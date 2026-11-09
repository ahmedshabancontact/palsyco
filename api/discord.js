import supabase from './db-client.js';
import { cors, getSettings } from './_lib.js';

const API = 'https://discord.com/api/v10';
const INVITE = process.env.DISCORD_INVITE_CODE || 'naHB2YVwKR';
const BOT = process.env.DISCORD_BOT_TOKEN || '';
const VIEW_CHANNEL = 1024n;
const cache = new Map();

async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  try {
    const v = await fn();
    cache.set(key, { t: Date.now(), v });
    return v;
  } catch (e) {
    if (hit) return hit.v;
    throw e;
  }
}

async function dget(path, useBot = false) {
  const headers = { 'User-Agent': 'DiscordBot (https://discord.gg/' + INVITE + ', 1.0) CommunitySite' };
  if (useBot) headers.Authorization = `Bot ${BOT}`;
  const r = await fetch(API + path, { headers });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    const e = new Error(
      r.status === 429 ? `Discord rate limit (retry in ${j.retry_after ?? '?'}s)` : j.message || `Discord API error ${r.status}`
    );
    e.status = r.status;
    e.code = j.code;
    throw e;
  }
  return r.json();
}

async function safe(fn) {
  if (!fn) return { data: null, error: null };
  try {
    return { data: await fn(), error: null };
  } catch (e) {
    return { data: null, error: e.message, status: e.status };
  }
}

const getInvite = () => cached('invite', 60000, () => dget(`/invites/${INVITE}?with_counts=true&with_expiration=true`));

async function getGuildId() {
  if (process.env.DISCORD_GUILD_ID) return process.env.DISCORD_GUILD_ID;
  const inv = await getInvite();
  return inv.guild_id || inv.guild?.id;
}

const getWidget = (gid) =>
  cached('widget', 30000, async () => {
    try {
      return await dget(`/guilds/${gid}/widget.json`);
    } catch (e) {
      if (e.status === 403 || e.status === 404 || e.code === 50004) return null;
      throw e;
    }
  });

const botGuild = (gid) => (BOT ? () => cached('bguild', 60000, () => dget(`/guilds/${gid}?with_counts=true`, true)) : null);
const botChannels = (gid) => (BOT ? () => cached('bchan', 60000, () => dget(`/guilds/${gid}/channels`, true)) : null);
const botMembers = (gid) =>
  BOT
    ? () =>
        cached('bmem', 60000, async () => {
          let all = [];
          let after = '0';
          for (let i = 0; i < 10; i++) {
            const page = await dget(`/guilds/${gid}/members?limit=1000&after=${after}`, true);
            all = all.concat(page);
            if (page.length < 1000) break;
            after = page[page.length - 1].user.id;
          }
          return all;
        })
    : null;

async function getSnapshot() {
  const { data } = await supabase.from('site_settings').select('value, updated_at').eq('key', 'live_snapshot').maybeSingle();
  if (!data?.value) return null;
  const updated = new Date(data.value.updated_at || data.updated_at).getTime();
  const age = Date.now() - updated;
  return { ...data.value, age, stale: age > 3 * 60 * 1000 };
}

/* ---------- CDN helpers ---------- */
const ext = (h) => (h && h.startsWith('a_') ? 'gif' : 'png');
const iconUrl = (gid, h) => (h ? `https://cdn.discordapp.com/icons/${gid}/${h}.${ext(h)}?size=256` : null);
const bannerUrl = (gid, h) => (h ? `https://cdn.discordapp.com/banners/${gid}/${h}.${ext(h)}?size=1024` : null);
const splashUrl = (gid, h) => (h ? `https://cdn.discordapp.com/splashes/${gid}/${h}.png?size=1024` : null);
function defaultAvatar(id) {
  try {
    return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`;
  } catch {
    return 'https://cdn.discordapp.com/embed/avatars/0.png';
  }
}
function memberAvatar(gid, m) {
  const u = m.user;
  if (m.avatar) return `https://cdn.discordapp.com/guilds/${gid}/users/${u.id}/avatars/${m.avatar}.${ext(m.avatar)}?size=128`;
  if (u.avatar) return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${ext(u.avatar)}?size=128`;
  return defaultAvatar(u.id);
}
const snowflakeDate = (id) => {
  try {
    return new Date(Number((BigInt(id) >> 22n) + 1420070400000n)).toISOString();
  } catch {
    return null;
  }
};
const hexColor = (n) => (n ? '#' + n.toString(16).padStart(6, '0') : null);

const KIND = { 0: 'text', 2: 'voice', 4: 'category', 5: 'announcement', 13: 'stage', 15: 'forum', 16: 'media' };
const TEXT_TYPES = [0, 5, 15, 16];
const VOICE_TYPES = [2, 13];

function isPrivate(ch, gid, byId) {
  const check = (c) =>
    (c?.permission_overwrites || []).some((o) => o.id === gid && (BigInt(o.deny || '0') & VIEW_CHANNEL) === VIEW_CHANNEL);
  if (check(ch)) return true;
  if (ch.parent_id && byId[ch.parent_id] && check(byId[ch.parent_id])) {
    const allow = (ch.permission_overwrites || []).some(
      (o) => o.id === gid && (BigInt(o.allow || '0') & VIEW_CHANNEL) === VIEW_CHANNEL
    );
    return !allow;
  }
  return false;
}

async function publicBotChannels(gid) {
  const res = await safe(botChannels(gid));
  if (!res.data) return { channels: null, error: res.error };
  const byId = Object.fromEntries(res.data.map((c) => [c.id, c]));
  const channels = res.data.filter((c) => !isPrivate(c, gid, byId));
  return { channels, byId, error: null, hidden: res.data.length - channels.length };
}

async function botVoiceStates(gid, members) {
  return cached('bvoice', 25000, async () => {
    const humans = members.filter((m) => !m.user.bot).slice(0, 250);
    const out = [];
    let i = 0;
    let limited = false;
    async function worker() {
      while (i < humans.length && !limited) {
        const m = humans[i++];
        try {
          const vs = await dget(`/guilds/${gid}/voice-states/${m.user.id}`, true);
          if (vs?.channel_id) out.push({ ...vs, member: m });
        } catch (e) {
          if (e.status === 429) limited = true;
        }
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker));
    if (limited && out.length === 0) throw new Error('Discord rate-limited voice lookups');
    return { states: out, partial: limited };
  });
}

/* ---------- builders ---------- */
async function buildVoice(gid) {
  const [chanRes, widget, snapshot] = await Promise.all([publicBotChannels(gid), getWidget(gid).catch(() => null), getSnapshot()]);
  let channelList = [];
  const byId = chanRes.byId || {};
  if (chanRes.channels) {
    channelList = chanRes.channels
      .filter((c) => VOICE_TYPES.includes(c.type))
      .map((c) => ({
        id: c.id,
        name: c.name,
        kind: KIND[c.type],
        position: c.position,
        category: c.parent_id && byId[c.parent_id] ? byId[c.parent_id].name : null,
        category_position: c.parent_id && byId[c.parent_id] ? byId[c.parent_id].position : -1,
        user_limit: c.user_limit || 0,
        members: [],
      }));
  } else if (widget?.channels) {
    channelList = widget.channels.map((c) => ({
      id: c.id,
      name: c.name,
      kind: 'voice',
      position: c.position,
      category: null,
      category_position: -1,
      user_limit: 0,
      members: [],
    }));
  }

  let source = 'none';
  let partial = false;
  let states = [];
  if (snapshot && !snapshot.stale && Array.isArray(snapshot.voice_states)) {
    source = 'sync-bot';
    states = snapshot.voice_states.map((v) => ({
      id: v.user_id,
      channel_id: v.channel_id,
      username: v.username || null,
      display_name: v.display_name || v.username || 'Member',
      avatar_url: v.avatar_url || defaultAvatar(v.user_id),
      self_mute: !!v.self_mute,
      self_deaf: !!v.self_deaf,
      streaming: !!v.streaming,
      video: !!v.video,
    }));
  } else if (widget) {
    source = 'widget';
    states = (widget.members || [])
      .filter((m) => m.channel_id)
      .map((m) => ({
        id: m.id,
        channel_id: m.channel_id,
        username: m.username,
        display_name: m.username,
        avatar_url: m.avatar_url,
        self_mute: !!(m.self_mute || m.mute),
        self_deaf: !!(m.self_deaf || m.deaf),
        streaming: false,
        video: false,
      }));
  } else if (BOT) {
    const mem = await safe(botMembers(gid));
    if (mem.data) {
      const vs = await safe(() => botVoiceStates(gid, mem.data));
      if (vs.data) {
        source = 'bot-rest';
        partial = vs.data.partial;
        states = vs.data.states.map((v) => ({
          id: v.user_id,
          channel_id: v.channel_id,
          username: v.member.user.username,
          display_name: v.member.nick || v.member.user.global_name || v.member.user.username,
          avatar_url: memberAvatar(gid, v.member),
          self_mute: !!v.self_mute,
          self_deaf: !!v.self_deaf,
          streaming: !!v.self_stream,
          video: !!v.self_video,
        }));
      }
    }
  }

  const map = Object.fromEntries(channelList.map((c) => [c.id, c]));
  for (const s of states) {
    if (!map[s.channel_id]) {
      const c = { id: s.channel_id, name: 'Voice channel', kind: 'voice', position: 999, category: null, category_position: 999, user_limit: 0, members: [] };
      map[s.channel_id] = c;
      channelList.push(c);
    }
    map[s.channel_id].members.push(s);
  }
  channelList.sort((a, b) => a.category_position - b.category_position || a.position - b.position);

  return {
    source,
    partial,
    available: source !== 'none',
    channels_source: chanRes.channels ? 'bot' : widget ? 'widget' : 'none',
    channels: channelList,
    total_connected: states.length,
    updated_at: new Date().toISOString(),
  };
}

async function buildOverview(gid) {
  const [invite, guildRes, chanRes, widget, voice] = await Promise.all([
    safe(getInvite),
    safe(botGuild(gid)),
    publicBotChannels(gid),
    getWidget(gid).catch(() => null),
    buildVoice(gid).catch(() => null),
  ]);
  const inv = invite.data;
  const g = guildRes.data || inv?.guild || {};
  const profile = inv?.profile || {};
  const memberCount = guildRes.data?.approximate_member_count ?? inv?.approximate_member_count ?? null;
  const onlineCount = guildRes.data?.approximate_presence_count ?? inv?.approximate_presence_count ?? widget?.presence_count ?? null;
  const countsFrom = guildRes.data ? 'bot' : inv ? 'invite' : widget ? 'widget' : 'none';
  const offline = memberCount != null && onlineCount != null && countsFrom !== 'widget' ? Math.max(0, memberCount - onlineCount) : null;
  const ch = chanRes.channels;
  return {
    id: gid,
    name: g.name || profile.name || widget?.name || 'Discord Server',
    description: g.description || profile.description || null,
    icon_url: iconUrl(gid, g.icon || profile.icon_hash),
    banner_url: bannerUrl(gid, g.banner || profile.custom_banner_hash || profile.banner_hash),
    splash_url: splashUrl(gid, g.splash),
    created_at: snowflakeDate(gid),
    features: g.features || [],
    verification_level: g.verification_level ?? null,
    premium_tier: g.premium_tier ?? profile.premium_tier ?? 0,
    boosts: g.premium_subscription_count ?? profile.premium_subscription_count ?? 0,
    vanity_url_code: g.vanity_url_code || null,
    member_count: memberCount,
    online_count: onlineCount,
    offline_count: offline,
    counts_source: countsFrom,
    text_channels: ch ? ch.filter((c) => TEXT_TYPES.includes(c.type)).length : null,
    voice_channels: ch ? ch.filter((c) => VOICE_TYPES.includes(c.type)).length : widget?.channels ? widget.channels.length : null,
    categories: ch ? ch.filter((c) => c.type === 4).length : null,
    channels_source: ch ? 'bot' : widget ? 'widget' : 'none',
    voice_connected: voice?.available ? voice.total_connected : null,
    voice_source: voice?.source || 'none',
    status: inv ? 'online' : invite.error ? 'unreachable' : 'unknown',
    status_detail: invite.error || null,
    invite: inv
      ? {
          code: inv.code,
          url: `https://discord.gg/${inv.code}`,
          channel: inv.channel?.name || null,
          inviter: inv.inviter ? inv.inviter.global_name || inv.inviter.username : null,
          expires_at: inv.expires_at || null,
        }
      : { code: INVITE, url: `https://discord.gg/${INVITE}`, channel: null, inviter: null, expires_at: null },
    widget_enabled: !!widget,
    bot_connected: !!guildRes.data,
    updated_at: new Date().toISOString(),
  };
}

async function buildChannels(gid) {
  const [chanRes, widget] = await Promise.all([publicBotChannels(gid), getWidget(gid).catch(() => null)]);
  if (chanRes.channels) {
    const all = chanRes.channels;
    const cats = all.filter((c) => c.type === 4).sort((a, b) => a.position - b.position);
    const items = all
      .filter((c) => c.type !== 4 && KIND[c.type])
      .map((c) => ({
        id: c.id,
        name: c.name,
        kind: KIND[c.type],
        topic: c.topic || null,
        nsfw: !!c.nsfw,
        position: c.position,
        parent_id: c.parent_id || null,
        user_limit: c.user_limit || 0,
        rate_limit: c.rate_limit_per_user || 0,
      }));
    const sortCh = (a, b) => {
      const av = VOICE_TYPES.includes(a.kind === 'voice' ? 2 : a.kind === 'stage' ? 13 : 0) ? 1 : 0;
      const bv = VOICE_TYPES.includes(b.kind === 'voice' ? 2 : b.kind === 'stage' ? 13 : 0) ? 1 : 0;
      return av - bv || a.position - b.position;
    };
    const groups = [];
    const loose = items.filter((c) => !c.parent_id || !cats.find((k) => k.id === c.parent_id)).sort(sortCh);
    if (loose.length) groups.push({ id: 'none', name: null, channels: loose });
    for (const k of cats) {
      const chs = items.filter((c) => c.parent_id === k.id).sort(sortCh);
      if (chs.length) groups.push({ id: k.id, name: k.name, channels: chs });
    }
    return { source: 'bot', groups, hidden_private: chanRes.hidden || 0, error: null };
  }
  if (widget?.channels) {
    return {
      source: 'widget',
      groups: [
        {
          id: 'widget',
          name: 'Voice channels (from server widget)',
          channels: widget.channels.map((c) => ({ id: c.id, name: c.name, kind: 'voice', topic: null, nsfw: false, position: c.position, parent_id: null, user_limit: 0, rate_limit: 0 })),
        },
      ],
      hidden_private: 0,
      error: chanRes.error,
    };
  }
  return { source: 'none', groups: [], hidden_private: 0, error: chanRes.error };
}

async function buildMembers(gid) {
  const settings = await getSettings();
  const { data: webProfiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, discord_id, discord_username, created_at')
    .eq('show_in_directory', true)
    .eq('banned', false)
    .order('created_at', { ascending: true });
  const website = settings.show_website_profiles ? webProfiles || [] : [];
  if (!settings.directory_enabled) {
    return { disabled: true, source: 'none', members: [], website_profiles: website, roles: [], total: null, online: null };
  }
  const [memRes, guildRes, snapshot, widget, voice] = await Promise.all([
    safe(botMembers(gid)),
    safe(botGuild(gid)),
    getSnapshot(),
    getWidget(gid).catch(() => null),
    settings.show_voice ? buildVoice(gid).catch(() => null) : Promise.resolve(null),
  ]);
  const voiceBy = {};
  const voiceByName = {};
  if (voice) for (const c of voice.channels) for (const m of c.members) {
    voiceBy[m.id] = c.name;
    if (m.username) voiceByName[m.username] = c.name;
  }
  const presences = snapshot && !snapshot.stale ? snapshot.presences || {} : null;

  if (memRes.data) {
    const roles = (guildRes.data?.roles || []).filter((r) => r.id !== gid).sort((a, b) => b.position - a.position);
    const roleBy = Object.fromEntries(roles.map((r) => [r.id, r]));
    let members = memRes.data.map((m) => {
      const mRoles = (m.roles || []).map((id) => roleBy[id]).filter(Boolean).sort((a, b) => b.position - a.position);
      const top = mRoles.find((r) => r.hoist) || mRoles[0] || null;
      return {
        id: m.user.id,
        username: m.user.username,
        display_name: m.nick || m.user.global_name || m.user.username,
        avatar_url: memberAvatar(gid, m),
        bot: !!m.user.bot,
        joined_at: m.joined_at,
        status: presences ? presences[m.user.id] || 'offline' : null,
        roles: settings.show_roles ? mRoles.map((r) => ({ id: r.id, name: r.name, color: hexColor(r.color) })) : [],
        top_role: settings.show_roles && top ? { id: top.id, name: top.name, color: hexColor(top.color) } : null,
        voice_channel: settings.show_voice ? voiceBy[m.user.id] || null : null,
      };
    });
    if (!settings.show_bots) members = members.filter((m) => !m.bot);
    return {
      source: 'bot',
      presence_source: presences ? 'sync-bot' : 'none',
      members,
      website_profiles: website,
      roles: settings.show_roles ? roles.map((r) => ({ id: r.id, name: r.name, color: hexColor(r.color) })) : [],
      total: guildRes.data?.approximate_member_count ?? members.length,
      online: guildRes.data?.approximate_presence_count ?? null,
      error: null,
      settings,
    };
  }
  if (widget) {
    const members = (widget.members || []).map((m) => ({
      id: m.id,
      username: m.username,
      display_name: m.username,
      avatar_url: m.avatar_url,
      bot: false,
      joined_at: null,
      status: m.status || 'online',
      roles: [],
      top_role: null,
      voice_channel: settings.show_voice ? voiceByName[m.username] || (m.channel_id ? 'In voice' : null) : null,
      activity: m.activity?.name || null,
    }));
    return {
      source: 'widget',
      presence_source: 'widget',
      members,
      website_profiles: website,
      roles: [],
      total: null,
      online: widget.presence_count ?? members.length,
      error: memRes.error,
      settings,
    };
  }
  return { source: 'none', members: [], website_profiles: website, roles: [], total: null, online: null, error: memRes.error, settings };
}

async function buildStatus(gid) {
  const [invite, guildRes, chanRes, memRes, widget, snapshot] = await Promise.all([
    safe(getInvite),
    safe(botGuild(gid)),
    safe(botChannels(gid)),
    safe(botMembers(gid)),
    safe(() => getWidget(gid)),
    getSnapshot(),
  ]);
  return {
    guild_id: gid,
    invite: { ok: !!invite.data, error: invite.error, code: INVITE },
    widget: { enabled: !!widget.data, error: widget.error },
    bot: {
      configured: !!BOT,
      ok: !!guildRes.data,
      error: guildRes.error,
      channels_ok: !!chanRes.data,
      members_ok: !!memRes.data,
      members_error: memRes.error,
    },
    sync: {
      configured: !!process.env.DISCORD_SYNC_SECRET,
      last_update: snapshot ? new Date(Date.now() - snapshot.age).toISOString() : null,
      live: !!snapshot && !snapshot.stale,
    },
    oauth: { configured: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) },
    checked_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    const type = req.query.type || 'overview';
    if (req.method === 'POST' && type === 'sync') {
      const secret = process.env.DISCORD_SYNC_SECRET;
      if (!secret || req.headers['x-sync-secret'] !== secret) return res.status(401).json({ error: 'Invalid sync secret' });
      const body = req.body || {};
      const value = {
        voice_states: Array.isArray(body.voice_states) ? body.voice_states.slice(0, 1000) : [],
        presences: body.presences && typeof body.presences === 'object' ? body.presences : {},
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('site_settings').upsert({ key: 'live_snapshot', value, updated_at: value.updated_at }, { onConflict: 'key' });
      if (error) throw error;
      cache.delete('bvoice');
      return res.status(200).json({ ok: true, voice: value.voice_states.length, presences: Object.keys(value.presences).length });
    }
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    let gid;
    try {
      gid = await getGuildId();
    } catch (e) {
      return res.status(502).json({ error: `Could not reach Discord: ${e.message}`, unreachable: true });
    }
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');
    if (type === 'overview') return res.status(200).json(await buildOverview(gid));
    if (type === 'channels') return res.status(200).json(await buildChannels(gid));
    if (type === 'voice') return res.status(200).json(await buildVoice(gid));
    if (type === 'members') return res.status(200).json(await buildMembers(gid));
    if (type === 'status') return res.status(200).json(await buildStatus(gid));
    return res.status(400).json({ error: 'Unknown type' });
  } catch (err) {
    console.error('discord api error:', err);
    res.status(500).json({ error: err.message });
  }
}

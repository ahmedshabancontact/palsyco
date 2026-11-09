// Live sync bot for your community website.
// Streams real-time voice channel occupancy + member presence (online/idle/dnd)
// from the Discord Gateway to your website's /api/discord endpoint.
//
// Requirements: Node 18+, `npm install discord.js`
// Developer Portal → Bot → enable "Server Members Intent" and "Presence Intent".
//
// Run:
//   SITE_URL=https://your-site.vercel.app \
//   DISCORD_BOT_TOKEN=xxxx \
//   DISCORD_GUILD_ID=1565054322171977878 \
//   DISCORD_SYNC_SECRET=same-value-as-on-vercel \
//   node palsyco-sync-bot.mjs

import { Client, GatewayIntentBits, Events } from 'discord.js';

const { SITE_URL, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_SYNC_SECRET } = process.env;
if (!SITE_URL || !DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID || !DISCORD_SYNC_SECRET) {
  console.error('Missing env: SITE_URL, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_SYNC_SECRET');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
  ],
});

let timer = null;
const schedule = () => {
  clearTimeout(timer);
  timer = setTimeout(push, 1500);
};

async function push() {
  const guild = client.guilds.cache.get(DISCORD_GUILD_ID);
  if (!guild) return;
  const voice_states = [...guild.voiceStates.cache.values()]
    .filter((v) => v.channelId)
    .map((v) => ({
      user_id: v.id,
      channel_id: v.channelId,
      username: v.member?.user.username,
      display_name: v.member?.displayName,
      avatar_url: v.member?.displayAvatarURL({ size: 128 }),
      self_mute: v.selfMute,
      self_deaf: v.selfDeaf,
      streaming: v.streaming,
      video: v.selfVideo,
    }));
  const presences = {};
  guild.presences.cache.forEach((p) => {
    presences[p.userId] = p.status;
  });
  try {
    const r = await fetch(`${SITE_URL.replace(/\/$/, '')}/api/discord?type=sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Sync-Secret': DISCORD_SYNC_SECRET },
      body: JSON.stringify({ voice_states, presences }),
    });
    console.log(new Date().toISOString(), 'sync', r.status, `${voice_states.length} in voice`);
  } catch (e) {
    console.error('sync failed', e.message);
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const guild = await client.guilds.fetch(DISCORD_GUILD_ID);
  await guild.members.fetch({ withPresences: true });
  await push();
  setInterval(push, 60_000); // heartbeat keeps the snapshot fresh
});
client.on(Events.VoiceStateUpdate, schedule);
client.on(Events.PresenceUpdate, schedule);
client.login(DISCORD_BOT_TOKEN);

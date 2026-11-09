import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import supabase from './db-client.js';

function baseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function page(res, status, title, msg) {
  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#08080b;color:#ececf1;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh">
<div style="max-width:460px;padding:32px;border:1px solid #262631;border-radius:20px;background:#111116">
<h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1><p style="color:#9a9aab;line-height:1.6">${msg}</p>
<a href="/setup" style="display:inline-block;margin-top:12px;color:#7983f5">Open the setup guide →</a></div></body></html>`);
}

function parseCookies(h = '') {
  return Object.fromEntries(
    h.split(';').map((p) => p.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
  );
}

export default async function handler(req, res) {
  const CID = process.env.DISCORD_CLIENT_ID;
  const SECRET = process.env.DISCORD_CLIENT_SECRET;
  const base = baseUrl(req);
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${base}/api/auth-discord`;
  const fail = (msg) => {
    res.writeHead(302, { Location: `${base}/auth/callback#error=${encodeURIComponent(msg)}` });
    res.end();
  };

  if (!CID || !SECRET) {
    return page(
      res,
      503,
      'Discord login is not configured yet',
      'The site owner needs to add <code>DISCORD_CLIENT_ID</code> and <code>DISCORD_CLIENT_SECRET</code> as server environment variables and register the redirect URL <code>' +
        esc(redirectUri) +
        '</code> in the Discord Developer Portal.'
    );
  }

  const { code, state, error, action } = req.query;

  if (action === 'start' || (!code && !error)) {
    const st = crypto.randomBytes(16).toString('hex');
    res.setHeader('Set-Cookie', `discord_oauth_state=${st}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
    const url = new URL('https://discord.com/oauth2/authorize');
    url.searchParams.set('client_id', CID);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', 'identify');
    url.searchParams.set('state', st);
    url.searchParams.set('prompt', 'none');
    res.writeHead(302, { Location: url.toString() });
    return res.end();
  }

  if (error) return fail(String(req.query.error_description || error));

  try {
    const cookies = parseCookies(req.headers.cookie);
    if (!state || cookies.discord_oauth_state !== state) return fail('Login session expired or invalid state. Please try again.');

    const tokRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CID, client_secret: SECRET, grant_type: 'authorization_code', code: String(code), redirect_uri: redirectUri }),
    });
    const tok = await tokRes.json();
    if (!tokRes.ok) return fail(tok.error_description || 'Discord token exchange failed');

    const meRes = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: `Bearer ${tok.access_token}` } });
    const du = await meRes.json();
    if (!meRes.ok || !du.id) return fail('Could not load your Discord profile');

    const avatar = du.avatar
      ? `https://cdn.discordapp.com/avatars/${du.id}/${du.avatar}.${du.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(du.id) >> 22n) % 6n)}.png`;
    const meta = {
      discord_id: du.id,
      discord_username: du.username,
      global_name: du.global_name || null,
      display_name: du.global_name || du.username,
      avatar_url: avatar,
    };
    // Synthetic, non-deliverable identity email so Discord accounts never merge with password accounts.
    const email = `discord-${du.id}@users.discord-login.app`;

    const { error: cErr } = await supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: meta });
    if (cErr && !/already|exists|registered/i.test(cErr.message)) return fail(cErr.message);

    const { data: link, error: lErr } = await supabase.auth.admin.generateLink({ type: 'magiclink', email });
    if (lErr) return fail(lErr.message);

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: v, error: vErr } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
    if (vErr || !v.session) return fail(vErr?.message || 'Could not create session');

    const uid = v.user.id;
    await supabase.auth.admin.updateUserById(uid, { user_metadata: meta });
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', uid).maybeSingle();
    const profileRow = {
      id: uid,
      display_name: meta.display_name,
      avatar_url: avatar,
      discord_id: du.id,
      discord_username: du.username,
      provider: 'discord',
    };
    if (existing) await supabase.from('profiles').update(profileRow).eq('id', uid);
    else await supabase.from('profiles').insert({ ...profileRow, username: du.username, show_in_directory: false, banned: false });

    res.setHeader('Set-Cookie', 'discord_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    const frag = new URLSearchParams({
      access_token: v.session.access_token,
      refresh_token: v.session.refresh_token,
      provider: 'discord',
    });
    res.writeHead(302, { Location: `${base}/auth/callback#${frag.toString()}` });
    return res.end();
  } catch (e) {
    console.error('discord oauth error', e);
    return fail(e.message || 'Unexpected error');
  }
}

import supabase from './db-client.js';

export function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Sync-Secret');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export async function getUser(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

function slug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 32);
}

export async function ensureProfile(user) {
  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing;
  const m = user.user_metadata || {};
  const email = user.email || '';
  const base = m.discord_username || m.username || m.full_name || m.name || email.split('@')[0] || 'member';
  const row = {
    id: user.id,
    username: slug(base) || 'member',
    display_name: String(m.display_name || m.global_name || m.full_name || m.name || base).slice(0, 48),
    avatar_url: m.avatar_url || m.picture || null,
    discord_id: m.discord_id || null,
    discord_username: m.discord_username || null,
    provider: m.discord_id ? 'discord' : user.app_metadata?.provider || 'email',
    show_in_directory: false,
    banned: false,
  };
  const { data, error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' }).select().single();
  if (error) throw error;
  return data;
}

export async function isAdmin(userId) {
  const { data, error } = await supabase.from('admin_roles').select('id').eq('user_id', userId).limit(1);
  if (error) throw error;
  return (data || []).length > 0;
}

export async function adminsExist() {
  const { count, error } = await supabase.from('admin_roles').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return (count || 0) > 0;
}

export async function requireUser(req, res, { allowBanned = false } = {}) {
  const user = await getUser(req);
  if (!user) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return null;
  }
  const profile = await ensureProfile(user);
  if (profile.banned && !allowBanned) {
    res.status(403).json({ error: 'Your account has been restricted by a moderator.' });
    return null;
  }
  return { user, profile };
}

export async function requireAdmin(req, res) {
  const ctx = await requireUser(req, res, { allowBanned: true });
  if (!ctx) return null;
  if (!(await isAdmin(ctx.user.id))) {
    res.status(403).json({ error: 'Administrator access required.' });
    return null;
  }
  return ctx;
}

export const DEFAULT_SETTINGS = {
  directory_enabled: true,
  show_roles: true,
  show_bots: false,
  show_voice: true,
  show_website_profiles: true,
  comments_enabled: true,
};

export async function getSettings() {
  const { data } = await supabase.from('site_settings').select('value').eq('key', 'settings').maybeSingle();
  return { ...DEFAULT_SETTINGS, ...(data?.value || {}) };
}

import supabase from './db-client.js';
import { cors, requireUser, requireAdmin, adminsExist, getSettings, DEFAULT_SETTINGS } from './_lib.js';

async function count(table, filter) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count: c, error } = await q;
  if (error) throw error;
  return c || 0;
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'POST' && req.body?.action === 'claim') {
      const ctx = await requireUser(req, res);
      if (!ctx) return;
      if (await adminsExist()) return res.status(403).json({ error: 'An administrator already exists. Ask them to grant you access.' });
      const { error } = await supabase.from('admin_roles').insert({ user_id: ctx.user.id, role: 'owner' });
      if (error) throw error;
      return res.status(201).json({ ok: true });
    }

    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    if (req.method === 'GET') {
      const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
      const [users, comments, hiddenComments, votes, polls, likes, openReports, admins, commentsWeek, votesWeek, discordUsers] = await Promise.all([
        count('profiles'),
        count('comments'),
        count('comments', (q) => q.eq('is_hidden', true)),
        count('votes'),
        count('polls'),
        count('comment_likes'),
        count('reports', (q) => q.eq('status', 'open')),
        count('admin_roles'),
        count('comments', (q) => q.gte('created_at', weekAgo)),
        count('votes', (q) => q.gte('created_at', weekAgo)),
        count('profiles', (q) => q.eq('provider', 'discord')),
      ]);
      const [{ data: reports }, { data: profiles }, { data: adminRows }, { data: recent }, settings] = await Promise.all([
        supabase
          .from('reports')
          .select('*, profiles(display_name, username, avatar_url), comments(id, body, user_id, is_hidden, created_at, profiles(display_name, username, avatar_url))')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('admin_roles').select('user_id, role'),
        supabase
          .from('comments')
          .select('*, profiles(display_name, username, avatar_url)')
          .order('created_at', { ascending: false })
          .limit(200),
        getSettings(),
      ]);
      const adminMap = Object.fromEntries((adminRows || []).map((a) => [a.user_id, a.role]));
      return res.status(200).json({
        stats: { users, comments, hidden_comments: hiddenComments, votes, polls, likes, open_reports: openReports, admins, comments_week: commentsWeek, votes_week: votesWeek, discord_users: discordUsers },
        reports: reports || [],
        users: (profiles || []).map((p) => ({ ...p, admin_role: adminMap[p.id] || null })),
        comments: recent || [],
        settings,
        me: ctx.user.id,
      });
    }

    if (req.method === 'PUT') {
      const { action } = req.body || {};
      if (action === 'resolve_report') {
        const { id, status } = req.body;
        if (!['resolved', 'dismissed', 'open'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
        const { error } = await supabase.from('reports').update({ status, resolved_by: ctx.user.id }).eq('id', id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      if (action === 'settings') {
        const current = await getSettings();
        const next = { ...current };
        for (const k of Object.keys(DEFAULT_SETTINGS)) if (req.body.values?.[k] !== undefined) next[k] = !!req.body.values[k];
        const { error } = await supabase.from('site_settings').upsert({ key: 'settings', value: next, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
        return res.status(200).json(next);
      }
      if (action === 'set_admin') {
        const { user_id, admin } = req.body;
        if (user_id === ctx.user.id && !admin) return res.status(400).json({ error: 'You cannot remove your own admin role.' });
        if (admin) {
          const { data: ex } = await supabase.from('admin_roles').select('id').eq('user_id', user_id).limit(1);
          if (!ex?.length) {
            const { error } = await supabase.from('admin_roles').insert({ user_id, role: 'admin' });
            if (error) throw error;
          }
        } else {
          const { error } = await supabase.from('admin_roles').delete().eq('user_id', user_id);
          if (error) throw error;
        }
        return res.status(200).json({ ok: true });
      }
      if (action === 'ban') {
        const { user_id, banned } = req.body;
        if (user_id === ctx.user.id) return res.status(400).json({ error: 'You cannot restrict yourself.' });
        const { error } = await supabase.from('profiles').update({ banned: !!banned }).eq('id', user_id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: 'Unknown action' });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin error:', err);
    res.status(500).json({ error: err.message });
  }
}

import supabase from './db-client.js';
import { cors, getUser, isAdmin, requireUser, getSettings } from './_lib.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const user = await getUser(req);
      const admin = user ? await isAdmin(user.id) : false;
      let q = supabase
        .from('comments')
        .select('*, profiles(id, username, display_name, avatar_url, discord_username, provider)')
        .order('created_at', { ascending: true })
        .limit(500);
      if (!admin) q = q.eq('is_hidden', false);
      const { data, error } = await q;
      if (error) throw error;
      const ids = data.map((c) => c.id);
      let likes = [];
      let myReports = [];
      if (ids.length) {
        const { data: l, error: lErr } = await supabase.from('comment_likes').select('comment_id, user_id').in('comment_id', ids);
        if (lErr) throw lErr;
        likes = l;
        if (user) {
          const { data: r } = await supabase.from('reports').select('comment_id').eq('reporter_id', user.id);
          myReports = (r || []).map((x) => x.comment_id);
        }
      }
      const { data: admins } = await supabase.from('admin_roles').select('user_id');
      const adminIds = new Set((admins || []).map((a) => a.user_id));
      const out = data.map((c) => ({
        id: c.id,
        parent_id: c.parent_id,
        body: c.body,
        is_hidden: c.is_hidden,
        created_at: c.created_at,
        edited_at: c.edited_at,
        user_id: c.user_id,
        author: c.profiles ? { ...c.profiles, is_admin: adminIds.has(c.user_id) } : null,
        like_count: likes.filter((l) => l.comment_id === c.id).length,
        liked_by_me: !!user && likes.some((l) => l.comment_id === c.id && l.user_id === user.id),
        reported_by_me: myReports.includes(c.id),
        is_mine: !!user && c.user_id === user.id,
      }));
      return res.status(200).json(out);
    }

    if (req.method === 'POST') {
      const ctx = await requireUser(req, res);
      if (!ctx) return;
      const { action } = req.body || {};

      if (action === 'like') {
        const commentId = Number(req.body.comment_id);
        const key = `${commentId}:${ctx.user.id}`;
        const { data: existing } = await supabase.from('comment_likes').select('id').eq('id', key).maybeSingle();
        if (existing) {
          await supabase.from('comment_likes').delete().eq('id', key);
          return res.status(200).json({ liked: false });
        }
        const { error } = await supabase.from('comment_likes').insert({ id: key, comment_id: commentId, user_id: ctx.user.id });
        if (error && error.code !== '23505') throw error;
        return res.status(200).json({ liked: true });
      }

      if (action === 'report') {
        const commentId = Number(req.body.comment_id);
        const reason = String(req.body.reason || '').trim();
        if (reason.length < 3) return res.status(400).json({ error: 'Please describe why you are reporting this comment.' });
        const { data: dup } = await supabase.from('reports').select('id').eq('comment_id', commentId).eq('reporter_id', ctx.user.id).limit(1);
        if (dup && dup.length) return res.status(409).json({ error: 'You already reported this comment.' });
        const { error } = await supabase.from('reports').insert({ comment_id: commentId, reporter_id: ctx.user.id, reason: reason.slice(0, 500), status: 'open' });
        if (error) throw error;
        return res.status(201).json({ ok: true });
      }

      const settings = await getSettings();
      if (!settings.comments_enabled && !(await isAdmin(ctx.user.id))) {
        return res.status(403).json({ error: 'Comments are temporarily disabled by the moderators.' });
      }
      const body = String(req.body.body || '').trim();
      if (body.length < 1) return res.status(400).json({ error: 'Comment cannot be empty.' });
      if (body.length > 2000) return res.status(400).json({ error: 'Comment must be under 2000 characters.' });
      const parentId = req.body.parent_id ? Number(req.body.parent_id) : null;
      if (parentId) {
        const { data: parent } = await supabase.from('comments').select('id').eq('id', parentId).maybeSingle();
        if (!parent) return res.status(400).json({ error: 'The comment you are replying to no longer exists.' });
      }
      const { data, error } = await supabase
        .from('comments')
        .insert({ user_id: ctx.user.id, parent_id: parentId, body, is_hidden: false })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const ctx = await requireUser(req, res, { allowBanned: true });
      if (!ctx) return;
      const { id, is_hidden, body } = req.body || {};
      const { data: c } = await supabase.from('comments').select('*').eq('id', id).maybeSingle();
      if (!c) return res.status(404).json({ error: 'Comment not found.' });
      const admin = await isAdmin(ctx.user.id);
      const patch = {};
      if (is_hidden !== undefined) {
        if (!admin) return res.status(403).json({ error: 'Moderator only.' });
        patch.is_hidden = !!is_hidden;
      }
      if (body !== undefined) {
        if (c.user_id !== ctx.user.id) return res.status(403).json({ error: 'You can only edit your own comments.' });
        const b = String(body).trim();
        if (!b || b.length > 2000) return res.status(400).json({ error: 'Comment must be 1–2000 characters.' });
        patch.body = b;
        patch.edited_at = new Date().toISOString();
      }
      const { error } = await supabase.from('comments').update(patch).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const ctx = await requireUser(req, res, { allowBanned: true });
      if (!ctx) return;
      const { id } = req.body || {};
      const { data: c } = await supabase.from('comments').select('user_id').eq('id', id).maybeSingle();
      if (!c) return res.status(404).json({ error: 'Comment not found.' });
      if (c.user_id !== ctx.user.id && !(await isAdmin(ctx.user.id))) {
        return res.status(403).json({ error: 'You can only delete your own comments.' });
      }
      // collect all descendant replies so the whole thread is removed
      const { data: all } = await supabase.from('comments').select('id, parent_id');
      const toDelete = new Set([Number(id)]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const x of all || []) {
          if (x.parent_id && toDelete.has(x.parent_id) && !toDelete.has(x.id)) {
            toDelete.add(x.id);
            grew = true;
          }
        }
      }
      const { error } = await supabase.from('comments').delete().in('id', [...toDelete]);
      if (error) throw error;
      return res.status(200).json({ ok: true, deleted: toDelete.size });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('comments error:', err);
    res.status(500).json({ error: err.message });
  }
}

import supabase from './db-client.js';
import { cors, getUser, requireUser, requireAdmin } from './_lib.js';

function pollStatus(p) {
  const now = Date.now();
  if (p.is_closed) return 'closed';
  if (p.ends_at && new Date(p.ends_at).getTime() <= now) return 'closed';
  if (p.starts_at && new Date(p.starts_at).getTime() > now) return 'upcoming';
  return 'active';
}

function validate(body, partial = false) {
  const errors = {};
  const title = String(body.title || '').trim();
  if (!partial || body.title !== undefined) {
    if (title.length < 3 || title.length > 140) errors.title = 'Title must be 3–140 characters.';
  }
  if (body.options !== undefined || !partial) {
    const opts = (body.options || []).map((o) => String(typeof o === 'string' ? o : o.label || '').trim()).filter(Boolean);
    if (opts.length < 2) errors.options = 'Add at least two options.';
    if (opts.length > 10) errors.options = 'Maximum 10 options.';
    if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) errors.options = 'Options must be unique.';
    if (opts.some((o) => o.length > 100)) errors.options = 'Options must be under 100 characters.';
  }
  if (body.starts_at && body.ends_at && new Date(body.ends_at) <= new Date(body.starts_at)) {
    errors.ends_at = 'End date must be after the start date.';
  }
  return Object.keys(errors).length ? errors : null;
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const user = await getUser(req);
      const { data: polls, error } = await supabase
        .from('polls')
        .select('*, poll_options(*), profiles(display_name, avatar_url)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const { data: votes, error: vErr } = await supabase.from('votes').select('poll_id, option_id, user_id');
      if (vErr) throw vErr;
      const out = polls.map((p) => {
        const pv = votes.filter((v) => v.poll_id === p.id);
        const mine = user ? pv.find((v) => v.user_id === user.id) : null;
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          starts_at: p.starts_at,
          ends_at: p.ends_at,
          is_closed: p.is_closed,
          created_at: p.created_at,
          author: p.profiles,
          status: pollStatus(p),
          total_votes: pv.length,
          my_vote: mine ? mine.option_id : null,
          options: (p.poll_options || [])
            .sort((a, b) => a.position - b.position || a.id - b.id)
            .map((o) => ({ id: o.id, label: o.label, votes: pv.filter((v) => v.option_id === o.id).length })),
        };
      });
      return res.status(200).json(out);
    }

    if (req.method === 'POST') {
      const { action } = req.body || {};
      if (action === 'vote') {
        const ctx = await requireUser(req, res);
        if (!ctx) return;
        const pollId = Number(req.body.poll_id);
        const optionId = Number(req.body.option_id);
        const { data: poll } = await supabase.from('polls').select('*').eq('id', pollId).maybeSingle();
        if (!poll) return res.status(404).json({ error: 'Poll not found.' });
        const st = pollStatus(poll);
        if (st !== 'active') return res.status(400).json({ error: st === 'upcoming' ? 'This poll has not opened yet.' : 'This poll is closed.' });
        const { data: opt } = await supabase.from('poll_options').select('id').eq('id', optionId).eq('poll_id', pollId).maybeSingle();
        if (!opt) return res.status(400).json({ error: 'Invalid option.' });
        const { error } = await supabase
          .from('votes')
          .insert({ id: `${pollId}:${ctx.user.id}`, poll_id: pollId, option_id: optionId, user_id: ctx.user.id });
        if (error) {
          if (error.code === '23505') return res.status(409).json({ error: 'You have already voted in this poll.' });
          throw error;
        }
        return res.status(201).json({ ok: true });
      }

      // create poll (admin)
      const ctx = await requireAdmin(req, res);
      if (!ctx) return;
      const errs = validate(req.body);
      if (errs) return res.status(400).json({ error: Object.values(errs)[0], fields: errs });
      const { title, description, starts_at, ends_at, options } = req.body;
      const { data: poll, error } = await supabase
        .from('polls')
        .insert({
          title: String(title).trim(),
          description: description ? String(description).trim().slice(0, 1000) : null,
          starts_at: starts_at || new Date().toISOString(),
          ends_at: ends_at || null,
          is_closed: false,
          created_by: ctx.user.id,
        })
        .select()
        .single();
      if (error) throw error;
      const rows = options
        .map((o) => String(typeof o === 'string' ? o : o.label).trim())
        .filter(Boolean)
        .map((label, i) => ({ poll_id: poll.id, label, position: i }));
      const { error: oErr } = await supabase.from('poll_options').insert(rows);
      if (oErr) throw oErr;
      return res.status(201).json(poll);
    }

    if (req.method === 'PUT') {
      const ctx = await requireAdmin(req, res);
      if (!ctx) return;
      const { id, options } = req.body || {};
      const errs = validate(req.body, true);
      if (errs) return res.status(400).json({ error: Object.values(errs)[0], fields: errs });
      const patch = {};
      for (const k of ['title', 'description', 'starts_at', 'ends_at', 'is_closed']) {
        if (req.body[k] !== undefined) patch[k] = req.body[k] === '' ? null : req.body[k];
      }
      if (Object.keys(patch).length) {
        const { error } = await supabase.from('polls').update(patch).eq('id', id);
        if (error) throw error;
      }
      if (Array.isArray(options)) {
        const { data: current } = await supabase.from('poll_options').select('id').eq('poll_id', id);
        const keep = options.filter((o) => o.id).map((o) => o.id);
        const remove = (current || []).filter((c) => !keep.includes(c.id)).map((c) => c.id);
        if (remove.length) {
          const { error } = await supabase.from('poll_options').delete().in('id', remove);
          if (error) throw error;
        }
        for (let i = 0; i < options.length; i++) {
          const o = options[i];
          const label = String(o.label || '').trim();
          if (!label) continue;
          if (o.id) await supabase.from('poll_options').update({ label, position: i }).eq('id', o.id).eq('poll_id', id);
          else await supabase.from('poll_options').insert({ poll_id: id, label, position: i });
        }
      }
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const ctx = await requireAdmin(req, res);
      if (!ctx) return;
      const { id } = req.body || {};
      const { error } = await supabase.from('polls').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('polls error:', err);
    res.status(500).json({ error: err.message });
  }
}

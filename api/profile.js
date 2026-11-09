import supabase from './db-client.js';
import { cors, requireUser, isAdmin, adminsExist } from './_lib.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const ctx = await requireUser(req, res, { allowBanned: true });
      if (!ctx) return;
      const [admin, exist] = await Promise.all([isAdmin(ctx.user.id), adminsExist()]);
      return res.status(200).json({ profile: ctx.profile, is_admin: admin, admins_exist: exist, email: ctx.user.email });
    }
    if (req.method === 'PUT') {
      const ctx = await requireUser(req, res, { allowBanned: true });
      if (!ctx) return;
      const patch = {};
      if (req.body.display_name !== undefined) {
        const d = String(req.body.display_name).trim();
        if (d.length < 2 || d.length > 48) return res.status(400).json({ error: 'Display name must be 2–48 characters.' });
        patch.display_name = d;
      }
      if (req.body.show_in_directory !== undefined) patch.show_in_directory = !!req.body.show_in_directory;
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', ctx.user.id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('profile error:', err);
    res.status(500).json({ error: err.message });
  }
}

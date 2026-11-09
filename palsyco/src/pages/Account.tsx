import { useEffect, useState } from 'react';
import { LogOut, Save } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, Badge, Field, PageHeader, Spinner, Toggle } from '../components/ui';
import { DiscordLogo } from '../components/discord';
import { fmtDate } from '../lib/format';

export default function Account() {
  const { profile, user, refreshProfile, signOut, isAdmin } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (profile) setName(profile.display_name);
  }, [profile]);

  if (!profile)
    return (
      <div className="flex items-center gap-2 text-muted">
        <Spinner /> Loading your profile…
      </div>
    );

  const save = async (patch: Record<string, unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      await api('/api/profile', { method: 'PUT', body: patch });
      await refreshProfile();
      setMsg({ ok: true, text: 'Saved.' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Account" title="Your profile" subtitle="Control how you appear on the community site." />
      <div className="rounded-2xl border border-line bg-surface/70 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Avatar src={profile.avatar_url} name={profile.display_name} size={64} ring />
          <div>
            <div className="font-display text-xl font-semibold flex items-center gap-2">
              {profile.display_name} {isAdmin && <Badge tone="fuchsia">Admin</Badge>}
            </div>
            <div className="text-sm text-muted">
              {profile.discord_username ? (
                <span className="inline-flex items-center gap-1">
                  <DiscordLogo className="w-3.5 h-3.5 text-blurple-2" /> @{profile.discord_username}
                </span>
              ) : (
                user?.email
              )}
            </div>
            <div className="text-xs text-dim">Member since {fmtDate(profile.created_at, false)} · via {profile.provider}</div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length < 2) return setMsg({ ok: false, text: 'Display name must be at least 2 characters.' });
            save({ display_name: name.trim() });
          }}
          className="flex gap-2 items-end"
        >
          <div className="flex-1">
            <Field label="Display name">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={48} />
            </Field>
          </div>
          <button disabled={busy} className="btn-primary">
            <Save className="w-4 h-4" /> Save
          </button>
        </form>

        <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-surface-2/50 p-4">
          <div>
            <div className="font-semibold">Show me in the member directory</div>
            <p className="text-sm text-muted">Publishes your display name, avatar and Discord username in the &ldquo;Website community&rdquo; directory. You can turn this off at any time.</p>
          </div>
          <Toggle checked={profile.show_in_directory} disabled={busy} onChange={(v) => save({ show_in_directory: v })} />
        </div>

        {msg && <p className={`text-sm ${msg.ok ? 'text-online' : 'text-dnd'}`}>{msg.text}</p>}

        <button onClick={signOut} className="btn-ghost hover:!text-dnd">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

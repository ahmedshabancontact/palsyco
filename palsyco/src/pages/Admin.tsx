import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Flag,
  Heart,
  MessagesSquare,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserX,
  Users,
  Vote,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useDiscord } from '../lib/useDiscord';
import type { Poll, Profile, Settings, StatusResponse } from '../lib/types';
import { fmtDate, fmtNum, timeAgo } from '../lib/format';
import { Avatar, Badge, EmptyState, ErrorState, LoadingBlock, PageHeader, Spinner, Toggle } from '../components/ui';
import StatCard from '../components/StatCard';
import PollEditor from '../components/PollEditor';
import { usePolls } from './Polls';

type MiniProfile = { display_name: string; username: string; avatar_url: string | null } | null;
type AdminData = {
  stats: Record<string, number>;
  reports: {
    id: number;
    reason: string;
    status: string;
    created_at: string;
    comment_id: number;
    profiles: MiniProfile;
    comments: { id: number; body: string; is_hidden: boolean; created_at: string; profiles: MiniProfile } | null;
  }[];
  users: (Profile & { admin_role: string | null })[];
  comments: { id: number; body: string; is_hidden: boolean; created_at: string; parent_id: number | null; profiles: MiniProfile }[];
  settings: Settings;
  me: string;
};

const TABS = [
  { k: 'overview', label: 'Overview', icon: BarChart3 },
  { k: 'polls', label: 'Polls', icon: Vote },
  { k: 'comments', label: 'Comments', icon: MessagesSquare },
  { k: 'reports', label: 'Reports', icon: Flag },
  { k: 'users', label: 'Users & roles', icon: Users },
  { k: 'directory', label: 'Directory settings', icon: Shield },
] as const;

function ClaimAdmin() {
  const { refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="max-w-lg mx-auto text-center rounded-3xl border border-line bg-surface p-8 card-glow">
      <Crown className="w-12 h-12 text-idle mx-auto mb-4" />
      <h2 className="font-display text-2xl font-bold">No administrator yet</h2>
      <p className="text-muted mt-2">This site has no admins. As the server owner, claim the owner role now. Once claimed, only existing admins can grant access.</p>
      {err && <p className="text-sm text-dnd mt-3">{err}</p>}
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api('/api/admin', { method: 'POST', body: { action: 'claim' } });
            await refreshProfile();
          } catch (e) {
            setErr((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
        className="btn-primary mt-6"
      >
        {busy && <Spinner className="w-4 h-4 !text-white" />} Claim owner role
      </button>
    </div>
  );
}

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail: string | null | undefined }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-line last:border-0">
      {ok ? <CheckCircle2 className="w-5 h-5 text-online shrink-0" /> : <XCircle className="w-5 h-5 text-dnd shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {detail && <div className="text-xs text-dim break-words">{detail}</div>}
      </div>
      <Badge tone={ok ? 'green' : 'red'}>{ok ? 'OK' : 'Off'}</Badge>
    </div>
  );
}

export default function Admin() {
  const { isAdmin, adminsExist, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]['k']>('overview');
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [reportFilter, setReportFilter] = useState<'open' | 'all'>('open');
  const [userQ, setUserQ] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Poll | null>(null);
  const { data: st, refresh: refreshStatus, refreshing } = useDiscord<StatusResponse>('status');
  const { polls, fetchPolls } = usePolls(30000);

  const load = useCallback(async () => {
    try {
      setData(await api<AdminData>('/api/admin'));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (authLoading) return <LoadingBlock rows={3} />;
  if (!isAdmin) {
    if (!adminsExist) return <ClaimAdmin />;
    return (
      <EmptyState
        icon={<ShieldOff className="w-6 h-6" />}
        title="Administrators only"
        text="Your account doesn't have admin access. Ask an existing administrator to grant you the admin role."
        action={
          <Link to="/" className="btn-ghost">
            Back home
          </Link>
        }
      />
    );
  }

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusyId(key);
    setActionErr(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setActionErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };
  const deleteComment = (id: number) => {
    if (!confirm('Permanently delete this comment and its replies?')) return;
    act(`c${id}`, () => api('/api/comments', { method: 'DELETE', body: { id } }));
  };
  const hideComment = (id: number, hidden: boolean) => act(`c${id}`, () => api('/api/comments', { method: 'PUT', body: { id, is_hidden: hidden } }));
  const resolve = (id: number, status: string) => act(`r${id}`, () => api('/api/admin', { method: 'PUT', body: { action: 'resolve_report', id, status } }));

  const s = data?.stats;
  const openReports = data?.reports.filter((r) => r.status === 'open').length || 0;

  return (
    <div>
      <PageHeader
        eyebrow="Admin dashboard"
        title="Mission control"
        subtitle="Moderate content, manage polls and monitor the Discord integration."
        actions={
          <button onClick={load} className="btn-ghost">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        }
      />

      <div className="flex gap-1 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${tab === t.k ? 'bg-blurple text-white' : 'text-muted hover:text-fg hover:bg-surface-2'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
            {t.k === 'reports' && openReports > 0 && <span className="text-[10px] px-1.5 rounded-full bg-dnd text-white">{openReports}</span>}
          </button>
        ))}
      </div>

      {actionErr && <div className="mb-4"><ErrorState message={actionErr} /></div>}

      {loading ? (
        <LoadingBlock rows={4} label="Loading dashboard…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data || !s ? null : (
        <>
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard icon={Users} label="Website users" value={fmtNum(s.users)} hint={`${s.discord_users} via Discord · ${s.admins} admins`} />
                <StatCard icon={MessagesSquare} label="Comments" value={fmtNum(s.comments)} accent="fuchsia" hint={`${s.comments_week} this week · ${s.hidden_comments} hidden`} />
                <StatCard icon={Vote} label="Votes" value={fmtNum(s.votes)} accent="green" hint={`${s.votes_week} this week · ${s.polls} polls`} />
                <StatCard icon={Flag} label="Open reports" value={<span className={s.open_reports ? 'text-dnd' : ''}>{fmtNum(s.open_reports)}</span>} accent="yellow" hint={`${fmtNum(s.likes)} likes total`} />
              </div>
              <section className="rounded-2xl border border-line bg-surface/60 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-display text-lg font-semibold">Discord integration status</h2>
                  <button onClick={refreshStatus} className="icon-btn" aria-label="Recheck">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {!st ? (
                  <LoadingBlock rows={2} />
                ) : (
                  <div className="grid md:grid-cols-2 gap-x-8">
                    <div>
                      <StatusRow ok={st.invite.ok} label={`Invite API (discord.gg/${st.invite.code})`} detail={st.invite.error || `Guild ${st.guild_id}`} />
                      <StatusRow ok={st.widget.enabled} label="Server widget" detail={st.widget.enabled ? 'Enabled' : 'Enable in Server Settings → Widget'} />
                      <StatusRow ok={st.oauth.configured} label="Discord OAuth2 login" detail={st.oauth.configured ? 'Client credentials present' : 'Set DISCORD_CLIENT_ID & DISCORD_CLIENT_SECRET'} />
                    </div>
                    <div>
                      <StatusRow ok={st.bot.ok} label="Bot → guild access" detail={st.bot.configured ? st.bot.error || 'Connected' : 'DISCORD_BOT_TOKEN not set'} />
                      <StatusRow ok={st.bot.members_ok} label="Server Members Intent" detail={st.bot.members_error || (st.bot.members_ok ? 'Member list accessible' : 'Requires bot')} />
                      <StatusRow ok={st.sync.live} label="Live gateway sync" detail={st.sync.last_update ? `Last push ${timeAgo(st.sync.last_update)}` : st.sync.configured ? 'Secret set — waiting for bot' : 'DISCORD_SYNC_SECRET not set'} />
                    </div>
                  </div>
                )}
                <Link to="/setup" className="inline-block mt-4 text-sm text-blurple-2">
                  Open setup guide →
                </Link>
              </section>
            </div>
          )}

          {tab === 'polls' && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  className="btn-primary"
                  onClick={() => {
                    setEditing(null);
                    setEditorOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" /> New poll
                </button>
              </div>
              {polls.length === 0 ? (
                <EmptyState title="No polls yet" />
              ) : (
                <div className="rounded-2xl border border-line overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
                      <tr>
                        <th className="text-left p-3">Poll</th>
                        <th className="text-left p-3 hidden md:table-cell">Window</th>
                        <th className="text-right p-3">Votes</th>
                        <th className="text-right p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {polls.map((p) => (
                        <tr key={p.id} className="border-t border-line bg-surface/50">
                          <td className="p-3">
                            <div className="font-medium">{p.title}</div>
                            <Badge tone={p.status === 'active' ? 'green' : p.status === 'upcoming' ? 'yellow' : 'default'} className="mt-1">
                              {p.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs text-muted hidden md:table-cell">
                            {fmtDate(p.starts_at)} → {p.ends_at ? fmtDate(p.ends_at) : '∞'}
                          </td>
                          <td className="p-3 text-right font-mono">{p.total_votes}</td>
                          <td className="p-3">
                            <div className="flex justify-end gap-1 flex-wrap">
                              <button
                                className="btn-ghost !py-1 !px-2.5 text-xs"
                                onClick={() => {
                                  setEditing(p);
                                  setEditorOpen(true);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn-ghost !py-1 !px-2.5 text-xs"
                                disabled={busyId === `p${p.id}`}
                                onClick={() => act(`p${p.id}`, async () => { await api('/api/polls', { method: 'PUT', body: { id: p.id, is_closed: !p.is_closed } }); await fetchPolls(); })}
                              >
                                {p.is_closed ? 'Reopen' : 'Close'}
                              </button>
                              <button
                                className="btn-ghost !py-1 !px-2.5 text-xs hover:!text-dnd"
                                disabled={busyId === `p${p.id}`}
                                onClick={() => {
                                  if (!confirm(`Delete "${p.title}"?`)) return;
                                  act(`p${p.id}`, async () => { await api('/api/polls', { method: 'DELETE', body: { id: p.id } }); await fetchPolls(); });
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <PollEditor open={editorOpen} onClose={() => setEditorOpen(false)} poll={editing} onSaved={() => { fetchPolls(); load(); }} />
            </div>
          )}

          {tab === 'comments' && (
            <div className="space-y-3">
              {data.comments.length === 0 ? (
                <EmptyState title="No comments yet" />
              ) : (
                data.comments.map((c) => (
                  <div key={c.id} className={`flex gap-3 rounded-xl border border-line bg-surface/60 p-4 ${c.is_hidden ? 'opacity-60' : ''}`}>
                    <Avatar src={c.profiles?.avatar_url} name={c.profiles?.display_name} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{c.profiles?.display_name}</span>
                        <span className="text-xs text-dim">{timeAgo(c.created_at)}</span>
                        {c.parent_id && <Badge>reply</Badge>}
                        {c.is_hidden && <Badge tone="red">hidden</Badge>}
                      </div>
                      <p className="text-sm text-muted break-words whitespace-pre-wrap">{c.body}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1 shrink-0">
                      <button className="icon-btn" title={c.is_hidden ? 'Unhide' : 'Hide'} disabled={busyId === `c${c.id}`} onClick={() => hideComment(c.id, !c.is_hidden)}>
                        {c.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button className="icon-btn hover:!text-dnd" title="Delete" disabled={busyId === `c${c.id}`} onClick={() => deleteComment(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'reports' && (
            <div>
              <div className="flex gap-2 mb-4">
                {(['open', 'all'] as const).map((f) => (
                  <button key={f} onClick={() => setReportFilter(f)} className={`chip ${reportFilter === f ? 'chip-active' : ''}`}>
                    {f === 'open' ? `Open (${openReports})` : `All (${data.reports.length})`}
                  </button>
                ))}
              </div>
              {data.reports.filter((r) => reportFilter === 'all' || r.status === 'open').length === 0 ? (
                <EmptyState icon={<CheckCircle2 className="w-6 h-6" />} title="Nothing to review" text="No reported content right now. Nice." />
              ) : (
                <div className="space-y-3">
                  {data.reports
                    .filter((r) => reportFilter === 'all' || r.status === 'open')
                    .map((r) => (
                      <div key={r.id} className="rounded-xl border border-line bg-surface/60 p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted mb-2">
                          <Badge tone={r.status === 'open' ? 'red' : r.status === 'resolved' ? 'green' : 'default'}>{r.status}</Badge>
                          Reported by <b className="text-fg">{r.profiles?.display_name || 'unknown'}</b> · {timeAgo(r.created_at)}
                        </div>
                        <p className="text-sm">
                          <span className="text-idle font-semibold">Reason:</span> {r.reason}
                        </p>
                        {r.comments ? (
                          <div className="mt-3 rounded-lg bg-surface-2 border border-line p-3 text-sm">
                            <div className="text-xs text-dim mb-1">
                              {r.comments.profiles?.display_name} wrote {r.comments.is_hidden && '(hidden)'}:
                            </div>
                            <p className="whitespace-pre-wrap break-words">{r.comments.body}</p>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-dim">The comment has already been deleted.</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {r.comments && (
                            <>
                              <button className="btn-ghost !py-1.5 text-xs" disabled={!!busyId} onClick={() => act(`r${r.id}`, async () => { await api('/api/comments', { method: 'PUT', body: { id: r.comment_id, is_hidden: true } }); await api('/api/admin', { method: 'PUT', body: { action: 'resolve_report', id: r.id, status: 'resolved' } }); })}>
                                <EyeOff className="w-3.5 h-3.5" /> Hide & resolve
                              </button>
                              <button className="btn-ghost !py-1.5 text-xs hover:!text-dnd" disabled={!!busyId} onClick={() => deleteComment(r.comment_id)}>
                                <Trash2 className="w-3.5 h-3.5" /> Delete comment
                              </button>
                            </>
                          )}
                          {r.status === 'open' ? (
                            <>
                              <button className="btn-ghost !py-1.5 text-xs" disabled={!!busyId} onClick={() => resolve(r.id, 'resolved')}>
                                Mark resolved
                              </button>
                              <button className="btn-ghost !py-1.5 text-xs" disabled={!!busyId} onClick={() => resolve(r.id, 'dismissed')}>
                                Dismiss
                              </button>
                            </>
                          ) : (
                            <button className="btn-ghost !py-1.5 text-xs" disabled={!!busyId} onClick={() => resolve(r.id, 'open')}>
                              Reopen
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {tab === 'users' && (
            <div>
              <input className="input mb-4" placeholder="Search users…" value={userQ} onChange={(e) => setUserQ(e.target.value)} />
              <div className="space-y-2">
                {data.users
                  .filter((u) => !userQ || `${u.display_name} ${u.username} ${u.discord_username || ''}`.toLowerCase().includes(userQ.toLowerCase()))
                  .map((u) => (
                    <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface/60 p-3">
                      <Avatar src={u.avatar_url} name={u.display_name} size={38} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          {u.display_name}
                          {u.admin_role && <Badge tone="fuchsia">{u.admin_role}</Badge>}
                          {u.banned && <Badge tone="red">restricted</Badge>}
                          {u.show_in_directory && <Badge tone="blurple">listed</Badge>}
                        </div>
                        <div className="text-xs text-muted">
                          {u.discord_username ? `@${u.discord_username} (Discord)` : `@${u.username}`} · joined {fmtDate(u.created_at, false)}
                        </div>
                      </div>
                      {u.id !== data.me && (
                        <div className="flex gap-1">
                          <button className="btn-ghost !py-1.5 text-xs" disabled={busyId === `u${u.id}`} onClick={() => act(`u${u.id}`, () => api('/api/admin', { method: 'PUT', body: { action: 'set_admin', user_id: u.id, admin: !u.admin_role } }))}>
                            {u.admin_role ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />} {u.admin_role ? 'Revoke admin' : 'Make admin'}
                          </button>
                          <button className="btn-ghost !py-1.5 text-xs hover:!text-dnd" disabled={busyId === `u${u.id}`} onClick={() => act(`u${u.id}`, () => api('/api/admin', { method: 'PUT', body: { action: 'ban', user_id: u.id, banned: !u.banned } }))}>
                            <UserX className="w-3.5 h-3.5" /> {u.banned ? 'Unrestrict' : 'Restrict'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {tab === 'directory' && (
            <div className="max-w-2xl rounded-2xl border border-line bg-surface/60 divide-y divide-line">
              {(
                [
                  ['directory_enabled', 'Discord member directory', 'Show members fetched by the bot / widget on the Members page.'],
                  ['show_roles', 'Show server roles', 'Display role names and colors next to members.'],
                  ['show_voice', 'Show voice channel per member', 'Reveal which voice channel each member is in.'],
                  ['show_bots', 'Include bots', 'List bot accounts in the directory.'],
                  ['show_website_profiles', 'Website community profiles', 'Show users who opted in to the website directory.'],
                  ['comments_enabled', 'Allow new comments', 'Turn off to freeze the comment section (admins can still post).'],
                ] as const
              ).map(([k, label, desc]) => (
                <div key={k} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-sm text-muted">{desc}</div>
                  </div>
                  <Toggle
                    checked={data.settings[k]}
                    disabled={busyId === 'settings'}
                    onChange={(v) => act('settings', () => api('/api/admin', { method: 'PUT', body: { action: 'settings', values: { [k]: v } } }))}
                  />
                </div>
              ))}
              <p className="p-4 text-xs text-dim">
                <Heart className="w-3 h-3 inline" /> Directory changes can take up to ~15 seconds to appear due to caching.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, CircleDot, Globe, Headphones, Search, Users, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDiscord } from '../lib/useDiscord';
import type { MembersResponse, Overview } from '../lib/types';
import { fmtDate, fmtNum } from '../lib/format';
import { Avatar, ConfigNotice, EmptyState, ErrorState, LoadingBlock, PageHeader, Badge } from '../components/ui';
import StatCard from '../components/StatCard';
import { DiscordLogo, sourceLabel } from '../components/discord';
import { useAuth } from '../contexts/AuthContext';

const STATUS = ['all', 'online', 'idle', 'dnd', 'offline'] as const;

export default function Members() {
  const { data, loading, error, refresh } = useDiscord<MembersResponse>('members', 30000);
  const { data: ov } = useDiscord<Overview>('overview', 60000);
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<'discord' | 'website'>('discord');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<(typeof STATUS)[number]>('all');
  const [role, setRole] = useState('');
  const [inVoice, setInVoice] = useState(false);
  const [sort, setSort] = useState<'name' | 'joined' | 'role'>('role');

  const hasPresence = !!data?.members.some((m) => m.status);

  const list = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    const out = data.members.filter((m) => {
      if (s && !m.username.toLowerCase().includes(s) && !m.display_name.toLowerCase().includes(s)) return false;
      if (status !== 'all' && m.status !== status) return false;
      if (role && !m.roles.some((r) => r.id === role)) return false;
      if (inVoice && !m.voice_channel) return false;
      return true;
    });
    const rolePos = Object.fromEntries((data.roles || []).map((r, i) => [r.id, i]));
    out.sort((a, b) => {
      if (sort === 'joined') return (a.joined_at || '').localeCompare(b.joined_at || '');
      if (sort === 'role') {
        const ra = a.top_role ? rolePos[a.top_role.id] ?? 999 : 999;
        const rb = b.top_role ? rolePos[b.top_role.id] ?? 999 : 999;
        if (ra !== rb) return ra - rb;
      }
      return a.display_name.localeCompare(b.display_name);
    });
    return out;
  }, [data, q, status, role, inVoice, sort]);

  const web = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.website_profiles || []).filter((p) => !s || p.display_name.toLowerCase().includes(s) || (p.discord_username || p.username).toLowerCase().includes(s));
  }, [data, q]);

  const onlineListed = data?.members.filter((m) => m.status && m.status !== 'offline').length || 0;
  const voiceListed = data?.members.filter((m) => m.voice_channel).length || 0;

  return (
    <div>
      <PageHeader eyebrow="Members" title="Member directory" subtitle="Only information Discord makes available to our authorized bot, or that members chose to publish, is shown here." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatCard icon={Users} label="Total members" value={fmtNum(data?.total ?? ov?.member_count)} hint="From Discord" />
        <StatCard icon={CircleDot} label="Online" value={<span className="text-online">{fmtNum(data?.online ?? ov?.online_count)}</span>} accent="green" hint="From Discord" />
        <StatCard icon={Headphones} label="In voice" value={data && data.source !== 'none' ? fmtNum(voiceListed) : '—'} accent="cyan" hint="Members listed in a voice channel" />
        <StatCard icon={Globe} label="Website profiles" value={fmtNum(data?.website_profiles.length ?? null)} accent="fuchsia" hint="Opted in to the directory" />
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-5">
        <div className="flex rounded-xl border border-line bg-surface p-1 shrink-0">
          <button onClick={() => setTab('discord')} className={`px-4 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${tab === 'discord' ? 'bg-blurple text-white' : 'text-muted hover:text-fg'}`}>
            <DiscordLogo className="w-4 h-4" /> Discord members
          </button>
          <button onClick={() => setTab('website')} className={`px-4 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${tab === 'website' ? 'bg-blurple text-white' : 'text-muted hover:text-fg'}`}>
            <Globe className="w-4 h-4" /> Website community
          </button>
        </div>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
          <input className="input !pl-10" placeholder="Search by username or display name…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {loading && !data ? (
        <LoadingBlock label="Loading members…" rows={5} />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : !data ? null : tab === 'website' ? (
        <div>
          {user && profile && !profile.show_in_directory && (
            <div className="mb-4 text-sm text-muted rounded-xl border border-line bg-surface/60 p-4">
              You&apos;re not listed. <Link to="/account" className="text-blurple-2">Opt in from your account settings</Link> to appear in the website community directory.
            </div>
          )}
          {web.length === 0 ? (
            <EmptyState title="No published profiles yet" text="Website members can opt in to appear here from their account settings." icon={<Globe className="w-6 h-6" />} />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {web.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface/70 p-4">
                  <Avatar src={p.avatar_url} name={p.display_name} size={44} />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.display_name}</div>
                    <div className="text-xs text-muted truncate inline-flex items-center gap-1">
                      {p.discord_username ? (
                        <>
                          <DiscordLogo className="w-3 h-3 text-blurple-2" />@{p.discord_username}
                        </>
                      ) : (
                        `@${p.username}`
                      )}
                    </div>
                    <div className="text-[11px] text-dim">Joined site {fmtDate(p.created_at, false)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : data.disabled ? (
        <EmptyState title="The Discord member directory is turned off" text="Administrators have disabled the Discord member directory. Website profiles are still available in the other tab." />
      ) : data.source === 'none' ? (
        <ConfigNotice title="Member directory requires the community bot">
          Discord only lists server members to authorized bots with the <b>Server Members Intent</b> enabled. The server widget can also list currently-online members.
          {data.error && <span className="block mt-2 text-dnd">Discord said: {data.error}</span>}
        </ConfigNotice>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {hasPresence &&
              STATUS.map((s) => (
                <button key={s} onClick={() => setStatus(s)} className={`chip ${status === s ? 'chip-active' : ''}`}>
                  {s !== 'all' && <span className={`w-2 h-2 rounded-full ${s === 'online' ? 'bg-online' : s === 'idle' ? 'bg-idle' : s === 'dnd' ? 'bg-dnd' : 'bg-offline'}`} />}
                  {s === 'dnd' ? 'Do not disturb' : s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            {data.roles.length > 0 && (
              <select className="input !w-auto !py-1.5 text-sm" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
                <option value="">All roles</option>
                {data.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
            <button onClick={() => setInVoice((v) => !v)} className={`chip ${inVoice ? 'chip-active' : ''}`}>
              <Volume2 className="w-3.5 h-3.5" /> In voice
            </button>
            <select className="input !w-auto !py-1.5 text-sm ml-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
              <option value="role">Sort: role</option>
              <option value="name">Sort: name</option>
              <option value="joined">Sort: join date</option>
            </select>
          </div>
          <p className="text-xs text-dim mb-4">
            Showing {list.length} of {data.members.length} listed · Source: {sourceLabel[data.source]}
            {data.presence_source === 'none' && ' · Online status requires the live sync bot'}
            {hasPresence && ` · ${onlineListed} online`}
          </p>
          {list.length === 0 ? (
            <EmptyState title="No members match these filters" />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {list.slice(0, 300).map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 20) * 0.02 }}
                  className="rounded-xl border border-line bg-surface/70 p-4 hover:border-blurple/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={m.avatar_url} name={m.display_name} size={46} status={m.status} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate flex items-center gap-1.5" style={{ color: m.top_role?.color || undefined }}>
                        {m.display_name}
                        {m.bot && (
                          <Badge tone="blurple">
                            <Bot className="w-3 h-3" /> Bot
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted truncate">@{m.username}</div>
                    </div>
                  </div>
                  {(m.top_role || m.voice_channel || m.activity) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.roles.slice(0, 3).map((r) => (
                        <span key={r.id} className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-surface-2 border border-line">
                          <span className="w-2 h-2 rounded-full" style={{ background: r.color || '#80848e' }} />
                          {r.name}
                        </span>
                      ))}
                      {m.roles.length > 3 && <span className="text-[11px] text-dim px-1">+{m.roles.length - 3}</span>}
                      {m.voice_channel && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-online/10 text-online border border-online/30">
                          <Volume2 className="w-3 h-3" /> {m.voice_channel}
                        </span>
                      )}
                      {m.activity && <span className="text-[11px] px-2 py-0.5 rounded-full bg-fuchsia/10 text-fuchsia border border-fuchsia/30">Playing {m.activity}</span>}
                    </div>
                  )}
                  {m.joined_at && <div className="mt-2 text-[11px] text-dim">Joined {fmtDate(m.joined_at, false)}</div>}
                </motion.div>
              ))}
            </div>
          )}
          {list.length > 300 && <p className="text-xs text-dim mt-4">Showing first 300 results — refine your search to see more.</p>}
        </>
      )}
    </div>
  );
}

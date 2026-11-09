import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Lock, RefreshCw, Search, Users } from 'lucide-react';
import { useDiscord } from '../lib/useDiscord';
import type { ChannelsResponse, VoiceResponse } from '../lib/types';
import { ConfigNotice, EmptyState, ErrorState, LoadingBlock, PageHeader, Badge, Avatar, LiveIndicator } from '../components/ui';
import { ChannelIcon, sourceLabel } from '../components/discord';

const VOICE_KINDS = ['voice', 'stage'];

export default function Channels() {
  const { data, loading, error, refresh, refreshing } = useDiscord<ChannelsResponse>('channels', 60000);
  const { data: voice } = useDiscord<VoiceResponse>('voice', 15000);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | 'text' | 'voice'>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const voiceBy = useMemo(() => Object.fromEntries((voice?.channels || []).map((c) => [c.id, c])), [voice]);

  const groups = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    return data.groups
      .map((g) => ({
        ...g,
        channels: g.channels.filter((c) => {
          const isVoice = VOICE_KINDS.includes(c.kind);
          if (kind === 'text' && isVoice) return false;
          if (kind === 'voice' && !isVoice) return false;
          return !s || c.name.toLowerCase().includes(s) || (c.topic || '').toLowerCase().includes(s) || (g.name || '').toLowerCase().includes(s);
        }),
      }))
      .filter((g) => g.channels.length);
  }, [data, q, kind]);

  const all = data?.groups.flatMap((g) => g.channels) || [];
  const textCount = all.filter((c) => !VOICE_KINDS.includes(c.kind)).length;
  const voiceCount = all.length - textCount;

  return (
    <div>
      <PageHeader
        eyebrow="Channels"
        title="Explore the server"
        subtitle="Every public text and voice channel, organized by category exactly as on Discord."
        actions={
          <button onClick={refresh} className="btn-ghost">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      {loading && !data ? (
        <LoadingBlock label="Loading channels…" rows={5} />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : data && data.source === 'none' ? (
        <ConfigNotice title="Channel list requires the community bot">
          Discord only exposes a server&apos;s channel list to an authorized bot. Add the bot to the server with the <b>View Channels</b> permission and set <code>DISCORD_BOT_TOKEN</code>.
          {data.error && <span className="block mt-2 text-dnd">Discord said: {data.error}</span>}
        </ConfigNotice>
      ) : data ? (
        <>
          {data.source === 'widget' && (
            <div className="mb-6">
              <ConfigNotice title="Partial channel data">The server widget only lists public voice channels. Connect the bot to see text channels, categories and descriptions.</ConfigNotice>
            </div>
          )}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
              <input className="input !pl-10" placeholder="Search channels, topics, categories…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex rounded-xl border border-line bg-surface p-1">
              {(
                [
                  ['all', `All (${all.length})`],
                  ['text', `Text (${textCount})`],
                  ['voice', `Voice (${voiceCount})`],
                ] as const
              ).map(([k, l]) => (
                <button key={k} onClick={() => setKind(k)} className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${kind === k ? 'bg-blurple text-white' : 'text-muted hover:text-fg'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted mb-4">
            <span>Source: {sourceLabel[data.source]}</span>
            {data.hidden_private > 0 && (
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3 h-3" /> {data.hidden_private} private channels hidden
              </span>
            )}
            {voice?.available && <LiveIndicator live label="Voice occupancy live" />}
          </div>
          {groups.length === 0 ? (
            <EmptyState title="No channels match" text="Try a different search or filter." />
          ) : (
            <div className="space-y-5">
              {groups.map((g, gi) => {
                const isCollapsed = collapsed[g.id];
                return (
                  <motion.section key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.04 }}>
                    {g.name && (
                      <button onClick={() => setCollapsed({ ...collapsed, [g.id]: !isCollapsed })} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-muted hover:text-fg mb-2">
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} /> {g.name}
                        <span className="text-dim font-mono normal-case tracking-normal">· {g.channels.length}</span>
                      </button>
                    )}
                    {!isCollapsed && (
                      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {g.channels.map((c) => {
                          const isVoice = VOICE_KINDS.includes(c.kind);
                          const v = voiceBy[c.id];
                          const n = v?.members.length || 0;
                          return (
                            <div key={c.id} className={`rounded-xl border p-4 bg-surface/70 hover:bg-surface-2/80 transition ${n ? 'border-online/30' : 'border-line'}`}>
                              <div className="flex items-center gap-2.5">
                                <span className={`w-8 h-8 rounded-lg grid place-items-center ${isVoice ? (n ? 'bg-online/15 text-online' : 'bg-fuchsia/10 text-fuchsia') : 'bg-blurple/10 text-blurple-2'}`}>
                                  <ChannelIcon kind={c.kind} />
                                </span>
                                <span className="font-medium truncate flex-1">{c.name}</span>
                                {c.nsfw && <Badge tone="red">NSFW</Badge>}
                                {isVoice && voice?.available && (
                                  <span className={`inline-flex items-center gap-1 text-xs font-mono ${n ? 'text-online' : 'text-dim'}`}>
                                    <Users className="w-3.5 h-3.5" />
                                    {n}
                                    {c.user_limit ? `/${c.user_limit}` : ''}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 text-xs text-dim flex items-center gap-2">
                                <span className="capitalize">{c.kind}</span>
                                {g.name && <span>· {g.name}</span>}
                                {c.rate_limit > 0 && <span>· slowmode {c.rate_limit}s</span>}
                              </div>
                              {c.topic && <p className="mt-2 text-sm text-muted line-clamp-3">{c.topic}</p>}
                              {isVoice && n > 0 && (
                                <div className="mt-3 flex -space-x-2">
                                  {v.members.slice(0, 8).map((m) => (
                                    <div key={m.id} title={m.display_name} className="ring-2 ring-surface rounded-full">
                                      <Avatar src={m.avatar_url} name={m.display_name} size={26} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.section>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

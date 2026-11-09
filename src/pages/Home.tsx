import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, CircleDot, CircleOff, Hash, Headphones, Users, Volume2, Vote, MessagesSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDiscord } from '../lib/useDiscord';
import type { CommentT, Overview, Poll, VoiceResponse } from '../lib/types';
import { fmtNum, timeAgo } from '../lib/format';
import { DiscordText } from '../lib/discordText';
import { api } from '../lib/api';
import StatCard from '../components/StatCard';
import VoiceCard from '../components/VoiceCard';
import { Avatar, ConfigNotice, ErrorState, LiveIndicator, LoadingBlock } from '../components/ui';
import { JoinButton, sourceLabel } from '../components/discord';

export function ServerHero({ ov }: { ov: Overview }) {
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="relative h-44 sm:h-60 overflow-hidden">
        <img src={ov.banner_url || ov.splash_url || '/banner-fallback.jpg'} alt="" className="absolute inset-0 w-full h-full object-cover scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
        <div className="absolute inset-0 grid-overlay opacity-40" />
      </div>
      <div className="relative px-5 sm:px-8 pb-7 -mt-16 sm:-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end gap-5">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="relative shrink-0">
            {ov.icon_url ? (
              <img src={ov.icon_url} alt={`${ov.name} logo`} className="w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] object-cover border-[6px] border-surface shadow-2xl" />
            ) : (
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] bg-gradient-to-br from-blurple to-fuchsia border-[6px] border-surface" />
            )}
            <span className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-online border-4 border-surface" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <LiveIndicator live={ov.status === 'online'} label={ov.status === 'online' ? 'Server online · invite active' : 'Server unreachable'} />
              {ov.premium_tier > 0 && <span className="text-xs text-fuchsia font-semibold">Boost level {ov.premium_tier}</span>}
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-gradient break-words">{ov.name}</h1>
          </div>
          <div className="flex gap-2">
            <JoinButton size="lg" />
          </div>
        </div>
        {ov.description && <DiscordText text={ov.description} className="mt-5 text-muted max-w-3xl text-[15px] leading-relaxed" />}
      </div>
    </motion.section>
  );
}

export function StatsGrid({ ov }: { ov: Overview }) {
  const needsBot = <Link to="/setup" className="text-idle hover:underline">Requires bot →</Link>;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard icon={Users} label="Total members" value={fmtNum(ov.member_count)} hint={`Source: ${sourceLabel[ov.counts_source]}`} delay={0.05} />
      <StatCard icon={CircleDot} label="Online now" value={<span className="text-online">{fmtNum(ov.online_count)}</span>} accent="green" hint={`Source: ${sourceLabel[ov.counts_source]}`} delay={0.1} />
      <StatCard
        icon={CircleOff}
        label="Offline"
        value={fmtNum(ov.offline_count)}
        accent="gray"
        hint={ov.offline_count != null ? 'Derived from Discord approximate counts' : 'Unavailable from current data source'}
        delay={0.15}
      />
      <StatCard icon={Activity} label="Server status" value={<span className={ov.status === 'online' ? 'text-online' : 'text-dnd'}>{ov.status === 'online' ? 'Online' : 'Offline'}</span>} accent="green" hint={ov.status_detail || 'Invite resolves via Discord API'} delay={0.2} />
      <StatCard icon={Hash} label="Text channels" value={fmtNum(ov.text_channels)} accent="blurple" hint={ov.text_channels == null ? needsBot : `${ov.categories ?? 0} categories · public only`} delay={0.25} />
      <StatCard icon={Volume2} label="Voice channels" value={fmtNum(ov.voice_channels)} accent="fuchsia" hint={ov.voice_channels == null ? needsBot : `Source: ${sourceLabel[ov.channels_source]}`} delay={0.3} />
      <StatCard icon={Headphones} label="In voice now" value={fmtNum(ov.voice_connected)} accent="cyan" hint={ov.voice_connected == null ? needsBot : `Source: ${sourceLabel[ov.voice_source]}`} delay={0.35} />
      <StatCard icon={Activity} label="Boosts" value={fmtNum(ov.boosts)} accent="yellow" hint={`Tier ${ov.premium_tier}`} delay={0.4} />
    </div>
  );
}

export default function Home() {
  const { data: ov, loading, error, refresh } = useDiscord<Overview>('overview', 60000);
  const { data: voice } = useDiscord<VoiceResponse>('voice', 20000);
  const [polls, setPolls] = useState<Poll[] | null>(null);
  const [comments, setComments] = useState<CommentT[] | null>(null);

  useEffect(() => {
    api<Poll[]>('/api/polls').then(setPolls).catch(() => setPolls([]));
    api<CommentT[]>('/api/comments').then(setComments).catch(() => setComments([]));
  }, []);

  if (loading && !ov) return <LoadingBlock label="Connecting to Discord…" rows={4} />;
  if (error && !ov) return <ErrorState message={`Could not load Discord server data: ${error}`} onRetry={refresh} />;
  if (!ov) return null;

  const activeVoice = (voice?.channels || []).filter((c) => c.members.length > 0);
  const activePolls = (polls || []).filter((p) => p.status === 'active').slice(0, 3);
  const recent = (comments || []).filter((c) => !c.parent_id).slice(-4).reverse();

  return (
    <div className="space-y-8">
      <ServerHero ov={ov} />
      <StatsGrid ov={ov} />

      {!ov.bot_connected && !ov.widget_enabled && (
        <ConfigNotice title="Showing public invite data only">
          Member and online counts come live from Discord&apos;s invite API. To unlock channel lists, voice activity and the member directory, enable the server widget or connect
          the community bot.
        </ConfigNotice>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-2xl border border-line bg-surface/60 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-semibold">Live voice activity</h2>
              <LiveIndicator live={!!voice?.available} label={voice?.available ? `${voice.total_connected} connected · ${sourceLabel[voice.source]}` : 'Voice data not configured'} />
            </div>
            <Link to="/voice" className="text-sm text-blurple-2 hover:text-fg inline-flex items-center gap-1">
              All voice <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {!voice ? (
            <LoadingBlock rows={2} label="Checking voice channels…" />
          ) : !voice.available ? (
            <p className="text-sm text-muted">
              Voice occupancy needs the server widget or the community bot. <Link to="/setup" className="text-blurple-2">See setup</Link>.
            </p>
          ) : activeVoice.length === 0 ? (
            <p className="text-sm text-muted py-6 text-center">All voice channels are quiet right now. Hop in and start the party!</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {activeVoice.slice(0, 4).map((c) => (
                <VoiceCard key={c.id} channel={c} compact />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface/60 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Active polls</h2>
            <Link to="/polls" className="text-sm text-blurple-2 hover:text-fg inline-flex items-center gap-1">
              Vote <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {!polls ? (
            <LoadingBlock rows={2} />
          ) : activePolls.length === 0 ? (
            <p className="text-sm text-muted">No active polls right now.</p>
          ) : (
            <ul className="space-y-3">
              {activePolls.map((p) => (
                <li key={p.id}>
                  <Link to="/polls" className="block rounded-xl border border-line bg-surface-2/60 p-3 hover:border-blurple/50 transition">
                    <div className="flex items-center gap-2 text-xs text-muted mb-1">
                      <Vote className="w-3.5 h-3.5 text-blurple-2" /> {p.total_votes} votes
                    </div>
                    <div className="font-medium leading-snug">{p.title}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-surface/60 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Latest from the community</h2>
          <Link to="/comments" className="text-sm text-blurple-2 hover:text-fg inline-flex items-center gap-1">
            Join the conversation <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {!comments ? (
          <LoadingBlock rows={2} />
        ) : recent.length === 0 ? (
          <div className="text-sm text-muted flex items-center gap-2">
            <MessagesSquare className="w-4 h-4" /> No comments yet — be the first.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {recent.map((c) => (
              <Link to="/comments" key={c.id} className="flex gap-3 rounded-xl border border-line bg-surface-2/50 p-4 hover:border-blurple/40 transition">
                <Avatar src={c.author?.avatar_url} name={c.author?.display_name} size={36} />
                <div className="min-w-0">
                  <div className="text-sm">
                    <span className="font-semibold">{c.author?.display_name}</span> <span className="text-dim text-xs">· {timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted line-clamp-2">{c.body}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

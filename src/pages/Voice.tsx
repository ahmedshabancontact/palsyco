import { useMemo } from 'react';
import { Headphones, RefreshCw, Volume2, Mic } from 'lucide-react';
import { useDiscord } from '../lib/useDiscord';
import type { VoiceResponse } from '../lib/types';
import { ConfigNotice, EmptyState, ErrorState, LiveIndicator, LoadingBlock, PageHeader } from '../components/ui';
import VoiceCard from '../components/VoiceCard';
import StatCard from '../components/StatCard';
import { sourceLabel } from '../components/discord';
import { timeAgo } from '../lib/format';

export default function Voice() {
  const { data, loading, error, refresh, refreshing, updatedAt } = useDiscord<VoiceResponse>('voice', 10000);

  const grouped = useMemo(() => {
    const out: { name: string; channels: VoiceResponse['channels'] }[] = [];
    for (const c of data?.channels || []) {
      const name = c.category || 'Voice channels';
      let g = out.find((x) => x.name === name);
      if (!g) out.push((g = { name, channels: [] }));
      g.channels.push(c);
    }
    return out;
  }, [data]);

  const active = (data?.channels || []).filter((c) => c.members.length).length;

  return (
    <div>
      <PageHeader
        eyebrow="Voice"
        title="Who's hanging out"
        subtitle="Live occupancy for every public voice channel. Updates automatically every few seconds as members join and leave."
        actions={
          <button onClick={refresh} className="btn-ghost">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />
      {loading && !data ? (
        <LoadingBlock label="Checking voice channels…" rows={4} />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : data ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={Headphones} label="Members in voice" value={data.available ? data.total_connected : '—'} accent="green" hint={<LiveIndicator live={data.available} label={sourceLabel[data.source]} />} />
            <StatCard icon={Mic} label="Active channels" value={data.available ? active : '—'} accent="fuchsia" hint={updatedAt ? `Checked ${timeAgo(new Date(updatedAt).toISOString())}` : undefined} />
            <StatCard icon={Volume2} label="Voice channels" value={data.channels.length || '—'} accent="blurple" hint={`Channel list: ${sourceLabel[data.channels_source]}`} />
          </div>

          {!data.available && (
            <ConfigNotice title="Voice activity isn't connected yet">
              Discord shares voice occupancy through the <b>server widget</b> (Server Settings → Widget → Enable) or through an authorized <b>bot</b>. For instant join/leave updates and
              mute/deafen states, run the live sync bot.
            </ConfigNotice>
          )}
          {data.partial && <p className="text-xs text-idle">Discord rate-limited some lookups — results may be partial. The live sync bot avoids this.</p>}

          {data.channels.length === 0 ? (
            data.available ? <EmptyState title="No public voice channels found" icon={<Volume2 className="w-6 h-6" />} /> : null
          ) : (
            grouped.map((g) => (
              <section key={g.name}>
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted mb-3">{g.name}</h2>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {g.channels.map((c) => (
                    <VoiceCard key={c.id} channel={c} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

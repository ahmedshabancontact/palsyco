import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Copy, ExternalLink, Fingerprint, Link2, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useDiscord } from '../lib/useDiscord';
import type { Overview, StatusResponse } from '../lib/types';
import { fmtDate, timeAgo } from '../lib/format';
import { ErrorState, LoadingBlock, PageHeader, Badge } from '../components/ui';
import { ServerHero, StatsGrid } from './Home';
import { JoinButton } from '../components/discord';

const verification = ['None', 'Low — verified email', 'Medium — registered 5+ min', 'High — member 10+ min', 'Highest — verified phone'];

function Check({ ok, label, detail }: { ok: boolean; label: string; detail?: string | null }) {
  return (
    <li className="flex items-start gap-3 py-3 border-b border-line last:border-0">
      {ok ? <CheckCircle2 className="w-5 h-5 text-online shrink-0" /> : <XCircle className="w-5 h-5 text-dim shrink-0" />}
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {detail && <div className="text-xs text-dim break-words">{detail}</div>}
      </div>
    </li>
  );
}

export default function OverviewPage() {
  const { data: ov, loading, error, refresh, updatedAt } = useDiscord<Overview>('overview', 60000);
  const { data: st } = useDiscord<StatusResponse>('status', 120000);
  const [copied, setCopied] = useState(false);

  if (loading && !ov) return <LoadingBlock label="Loading server overview…" rows={4} />;
  if (error && !ov) return <ErrorState message={error} onRetry={refresh} />;
  if (!ov) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(ov.invite.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Server overview" title="Everything about the server" subtitle={`Live data pulled from the official Discord API${updatedAt ? ` · updated ${timeAgo(new Date(updatedAt).toISOString())}` : ''}.`} />
      <ServerHero ov={ov} />
      <StatsGrid ov={ov} />

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="rounded-2xl border border-line bg-surface/60 p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Server details</h2>
          <dl className="space-y-4 text-sm">
            <div className="flex gap-3">
              <Fingerprint className="w-4 h-4 text-muted mt-0.5" />
              <div>
                <dt className="text-dim text-xs uppercase tracking-wider">Server ID</dt>
                <dd className="font-mono">{ov.id}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <CalendarDays className="w-4 h-4 text-muted mt-0.5" />
              <div>
                <dt className="text-dim text-xs uppercase tracking-wider">Created</dt>
                <dd>{fmtDate(ov.created_at, false)}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <ShieldCheck className="w-4 h-4 text-muted mt-0.5" />
              <div>
                <dt className="text-dim text-xs uppercase tracking-wider">Verification level</dt>
                <dd>{ov.verification_level != null ? verification[ov.verification_level] : '—'}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Sparkles className="w-4 h-4 text-muted mt-0.5" />
              <div>
                <dt className="text-dim text-xs uppercase tracking-wider">Nitro boosts</dt>
                <dd>
                  {ov.boosts} boosts · Level {ov.premium_tier}
                </dd>
              </div>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-line bg-surface/60 p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Invitation</h2>
          <div className="rounded-xl bg-surface-2 border border-line p-3 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blurple-2" />
            <span className="font-mono text-sm truncate flex-1">{ov.invite.url}</span>
            <button onClick={copy} className="icon-btn" aria-label="Copy invite">
              {copied ? <CheckCircle2 className="w-4 h-4 text-online" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {ov.invite.channel && (
              <li>
                Lands in <span className="text-fg">#{ov.invite.channel}</span>
              </li>
            )}
            {ov.invite.inviter && (
              <li>
                Created by <span className="text-fg">{ov.invite.inviter}</span>
              </li>
            )}
            <li>{ov.invite.expires_at ? `Expires ${fmtDate(ov.invite.expires_at)}` : 'Permanent invite — never expires'}</li>
          </ul>
          <div className="mt-5 flex gap-2">
            <JoinButton className="flex-1" />
            <a href={ov.invite.url} target="_blank" rel="noreferrer" className="btn-ghost" aria-label="Open invite">
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface/60 p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-lg font-semibold">Data connections</h2>
            <Link to="/setup" className="text-xs text-blurple-2">
              Configure
            </Link>
          </div>
          {!st ? (
            <LoadingBlock rows={2} />
          ) : (
            <ul>
              <Check ok={st.invite.ok} label="Discord invite API" detail={st.invite.ok ? 'Name, icon, member & online counts' : st.invite.error} />
              <Check ok={st.widget.enabled} label="Server widget" detail={st.widget.enabled ? 'Online members & voice occupancy' : 'Disabled in Server Settings → Widget'} />
              <Check ok={st.bot.ok} label="Community bot" detail={st.bot.ok ? 'Channels, roles & members' : st.bot.configured ? st.bot.error : 'DISCORD_BOT_TOKEN not set'} />
              <Check ok={st.sync.live} label="Live gateway sync" detail={st.sync.live ? `Last update ${timeAgo(st.sync.last_update)}` : 'Real-time voice & presence (optional)'} />
              <Check ok={st.oauth.configured} label="Discord OAuth2 login" detail={st.oauth.configured ? 'Members can sign in with Discord' : 'Client ID / secret not set'} />
            </ul>
          )}
        </section>
      </div>

      {ov.features.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface/60 p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Server features</h2>
          <div className="flex flex-wrap gap-2">
            {ov.features.map((f) => (
              <Badge key={f} tone="blurple">
                {f.replace(/_/g, ' ').toLowerCase()}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

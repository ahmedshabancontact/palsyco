import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Copy, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { useDiscord } from '../lib/useDiscord';
import type { StatusResponse } from '../lib/types';
import { PageHeader, Badge } from '../components/ui';
import { timeAgo } from '../lib/format';

function CopyBox({ text }: { text: string }) {
  const [c, setC] = useState(false);
  return (
    <div className="relative group">
      <pre className="rounded-xl bg-bg border border-line p-4 pr-12 text-xs font-mono overflow-x-auto text-fg/90 whitespace-pre">{text}</pre>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setC(true);
          setTimeout(() => setC(false), 1200);
        }}
        className="absolute top-2 right-2 icon-btn bg-surface-2"
        aria-label="Copy"
      >
        {c ? <CheckCircle2 className="w-4 h-4 text-online" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

function Step({ n, title, done, optional, children }: { n: number; title: string; done?: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <section className="relative rounded-2xl border border-line bg-surface/70 p-6">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl grid place-items-center font-mono font-bold shrink-0 ${done ? 'bg-online/15 text-online' : 'bg-blurple/15 text-blurple-2'}`}>
          {done ? <CheckCircle2 className="w-5 h-5" /> : n}
        </div>
        <div className="flex-1 min-w-0 space-y-3 text-sm text-muted leading-relaxed">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-fg">{title}</h2>
            {done ? <Badge tone="green">Connected</Badge> : optional ? <Badge>Optional</Badge> : <Badge tone="yellow">Pending</Badge>}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

export default function Setup() {
  const { data: st, refresh, refreshing } = useDiscord<StatusResponse>('status');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const gid = st?.guild_id || 'YOUR_GUILD_ID';
  const [script, setScript] = useState('');
  useEffect(() => {
    fetch('/palsyco-sync-bot.mjs')
      .then((r) => r.text())
      .then(setScript)
      .catch(() => setScript(''));
  }, []);

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Setup & integration"
        title="Connect your Discord server"
        subtitle="The site already reads live public data through the invite link. Follow these steps to unlock channels, voice activity, the member directory and Discord login. Secrets are only ever stored as server-side environment variables."
        actions={
          <button onClick={refresh} className="btn-ghost">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Re-check
          </button>
        }
      />

      <div className="rounded-2xl border border-line bg-surface/60 p-5 mb-6 grid sm:grid-cols-5 gap-3 text-sm">
        {[
          ['Invite API', st?.invite.ok],
          ['Widget', st?.widget.enabled],
          ['Bot', st?.bot.ok],
          ['Live sync', st?.sync.live],
          ['OAuth2', st?.oauth.configured],
        ].map(([l, ok]) => (
          <div key={l as string} className="flex items-center gap-2">
            {ok ? <CheckCircle2 className="w-4 h-4 text-online" /> : <Circle className="w-4 h-4 text-dim" />}
            <span className={ok ? 'text-fg' : 'text-muted'}>{l}</span>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <Step n={1} title="Public invite data (automatic)" done={st?.invite.ok}>
          <p>
            Server name, icon, description, total members and online members are read from Discord&apos;s official invite endpoint for <code className="text-fg">discord.gg/{st?.invite.code || 'naHB2YVwKR'}</code>. Nothing to configure.
          </p>
          {st?.invite.error && <p className="text-dnd">Error: {st.invite.error}</p>}
        </Step>

        <Step n={2} title="Enable the server widget" done={st?.widget.enabled} optional>
          <p>
            In Discord: <b className="text-fg">Server Settings → Engagement / Widget → Enable Server Widget</b>. This exposes online members and voice-channel occupancy (public voice channels only)
            without a bot.
          </p>
        </Step>

        <Step n={3} title="Create the community bot" done={st?.bot.ok}>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>
              Open the{' '}
              <a className="text-blurple-2 inline-flex items-center gap-1" href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
                Discord Developer Portal <ExternalLink className="w-3 h-3" />
              </a>{' '}
              → <b className="text-fg">New Application</b>.
            </li>
            <li>
              <b className="text-fg">Bot</b> tab → <b className="text-fg">Reset Token</b> and copy it (keep it secret).
            </li>
            <li>
              Under <b className="text-fg">Privileged Gateway Intents</b> enable <b className="text-fg">Server Members Intent</b> (member directory) and <b className="text-fg">Presence Intent</b> (online status, used by the live sync bot).
            </li>
            <li>Invite the bot with the View Channels permission (read-only — it cannot post or moderate):</li>
          </ol>
          <CopyBox text={`https://discord.com/oauth2/authorize?client_id=YOUR_APPLICATION_ID&scope=bot&permissions=1024&guild_id=${gid}`} />
          {st?.bot.configured && !st.bot.ok && <p className="text-dnd">Bot error: {st.bot.error}</p>}
          {st?.bot.ok && !st.bot.members_ok && <p className="text-idle">Member list unavailable: {st.bot.members_error} — enable the Server Members Intent.</p>}
        </Step>

        <Step n={4} title="Add server environment variables" done={st?.bot.configured && st?.oauth.configured}>
          <p>
            In your Vercel project: <b className="text-fg">Settings → Environment Variables</b>, add the following, then redeploy. These are read only by serverless functions and never sent to the
            browser.
          </p>
          <CopyBox
            text={`DISCORD_BOT_TOKEN=your-bot-token
DISCORD_GUILD_ID=${gid}
DISCORD_CLIENT_ID=your-application-id
DISCORD_CLIENT_SECRET=your-oauth2-client-secret
DISCORD_SYNC_SECRET=any-long-random-string
# optional overrides
DISCORD_INVITE_CODE=naHB2YVwKR
DISCORD_REDIRECT_URI=${origin}/api/auth-discord`}
          />
        </Step>

        <Step n={5} title="Enable Discord OAuth2 login" done={st?.oauth.configured}>
          <p>
            Developer Portal → <b className="text-fg">OAuth2</b> → <b className="text-fg">Redirects</b> → add this exact URL. Copy the Client ID and Client Secret into the variables above.
          </p>
          <CopyBox text={`${origin}/api/auth-discord`} />
          <p>Login requests only the <code className="text-fg">identify</code> scope (username, display name, avatar). We never see your email or password.</p>
        </Step>

        <Step n={6} title="Run the live sync bot (real-time voice & presence)" done={st?.sync.live} optional>
          <p>
            Discord only streams voice joins/leaves and online status over its Gateway (a persistent connection), which serverless functions can&apos;t hold. Run this small script on any always-on
            host (VPS, Railway, Render, a Raspberry Pi…). It pushes a snapshot to this site on every change.
          </p>
          {st?.sync.last_update && <p className="text-online">Last update received {timeAgo(st.sync.last_update)}.</p>}
          <CopyBox
            text={`npm install discord.js
SITE_URL=${origin} DISCORD_BOT_TOKEN=... DISCORD_GUILD_ID=${gid} DISCORD_SYNC_SECRET=... node palsyco-sync-bot.mjs`}
          />
          <a href="/palsyco-sync-bot.mjs" download className="btn-ghost w-fit">
            <Download className="w-4 h-4" /> Download palsyco-sync-bot.mjs
          </a>
          {script && (
            <details className="rounded-xl border border-line">
              <summary className="cursor-pointer p-3 text-fg">View script source</summary>
              <div className="p-3 pt-0">
                <CopyBox text={script} />
              </div>
            </details>
          )}
        </Step>

        <Step n={7} title="Become the site administrator">
          <p>
            Sign in, then open the <b className="text-fg">Admin Dashboard</b>. If no administrator exists yet, you&apos;ll be offered a one-time <b className="text-fg">Claim owner role</b> button. After that,
            admins can promote others from <i>Users &amp; roles</i>.
          </p>
        </Step>
      </div>
    </div>
  );
}

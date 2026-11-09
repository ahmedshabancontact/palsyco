import { PageHeader } from '../components/ui';
import { INVITE_URL } from '../lib/config';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-xl font-semibold text-fg">{title}</h2>
      <div className="text-muted leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export function Privacy() {
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Legal" title="Privacy Policy" subtitle="Last updated November 9, 2026" />
      <div className="rounded-2xl border border-line bg-surface/60 p-6 sm:p-8 space-y-8">
        <Section title="What we collect">
          <p>
            <b className="text-fg">Account data:</b> when you register with email we store your email and a securely hashed password (handled by Supabase Auth). When you sign in with Discord we receive only
            your Discord user ID, username, display name and avatar via the <code>identify</code> scope. Google sign-in provides your name, email and avatar.
          </p>
          <p>
            <b className="text-fg">Community content:</b> comments, replies, likes, poll votes and reports you submit, linked to your account.
          </p>
        </Section>
        <Section title="Discord server data">
          <p>
            Server statistics, channels, voice occupancy and member information are fetched from the official Discord API using the public invite, the server widget (if enabled by the server owner) and an
            authorized bot. We only display information Discord makes available to these authorized integrations. We do not store Discord member lists in our database; live voice/presence snapshots are
            overwritten on every update.
          </p>
          <p>Your profile appears in the &ldquo;Website community&rdquo; directory only if you opt in, and you can opt out at any time from your account page.</p>
        </Section>
        <Section title="How we use it">
          <p>To operate the site: authenticate you, show your comments and votes, prevent duplicate votes, and let moderators handle reports. We do not sell data or run advertising trackers.</p>
        </Section>
        <Section title="Security">
          <p>
            Data is stored in Supabase (PostgreSQL) with Row Level Security. Discord bot tokens and OAuth secrets live only in server-side environment variables and are never exposed to the browser.
          </p>
        </Section>
        <Section title="Your rights">
          <p>You can edit your display name, change directory visibility and delete your own comments at any time. To delete your account entirely, contact a moderator in our Discord server.</p>
        </Section>
        <Section title="Contact">
          <p>
            Reach the moderation team in our Discord:{' '}
            <a href={INVITE_URL} className="text-blurple-2" target="_blank" rel="noreferrer">
              {INVITE_URL}
            </a>
          </p>
        </Section>
      </div>
    </div>
  );
}

export function Terms() {
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Legal" title="Terms of Service" subtitle="Last updated November 9, 2026" />
      <div className="rounded-2xl border border-line bg-surface/60 p-6 sm:p-8 space-y-8">
        <Section title="1. Acceptance">
          <p>By using this community website you agree to these terms, our Privacy Policy, and Discord&apos;s Terms of Service and Community Guidelines.</p>
        </Section>
        <Section title="2. Accounts">
          <p>You are responsible for activity on your account. One person, one account — creating multiple accounts to manipulate polls is prohibited and may result in removal.</p>
        </Section>
        <Section title="3. Community conduct">
          <p>No harassment, hate speech, spam, NSFW content, doxxing or illegal content. Be respectful to members of every language and background.</p>
        </Section>
        <Section title="4. Moderation">
          <p>Moderators may hide or delete content, close polls, and restrict accounts that violate these terms, with or without notice. Reports are reviewed privately.</p>
        </Section>
        <Section title="5. Your content">
          <p>You keep ownership of what you post, and grant us a license to display it on this site. You can delete your own comments at any time.</p>
        </Section>
        <Section title="6. Disclaimer">
          <p>This site is a fan-run community project and is not affiliated with or endorsed by Discord Inc. Server statistics are provided by Discord and may be approximate.</p>
        </Section>
        <Section title="7. Changes">
          <p>We may update these terms; continued use after changes means you accept them.</p>
        </Section>
      </div>
    </div>
  );
}

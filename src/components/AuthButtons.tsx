import { useState } from 'react';
import { signInWithGoogle } from '../lib/googleAuth';
import { signInWithDiscord } from '../lib/discordAuth';
import { useDiscord } from '../lib/useDiscord';
import type { StatusResponse } from '../lib/types';
import { DiscordLogo } from './discord';
import { Link } from 'react-router-dom';

export default function AuthButtons() {
  const { data: st, loading } = useDiscord<StatusResponse>('status');
  const [err, setErr] = useState<string | null>(null);
  const discordReady = !!st?.oauth.configured;
  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          setErr(null);
          if (!discordReady) {
            setErr('Discord login is not configured yet. The site owner must add the Discord OAuth2 client ID and secret.');
            return;
          }
          signInWithDiscord((e) => e && setErr(e));
        }}
        className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-blurple hover:bg-[#4752c4] text-white font-semibold py-3 transition disabled:opacity-60"
      >
        <DiscordLogo className="w-5 h-5" /> Continue with Discord
      </button>
      <button
        type="button"
        onClick={() => signInWithGoogle('Palsyco Community')}
        className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-surface-2 border border-line hover:border-muted/50 font-semibold py-3 transition"
      >
        <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continue with Google
      </button>
      {err && (
        <p className="text-xs text-idle bg-idle/10 border border-idle/30 rounded-lg p-3">
          {err}{' '}
          <Link to="/setup" className="underline">
            Setup guide
          </Link>
        </p>
      )}
    </div>
  );
}

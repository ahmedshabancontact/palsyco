import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import { ErrorState, Spinner } from '../components/ui';

export default function AuthCallback() {
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const frag = new URLSearchParams(window.location.hash.slice(1));
    const err = frag.get('error');
    const access_token = frag.get('access_token');
    const refresh_token = frag.get('refresh_token');
    history.replaceState(null, '', window.location.pathname);
    if (err) {
      if (window.opener) window.opener.postMessage({ type: 'discord-auth-error', error: err }, window.location.origin);
      setError(err);
      return;
    }
    if (!access_token || !refresh_token) {
      setError('No session was returned. Please try signing in again.');
      return;
    }
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'discord-auth-success', access_token, refresh_token }, window.location.origin);
      setTimeout(() => window.close(), 150);
    }
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error: e }) => {
      if (e) setError(e.message);
      else nav('/', { replace: true });
    });
  }, [nav]);

  return (
    <div className="min-h-[60vh] grid place-items-center">
      {error ? (
        <div className="max-w-md w-full space-y-4">
          <ErrorState message={`Discord sign-in failed: ${error}`} />
          <Link to="/login" className="btn-ghost">
            Back to login
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-muted">
          <Spinner /> Finishing Discord sign-in…
        </div>
      )}
    </div>
  );
}

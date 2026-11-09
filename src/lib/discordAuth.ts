import supabase from './supabase';

const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export function signInWithDiscord(onDone?: (err?: string) => void) {
  const url = '/api/auth-discord?action=start';
  const popup = window.open(url, 'discord-auth', isMobile() ? '' : 'width=520,height=780');
  if (!popup) {
    window.location.href = url;
    return;
  }
  const handler = async (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === 'discord-auth-error') {
      window.removeEventListener('message', handler);
      onDone?.(event.data.error);
      return;
    }
    if (event.data?.type !== 'discord-auth-success') return;
    window.removeEventListener('message', handler);
    const { error } = await supabase.auth.setSession({
      access_token: event.data.access_token,
      refresh_token: event.data.refresh_token,
    });
    onDone?.(error?.message);
  };
  window.addEventListener('message', handler);
}

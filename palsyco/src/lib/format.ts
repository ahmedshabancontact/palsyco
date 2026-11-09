export const fmtNum = (n: number | null | undefined) => (n == null ? '—' : new Intl.NumberFormat().format(n));

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function fmtDate(iso: string | null | undefined, withTime = true) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'long' });
}

export function timeLeft(iso: string | null | undefined) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const h = Math.floor(ms / 36e5);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 6e4))}m left`;
  if (h < 48) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

export const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};

export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

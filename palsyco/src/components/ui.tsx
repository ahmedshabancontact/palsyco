import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Inbox, Loader2, Settings2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Card({ children, className = '', glow = false }: { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <div
      className={`relative rounded-2xl border border-line bg-surface/80 backdrop-blur-sm ${glow ? 'card-glow' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return <Loader2 className={`animate-spin text-blurple-2 ${className}`} />;
}

export function LoadingBlock({ label = 'Loading…', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Spinner className="w-4 h-4" /> {label}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl skeleton" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-dnd/30 bg-dnd/10 p-5 flex flex-col sm:flex-row sm:items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-dnd shrink-0" />
      <p className="text-sm text-fg/90 flex-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost text-sm">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, icon, action }: { title: string; text?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line p-10 text-center flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-surface-2 grid place-items-center text-muted">{icon || <Inbox className="w-6 h-6" />}</div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {text && <p className="text-sm text-muted max-w-md">{text}</p>}
      {action}
    </div>
  );
}

export function ConfigNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-idle/30 bg-gradient-to-br from-idle/10 to-transparent p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-idle/15 grid place-items-center shrink-0">
          <Settings2 className="w-4.5 h-4.5 text-idle" />
        </div>
        <div className="text-sm">
          <h4 className="font-semibold text-fg mb-1">{title}</h4>
          <div className="text-muted leading-relaxed">{children}</div>
          <Link to="/setup" className="inline-flex mt-3 text-blurple-2 hover:text-fg font-medium">
            Open the setup guide →
          </Link>
        </div>
      </div>
    </div>
  );
}

const statusColor: Record<string, string> = {
  online: 'bg-online',
  idle: 'bg-idle',
  dnd: 'bg-dnd',
  offline: 'bg-offline',
};

export function StatusDot({ status, className = '' }: { status: string | null | undefined; className?: string }) {
  if (!status) return null;
  return <span className={`inline-block rounded-full ${statusColor[status] || 'bg-offline'} ${className}`} title={status} />;
}

export function Avatar({
  src,
  name,
  size = 40,
  status,
  ring = false,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  status?: string | null;
  ring?: boolean;
}) {
  const initials = (name || '?').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '?';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt={name || 'avatar'}
          loading="lazy"
          className={`w-full h-full rounded-full object-cover bg-surface-3 ${ring ? 'ring-2 ring-blurple/60' : ''}`}
        />
      ) : (
        <div
          className={`w-full h-full rounded-full grid place-items-center bg-gradient-to-br from-blurple to-fuchsia text-white font-semibold ${ring ? 'ring-2 ring-blurple/60' : ''}`}
          style={{ fontSize: size * 0.36 }}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full border-[3px] border-surface ${statusColor[status] || 'bg-offline'}`}
          style={{ width: Math.max(12, size * 0.32), height: Math.max(12, size * 0.32) }}
        />
      )}
    </div>
  );
}

export function Badge({ children, tone = 'default', className = '' }: { children: ReactNode; tone?: 'default' | 'blurple' | 'green' | 'red' | 'yellow' | 'fuchsia'; className?: string }) {
  const tones = {
    default: 'bg-surface-3 text-muted border-line',
    blurple: 'bg-blurple/15 text-blurple-2 border-blurple/30',
    green: 'bg-online/15 text-online border-online/30',
    red: 'bg-dnd/15 text-dnd border-dnd/30',
    yellow: 'bg-idle/15 text-idle border-idle/30',
    fuchsia: 'bg-fuchsia/15 text-fuchsia border-fuchsia/30',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide border ${tones[tone]} ${className}`}>{children}</span>;
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8"
    >
      <div>
        {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blurple-2 mb-2">{eyebrow}</div>}
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </motion.div>
  );
}

export function LiveIndicator({ live, label }: { live: boolean; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-medium ${live ? 'text-online' : 'text-muted'}`}>
      <span className="relative flex w-2 h-2">
        {live && <span className="absolute inline-flex w-full h-full rounded-full bg-online opacity-70 animate-ping" />}
        <span className={`relative inline-flex w-2 h-2 rounded-full ${live ? 'bg-online' : 'bg-offline'}`} />
      </span>
      {label}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl`}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl font-semibold">{title}</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-3 text-muted" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({ label, error, children, hint }: { label: string; error?: string | null; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-dim mt-1">{hint}</span>}
      {error && <span className="block text-xs text-dnd mt-1">{error}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${checked ? 'bg-blurple' : 'bg-surface-3 border border-line'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

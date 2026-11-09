import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'blurple',
  delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: 'blurple' | 'green' | 'gray' | 'fuchsia' | 'yellow' | 'cyan';
  delay?: number;
}) {
  const accents = {
    blurple: 'from-blurple/25 text-blurple-2',
    green: 'from-online/25 text-online',
    gray: 'from-offline/25 text-offline',
    fuchsia: 'from-fuchsia/25 text-fuchsia',
    yellow: 'from-idle/25 text-idle',
    cyan: 'from-cyan-400/25 text-cyan-300',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-line bg-surface/80 p-5 hover:border-blurple/40 transition-colors"
    >
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${accents[accent].split(' ')[0]} to-transparent blur-2xl opacity-70 group-hover:opacity-100 transition-opacity`} />
      <div className="relative flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
        <span className={`w-9 h-9 rounded-xl bg-surface-2 border border-line grid place-items-center ${accents[accent].split(' ')[1]}`}>
          <Icon className="w-[18px] h-[18px]" />
        </span>
      </div>
      <div className="relative font-mono text-3xl font-bold tracking-tight">{value}</div>
      {hint && <div className="relative mt-2 text-xs text-dim">{hint}</div>}
    </motion.div>
  );
}

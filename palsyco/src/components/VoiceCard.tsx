import { motion, AnimatePresence } from 'framer-motion';
import { MicOff, HeadphoneOff, MonitorUp, Video, Volume2, Radio } from 'lucide-react';
import type { VoiceChannel } from '../lib/types';
import { Avatar } from './ui';

export default function VoiceCard({ channel, compact = false }: { channel: VoiceChannel; compact?: boolean }) {
  const n = channel.members.length;
  const active = n > 0;
  const pct = channel.user_limit ? Math.min(100, (n / channel.user_limit) * 100) : 0;
  const Icon = channel.kind === 'stage' ? Radio : Volume2;
  return (
    <motion.div
      layout
      className={`rounded-2xl border p-4 transition-colors ${active ? 'border-online/30 bg-gradient-to-br from-online/[0.07] to-surface/80' : 'border-line bg-surface/80'}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl grid place-items-center ${active ? 'bg-online/15 text-online' : 'bg-surface-2 text-muted'}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{channel.name}</div>
          {channel.category && <div className="text-xs text-dim truncate">{channel.category}</div>}
        </div>
        <div className={`font-mono text-sm px-2.5 py-1 rounded-lg ${active ? 'bg-online/15 text-online' : 'bg-surface-2 text-muted'}`}>
          {n}
          {channel.user_limit ? `/${channel.user_limit}` : ''}
        </div>
      </div>
      {channel.user_limit > 0 && (
        <div className="mt-3 h-1.5 rounded-full bg-surface-3 overflow-hidden">
          <motion.div className="h-full bg-online rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
        </div>
      )}
      <AnimatePresence initial={false}>
        {active && (
          <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-1.5">
            {channel.members.slice(0, compact ? 4 : 99).map((m) => (
              <motion.li
                key={m.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center gap-2.5 pl-1"
              >
                <Avatar src={m.avatar_url} name={m.display_name} size={26} />
                <span className="text-sm truncate flex-1">{m.display_name}</span>
                <span className="flex items-center gap-1 text-dim">
                  {m.streaming && <MonitorUp className="w-3.5 h-3.5 text-fuchsia" aria-label="Streaming" />}
                  {m.video && <Video className="w-3.5 h-3.5" aria-label="Camera on" />}
                  {m.self_mute && <MicOff className="w-3.5 h-3.5 text-dnd" aria-label="Muted" />}
                  {m.self_deaf && <HeadphoneOff className="w-3.5 h-3.5 text-dnd" aria-label="Deafened" />}
                </span>
              </motion.li>
            ))}
            {compact && n > 4 && <li className="text-xs text-muted pl-1">+{n - 4} more</li>}
          </motion.ul>
        )}
      </AnimatePresence>
      {!active && !compact && <p className="mt-3 text-xs text-dim">Nobody here right now.</p>}
    </motion.div>
  );
}

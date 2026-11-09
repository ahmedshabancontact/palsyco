import { Hash, Image, Megaphone, MessagesSquare, Radio, Volume2 } from 'lucide-react';
import type { ChannelKind } from '../lib/types';
import { INVITE_URL } from '../lib/config';

export function ChannelIcon({ kind, className = 'w-4 h-4' }: { kind: ChannelKind | string; className?: string }) {
  switch (kind) {
    case 'voice':
      return <Volume2 className={className} />;
    case 'announcement':
      return <Megaphone className={className} />;
    case 'stage':
      return <Radio className={className} />;
    case 'forum':
      return <MessagesSquare className={className} />;
    case 'media':
      return <Image className={className} />;
    default:
      return <Hash className={className} />;
  }
}

export function DiscordLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 127.14 96.36" className={className} fill="currentColor" aria-hidden="true">
      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z" />
    </svg>
  );
}

export function JoinButton({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3.5 text-base' };
  return (
    <a
      href={INVITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white bg-blurple hover:bg-[#4752c4] transition-all shadow-[0_8px_30px_-8px_rgba(88,101,242,0.8)] hover:shadow-[0_10px_40px_-6px_rgba(88,101,242,0.95)] hover:-translate-y-0.5 ${sizes[size]} ${className}`}
    >
      <DiscordLogo className={size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} />
      Join Discord
    </a>
  );
}

export const sourceLabel: Record<string, string> = {
  bot: 'Discord bot',
  invite: 'Discord invite API',
  widget: 'Server widget',
  'sync-bot': 'Live gateway sync',
  'bot-rest': 'Discord bot (REST)',
  none: 'Not configured',
};

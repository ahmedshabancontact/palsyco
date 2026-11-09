import { Fragment, type ReactNode } from 'react';

function inline(text: string, key: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p) || /^__[^_]+__$/.test(p)) return <strong key={key + i} className="text-fg font-semibold">{p.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(p)) return <code key={key + i} className="px-1 rounded bg-surface-3 font-mono text-[0.85em]">{p.slice(1, -1)}</code>;
    return <Fragment key={key + i}>{p}</Fragment>;
  });
}

/** Lightweight Discord-markdown renderer (headings, bold, code, separators). */
export function DiscordText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = text
    .replace(/\r/g, '')
    .split(/\n|━{3,}|─{3,}/g)
    .map((b) => b.replace(/^#{1,3}\s*/, '').trim())
    .filter(Boolean);
  return (
    <div className={className}>
      {blocks.map((b, i) => (
        <p key={i} className="mb-2 last:mb-0">
          {inline(b, `b${i}-`)}
        </p>
      ))}
    </div>
  );
}

export function plainDiscordText(text: string | null) {
  if (!text) return '';
  return text.replace(/^#{1,3}\s*/gm, '').replace(/\*\*|__|`/g, '').replace(/━{3,}/g, ' · ');
}

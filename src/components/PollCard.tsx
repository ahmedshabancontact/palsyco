import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Check, Clock, Lock, Pencil, Trash2, Unlock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Poll } from '../lib/types';
import { api } from '../lib/api';
import { fmtDate, fmtNum, timeLeft } from '../lib/format';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from './ui';

export default function PollCard({ poll, onChanged, onEdit }: { poll: Poll; onChanged: () => void; onEdit?: (p: Poll) => void }) {
  const { user, isAdmin } = useAuth();
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const canVote = poll.status === 'active' && !poll.my_vote && !!user;
  const showResults = !!poll.my_vote || poll.status === 'closed' || !user || true;
  const max = Math.max(0, ...poll.options.map((o) => o.votes));

  const vote = async (optionId: number) => {
    setErr(null);
    setBusy(optionId);
    try {
      await api('/api/polls', { method: 'POST', body: { action: 'vote', poll_id: poll.id, option_id: optionId } });
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const toggleClosed = async () => {
    setAdminBusy(true);
    try {
      await api('/api/polls', { method: 'PUT', body: { id: poll.id, is_closed: !poll.is_closed } });
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setAdminBusy(false);
    }
  };
  const remove = async () => {
    if (!confirm(`Delete poll "${poll.title}"? All votes will be removed.`)) return;
    setAdminBusy(true);
    try {
      await api('/api/polls', { method: 'DELETE', body: { id: poll.id } });
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
      setAdminBusy(false);
    }
  };

  const tone = poll.status === 'active' ? 'green' : poll.status === 'upcoming' ? 'yellow' : 'default';
  const left = poll.status === 'active' ? timeLeft(poll.ends_at) : null;

  return (
    <motion.article layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-line bg-surface/80 p-5 sm:p-6 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone}>{poll.status === 'active' ? '● Live' : poll.status}</Badge>
          {left && (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Clock className="w-3.5 h-3.5" /> {left}
            </span>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <button onClick={() => onEdit(poll)} className="icon-btn" title="Edit poll" aria-label="Edit poll">
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button onClick={toggleClosed} disabled={adminBusy} className="icon-btn" title={poll.is_closed ? 'Reopen poll' : 'Close poll'} aria-label="Toggle closed">
              {poll.is_closed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>
            <button onClick={remove} disabled={adminBusy} className="icon-btn hover:!text-dnd" title="Delete poll" aria-label="Delete poll">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <h3 className="font-display text-xl font-semibold leading-snug">{poll.title}</h3>
      {poll.description && <p className="text-sm text-muted mt-1.5">{poll.description}</p>}

      <div className="mt-5 space-y-2.5 flex-1">
        {poll.options.map((o, i) => {
          const pct = poll.total_votes ? Math.round((o.votes / poll.total_votes) * 1000) / 10 : 0;
          const mine = poll.my_vote === o.id;
          const leading = poll.total_votes > 0 && o.votes === max;
          return (
            <button
              key={o.id}
              disabled={!canVote || busy !== null}
              onClick={() => vote(o.id)}
              className={`relative w-full overflow-hidden rounded-xl border text-left px-4 py-3 transition-all ${
                mine ? 'border-blurple bg-blurple/5' : 'border-line bg-surface-2/60'
              } ${canVote ? 'hover:border-blurple/60 hover:-translate-y-px cursor-pointer' : 'cursor-default'}`}
            >
              {showResults && (
                <motion.div
                  className={`absolute inset-y-0 left-0 ${mine ? 'bg-gradient-to-r from-blurple/40 to-fuchsia/25' : leading ? 'bg-blurple/20' : 'bg-surface-3'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <div className="relative flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full border grid place-items-center shrink-0 ${mine ? 'bg-blurple border-blurple' : 'border-muted/50'}`}>
                  {mine && <Check className="w-3 h-3 text-white" />}
                  {busy === o.id && <span className="w-2.5 h-2.5 rounded-full bg-blurple-2 animate-pulse" />}
                </span>
                <span className="flex-1 font-medium">{o.label}</span>
                <span className="font-mono text-sm text-muted">{fmtNum(o.votes)}</span>
                <span className="font-mono text-sm font-bold w-14 text-right">{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {err && <p className="mt-3 text-sm text-dnd">{err}</p>}

      <div className="mt-5 pt-4 border-t border-line flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> <b className="text-fg font-mono">{fmtNum(poll.total_votes)}</b> total votes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> {fmtDate(poll.starts_at)} → {poll.ends_at ? fmtDate(poll.ends_at) : 'no end date'}
        </span>
        <span className="ml-auto">
          {!user && poll.status === 'active' && (
            <Link to="/login?next=/polls" className="text-blurple-2 font-semibold hover:text-fg">
              Sign in to vote →
            </Link>
          )}
          {poll.my_vote && <span className="text-online font-semibold">✓ You voted</span>}
          {user && !poll.my_vote && poll.status === 'upcoming' && <span>Opens {fmtDate(poll.starts_at)}</span>}
        </span>
      </div>
    </motion.article>
  );
}

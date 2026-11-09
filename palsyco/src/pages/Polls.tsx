import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Vote } from 'lucide-react';
import type { Poll } from '../lib/types';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import PollCard from '../components/PollCard';
import PollEditor from '../components/PollEditor';
import { EmptyState, ErrorState, LiveIndicator, LoadingBlock, PageHeader } from '../components/ui';
import { fmtNum } from '../lib/format';

export function usePolls(refreshMs = 15000) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchPolls = useCallback(async () => {
    try {
      setPolls(await api<Poll[]>('/api/polls'));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchPolls();
    const id = setInterval(() => document.visibilityState === 'visible' && fetchPolls(), refreshMs);
    return () => clearInterval(id);
  }, [fetchPolls, refreshMs]);
  return { polls, loading, error, fetchPolls };
}

export default function Polls() {
  const { isAdmin, user } = useAuth();
  const { polls, loading, error, fetchPolls } = usePolls();
  const [tab, setTab] = useState<'active' | 'upcoming' | 'closed'>('active');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Poll | null>(null);

  useEffect(() => {
    fetchPolls();
  }, [user, fetchPolls]);

  const counts = {
    active: polls.filter((p) => p.status === 'active').length,
    upcoming: polls.filter((p) => p.status === 'upcoming').length,
    closed: polls.filter((p) => p.status === 'closed').length,
  };
  const shown = polls.filter((p) => p.status === tab);
  const totalVotes = polls.reduce((s, p) => s + p.total_votes, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Voting & polls"
        title="Have your say"
        subtitle={
          <>
            One vote per account. Results update live. <span className="text-fg font-mono">{fmtNum(totalVotes)}</span> votes cast across {polls.length} polls.
          </>
        }
        actions={
          <>
            <button onClick={fetchPolls} className="btn-ghost" aria-label="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setEditing(null);
                  setEditorOpen(true);
                }}
                className="btn-primary"
              >
                <Plus className="w-4 h-4" /> New poll
              </button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex rounded-xl border border-line bg-surface p-1">
          {(['active', 'upcoming', 'closed'] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${tab === k ? 'bg-blurple text-white' : 'text-muted hover:text-fg'}`}>
              {k === 'closed' ? 'Completed' : k} <span className="opacity-70 font-mono">{counts[k]}</span>
            </button>
          ))}
        </div>
        <LiveIndicator live label="Live counts" />
      </div>

      {loading ? (
        <LoadingBlock label="Loading polls…" rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchPolls} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<Vote className="w-6 h-6" />}
          title={tab === 'active' ? 'No active polls' : tab === 'upcoming' ? 'No upcoming polls' : 'No completed polls yet'}
          text={isAdmin ? 'Create a poll to get the community voting.' : 'Check back soon — moderators post new polls regularly.'}
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {shown.map((p) => (
            <PollCard
              key={p.id}
              poll={p}
              onChanged={fetchPolls}
              onEdit={(x) => {
                setEditing(x);
                setEditorOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <PollEditor open={editorOpen} onClose={() => setEditorOpen(false)} poll={editing} onSaved={fetchPolls} />
    </div>
  );
}

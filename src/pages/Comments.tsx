import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessagesSquare } from 'lucide-react';
import supabase from '../lib/supabase';
import { api } from '../lib/api';
import type { CommentT } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import CommentItem, { Composer } from '../components/CommentItem';
import { EmptyState, ErrorState, LiveIndicator, LoadingBlock, PageHeader } from '../components/ui';
import AuthButtons from '../components/AuthButtons';

export default function Comments() {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<CommentT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<'new' | 'top' | 'old'>('new');
  const [live, setLive] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      setComments(await api<CommentT[]>('/api/comments'));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments, user]);

  // Realtime subscription + polling fallback
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (t) clearTimeout(t);
      t = setTimeout(fetchComments, 400);
    };
    const channel = supabase
      .channel('community-comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, debounced)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_likes' }, debounced)
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    const poll = setInterval(() => document.visibilityState === 'visible' && fetchComments(), 12000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      if (t) clearTimeout(t);
    };
  }, [fetchComments]);

  const { roots, childrenMap } = useMemo(() => {
    const map: Record<number, CommentT[]> = {};
    const ids = new Set(comments.map((c) => c.id));
    const roots: CommentT[] = [];
    for (const c of comments) {
      if (c.parent_id && ids.has(c.parent_id)) (map[c.parent_id] ||= []).push(c);
      else if (!c.parent_id) roots.push(c);
    }
    const score = (c: CommentT) => c.like_count * 3 + (map[c.id]?.length || 0);
    roots.sort((a, b) =>
      sort === 'top' ? score(b) - score(a) || b.created_at.localeCompare(a.created_at) : sort === 'old' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at)
    );
    return { roots, childrenMap: map };
  }, [comments, sort]);

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Community" title="Community comments" subtitle="Chat with members, share ideas and reply to each other. Be kind — moderators review reported content." />

      <div className="rounded-2xl border border-line bg-surface/70 p-5 mb-6">
        {user ? (
          profile?.banned ? (
            <p className="text-sm text-dnd">Your account has been restricted from posting by a moderator.</p>
          ) : (
            <Composer onPosted={fetchComments} />
          )
        ) : (
          <div className="grid sm:grid-cols-[1fr_260px] gap-5 items-center">
            <div>
              <h3 className="font-display font-semibold text-lg">Join the conversation</h3>
              <p className="text-sm text-muted mt-1">
                Sign in with your Discord account to comment, reply and like. Or <Link to="/register" className="text-blurple-2">create an account</Link> with email.
              </p>
            </div>
            <AuthButtons />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{comments.length} comments</span>
          <LiveIndicator live={live} label={live ? 'Real-time' : 'Auto-refresh'} />
        </div>
        <select className="input !w-auto !py-1.5 text-sm" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort comments">
          <option value="new">Newest</option>
          <option value="top">Top</option>
          <option value="old">Oldest</option>
        </select>
      </div>

      {loading ? (
        <LoadingBlock label="Loading comments…" rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchComments} />
      ) : roots.length === 0 ? (
        <EmptyState icon={<MessagesSquare className="w-6 h-6" />} title="No comments yet" text="Start the conversation — your comment will appear here instantly." />
      ) : (
        <div className="space-y-4">
          {roots.map((c) => (
            <div key={c.id} className="rounded-2xl border border-line bg-surface/60 p-4 sm:p-5">
              <CommentItem comment={c} childrenMap={childrenMap} onChanged={fetchComments} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

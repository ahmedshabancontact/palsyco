import { useState } from 'react';
import { motion } from 'framer-motion';
import { EyeOff, Eye, Flag, Heart, MessageCircle, ShieldCheck, Trash2 } from 'lucide-react';
import type { CommentT } from '../lib/types';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, Badge, Field, Modal, Spinner } from './ui';
import { DiscordLogo } from './discord';

export function Composer({
  parentId = null,
  onPosted,
  autoFocus = false,
  onCancel,
  placeholder = 'Share something with the community…',
}: {
  parentId?: number | null;
  onPosted: () => void;
  autoFocus?: boolean;
  onCancel?: () => void;
  placeholder?: string;
}) {
  const { profile } = useAuth();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const b = body.trim();
    if (!b) return setErr('Write something first.');
    if (b.length > 2000) return setErr('Keep it under 2000 characters.');
    setBusy(true);
    setErr(null);
    try {
      await api('/api/comments', { method: 'POST', body: { body: b, parent_id: parentId } });
      setBody('');
      onPosted();
      onCancel?.();
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="flex gap-3">
      <Avatar src={profile?.avatar_url} name={profile?.display_name} size={parentId ? 32 : 40} />
      <div className="flex-1">
        <textarea
          autoFocus={autoFocus}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
          }}
          placeholder={placeholder}
          className="input min-h-[76px] resize-y"
          maxLength={2000}
        />
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs ${body.length > 1900 ? 'text-idle' : 'text-dim'}`}>{body.length}/2000</span>
          {err && <span className="text-xs text-dnd">{err}</span>}
          <div className="ml-auto flex gap-2">
            {onCancel && (
              <button type="button" onClick={onCancel} className="btn-ghost !py-1.5 text-sm">
                Cancel
              </button>
            )}
            <button disabled={busy || !body.trim()} className="btn-primary !py-1.5 text-sm">
              {busy && <Spinner className="w-3.5 h-3.5 !text-white" />} {parentId ? 'Reply' : 'Post comment'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function CommentItem({
  comment,
  childrenMap,
  depth = 0,
  onChanged,
}: {
  comment: CommentT;
  childrenMap: Record<number, CommentT[]>;
  depth?: number;
  onChanged: () => void;
}) {
  const { user, isAdmin } = useAuth();
  const [replying, setReplying] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('Spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reported, setReported] = useState(comment.reported_by_me);
  const replies = childrenMap[comment.id] || [];
  const a = comment.author;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const like = () => (user ? run(() => api('/api/comments', { method: 'POST', body: { action: 'like', comment_id: comment.id } })) : setErr('Sign in to like comments.'));
  const del = () => {
    if (!confirm('Delete this comment and all of its replies?')) return;
    run(() => api('/api/comments', { method: 'DELETE', body: { id: comment.id } }));
  };
  const hide = () => run(() => api('/api/comments', { method: 'PUT', body: { id: comment.id, is_hidden: !comment.is_hidden } }));
  const report = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = `${reason}${details.trim() ? ': ' + details.trim() : ''}`;
    setBusy(true);
    setErr(null);
    try {
      await api('/api/comments', { method: 'POST', body: { action: 'report', comment_id: comment.id, reason: text } });
      setReported(true);
      setReporting(false);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={depth > 0 ? 'mt-4' : ''}>
      <div className={`flex gap-3 ${comment.is_hidden ? 'opacity-50' : ''}`}>
        <Avatar src={a?.avatar_url} name={a?.display_name} size={depth ? 32 : 40} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{a?.display_name || 'Deleted user'}</span>
            {a?.discord_username ? (
              <span className="inline-flex items-center gap-1 text-xs text-blurple-2">
                <DiscordLogo className="w-3 h-3" />@{a.discord_username}
              </span>
            ) : (
              a && <span className="text-xs text-dim">@{a.username}</span>
            )}
            {a?.is_admin && (
              <Badge tone="fuchsia">
                <ShieldCheck className="w-3 h-3" /> Admin
              </Badge>
            )}
            <span className="text-xs text-dim">· {timeAgo(comment.created_at)}</span>
            {comment.is_hidden && <Badge tone="red">Hidden</Badge>}
          </div>
          <p className="mt-1 text-[15px] text-fg/90 whitespace-pre-wrap break-words leading-relaxed">{comment.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1 -ml-2 text-sm">
            <button onClick={like} disabled={busy} className={`action-btn ${comment.liked_by_me ? '!text-fuchsia' : ''}`}>
              <Heart className={`w-4 h-4 ${comment.liked_by_me ? 'fill-current' : ''}`} /> {comment.like_count || ''}
            </button>
            {user && (
              <button onClick={() => setReplying((r) => !r)} className="action-btn">
                <MessageCircle className="w-4 h-4" /> Reply
              </button>
            )}
            {user && !comment.is_mine && (
              <button onClick={() => !reported && setReporting(true)} disabled={reported} className="action-btn">
                <Flag className="w-4 h-4" /> {reported ? 'Reported' : 'Report'}
              </button>
            )}
            {(comment.is_mine || isAdmin) && (
              <button onClick={del} disabled={busy} className="action-btn hover:!text-dnd">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
            {isAdmin && (
              <button onClick={hide} disabled={busy} className="action-btn">
                {comment.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} {comment.is_hidden ? 'Unhide' : 'Hide'}
              </button>
            )}
            {busy && <Spinner className="w-3.5 h-3.5 ml-1" />}
          </div>
          {err && <p className="text-xs text-dnd mt-1">{err}</p>}
          {replying && (
            <div className="mt-3">
              <Composer parentId={comment.id} autoFocus onPosted={onChanged} onCancel={() => setReplying(false)} placeholder={`Reply to ${a?.display_name || 'comment'}…`} />
            </div>
          )}
          {replies.length > 0 && (
            <div className={depth < 3 ? 'mt-1 pl-4 border-l-2 border-line' : 'mt-1'}>
              {replies.map((r) => (
                <CommentItem key={r.id} comment={r} childrenMap={childrenMap} depth={depth + 1} onChanged={onChanged} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={reporting} onClose={() => setReporting(false)} title="Report comment">
        <form onSubmit={report} className="space-y-4">
          <p className="text-sm text-muted">Reports are reviewed privately by the moderators.</p>
          <Field label="Reason">
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {['Spam', 'Harassment or hate', 'Inappropriate content', 'Personal information', 'Other'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Details (optional)">
            <textarea className="input min-h-20" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={400} />
          </Field>
          {err && <p className="text-sm text-dnd">{err}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setReporting(false)}>
              Cancel
            </button>
            <button className="btn-primary !bg-dnd hover:!bg-dnd/80" disabled={busy}>
              Submit report
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}

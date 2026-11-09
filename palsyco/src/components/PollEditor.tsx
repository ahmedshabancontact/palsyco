import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Poll } from '../lib/types';
import { api } from '../lib/api';
import { fromLocalInput, toLocalInput } from '../lib/format';
import { Field, Modal, Spinner } from './ui';

type Opt = { id?: number; label: string; votes?: number };

export default function PollEditor({ open, onClose, poll, onSaved }: { open: boolean; onClose: () => void; poll: Poll | null; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [options, setOptions] = useState<Opt[]>([{ label: '' }, { label: '' }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setServerErr(null);
    if (poll) {
      setTitle(poll.title);
      setDescription(poll.description || '');
      setStartsAt(toLocalInput(poll.starts_at));
      setEndsAt(toLocalInput(poll.ends_at));
      setOptions(poll.options.map((o) => ({ id: o.id, label: o.label, votes: o.votes })));
    } else {
      const week = new Date(Date.now() + 7 * 864e5).toISOString();
      setTitle('');
      setDescription('');
      setStartsAt(toLocalInput(new Date().toISOString()));
      setEndsAt(toLocalInput(week));
      setOptions([{ label: '' }, { label: '' }]);
    }
  }, [open, poll]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (title.trim().length < 3) e.title = 'Title must be at least 3 characters.';
    if (title.trim().length > 140) e.title = 'Title must be under 140 characters.';
    const labels = options.map((o) => o.label.trim()).filter(Boolean);
    if (labels.length < 2) e.options = 'Add at least two options.';
    else if (new Set(labels.map((l) => l.toLowerCase())).size !== labels.length) e.options = 'Options must be unique.';
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) e.ends_at = 'End must be after start.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setServerErr(null);
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      starts_at: fromLocalInput(startsAt),
      ends_at: fromLocalInput(endsAt),
      options: options.filter((o) => o.label.trim()).map((o) => (poll ? { id: o.id, label: o.label.trim() } : o.label.trim())),
    };
    try {
      if (poll) await api('/api/polls', { method: 'PUT', body: { id: poll.id, ...body } });
      else await api('/api/polls', { method: 'POST', body });
      onSaved();
      onClose();
    } catch (e) {
      setServerErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={poll ? 'Edit poll' : 'Create a poll'} wide>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Question" error={errors.title}>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What should our next event be?" maxLength={140} />
        </Field>
        <Field label="Description (optional)">
          <textarea className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} placeholder="Add context for voters" />
        </Field>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Options</span>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input"
                  value={o.label}
                  maxLength={100}
                  placeholder={`Option ${i + 1}`}
                  onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                />
                <button
                  type="button"
                  disabled={options.length <= 2}
                  onClick={() => {
                    if (o.votes && !confirm(`"${o.label}" has ${o.votes} vote(s). Removing it deletes those votes. Continue?`)) return;
                    setOptions(options.filter((_, j) => j !== i));
                  }}
                  className="icon-btn border border-line disabled:opacity-30"
                  aria-label="Remove option"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {errors.options && <span className="block text-xs text-dnd mt-1">{errors.options}</span>}
          {options.length < 10 && (
            <button type="button" onClick={() => setOptions([...options, { label: '' }])} className="mt-2 inline-flex items-center gap-1.5 text-sm text-blurple-2 hover:text-fg font-medium">
              <Plus className="w-4 h-4" /> Add option
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Starts">
            <input type="datetime-local" className="input" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </Field>
          <Field label="Ends (optional)" error={errors.ends_at}>
            <input type="datetime-local" className="input" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </Field>
        </div>
        {serverErr && <p className="text-sm text-dnd">{serverErr}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Spinner className="w-4 h-4 !text-white" />} {poll ? 'Save changes' : 'Publish poll'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

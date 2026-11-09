import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AuthButtons from '../components/AuthButtons';
import { Field, Spinner } from '../components/ui';
import { AuthShell } from './Login';

export default function Register() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user) nav('/', { replace: true });
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = 'Display name must be at least 2 characters.';
    if (name.trim().length > 48) errs.name = 'Display name must be under 48 characters.';
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email address.';
    if (password.length < 8) errs.password = 'Use at least 8 characters.';
    if (password !== confirm) errs.confirm = 'Passwords do not match.';
    if (!agree) errs.agree = 'You must accept the terms and privacy policy.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return setErrors({ form: error.message });
    if (!data.session) setSent(true);
  };

  if (sent)
    return (
      <AuthShell title="Check your inbox" subtitle={`We sent a confirmation link to ${email}.`}>
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <MailCheck className="w-12 h-12 text-online" />
          <p className="text-sm text-muted">Click the link in the email to activate your account, then sign in.</p>
          <Link to="/login" className="btn-primary">
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );

  return (
    <AuthShell title="Create your account" subtitle="Fastest way: continue with Discord.">
      <AuthButtons />
      <div className="flex items-center gap-3 my-6 text-xs text-dim uppercase tracking-widest">
        <span className="flex-1 h-px bg-line" /> or register with email <span className="flex-1 h-px bg-line" />
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Display name" error={errors.name}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={48} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Password" error={errors.password}>
            <input type="password" autoComplete="new-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm" error={errors.confirm}>
            <input type="password" autoComplete="new-password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
        </div>
        <label className="flex items-start gap-2.5 text-sm text-muted">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 accent-[#5865f2]" />
          <span>
            I agree to the{' '}
            <Link to="/terms" className="text-blurple-2">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-blurple-2">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.agree && <p className="text-xs text-dnd -mt-2">{errors.agree}</p>}
        {errors.form && <p className="text-sm text-dnd">{errors.form}</p>}
        <button disabled={busy} className="btn-primary w-full !py-3">
          {busy && <Spinner className="w-4 h-4 !text-white" />} Create account
        </button>
      </form>
      <p className="text-sm text-muted mt-6 text-center">
        Already a member?{' '}
        <Link to="/login" className="text-blurple-2 font-semibold">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

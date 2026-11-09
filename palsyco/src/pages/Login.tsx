import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AuthButtons from '../components/AuthButtons';
import { Field, Spinner } from '../components/ui';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="w-full max-w-md">
        <div className="relative rounded-3xl border border-line bg-surface p-7 sm:p-8 overflow-hidden card-glow">
          <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-blurple/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-fuchsia/20 blur-3xl" />
          <div className="relative">
            <h1 className="font-display text-3xl font-bold">{title}</h1>
            <p className="text-muted mt-1 mb-6">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav(next, { replace: true });
  }, [user, nav, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email address.';
    if (password.length < 6) errs.password = 'Password must be at least 6 characters.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setErrors({ form: error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message });
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to vote, comment and connect.">
      <AuthButtons />
      <div className="flex items-center gap-3 my-6 text-xs text-dim uppercase tracking-widest">
        <span className="flex-1 h-px bg-line" /> or with email <span className="flex-1 h-px bg-line" />
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" error={errors.email}>
          <input type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" error={errors.password}>
          <input type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {errors.form && <p className="text-sm text-dnd">{errors.form}</p>}
        <button disabled={busy} className="btn-primary w-full !py-3">
          {busy && <Spinner className="w-4 h-4 !text-white" />} Sign in
        </button>
      </form>
      <p className="text-sm text-muted mt-6 text-center">
        New here?{' '}
        <Link to="/register" className="text-blurple-2 font-semibold">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

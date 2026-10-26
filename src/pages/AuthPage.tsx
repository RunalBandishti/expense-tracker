import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Button, Logo } from '../components/ui';
import { api } from '../lib/api';
import type { InvitePreview } from '../lib/types';
import { useAuth } from '../state/auth';

type Mode = 'login' | 'signup' | 'recover';

const COPY: Record<Mode, { title: string; body: string; submit: string }> = {
  login: { title: 'Welcome back', body: 'Log in to see your expenses and splits.', submit: 'Log in' },
  signup: { title: 'Create your account', body: 'Track expenses and budgets, and split costs with friends.', submit: 'Create account' },
  recover: { title: 'Reset your password', body: 'Use the recovery code you saved when you signed up.', submit: 'Set new password' },
};

const inputClass = 'mt-0.5 block h-7 w-full min-w-0 bg-transparent text-base font-medium outline-none';

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

export function AuthPage() {
  const { authenticate, recover, googleEnabled } = useAuth();
  const location = useLocation();
  const inviteToken = location.pathname.match(/^\/join\/([A-Za-z0-9_-]{16,64})$/)?.[1];
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [mode, setMode] = useState<Mode>(inviteToken ? 'signup' : 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    new URLSearchParams(location.search).get('authError') ? "Google sign-in didn't work. Please try again." : null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    api<{ invite: InvitePreview }>(`/invites/${inviteToken}`).then(
      ({ invite: preview }) => setInvite(preview),
      () => undefined,
    );
  }, [inviteToken]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'recover') await recover(username.trim(), recoveryCode, password);
      else await authenticate(mode, username.trim(), password);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const copy = COPY[mode];

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <Logo className="size-11" />
          <span className="text-lg font-semibold tracking-tight">Expense Manager</span>
        </div>

        {invite && (
          <p className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="font-semibold">{invite.ownerName}</span> invited you to {invite.emoji}{' '}
            <span className="font-semibold">{invite.name}</span>. Log in or create an account to join.
          </p>
        )}

        <h1 className="mt-8 text-[30px] font-semibold leading-tight tracking-tight">{copy.title}</h1>
        <p className="mt-2 text-zinc-500">{copy.body}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white focus-within:border-zinc-300">
            <label className="block px-4 py-2.5">
              <span className="text-xs font-medium text-zinc-500">Username</span>
              <input
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                minLength={3}
                maxLength={64}
                className={inputClass}
              />
            </label>
            {mode === 'recover' && (
              <label className="block px-4 py-2.5">
                <span className="text-xs font-medium text-zinc-500">Recovery code</span>
                <input
                  required
                  value={recoveryCode}
                  onChange={(event) => setRecoveryCode(event.target.value)}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className={`${inputClass} font-mono uppercase placeholder:font-normal placeholder:text-zinc-300`}
                />
              </label>
            )}
            <label className="block px-4 py-2.5">
              <span className="text-xs font-medium text-zinc-500">{mode === 'recover' ? 'New password' : 'Password'}</span>
              <span className="mt-0.5 flex items-center gap-2">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={8}
                  className="block h-7 min-w-0 flex-1 bg-transparent text-base font-medium outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="text-zinc-400 transition hover:text-zinc-700"
                >
                  {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </span>
            </label>
          </div>
          {mode !== 'login' && <p className="px-1 text-xs text-zinc-500">Use at least 8 characters for your password.</p>}
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <LoaderCircle className="size-4 animate-spin" />}
            {copy.submit}
          </Button>
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => switchMode('recover')}
              className="block w-full text-center text-sm font-medium text-zinc-500 hover:text-zinc-900"
            >
              Forgot password?
            </button>
          )}
        </form>

        {googleEnabled && mode !== 'recover' && (
          <>
            <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
              <span className="h-px flex-1 bg-zinc-200" />
              or
              <span className="h-px flex-1 bg-zinc-200" />
            </div>
            <a
              href={`/api/auth/google?returnTo=${encodeURIComponent(location.pathname)}`}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-zinc-300 bg-white text-[15px] font-semibold transition hover:bg-zinc-50"
            >
              <GoogleMark />
              Continue with Google
            </a>
          </>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          {mode === 'signup' ? 'Already have an account?' : mode === 'login' ? 'New here?' : 'Remembered it?'}{' '}
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="font-semibold text-zinc-900 underline-offset-4 hover:underline"
          >
            {mode === 'login' ? 'Create an account' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}

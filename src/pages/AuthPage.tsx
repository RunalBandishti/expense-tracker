import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Button, Logo } from '../components/ui';
import { useAuth } from '../state/auth';

export function AuthPage() {
  const { authenticate } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authenticate(mode, username.trim(), password);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <Logo className="size-11" />
          <span className="text-lg font-semibold tracking-tight">Expense Manager</span>
        </div>
        <h1 className="mt-10 text-[30px] font-semibold leading-tight tracking-tight">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-2 text-zinc-500">
          {isLogin ? 'Log in to see your trips and splits.' : 'Track trip budgets and split expenses with your group.'}
        </p>

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
                className="mt-0.5 block h-7 w-full bg-transparent text-base font-medium outline-none"
              />
            </label>
            <label className="block px-4 py-2.5">
              <span className="text-xs font-medium text-zinc-500">Password</span>
              <span className="mt-0.5 flex items-center gap-2">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
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
          {!isLogin && <p className="px-1 text-xs text-zinc-500">Use at least 8 characters for your password.</p>}
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <LoaderCircle className="size-4 animate-spin" />}
            {isLogin ? 'Log in' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          {isLogin ? 'New here?' : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(isLogin ? 'signup' : 'login');
              setError(null);
            }}
            className="font-semibold text-zinc-900 underline-offset-4 hover:underline"
          >
            {isLogin ? 'Create an account' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}

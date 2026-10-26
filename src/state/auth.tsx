import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import { readStored, removeStored, savedPeopleCacheKey, tripsCacheKey, USER_KEY, writeStored } from '../lib/storage';
import type { User } from '../lib/types';
import { disableReminders } from './reminders';

type AuthState = { status: 'loading' } | { status: 'anonymous' } | { status: 'authenticated'; user: User };

type AuthContextValue = {
  state: AuthState;
  googleEnabled: boolean;
  recoveryCode: string | null;
  dismissRecoveryCode: () => void;
  authenticate: (mode: 'login' | 'signup', username: string, password: string) => Promise<void>;
  recover: (username: string, recoveryCode: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  regenerateRecoveryCode: () => Promise<void>;
  logout: () => Promise<void>;
  expireSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  const signIn = useCallback((user: User) => {
    writeStored(USER_KEY, user);
    setState({ status: 'authenticated', user });
  }, []);

  const signOut = useCallback(() => {
    removeStored(USER_KEY);
    setState({ status: 'anonymous' });
  }, []);

  // Keeps the cached user and unsynced changes so they sync after the next login.
  const expireSession = useCallback(() => setState({ status: 'anonymous' }), []);

  useEffect(() => {
    api<{ user: User | null; google: boolean }>('/auth/me').then(
      ({ user, google }) => {
        setGoogleEnabled(google);
        if (user) signIn(user);
        else signOut();
      },
      (err: ApiError) => {
        // Offline: keep the last signed-in user so cached trips stay usable.
        const cached = readStored<User>(USER_KEY);
        if (err.status === 0 && cached) setState({ status: 'authenticated', user: cached });
        else setState({ status: 'anonymous' });
      },
    );
  }, [signIn, signOut]);

  const authenticate = useCallback(
    async (mode: 'login' | 'signup', username: string, password: string) => {
      const result = await api<{ user: User; recoveryCode?: string }>(`/auth/${mode}`, {
        method: 'POST',
        json: { username, password },
      });
      setRecoveryCode(result.recoveryCode ?? null);
      signIn(result.user);
    },
    [signIn],
  );

  const recover = useCallback(
    async (username: string, code: string, newPassword: string) => {
      const result = await api<{ user: User; recoveryCode: string }>('/auth/recover', {
        method: 'POST',
        json: { username, recoveryCode: code, newPassword },
      });
      setRecoveryCode(result.recoveryCode);
      signIn(result.user);
    },
    [signIn],
  );

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api('/auth/password', { method: 'POST', json: { currentPassword, newPassword } });
  }, []);

  const regenerateRecoveryCode = useCallback(async () => {
    const result = await api<{ recoveryCode: string }>('/auth/recovery-code', { method: 'POST' });
    setRecoveryCode(result.recoveryCode);
  }, []);

  const logout = useCallback(async () => {
    if (state.status === 'authenticated') {
      removeStored(tripsCacheKey(state.user.id));
      removeStored(savedPeopleCacheKey(state.user.id));
    }
    // Before logging out, while the session can still unlink this device; otherwise the next account inherits its reminders.
    await disableReminders().catch(() => undefined);
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    signOut();
  }, [state, signOut]);

  const value = useMemo(
    () => ({
      state,
      googleEnabled,
      recoveryCode,
      dismissRecoveryCode: () => setRecoveryCode(null),
      authenticate,
      recover,
      changePassword,
      regenerateRecoveryCode,
      logout,
      expireSession,
    }),
    [state, googleEnabled, recoveryCode, authenticate, recover, changePassword, regenerateRecoveryCode, logout, expireSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

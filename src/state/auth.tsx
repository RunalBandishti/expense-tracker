import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/types';

type AuthState = { status: 'loading' } | { status: 'anonymous' } | { status: 'authenticated'; user: User };

type AuthContextValue = {
  state: AuthState;
  authenticate: (mode: 'login' | 'signup', username: string, password: string) => Promise<void>;
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

  useEffect(() => {
    api<{ user: User }>('/auth/me').then(
      ({ user }) => setState({ status: 'authenticated', user }),
      () => setState({ status: 'anonymous' }),
    );
  }, []);

  const authenticate = useCallback(async (mode: 'login' | 'signup', username: string, password: string) => {
    const { user } = await api<{ user: User }>(`/auth/${mode}`, { method: 'POST', json: { username, password } });
    setState({ status: 'authenticated', user });
  }, []);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setState({ status: 'anonymous' });
  }, []);

  const expireSession = useCallback(() => setState({ status: 'anonymous' }), []);

  const value = useMemo(
    () => ({ state, authenticate, logout, expireSession }),
    [state, authenticate, logout, expireSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

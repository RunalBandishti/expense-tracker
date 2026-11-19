# Shared Layouts

## Application shell

- File: `src/App.tsx`
- Description: root router and provider shell; public routes bypass the authenticated layout, while private routes mount the trips provider and responsive app shell.

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { RecoveryCodeSheet } from './components/AccountSheets';
import { Logo } from './components/ui';
import { AuthPage } from './pages/AuthPage';
import { JoinPage } from './pages/JoinPage';
import { Layout } from './pages/Layout';
import { PayPage } from './pages/PayPage';
import { PublicTripPage } from './pages/PublicTripPage';
import { TripPage } from './pages/TripPage';
import { TripsPage } from './pages/TripsPage';
import { AuthProvider, useAuth } from './state/auth';
import { ToastProvider } from './state/toast';
import { TripsProvider } from './state/trips';

function AppRoutes() {
  const { state, recoveryCode, dismissRecoveryCode } = useAuth();

  if (state.status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Logo className="size-14 animate-pulse" />
      </div>
    );
  }

  if (state.status === 'anonymous') return <AuthPage />;

  return (
    <TripsProvider key={state.user.id} user={state.user}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TripsPage />} />
          <Route path="trips/:tripId" element={<TripPage />} />
          <Route path="join/:token" element={<JoinPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {recoveryCode && <RecoveryCodeSheet code={recoveryCode} onClose={dismissRecoveryCode} />}
    </TripsProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/s/:token" element={<PublicTripPage />} />
            <Route path="/pay" element={<PayPage />} />
            <Route path="*" element={<AppRoutes />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
```

## Authenticated responsive layout and sidebar

- File: `src/pages/Layout.tsx`
- Description: authenticated route wrapper. At 1024px and above it renders a full-height 20rem event sidebar; smaller screens render only the route outlet.

```tsx
import { useState } from 'react';
import { Link, Outlet, useMatch, useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { TripCard } from '../components/TripCard';
import { TripSheet } from '../components/TripSheet';
import { Button, Logo, SyncBadge } from '../components/ui';
import { UserMenu } from '../components/UserMenu';
import { useIsDesktop } from '../lib/useMediaQuery';
import { useTrips } from '../state/trips';

function Sidebar() {
  const { trips, syncStatus, pendingCount } = useTrips();
  const activeTripId = useMatch('/trips/:tripId')?.params.tripId;
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  return (
    <aside className="sticky top-0 flex h-dvh flex-col border-r border-zinc-200/80 bg-paper-dim">
      <Link to="/" className="flex items-center gap-3 px-5 pt-6">
        <Logo />
        <span>
          <span className="block font-semibold leading-tight tracking-tight">Expense Manager</span>
          <span className="block text-xs text-zinc-500">Expenses, budgets & splits</span>
        </span>
      </Link>
      <div className="px-5 pt-6">
        <Button className="w-full" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New event
        </Button>
      </div>
      <nav aria-label="Events" className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} compact active={trip.id === activeTripId} />
        ))}
      </nav>
      <footer className="flex items-center justify-between gap-3 border-t border-zinc-200/80 px-5 py-4">
        <UserMenu placement="up" showName />
        <SyncBadge status={syncStatus} pendingCount={pendingCount} />
      </footer>
      {creating && (
        <TripSheet onClose={() => setCreating(false)} onCreated={(trip) => navigate(`/trips/${trip.id}`)} />
      )}
    </aside>
  );
}

export function Layout() {
  const isDesktop = useIsDesktop();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
      {isDesktop && <Sidebar />}
      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
```

## Account menu

- File: `src/components/UserMenu.tsx`
- Description: shared account control used in the desktop sidebar footer and mobile dashboard header.

```tsx
import { useState } from 'react';
import { Bell, BellOff, KeyRound, LifeBuoy, LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { setThemePreference, useThemePreference, type ThemePreference } from '../lib/theme';
import { useAuth } from '../state/auth';
import { useReminders } from '../state/reminders';
import { useToast } from '../state/toast';
import { useTrips } from '../state/trips';
import { PasswordSheet } from './AccountSheets';
import { cx, Menu, segmentClass, type MenuItem } from './ui';

const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'Auto', Icon: Monitor },
];

function ThemeSwitcher() {
  const preference = useThemePreference();
  return (
    <div role="radiogroup" aria-label="Appearance" className="mx-1 mb-1 grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1">
      {THEME_OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          onClick={() => setThemePreference(value)}
          className={cx(
            'flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition',
            segmentClass(preference === value),
          )}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

export function UserMenu({ placement = 'down', showName = false }: { placement?: 'down' | 'up'; showName?: boolean }) {
  const { state, logout, regenerateRecoveryCode } = useAuth();
  const { pendingCount } = useTrips();
  const toast = useToast();
  const reminders = useReminders();
  const [changingPassword, setChangingPassword] = useState(false);
  const user = state.status === 'authenticated' ? state.user : null;

  const items: MenuItem[] = [];
  if (reminders.status === 'on') {
    items.push({ label: 'Turn off reminders', icon: <BellOff className="size-4" />, onSelect: () => void reminders.turnOff() });
  } else if (reminders.status !== 'checking') {
    items.push({
      label: reminders.status === 'blocked' ? 'Reminders are blocked' : 'Turn on reminders',
      icon: <Bell className="size-4" />,
      onSelect: () => void reminders.turnOn(),
    });
  }
  if (user?.provider === 'password') {
    items.push(
      { label: 'Change password', icon: <KeyRound className="size-4" />, onSelect: () => setChangingPassword(true) },
      {
        label: 'New recovery code',
        icon: <LifeBuoy className="size-4" />,
        onSelect: () => {
          if (!window.confirm('Make a new recovery code? Your old one will stop working.')) return;
          regenerateRecoveryCode().catch((err: Error) => toast({ message: err.message, tone: 'error' }));
        },
      },
    );
  }
  items.push({
    label: 'Log out',
    icon: <LogOut className="size-4" />,
    onSelect: () => {
      if (pendingCount > 0 && !window.confirm(`${pendingCount} changes haven't synced yet. Log out and lose them?`)) return;
      void logout();
    },
  });

  return (
    <>
      <Menu
        label="Account"
        heading={`Signed in as ${user?.username ?? ''}`}
        content={<ThemeSwitcher />}
        placement={placement}
        items={items}
        triggerClassName="flex min-w-0 items-center gap-2.5 rounded-full transition hover:opacity-80"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
          {user?.username.charAt(0).toUpperCase()}
        </span>
        {showName && <span className="truncate text-sm font-medium">{user?.username}</span>}
      </Menu>
      {changingPassword && <PasswordSheet onClose={() => setChangingPassword(false)} />}
    </>
  );
}
```

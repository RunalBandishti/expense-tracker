# Routes

## Routing model

- React Router 7 is configured explicitly in `src/App.tsx`.
- `BrowserRouter`, `ToastProvider`, and `AuthProvider` wrap the whole application.
- `/s/:token` and `/pay` render without the authenticated `Layout`.
- Every other URL enters `AppRoutes`: loading shows the logo, anonymous users see `AuthPage`, and authenticated users receive `TripsProvider` plus the responsive `Layout`.

## Route map

- `/` — `src/pages/TripsPage.tsx`; authenticated `src/pages/Layout.tsx`; event dashboard with greeting, total-spend summary, budget gauge, activity sparkline, event cards, and creation flow.
- `/trips/:tripId` — `src/pages/TripPage.tsx`; authenticated `src/pages/Layout.tsx`; main event workspace for budget, expenses, balances, insights, people, sharing, settlement, and payment.
- `/join/:token` — `src/pages/JoinPage.tsx`; authenticated `src/pages/Layout.tsx`; invitation preview and acceptance.
- `/s/:token` — `src/pages/PublicTripPage.tsx`; no authenticated layout; read-only live event view with payment actions.
- `/pay` — `src/pages/PayPage.tsx`; no authenticated layout; standalone UPI payment view.
- Any non-public URL while anonymous — `src/pages/AuthPage.tsx`; no authenticated layout; login, signup, recovery, Google authentication, and invite-aware messaging.
- Any unmatched authenticated URL — `Navigate` redirects to `/`.

## Full router configuration

File: `src/App.tsx`

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

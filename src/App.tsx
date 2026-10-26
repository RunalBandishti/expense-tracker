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

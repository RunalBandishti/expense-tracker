import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Logo } from './components/ui';
import { AuthPage } from './pages/AuthPage';
import { Layout } from './pages/Layout';
import { TripPage } from './pages/TripPage';
import { TripsPage } from './pages/TripsPage';
import { AuthProvider, useAuth } from './state/auth';
import { ToastProvider } from './state/toast';
import { TripsProvider } from './state/trips';

function AppRoutes() {
  const { state } = useAuth();

  if (state.status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Logo className="size-14 animate-pulse" />
      </div>
    );
  }

  if (state.status === 'anonymous') return <AuthPage />;

  return (
    <TripsProvider key={state.user.id}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TripsPage />} />
          <Route path="trips/:tripId" element={<TripPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TripsProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

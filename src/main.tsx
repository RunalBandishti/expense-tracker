import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { initTheme } from './lib/theme';
import './index.css';

initTheme();

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    // Home Screen apps resume instead of relaunching, so new deploys are only found by checking on return.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration?.update().catch(() => undefined);
    });
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

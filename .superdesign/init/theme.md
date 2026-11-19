# Theme

## Part 1 — Compact token summary

### System

- Tailwind CSS 4 runs through `@tailwindcss/vite`; there is no standalone `tailwind.config.*`.
- CSS-first tokens are defined in `src/index.css`.
- `src/lib/theme.ts` manages light, dark, and system preferences; `index.html` applies dark mode before first paint.

### Color palette

Light/base:

- `--color-paper: #f6f5f1`
- `--color-paper-dim: #f1efea`
- `--color-segment: #ffffff`
- Standard Tailwind `white`, `zinc`, and semantic palettes are unchanged.
- Document foreground is `var(--color-zinc-900)`.

Dark:

- Surfaces: `paper #0e0e10`, `paper-dim #131316`, `segment #3a3a41`, remapped `white #18181b`.
- Zinc: `50 #1e1e22`, `100 #26262b`, `200 #2e2e34`, `300 #3d3d44`, `400 #77777f`, `500 #a1a1aa`, `600 #babac2`, `700 #d4d4d8`, `800 #e4e4e7`, `900 #f4f4f5`, `950 #fafafa`.
- Emerald: `50 oklch(69.6% 0.17 162.48 / .12)`, `100 /.20`, `200 /.32`, `600 oklch(69.6% 0.17 162.48)`, `700 oklch(76.5% 0.177 163.223)`, `800 oklch(84.5% 0.143 164.978)`.
- Red: `50 oklch(63.7% 0.237 25.331 / .14)`, `300 /.50`, `600 oklch(70.4% 0.191 22.216)`, `700 oklch(88.5% 0.062 18.334)`.
- Amber: `50 oklch(76.9% 0.188 70.08 / .14)`, `100 /.20`, `800 oklch(92.4% 0.12 95.746)`.
- Rose, sky, violet, teal, orange, indigo, lime, and fuchsia use translucent `100` tints and light `800` foregrounds as defined below.
- Browser/PWA theme colors: light `#f6f5f1`; dark `#0e0e10`.
- Event cards use deterministic orange, emerald, violet, rose, sky, and amber `100` surfaces with `400/500` accent stripes from `src/lib/tints.ts`.

### Typography

- Sans stack: `'Inter Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif`.
- Font package: `@fontsource-variable/inter`.
- Regular body copy, medium labels/actions, semibold headings/totals.
- Tailwind scale plus recurring arbitrary sizes `11px`, `13px`, `15px`, `28px`, `30px`, `32px`, `34px`, `40px`, `46px`, and responsive `52px`.
- Financial values commonly use `tabular-nums`; headings use tight tracking.

### Spacing, radius, shadows, motion, and breakpoints

- Default Tailwind spacing; no custom spacing tokens. Common page gutters are `1.25rem` mobile and `2.5rem` desktop.
- Common radii: `0.5rem`, `0.75rem`, `1rem`, `1.5rem`, full pills/circles, and `28px` sheets.
- Card hairline shadow: `0 1px 2px rgba(0,0,0,.04)`.
- Sheet shadows: mobile `0 -10px 40px rgb(0 0 0 / .12)`; desktop `0 30px 80px rgb(0 0 0 / .18)`.
- Body texture: 1px radial dots on a 22px grid (`rgb(24 24 27 / .04)` light, white at `.05` dark).
- Breakpoints used directly: `375px` segmented-control text adjustment, `640px` sheet modal switch, `1024px` authenticated desktop layout.
- Motion: sheet rise `320ms`, pop-in `160–220ms`, fade `200ms`, progress transitions `500–700ms`, empty-state emoji bob `2.6s`; all CSS animations stop under reduced motion.

## Part 2 — Raw source dumps

### Global CSS and CSS-first tokens

File: `src/index.css`

```css
@import 'tailwindcss';
@import '@fontsource-variable/inter';

@theme {
  --font-sans: 'Inter Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --color-paper: #f6f5f1;
  --color-paper-dim: #f1efea;
  --color-segment: #ffffff;
}

/* Dark mode remaps the palette tokens the UI uses, so light-mode classes like bg-white and text-zinc-900 flip automatically. */
.dark {
  color-scheme: dark;
  --color-paper: #0e0e10;
  --color-paper-dim: #131316;
  --color-segment: #3a3a41;
  --color-white: #18181b;

  --color-zinc-50: #1e1e22;
  --color-zinc-100: #26262b;
  --color-zinc-200: #2e2e34;
  --color-zinc-300: #3d3d44;
  --color-zinc-400: #77777f;
  --color-zinc-500: #a1a1aa;
  --color-zinc-600: #babac2;
  --color-zinc-700: #d4d4d8;
  --color-zinc-800: #e4e4e7;
  --color-zinc-900: #f4f4f5;
  --color-zinc-950: #fafafa;

  --color-emerald-50: oklch(69.6% 0.17 162.48 / 0.12);
  --color-emerald-100: oklch(69.6% 0.17 162.48 / 0.2);
  --color-emerald-200: oklch(69.6% 0.17 162.48 / 0.32);
  --color-emerald-600: oklch(69.6% 0.17 162.48);
  --color-emerald-700: oklch(76.5% 0.177 163.223);
  --color-emerald-800: oklch(84.5% 0.143 164.978);

  --color-red-50: oklch(63.7% 0.237 25.331 / 0.14);
  --color-red-300: oklch(63.7% 0.237 25.331 / 0.5);
  --color-red-600: oklch(70.4% 0.191 22.216);
  --color-red-700: oklch(88.5% 0.062 18.334);

  --color-amber-50: oklch(76.9% 0.188 70.08 / 0.14);
  --color-amber-100: oklch(76.9% 0.188 70.08 / 0.2);
  --color-amber-800: oklch(92.4% 0.12 95.746);

  --color-rose-100: oklch(64.5% 0.246 16.439 / 0.2);
  --color-rose-800: oklch(89.2% 0.058 10.001);
  --color-sky-100: oklch(68.5% 0.169 237.323 / 0.2);
  --color-sky-800: oklch(90.1% 0.058 230.902);
  --color-violet-100: oklch(60.6% 0.25 292.717 / 0.2);
  --color-violet-800: oklch(89.4% 0.057 293.283);
  --color-teal-100: oklch(70.4% 0.14 182.503 / 0.2);
  --color-teal-800: oklch(91% 0.096 180.426);
  --color-orange-100: oklch(70.5% 0.213 47.604 / 0.2);
  --color-orange-800: oklch(90.1% 0.076 70.697);
  --color-indigo-100: oklch(58.5% 0.233 277.117 / 0.2);
  --color-indigo-800: oklch(87% 0.065 274.039);
  --color-lime-100: oklch(76.8% 0.233 130.85 / 0.2);
  --color-lime-800: oklch(93.8% 0.127 124.321);
  --color-fuchsia-100: oklch(66.7% 0.295 322.15 / 0.2);
  --color-fuchsia-800: oklch(90.3% 0.076 319.62);
}

@layer base {
  html {
    background-color: var(--color-paper);
    color: var(--color-zinc-900);
    -webkit-tap-highlight-color: transparent;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  html:has(dialog[open]) {
    overflow: hidden;
  }

  body {
    min-height: 100dvh;
    background-image: radial-gradient(rgb(24 24 27 / 0.04) 1px, transparent 1px);
    background-size: 22px 22px;
  }

  .dark body {
    background-image: radial-gradient(rgb(255 255 255 / 0.05) 1px, transparent 1px);
  }

  button:not(:disabled),
  select {
    cursor: pointer;
  }

  input[type='date'] {
    min-height: 1.75rem;
  }

  input[type='date']::-webkit-date-and-time-value {
    text-align: right;
  }

  input[type='date']::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.45;
  }
}

.sheet {
  margin: auto auto 0;
  width: 100%;
  max-width: 100%;
  max-height: 92dvh;
  padding: 0;
  border: 0;
  border-radius: 28px 28px 0 0;
  background: var(--color-paper);
  color: inherit;
  overflow: hidden;
  box-shadow: 0 -10px 40px rgb(0 0 0 / 0.12);
}

.sheet[open] {
  animation: sheet-up 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.sheet::backdrop {
  background: rgb(24 24 27 / 0.32);
  backdrop-filter: blur(2px);
  animation: fade-in 0.2s ease-out;
}

.dark .sheet::backdrop {
  background: rgb(0 0 0 / 0.6);
}

@media (min-width: 640px) {
  .sheet {
    margin: auto;
    max-width: 32rem;
    max-height: 88dvh;
    border-radius: 28px;
    box-shadow: 0 30px 80px rgb(0 0 0 / 0.18);
  }

  .sheet[open] {
    animation-name: pop-in;
  }
}

.menu-in {
  animation: pop-in 0.16s ease-out;
}

.toast-in {
  animation: pop-in 0.22s ease-out;
}

@keyframes sheet-up {
  from {
    transform: translateY(100%);
  }
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

.emoji-bob {
  animation: bob 2.6s ease-in-out infinite;
}

@keyframes bob {
  50% {
    transform: translateY(-4px);
  }
}

@media (prefers-reduced-motion: reduce) {

  .sheet[open],
  .sheet::backdrop,
  .menu-in,
  .toast-in,
  .emoji-bob {
    animation: none;
  }
}
```

### Event tint tokens

File: `src/lib/tints.ts`

```ts
const TINTS = [
  { card: 'bg-orange-100', stripe: 'bg-orange-400' },
  { card: 'bg-emerald-100', stripe: 'bg-emerald-500' },
  { card: 'bg-violet-100', stripe: 'bg-violet-500' },
  { card: 'bg-rose-100', stripe: 'bg-rose-400' },
  { card: 'bg-sky-100', stripe: 'bg-sky-500' },
  { card: 'bg-amber-100', stripe: 'bg-amber-400' },
] as const;

export function tripTint(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
}
```

### Theme preference store

File: `src/lib/theme.ts`

```ts
import { useSyncExternalStore } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

// Mirrored by the inline script in index.html, which applies the theme before first paint.
const STORAGE_KEY = 'em-theme';
const THEME_COLOR = { light: '#f6f5f1', dark: '#0e0e10' };

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set<() => void>();

// Storage access throws when the browser blocks site data; the choice then just isn't remembered.
function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function savePreference(value: ThemePreference) {
  try {
    if (value === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, value);
  } catch {}
}

let preference = readPreference();

function applyTheme() {
  const dark = preference === 'dark' || (preference === 'system' && systemDark.matches);
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light);
}

export function initTheme() {
  applyTheme();
  systemDark.addEventListener('change', applyTheme);
}

export function setThemePreference(value: ThemePreference) {
  preference = value;
  savePreference(value);
  applyTheme();
  listeners.forEach((listener) => listener());
}

export function useThemePreference() {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => preference,
  );
}
```

### Pre-paint theme bootstrap

File: `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#f6f5f1" />
    <script>
      try {
        var theme = localStorage.getItem('em-theme');
        if (theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
          document.querySelector('meta[name="theme-color"]').setAttribute('content', '#0e0e10');
        }
      } catch (e) {}
    </script>
    <meta name="description" content="Track expenses and budgets, and split costs with friends." />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Expenses" />
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" href="/logo.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
    <title>Expense Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Tailwind and PWA configuration

File: `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@netlify/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    netlify({
      // In dev the SPA catch-all would rewrite Vite's own module URLs to index.html.
      redirects: { enabled: false },
      // Unused here, and its Deno runtime crashes the dev server when the local Deno is incompatible.
      edgeFunctions: { enabled: false },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Expense Manager',
        short_name: 'Expenses',
        description: 'Track expenses and budgets, and split costs with friends.',
        theme_color: '#F6F5F1',
        background_color: '#F6F5F1',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // jsPDF's optional html()/SVG helpers are split into chunks the app never loads.
        globIgnores: ['**/html2canvas-*.js', '**/purify.es-*.js', '**/index.es-*.js'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        importScripts: ['/push-sw.js'],
      },
    }),
  ],
});
```

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

import { LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { setThemePreference, useThemePreference, type ThemePreference } from '../lib/theme';
import { useAuth } from '../state/auth';
import { cx, Menu, segmentClass } from './ui';

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
  const { state, logout } = useAuth();
  const username = state.status === 'authenticated' ? state.user.username : '';

  return (
    <Menu
      label="Account"
      heading={`Signed in as ${username}`}
      content={<ThemeSwitcher />}
      placement={placement}
      items={[{ label: 'Log out', icon: <LogOut className="size-4" />, onSelect: () => void logout() }]}
      triggerClassName="flex min-w-0 items-center gap-2.5 rounded-full transition hover:opacity-80"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
        {username.charAt(0).toUpperCase()}
      </span>
      {showName && <span className="truncate text-sm font-medium">{username}</span>}
    </Menu>
  );
}

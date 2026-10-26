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
  } else if (reminders.status === 'off' || reminders.status === 'blocked') {
    items.push({
      label: reminders.status === 'off' ? 'Turn on reminders' : 'Reminders are blocked',
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

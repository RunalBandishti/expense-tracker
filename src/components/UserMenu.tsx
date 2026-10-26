import { LogOut } from 'lucide-react';
import { useAuth } from '../state/auth';
import { Menu } from './ui';

export function UserMenu({ placement = 'down', showName = false }: { placement?: 'down' | 'up'; showName?: boolean }) {
  const { state, logout } = useAuth();
  const username = state.status === 'authenticated' ? state.user.username : '';

  return (
    <Menu
      label="Account"
      heading={`Signed in as ${username}`}
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

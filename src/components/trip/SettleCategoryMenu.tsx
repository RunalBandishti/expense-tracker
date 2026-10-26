import { Ellipsis, HandCoins } from 'lucide-react';
import type { Transfer } from '../../lib/split';
import type { CategoryDef } from '../../lib/types';
import { cx, Menu } from '../ui';

type Props = {
  category: CategoryDef;
  owed: Transfer[];
  onSettle: (category: CategoryDef, owed: Transfer[]) => void;
  compact?: boolean;
};

export function SettleCategoryMenu({ category, owed, onSettle, compact = false }: Props) {
  return (
    <Menu
      label={`Options for ${category.label}`}
      items={[{ label: 'Settle all', icon: <HandCoins className="size-4" />, onSelect: () => onSettle(category, owed) }]}
      triggerClassName={cx(
        'grid shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700',
        compact ? '-my-1.5 -mr-1.5 size-8' : '-mr-2 size-9',
      )}
    >
      <Ellipsis className="size-4" />
    </Menu>
  );
}

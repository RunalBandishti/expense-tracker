import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { formatMoney } from '../lib/money';
import { findPersonByName, isReservedName, splitEvenly } from '../lib/split';
import type { Person, Split } from '../lib/types';
import { Avatar, Button, cx } from './ui';

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'grid size-5 shrink-0 place-items-center rounded-md border transition',
        checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-300 bg-white',
      )}
    >
      {checked && <Check className="size-3.5" strokeWidth={3} />}
    </span>
  );
}

type Props = {
  people: Person[];
  split: Split;
  amount: number | null;
  currency: string;
  onChange: (split: Split) => void;
  onAddPerson: (name: string) => string;
};

export function SplitPicker({ people, split, amount, currency, onChange, onAddPerson }: Props) {
  const [adding, setAdding] = useState(people.length === 0);
  const [newName, setNewName] = useState('');

  const selectedIds =
    split.mode === 'all'
      ? people.map((person) => person.id)
      : people.filter((person) => split.personIds.includes(person.id)).map((person) => person.id);
  const allSelected = people.length > 0 && selectedIds.length === people.length;
  const shares = amount ? splitEvenly(amount, selectedIds) : new Map<string, number>();

  const select = (ids: string[]) => {
    const ordered = people.filter((person) => ids.includes(person.id)).map((person) => person.id);
    onChange(ordered.length === people.length ? { mode: 'all' } : { mode: 'custom', personIds: ordered });
  };

  const togglePerson = (id: string) =>
    select(selectedIds.includes(id) ? selectedIds.filter((selectedId) => selectedId !== id) : [...selectedIds, id]);

  const addPerson = () => {
    const name = newName.trim();
    if (!name || isReservedName(name)) return;
    const id = findPersonByName(people, name)?.id ?? onAddPerson(name);
    if (split.mode === 'custom' && !split.personIds.includes(id)) {
      onChange({ mode: 'custom', personIds: [...split.personIds, id] });
    }
    setNewName('');
  };

  return (
    <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      {people.length > 0 && (
        <button
          type="button"
          role="checkbox"
          aria-checked={allSelected}
          onClick={() => onChange(allSelected ? { mode: 'custom', personIds: [] } : { mode: 'all' })}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
        >
          <Checkbox checked={allSelected} />
          <span className="flex-1 text-[15px] font-semibold">All people</span>
          <span className="text-sm text-zinc-400">{people.length}</span>
        </button>
      )}

      {people.map((person) => {
        const checked = selectedIds.includes(person.id);
        return (
          <button
            key={person.id}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => togglePerson(person.id)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-zinc-50"
          >
            <Checkbox checked={checked} />
            <Avatar person={person} size="sm" />
            <span className={cx('min-w-0 flex-1 truncate text-[15px]', !checked && 'text-zinc-400')}>{person.name}</span>
            <span className="text-sm tabular-nums text-zinc-500">
              {checked && amount ? formatMoney(shares.get(person.id) ?? 0, currency) : '—'}
            </span>
          </button>
        );
      })}

      {adding ? (
        <div className="flex items-center gap-2 px-3 py-2">
          <input
            autoFocus={people.length > 0}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addPerson();
              }
            }}
            placeholder={people.length ? 'Name' : 'Add the people on this trip'}
            aria-label="New person's name"
            autoCapitalize="words"
            enterKeyHint="done"
            className="h-10 min-w-0 flex-1 rounded-xl bg-zinc-100 px-3 text-base outline-none focus:ring-2 focus:ring-emerald-600/70"
          />
          <Button size="sm" onClick={addPerson} disabled={!newName.trim()}>
            Add
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-3 px-4 py-3 text-[15px] font-medium text-emerald-700 transition hover:bg-emerald-50/60"
        >
          <Plus className="size-5" />
          Add person
        </button>
      )}
    </div>
  );
}

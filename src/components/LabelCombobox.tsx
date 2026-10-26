import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { findPersonByName, isReservedName } from '../lib/split';
import { COMMON, type Person } from '../lib/types';
import { Avatar, CommonAvatar, cx } from './ui';

type Option = { kind: 'common' } | { kind: 'person'; person: Person } | { kind: 'create'; name: string };

function buildOptions(people: Person[], query: string, includeCommon: boolean) {
  const name = query.trim();
  const needle = name.toLowerCase();
  const matches = people.filter((person) => person.name.toLowerCase().includes(needle));
  const exactMatch = isReservedName(name) || !!findPersonByName(people, name);
  const firstPersonIndex = includeCommon ? 1 : 0;
  const options: Option[] = [
    ...(includeCommon ? [{ kind: 'common' as const }] : []),
    ...matches.map((person) => ({ kind: 'person' as const, person })),
    ...(name && !exactMatch ? [{ kind: 'create' as const, name }] : []),
  ];
  // While typing, Enter should pick the first person match (or "create") rather than the pinned Common row.
  const defaultIndex = needle ? (matches.length ? firstPersonIndex : options.length - 1) : 0;
  return { options, matches, needle, defaultIndex, firstPersonIndex };
}

function Highlight({ text, needle }: { text: string; needle: string }) {
  const start = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (start < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, start)}
      <span className="font-semibold text-zinc-900">{text.slice(start, start + needle.length)}</span>
      {text.slice(start + needle.length)}
    </>
  );
}

type Props = {
  people: Person[];
  value: string | null;
  onChange: (id: string) => void;
  /** Adds a new person to the trip and returns its id. */
  onCreate: (name: string) => string;
  onClear?: () => void;
  includeCommon?: boolean;
  label?: string;
  placeholder?: string;
  invalid?: boolean;
};

export function LabelCombobox({
  people,
  value,
  onChange,
  onCreate,
  onClear,
  includeCommon = true,
  label = 'Who is this expense for',
  placeholder = 'Who is it for? Pick or type a name',
  invalid,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const { options, matches, needle, firstPersonIndex } = buildOptions(people, query, includeCommon);
  const selectedPerson = people.find((person) => person.id === value);
  const selectedName = value === COMMON ? 'Common' : (selectedPerson?.name ?? '');

  const isSelected = (option: Option) =>
    (option.kind === 'common' && value === COMMON) || (option.kind === 'person' && option.person.id === value);

  const openList = () => {
    setOpen(true);
    setQuery('');
    setActiveIndex(Math.max(buildOptions(people, '', includeCommon).options.findIndex(isSelected), 0));
  };

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const choose = (option: Option | undefined) => {
    if (!option) return;
    if (option.kind === 'common') onChange(COMMON);
    else if (option.kind === 'person') onChange(option.person.id);
    else onChange(onCreate(option.name));
    close();
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openList();
      }
      return;
    }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && options.length) {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (index + step + options.length) % options.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(options[Math.min(activeIndex, options.length - 1)]);
    } else if (event.key === 'Escape') {
      // Keep Escape from also closing the surrounding sheet.
      event.preventDefault();
      event.stopPropagation();
      close();
      inputRef.current?.blur();
    }
  };

  const renderOption = (option: Option, index: number) => {
    const active = index === activeIndex;
    return (
      <li
        key={option.kind === 'person' ? option.person.id : option.kind}
        id={`${listId}-${index}`}
        role="option"
        aria-selected={isSelected(option)}
        onMouseDown={(event) => event.preventDefault()}
        onMouseMove={(event) => {
          // Browsers fire zero-movement events when the list renders under a still cursor; those must not steal Enter.
          if (event.movementX || event.movementY) setActiveIndex(index);
        }}
        onClick={() => choose(option)}
        className={cx(
          'flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors',
          option.kind === 'create'
            ? cx('mt-1 ring-1 ring-emerald-200', active ? 'bg-emerald-100' : 'bg-emerald-50')
            : active && 'bg-zinc-100',
        )}
      >
        {option.kind === 'common' && (
          <>
            <CommonAvatar size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">Common</p>
              <p className="text-xs text-zinc-500">Split between people</p>
            </div>
          </>
        )}
        {option.kind === 'person' && (
          <>
            <Avatar person={option.person} size="sm" />
            <p className="min-w-0 flex-1 truncate text-[15px] text-zinc-700">
              <Highlight text={option.person.name} needle={needle} />
            </p>
          </>
        )}
        {option.kind === 'create' && (
          <>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
              <Plus className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-emerald-800">Create “{option.name}”</p>
              <p className="text-xs text-emerald-700/80">New label for this event</p>
            </div>
          </>
        )}
        {isSelected(option) && <Check className="size-4 text-emerald-600" />}
      </li>
    );
  };

  return (
    <div
      className={cx(
        'rounded-2xl border bg-white p-2 transition-shadow',
        open ? 'border-zinc-200 shadow-[0_10px_30px_rgba(0,0,0,.06)]' : invalid ? 'border-red-300' : 'border-zinc-200',
      )}
    >
      <div
        className={cx(
          'flex items-center gap-2.5 rounded-xl px-2.5 transition',
          open ? 'bg-zinc-100 ring-2 ring-emerald-600/70' : 'hover:bg-zinc-50',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {!open && value === COMMON ? (
          <CommonAvatar size="xs" />
        ) : !open && selectedPerson ? (
          <Avatar person={selectedPerson} size="xs" />
        ) : (
          <Search className="size-4 shrink-0 text-zinc-400" />
        )}
        <input
          ref={inputRef}
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options.length ? `${listId}-${activeIndex}` : undefined}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
          value={open ? query : selectedName}
          placeholder={open ? selectedName || 'Type a name…' : placeholder}
          onFocus={openList}
          onBlur={close}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(buildOptions(people, event.target.value, includeCommon).defaultIndex);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="h-11 min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:font-normal placeholder:text-zinc-400"
        />
        {!open && value && onClear ? (
          <button
            type="button"
            aria-label="Clear"
            onClick={(event) => {
              event.stopPropagation();
              onClear();
            }}
            className="grid size-7 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="size-4" />
          </button>
        ) : (
          !open && <ChevronDown className="size-4 shrink-0 text-zinc-400" />
        )}
      </div>

      {open && (
        <ul id={listId} role="listbox" aria-label={label} className="mt-1 max-h-72 overflow-y-auto overscroll-contain">
          {includeCommon && renderOption(options[0], 0)}
          <li role="presentation" className="px-2 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            People
          </li>
          {matches.length === 0 && (
            <li role="presentation" className="px-2 py-1.5 text-sm text-zinc-400">
              {needle ? `No match for “${query.trim()}”` : 'No people yet. Type a name to add one.'}
            </li>
          )}
          {options.slice(firstPersonIndex).map((option, index) => renderOption(option, index + firstPersonIndex))}
        </ul>
      )}
    </div>
  );
}

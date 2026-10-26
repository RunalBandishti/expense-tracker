import { findPersonByName } from '../lib/split';
import type { Person } from '../lib/types';
import { useSavedPeople } from '../state/trips';
import { Avatar } from './ui';

const MAX_SUGGESTIONS = 6;

export function matchingSavedPeople(savedPeople: Person[], query: string, exclude: Person[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return savedPeople
    .filter((person) => person.name.toLowerCase().includes(needle) && !findPersonByName(exclude, person.name))
    .slice(0, MAX_SUGGESTIONS);
}

type Props = { query: string; exclude: Person[]; onPick: (name: string) => void };

export function SavedPeopleSuggestions({ query, exclude, onPick }: Props) {
  const matches = matchingSavedPeople(useSavedPeople(), query, exclude);
  if (matches.length === 0) return null;

  return (
    <div role="group" aria-label="Saved people" className="mt-2 flex flex-wrap gap-1.5">
      {matches.map((person) => (
        <button
          key={person.name}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(person.name)}
          className="flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-1 pl-1 pr-3 text-sm font-medium transition hover:bg-zinc-50"
        >
          <Avatar person={person} size="xs" />
          <span className="truncate">{person.name}</span>
        </button>
      ))}
    </div>
  );
}

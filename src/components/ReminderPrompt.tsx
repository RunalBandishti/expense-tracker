import { useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { reminderTimesLabel } from '../lib/reminders';
import { readStored, REMINDER_PROMPT_KEY, writeStored } from '../lib/storage';
import { useReminders } from '../state/reminders';
import { Button } from './ui';

export function ReminderPrompt() {
  const { status, turnOn } = useReminders();
  const [dismissed, setDismissed] = useState(() => readStored<boolean>(REMINDER_PROMPT_KEY) === true);
  if (status !== 'off' || dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white py-3 pl-4 pr-2">
      <BellRing className="size-5 shrink-0 text-emerald-700" />
      <p className="min-w-0 flex-1 text-sm text-zinc-600">
        Get a reminder at {reminderTimesLabel} to log expenses while this event is on.
      </p>
      <Button size="sm" onClick={() => void turnOn()}>
        Turn on
      </Button>
      <button
        type="button"
        aria-label="Dismiss reminder suggestion"
        onClick={() => {
          writeStored(REMINDER_PROMPT_KEY, true);
          setDismissed(true);
        }}
        className="grid size-8 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-900/5 hover:text-zinc-700"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

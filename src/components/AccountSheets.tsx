import { useId, useState, type FormEvent } from 'react';
import { Copy } from 'lucide-react';
import { copyText } from '../lib/share';
import { useAuth } from '../state/auth';
import { useToast } from '../state/toast';
import { Button, FieldError, FormRow, rowInputClass, Sheet } from './ui';

export function RecoveryCodeSheet({ code, onClose }: { code: string; onClose: () => void }) {
  const toast = useToast();
  return (
    <Sheet title="Your recovery code" onClose={onClose} cancelLabel="Close">
      <p className="px-1 text-sm text-zinc-500">
        If you ever forget your password, this code and your username let you set a new one. Each code works once,
        so save it somewhere safe, like your password manager or notes.
      </p>
      <p className="mt-5 select-all rounded-2xl border border-zinc-200 bg-white px-4 py-5 text-center font-mono text-xl font-semibold tracking-[0.12em]">
        {code}
      </p>
      <div className="mt-4 grid gap-2">
        <Button variant="secondary" size="lg" onClick={() => copyText(code).then(() => toast({ message: 'Recovery code copied' }))}>
          <Copy className="size-4" />
          Copy code
        </Button>
        <Button size="lg" onClick={onClose}>
          I've saved it
        </Button>
      </div>
    </Sheet>
  );
}

export function PasswordSheet({ onClose }: { onClose: () => void }) {
  const { changePassword } = useAuth();
  const toast = useToast();
  const formId = useId();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (next.length < 8) return setError('Use at least 8 characters for the new password');
    if (next !== confirm) return setError("The new passwords don't match");
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      toast({ message: 'Password changed. Other devices were signed out.' });
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const fields = [
    { id: 'current', label: 'Current', value: current, set: setCurrent, autoComplete: 'current-password' },
    { id: 'new', label: 'New', value: next, set: setNext, autoComplete: 'new-password' },
    { id: 'confirm', label: 'Confirm', value: confirm, set: setConfirm, autoComplete: 'new-password' },
  ];

  return (
    <Sheet title="Change password" onClose={onClose} formId={formId}>
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
          {fields.map((field) => (
            <FormRow key={field.id} label={field.label} htmlFor={`${formId}-${field.id}`}>
              <input
                id={`${formId}-${field.id}`}
                type="password"
                value={field.value}
                onChange={(event) => field.set(event.target.value)}
                autoComplete={field.autoComplete}
                className={rowInputClass}
              />
            </FormRow>
          ))}
        </div>
        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          Change password
        </Button>
      </form>
    </Sheet>
  );
}

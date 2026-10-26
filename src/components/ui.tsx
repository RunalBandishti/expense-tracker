import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, CloudOff, LoaderCircle, Users } from 'lucide-react';
import { currencySymbol, sanitizeAmountInput } from '../lib/money';
import type { Person } from '../lib/types';
import { useToastHost } from '../state/toast';
import type { SyncStatus } from '../state/trips';

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

const BUTTON_VARIANTS = {
  primary: 'bg-zinc-900 text-white shadow-sm hover:bg-zinc-800',
  secondary: 'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50',
  ghost: 'text-zinc-600 hover:bg-zinc-900/5 hover:text-zinc-900',
  danger: 'text-red-600 hover:bg-red-50',
};
const BUTTON_SIZES = { sm: 'h-8 gap-1.5 px-3 text-xs', md: 'h-10 gap-2 px-4 text-sm', lg: 'h-12 gap-2 px-6 text-[15px]' };

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
};

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
    />
  );
}

export function IconButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'grid size-10 shrink-0 place-items-center rounded-full text-zinc-600 transition hover:bg-zinc-900/5 hover:text-zinc-900 active:scale-95',
        className,
      )}
    />
  );
}

const AVATAR_TONES = [
  'bg-emerald-100 text-emerald-800',
  'bg-rose-100 text-rose-800',
  'bg-sky-100 text-sky-800',
  'bg-amber-100 text-amber-800',
  'bg-violet-100 text-violet-800',
  'bg-teal-100 text-teal-800',
  'bg-orange-100 text-orange-800',
  'bg-indigo-100 text-indigo-800',
  'bg-lime-100 text-lime-800',
  'bg-fuchsia-100 text-fuchsia-800',
];
const AVATAR_SIZES = { xs: 'size-6 text-[11px]', sm: 'size-8 text-[13px]', md: 'size-10 text-sm', lg: 'size-12 text-base' };

function toneFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

export function Avatar({ person, size = 'md' }: { person: Person; size?: keyof typeof AVATAR_SIZES }) {
  return (
    <span
      aria-hidden
      className={cx('grid shrink-0 place-items-center rounded-full font-semibold', AVATAR_SIZES[size], toneFor(person.id))}
    >
      {person.name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

export function CommonAvatar({ size = 'md' }: { size?: keyof typeof AVATAR_SIZES }) {
  return (
    <span aria-hidden className={cx('grid shrink-0 place-items-center rounded-full bg-zinc-900 text-white', AVATAR_SIZES[size])}>
      <Users className="size-[55%]" />
    </span>
  );
}

export function ProgressBar({ ratio, className = 'h-1.5' }: { ratio: number; className?: string }) {
  const tone = ratio > 1 ? 'bg-red-500' : ratio >= 0.85 ? 'bg-amber-500' : 'bg-emerald-600';
  return (
    <div className={cx('overflow-hidden rounded-full bg-zinc-200/80', className)}>
      <div
        className={cx('h-full rounded-full transition-[width] duration-500', tone)}
        style={{ width: `${Math.min(ratio, 1) * 100}%` }}
      />
    </div>
  );
}

type SheetProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  formId?: string;
  submitLabel?: string;
  cancelLabel?: string;
};

export function Sheet({ title, onClose, children, formId, submitLabel = 'Save', cancelLabel = 'Cancel' }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  const registerToastHost = useToastHost();

  useEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    (dialog.querySelector<HTMLElement>('[data-autofocus]') ?? dialog).focus();
    const unregisterToastHost = registerToastHost(dialog);
    return () => {
      unregisterToastHost();
      dialog.close();
    };
  }, [registerToastHost]);

  return (
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      className="sheet outline-none"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressStartedOnBackdrop.current && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-zinc-300 sm:hidden" />
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pb-1 pt-2 sm:pt-3">
          <button
            type="button"
            onClick={onClose}
            className="justify-self-start rounded-full px-3 py-2 text-[15px] text-zinc-500 transition hover:text-zinc-900"
          >
            {cancelLabel}
          </button>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {formId ? (
            <button
              type="submit"
              form={formId}
              className="justify-self-end rounded-full px-3 py-2 text-[15px] font-semibold text-emerald-700 transition hover:text-emerald-800"
            >
              {submitLabel}
            </button>
          ) : (
            <span />
          )}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3">
          {children}
        </div>
      </div>
    </dialog>
  );
}

export type MenuItem = { label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean };

const MENU_GAP = 8;
const MENU_FLIP_SPACE = 280;

export function Menu({
  label,
  heading,
  content,
  items,
  children,
  placement = 'down',
  triggerClassName,
}: {
  label: string;
  heading?: string;
  content?: ReactNode;
  items: MenuItem[];
  children: ReactNode;
  placement?: 'down' | 'up';
  triggerClassName?: string;
}) {
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = position !== null;

  useEffect(() => {
    if (!open) return;
    const close = () => setPosition(null);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  const toggle = () => {
    if (open) return setPosition(null);
    const rect = triggerRef.current!.getBoundingClientRect();
    const above = placement === 'up' || window.innerHeight - rect.bottom < MENU_FLIP_SPACE;
    setPosition({
      ...(above ? { bottom: window.innerHeight - rect.top + MENU_GAP } : { top: rect.bottom + MENU_GAP }),
      ...(placement === 'up' ? { left: rect.left } : { right: window.innerWidth - rect.right }),
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={triggerClassName}
      >
        {children}
      </button>
      {position &&
        // Rendered at the body so lists with overflow-hidden (rounded cards) can't clip it.
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={position}
            className="menu-in fixed z-40 min-w-52 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-black/10"
          >
            {heading && <p className="truncate px-3 pb-1.5 pt-2 text-xs text-zinc-500">{heading}</p>}
            {content}
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setPosition(null);
                  item.onSelect();
                }}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition',
                  item.danger ? 'text-red-600 hover:bg-red-50' : 'text-zinc-800 hover:bg-zinc-100',
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export const segmentClass = (selected: boolean) =>
  selected ? 'bg-segment text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800';

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" className="flex rounded-xl bg-zinc-200/70 p-1 text-sm font-medium">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          onClick={() => onChange(option.value)}
          className={cx('flex-1 rounded-lg py-1.5 transition', segmentClass(option.value === value))}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SyncBadge({ status, pendingCount = 0 }: { status: SyncStatus; pendingCount?: number }) {
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
        <LoaderCircle className="size-3.5 animate-spin" />
        Saving…
      </span>
    );
  }
  if (status === 'offline') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
        <CloudOff className="size-3.5" />
        {pendingCount > 0 ? `Offline · ${pendingCount} unsynced` : 'Offline'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
      <Check className="size-3.5" />
      Saved
    </span>
  );
}

export function FormRow({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[52px] items-center gap-4 px-4">
      <label htmlFor={htmlFor} className="shrink-0 text-[15px] text-zinc-500">
        {label}
      </label>
      <div className="flex min-w-0 flex-1 justify-end">{children}</div>
    </div>
  );
}

export const rowInputClass =
  'w-full min-w-0 bg-transparent text-right text-base font-medium outline-none placeholder:font-normal placeholder:text-zinc-400';

export const rowDateInputClass = 'min-w-0 bg-transparent text-right text-base font-medium outline-none';

export function FieldError({ children }: { children: ReactNode }) {
  return <p className="mt-2 px-1 text-sm text-red-600">{children}</p>;
}

export function AmountInput({
  value,
  onChange,
  currency,
  autoFocus,
  error,
}: {
  value: string;
  onChange: (text: string) => void;
  currency: string;
  autoFocus?: boolean;
  error?: string | null;
}) {
  return (
    <label className="block text-center">
      <span className="flex items-baseline justify-center gap-1">
        <span className="text-[34px] font-semibold text-zinc-300 sm:text-[40px]">{currencySymbol(currency)}</span>
        <input
          data-autofocus={autoFocus || undefined}
          inputMode="decimal"
          enterKeyHint="next"
          placeholder="0"
          aria-label="Amount"
          value={value}
          onChange={(event) => onChange(sanitizeAmountInput(event.target.value))}
          style={{ width: `${Math.max(value.length, 1) + 0.6}ch` }}
          className="max-w-full bg-transparent text-center text-[46px] font-semibold leading-tight tracking-tight tabular-nums outline-none placeholder:text-zinc-300 sm:text-[52px]"
        />
      </span>
      <span className="text-xs text-zinc-500">Amount</span>
      {error && <FieldError>{error}</FieldError>}
    </label>
  );
}

export function SelectInput({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative flex items-center">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="appearance-none bg-transparent pr-6 text-right text-base font-medium outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-0 size-4 text-zinc-400" />
    </div>
  );
}

export function SectionLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{children}</h3>
      {aside}
    </div>
  );
}

export function EmptyState({ emoji, title, body, action }: { emoji: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-zinc-300 bg-white/60 px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-white text-3xl shadow-sm ring-1 ring-zinc-200">{emoji}</span>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-zinc-500">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <LoaderCircle className="size-6 animate-spin text-zinc-400" />
    </div>
  );
}

export function CategoryTile({ emoji, size = 'md' }: { emoji: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cx(
        'grid shrink-0 place-items-center rounded-xl bg-zinc-100',
        size === 'md' ? 'size-10 text-lg' : 'size-8 text-base',
      )}
    >
      {emoji}
    </span>
  );
}

export function Logo({ className = 'size-9' }: { className?: string }) {
  return <img src="/logo.svg" alt="" className={cx('rounded-[28%]', className)} />;
}

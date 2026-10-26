import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ToastInput = { message: string; tone?: 'error'; action?: { label: string; run: () => void } };
type Toast = ToastInput & { id: number };

type ToastContextValue = {
  show: (toast: ToastInput) => void;
  /** Toasts render inside the newest registered host; an open modal sheet makes everything outside it inert. */
  registerHost: (host: HTMLElement) => () => void;
};

const ToastContext = createContext<ToastContextValue>({ show: () => {}, registerHost: () => () => {} });

export const useToast = () => useContext(ToastContext).show;
export const useToastHost = () => useContext(ToastContext).registerHost;

let nextToastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hosts, setHosts] = useState<HTMLElement[]>([]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const show = useCallback(
    (toast: ToastInput) => {
      const id = nextToastId++;
      setToasts((list) => [...list.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), toast.action ? 6000 : 3500);
    },
    [dismiss],
  );

  const registerHost = useCallback((host: HTMLElement) => {
    setHosts((list) => [...list, host]);
    return () => setHosts((list) => list.filter((candidate) => candidate !== host));
  }, []);

  const value = useMemo(() => ({ show, registerHost }), [show, registerHost]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-8"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast-in pointer-events-auto flex max-w-sm items-center gap-4 rounded-full py-2.5 pl-5 pr-2.5 text-sm font-medium text-white shadow-xl shadow-black/20 ${
                toast.tone === 'error' ? 'bg-red-600' : 'bg-zinc-900'
              }`}
            >
              <span className="py-0.5">{toast.message}</span>
              {toast.action ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.action!.run();
                    dismiss(toast.id);
                  }}
                  className="rounded-full bg-white/15 px-3 py-1 font-semibold hover:bg-white/25"
                >
                  {toast.action.label}
                </button>
              ) : (
                <span className="w-1.5" />
              )}
            </div>
          ))}
        </div>,
        hosts.at(-1) ?? document.body,
      )}
    </ToastContext.Provider>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import clsx from "clsx";

/**
 * The admin's own pop-up, in place of the browser's confirm(): a card in the middle on a
 * computer, a sheet from the bottom on a phone. Esc or tapping outside closes it.
 */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fade-in absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="dialog-in relative w-full max-w-md rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-m-1 rounded-full p-1 text-muted hover:bg-black/5 hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

type ConfirmOptions = {
  title: string;
  body?: React.ReactNode;
  confirmLabel: string;
  /** Red button, and Cancel gets the focus, for things that can't be undone. */
  danger?: boolean;
};

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/** `const confirm = useConfirm(); if (await confirm({...})) …` */
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm needs <ConfirmProvider>");
  return confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setRequest({ ...options, resolve })),
    [],
  );
  const answer = useCallback(
    (ok: boolean) => {
      request?.resolve(ok);
      setRequest(null);
    },
    [request],
  );
  const cancel = useCallback(() => answer(false), [answer]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <Dialog title={request.title} onClose={cancel}>
          {request.body && (
            <div className="mt-2 flex gap-3 text-sm text-muted">
              {request.danger && <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />}
              <div>{request.body}</div>
            </div>
          )}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={cancel} autoFocus={request.danger} className="h-11 rounded-lg border border-line px-4 font-semibold hover:bg-black/5 sm:h-10">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => answer(true)}
              autoFocus={!request.danger}
              className={clsx("h-11 rounded-lg px-4 font-semibold text-white sm:h-10", request.danger ? "bg-red-600 hover:bg-red-700" : "bg-foreground hover:bg-foreground/90")}
            >
              {request.confirmLabel}
            </button>
          </div>
        </Dialog>
      )}
    </ConfirmContext.Provider>
  );
}

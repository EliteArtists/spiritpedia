'use client';

import { useEffect, useId, useRef } from 'react';

// The confirmation step in front of every irreversible admin action.
//
// Same mechanics as PractitionerModal on the public side — focus moved in and
// handed back, a Tab trap, Escape to dismiss, the page held still underneath,
// and a backdrop press that must both start and end on the backdrop. Styled
// destructive rather than inviting: the primary button here is the one nobody
// should press by accident.
//
// `error` renders INSIDE the dialog and the dialog stays open, because a failed
// delete that closes the modal looks exactly like a successful one.
export default function ConfirmDelete({
  open,
  title,
  body,
  consequences = [],
  confirmLabel = 'Delete',
  busy = false,
  error = null,
  done = null,
  onCancel,
  onConfirm,
}) {
  const cardRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    returnFocusRef.current = document.activeElement;
    const card = cardRef.current;

    // Focus the dialog itself, not the Delete button. Landing on the
    // destructive control means a stray Return key confirms it.
    card?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (!busy) onCancel?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = card?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === card)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      const target = returnFocusRef.current;
      if (target && document.body.contains(target)) target.focus?.();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel?.();
      }}
    >
      <div
        ref={cardRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#111827] p-6 shadow-2xl outline-none"
      >
        <h3 id={titleId} className="text-lg font-bold text-white">
          {title}
        </h3>
        <p id={descId} className="mt-2 text-sm leading-relaxed text-slate-400">
          {body}
        </p>

        {consequences.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-200/80">
            {consequences.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
        )}

        {error && (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </p>
        )}

        {done && <p className="mt-3 text-xs font-semibold text-emerald-400">{done}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || Boolean(done)}
            className="rounded-full bg-red-600 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

// Declining something emails the person with a reason (the approved copy's
// D4, D8 and D11). This is where the admin writes it: the confirm button stays
// off until there is one, and the box says plainly who will read it.
export default function ReasonBox({ title, confirmLabel, busy, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const ready = reason.trim().length > 0;

  return (
    <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
      <p className="text-sm font-bold text-red-300">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-red-200/70">
        They read this in their email, after “Reason:”. Keep private notes out of it.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="The reason, in a sentence or two"
        className="mt-3 w-full rounded-lg border border-white/10 bg-[#0a0f1d] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-red-400 focus:outline-none"
      />
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/5 disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(reason.trim())}
          disabled={busy || !ready}
          className="rounded-full bg-red-600 px-5 py-1.5 text-xs font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? '…' : confirmLabel}
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import ConfirmDelete from '@/components/admin/ConfirmDelete';

// "Do not contact this email address" (owner, 20 Nov 2026; migration 0055).
// On a listing's Outreach tab, and in Admin → Outreach (Up next, and each
// journey). Asks first, then POST /api/admin/do-not-contact: the address is
// never sent anything again, comes off every listing that shows it, and any
// running journey to it stops. `onDone` reloads whatever showed it.
export default function DoNotContactButton({ email, onDone, compact = false }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  if (!email) return null;

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/do-not-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, note }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.message || json.error || `Failed (${res.status})`);
      } else {
        const names = json.listings.map((l) => l.name);
        setDone(
          [
            `${json.email} is do not contact.`,
            names.length ? `Taken off ${names.join(', ')}.` : 'No listing shows it now.',
            json.stopped ? `${json.stopped} journey${json.stopped === 1 ? '' : 's'} stopped.` : '',
            json.problems?.length ? `Not changed: ${json.problems.join('; ')}` : '',
          ]
            .filter(Boolean)
            .join(' ')
        );
        setTimeout(() => {
          setOpen(false);
          setDone(null);
          onDone?.();
        }, 1800);
      }
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setError(null);
          setDone(null);
          setOpen(true);
        }}
        className={
          compact
            ? 'shrink-0 rounded-full border border-red-500/40 px-3 py-1 text-[11px] font-bold text-red-400 hover:bg-red-500/10'
            : 'rounded-full border border-red-500/40 px-4 py-1.5 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10'
        }
      >
        {compact ? 'Do not contact' : 'Do not contact this email address'}
      </button>
      <ConfirmDelete
        open={open}
        title={`Never email ${email} again?`}
        body="Spiritpedia will never send this address anything again: no outreach, and no other email either."
        consequences={[
          'It comes off every listing that shows it (each change is logged)',
          'Any running or paused journey to it stops',
          'It is left out of Up next, and Start refuses it',
          'A sprint or ingest that adds it back has it cleared by the database',
        ]}
        confirmLabel="Do not contact"
        busyLabel="Saving…"
        busy={busy}
        error={error}
        done={done}
        onCancel={() => setOpen(false)}
        onConfirm={confirm}
      >
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why, for the record (optional): asked to be removed, …"
          className="mt-3 w-full rounded-lg border border-white/10 bg-[#0a0f1d] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[#7c3aed] focus:outline-none"
        />
      </ConfirmDelete>
    </>
  );
}

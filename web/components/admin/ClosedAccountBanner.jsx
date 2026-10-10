'use client';

import { useState } from 'react';

// Shown on a listing's admin page when it was opened from a "Closed account"
// Inbox item (?closed={account_deletions.id}). The owner has deleted their
// account; the listing stays, but the contact details and photos they added
// should come off it. "Mark reviewed" takes the item out of the Inbox.
export default function ClosedAccountBanner({ closedId }) {
  const [state, setState] = useState('open'); // open | saving | done | error

  if (!closedId) return null;

  async function markReviewed() {
    setState('saving');
    try {
      const res = await fetch('/api/admin/account-deletions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: closedId }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-300">
        ✅ Marked reviewed — it has left the Inbox.
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-xl border border-slate-500/40 bg-slate-500/10 p-4 text-sm text-slate-200">
      <p className="font-semibold text-white">The owner of this listing has deleted their account.</p>
      <p className="mt-1 text-slate-300">
        The listing stays on Spiritpedia, unclaimed. Remove the personal details they added — contact
        email, phone, booking link, social links and any photos of theirs — then mark it reviewed.
      </p>
      <button
        type="button"
        onClick={markReviewed}
        disabled={state === 'saving'}
        className="mt-3 rounded-lg bg-[#7c3aed] px-4 py-2 text-xs font-bold text-white hover:bg-[#6d28d9] disabled:opacity-60"
      >
        {state === 'saving' ? 'Saving…' : 'Mark reviewed'}
      </button>
      {state === 'error' && <span className="ml-3 text-red-300">That did not save — try again.</span>}
    </div>
  );
}

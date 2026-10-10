'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabaseAuth } from '../utils/supabaseAuth.js';
import { CONTENT_TYPES, writeFavorites } from '../utils/favorites.js';
import { forgetAccountMerge } from '../utils/favouritesSync.js';

// Self-serve account deletion — POST /api/account/delete, the same route the
// app uses. Two steps: the button opens an explanation, and the person types
// DELETE to confirm. It cannot be undone, so the explanation says exactly what
// goes and what stays.
//
// `hasListing`: a practitioner with a claimed public profile is told that the
// listing stays, unclaimed, and that we remove the details they added.
export default function DeleteAccount({ hasListing = false }) {
  const [step, setStep] = useState('closed'); // closed | confirming | deleting | deleted
  const [typed, setTyped] = useState('');
  const [error, setError] = useState(null);

  async function confirmDelete() {
    if (typed.trim() !== 'DELETE' || step === 'deleting') return;
    setStep('deleting');
    setError(null);
    try {
      const { data } = await supabaseAuth.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error('signed_out');
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE', source: 'website' }),
      });
      if (!res.ok) throw new Error('failed');
    } catch (err) {
      setStep('confirming');
      setError(
        err.message === 'signed_out'
          ? 'Your session has ended. Sign in again, then delete your account.'
          : 'Your account could not be deleted just now. Nothing was removed — please try again.'
      );
      return;
    }
    // The account is gone. Leave nothing of it in this browser: the saved
    // items, then the session (local only — the server side no longer exists).
    for (const key of Object.keys(CONTENT_TYPES)) writeFavorites(key, []);
    forgetAccountMerge();
    await supabaseAuth.auth.signOut({ scope: 'local' }).catch(() => {});
    setStep('deleted');
  }

  if (step === 'deleted') {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5 text-left">
        <p className="text-sm font-semibold text-white">Your account has been deleted.</p>
        <p className="mt-1 text-sm text-gray-400">
          Thank you for being part of Spiritpedia. You can keep exploring without an account.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-full bg-[#7c3aed] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6d28d9]"
        >
          Back to Spiritpedia
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 p-5 text-left">
      <p className="text-sm font-semibold text-white">Delete account</p>
      {step === 'closed' ? (
        <button
          type="button"
          onClick={() => setStep('confirming')}
          className="mt-3 rounded-full border border-red-500/40 px-5 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10"
        >
          Delete account
        </button>
      ) : (
        <div className="mt-3">
          <p className="text-sm leading-relaxed text-gray-300">
            This permanently deletes your account, your saved items and any reviews you have
            written. It cannot be undone.
          </p>
          {hasListing && (
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              Your public teacher profile stays on Spiritpedia, unclaimed. We will remove the contact
              details and photos you added to it. If you would like the profile removed entirely,
              email love@spiritpedia.co.
            </p>
          )}
          <label className="mt-4 block text-sm text-gray-400" htmlFor="confirm-delete">
            Type DELETE to confirm
          </label>
          <input
            id="confirm-delete"
            type="text"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0f1d] px-4 py-3 text-sm text-white outline-none focus:border-red-400/60"
          />
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={confirmDelete}
              disabled={typed.trim() !== 'DELETE' || step === 'deleting'}
              className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {step === 'deleting' ? 'Deleting…' : 'Delete my account'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('closed');
                setTyped('');
                setError(null);
              }}
              disabled={step === 'deleting'}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

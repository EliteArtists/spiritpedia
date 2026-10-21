'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthShell from '@/components/AuthShell';

// Asks first, then unsubscribes: mail scanners open every link in an email,
// and a link that unsubscribed on opening would unsubscribe people who never
// clicked it. The token in the link is the only key (email_preferences).
export default function UnsubscribeForm() {
  const token = useSearchParams().get('token') || '';
  const [state, setState] = useState('ask'); // ask | sending | done | failed

  const unsubscribe = async () => {
    setState('sending');
    try {
      const res = await fetch('/api/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      setState(res.ok ? 'done' : 'failed');
    } catch {
      setState('failed');
    }
  };

  return (
    <AuthShell>
      {state === 'done' ? (
        <>
          <h1 className="mt-8 text-2xl font-bold leading-snug">You’re unsubscribed.</h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-400">
            You won’t receive any more discovery emails. Emails about your account, your reviews and anything you
            submit will still reach you.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-8 text-2xl font-bold leading-snug">Unsubscribe from discovery emails?</h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-400">
            We’ll stop sending introductions and personal discoveries. Emails about your account, your reviews and
            anything you submit will still reach you.
          </p>
          <button
            type="button"
            onClick={unsubscribe}
            disabled={!token || state === 'sending'}
            className="mt-8 w-full rounded-full bg-[#7c3aed] px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === 'sending' ? 'Unsubscribing…' : 'Unsubscribe'}
          </button>
          {(state === 'failed' || !token) && (
            <p role="alert" className="mt-5 text-sm leading-relaxed text-red-400">
              {token
                ? 'That didn’t work. Please try again, or email love@spiritpedia.co and we’ll do it for you.'
                : 'This link is incomplete. Email love@spiritpedia.co and we’ll unsubscribe you.'}
            </p>
          )}
        </>
      )}
      <Link href="/" className="mt-8 inline-block text-sm text-gray-500 underline underline-offset-4 hover:text-white">
        Back to Spiritpedia
      </Link>
    </AuthShell>
  );
}

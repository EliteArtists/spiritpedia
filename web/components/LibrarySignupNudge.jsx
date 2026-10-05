'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, signInWithOtp } from '../utils/supabaseAuth.js';
import { recordPendingUserType } from '../utils/onboarding.js';
import { getUserType } from '../utils/userType.js';

// "Your library lives on this browser only."
//
// Shown to a signed-out visitor who has saved something — and to nobody else.
// Someone with an empty library has nothing to lose yet, and asking them to
// register for the safekeeping of nothing is a worse first impression than
// saying nothing at all. Someone signed in already has what this offers.
//
// It is the SAME send as /auth/signup, not a second one: signInWithOtp creates
// the account if the address is new, and the pending user type is recorded
// first so the magic link still knows what they chose. Submitting leaves for
// /auth/verify exactly as the sign-up page does, so there is one code screen
// rather than two.
export default function LibrarySignupNudge() {
  const router = useRouter();

  // undefined until the session is known. Rendering nothing in that moment is
  // what stops the card flashing at somebody who is already signed in.
  const [signedIn, setSignedIn] = useState(undefined);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSession().then(({ data }) => {
      if (!cancelled) setSignedIn(Boolean(data));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (sending) return;

      const address = email.trim().toLowerCase();
      if (!address) return;

      setError(null);
      setSending(true);

      // Recorded before the code is sent, so the answer is stored by the time
      // any link in that email can be clicked. Someone arriving from their own
      // library is an explorer unless they have said otherwise elsewhere.
      await recordPendingUserType(address, getUserType());

      const { error: sendError } = await signInWithOtp(address);

      if (sendError) {
        setError(sendError.message || 'We could not send that link. Please try again.');
        setSending(false);
        return;
      }

      // Encoded — a + in an address is legal and common.
      router.push(`/auth/verify?email=${encodeURIComponent(address)}`);
    },
    [email, sending, router]
  );

  if (signedIn !== false) return null;

  return (
    <section className="mb-10 rounded-2xl border border-white/10 bg-[#111827] p-6 md:p-8">
      <p className="text-sm leading-relaxed text-gray-300">
        Your library is stored on this browser only. Create a free account so your library follows
        you everywhere. Spiritpedia doesn&apos;t use passwords — put your email in the box below and
        we&apos;ll send you a magic link:
      </p>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="library-nudge-email" className="sr-only">
          Your email address
        </label>
        <input
          id="library-nudge-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full flex-1 rounded-full border border-white/10 bg-[#0a0f1d] px-5 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#7c3aed] focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !email.trim()}
          className="shrink-0 rounded-full bg-[#7c3aed] px-8 py-3 text-sm font-bold text-white transition-all hover:bg-[#6d28d9] hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </section>
  );
}

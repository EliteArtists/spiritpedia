'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import { getSession, signInWithOtp } from '@/utils/supabaseAuth';

// Sign in and sign up are the same page, because they are the same action:
// type your address, receive a code. signInWithOtp creates the user if the
// address is new, so nobody is asked whether they already have an account — a
// question people frequently answer wrongly.

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Someone already signed in has no business on a sign-in page.
  useEffect(() => {
    let cancelled = false;
    getSession().then(({ data }) => {
      if (!cancelled && data) router.replace('/account');
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (sending) return;

      setError(null);
      setSending(true);

      const { error: sendError } = await signInWithOtp(email);

      if (sendError) {
        // Supabase's own wording is shown when it is useful (rate limits say so
        // plainly), with a readable fallback for anything that is not.
        setError(sendError.message || 'We could not send that code. Please try again.');
        setSending(false);
        return;
      }

      // The address travels in the URL so the verify page can name it and
      // resend to it. Encoded — a + in an address is legal and common.
      router.push(`/auth/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    },
    [email, sending, router]
  );

  return (
    <AuthShell>
      <h1 className="mt-8 text-3xl font-bold">Welcome to Spiritpedia</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-400">
        Enter your email to continue — no password needed
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3" noValidate>
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <input
          id="email"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'email-error' : undefined}
          className="w-full rounded-full border border-white/15 bg-[#111827] px-5 py-4 text-center text-base text-white placeholder:text-gray-600 focus:border-[#7c3aed] focus:outline-none"
        />

        <button
          type="submit"
          disabled={sending || !email.trim()}
          className="w-full rounded-full bg-[#7c3aed] px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-[#6d28d9] hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {sending ? 'Sending your code…' : 'Continue →'}
        </button>
      </form>

      {/* role=alert so a screen reader hears the failure without having to go
          looking for it. */}
      {error && (
        <p id="email-error" role="alert" className="mt-4 text-sm leading-relaxed text-red-400">
          {error}
        </p>
      )}

      <p className="mt-8 text-xs leading-relaxed text-gray-600">
        We will email you a six-digit code. It is valid for one hour.
      </p>
    </AuthShell>
  );
}

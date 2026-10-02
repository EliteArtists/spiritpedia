'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import { getUser, signInWithOtp, supabaseAuth, verifyOtp } from '@/utils/supabaseAuth';
import {
  ensureProfile,
  migrateFavourites,
  readPendingUserType,
  resolveDestination,
} from '@/utils/onboarding';

// Set by Supabase, not chosen here: Authentication -> Providers -> Email ->
// Email OTP Length, which accepts 6 to 10. It is 6, so this is 6; if it is ever
// changed there, this line has to follow or every code will be rejected.
//
// Every piece of logic below derives from it — focus advance, paste spreading,
// auto-submit, maxLength — so this is the only place the number appears.
const LENGTH = 6;
const EMPTY = Array(LENGTH).fill('');

// Supabase says "expired or invalid" for both a wrong code and a stale one, so
// the two cannot be told apart from the message alone. Tracking whether this
// browser has been sitting here long enough for expiry to be plausible is what
// lets the page offer the right next step instead of the same flat error twice.
function expiryLikely(sentAt) {
  return sentAt ? Date.now() - sentAt > 60 * 60 * 1000 : false;
}

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = (params.get('email') || '').trim();

  const [digits, setDigits] = useState(EMPTY);
  const [status, setStatus] = useState('idle'); // idle | verifying | finishing
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(false);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  const inputsRef = useRef([]);
  // When the code being typed was sent. Set on mount rather than in useRef's
  // initialiser, which would call Date.now() on every render.
  const sentAtRef = useRef(null);
  // Guards the auto-submit: without it, every re-render with a full row present
  // would fire another verification.
  const submittedRef = useRef(null);

  // No email in the URL means the page was reached sideways and has nothing to
  // verify against. Send them back rather than show boxes that cannot work.
  useEffect(() => {
    if (!email) router.replace('/auth/signup');
  }, [email, router]);

  useEffect(() => {
    sentAtRef.current = Date.now();
    inputsRef.current[0]?.focus();
  }, []);

  // Put the caret back in the first box after a rejected code, so the next
  // attempt is just typing. This cannot be done in the failure handler itself:
  // the inputs are still disabled at that moment — React has not yet rendered
  // the return to idle — and focus() on a disabled input silently does nothing.
  // Measured: focus landed on <body> and the row had to be clicked to retry.
  useEffect(() => {
    if (status === 'idle' && error) inputsRef.current[0]?.focus();
  }, [status, error]);

  // Everything that happens once a session exists, whichever way it arrived:
  // typing the code here, or clicking the magic link in the same email and
  // landing back on this page already signed in.
  //
  // None of it may strand someone on this screen. The account exists from the
  // moment the session does, so every step reports failure rather than throwing.
  const complete = useCallback(async () => {
    setStatus('finishing');

    const { data: user } = await getUser();

    // The recorded choice beats sessionStorage, and is consumed as it is read
    // so a stale answer cannot outlive the sign-up it belonged to. A magic link
    // opened on a different device has no sessionStorage at all — this lookup
    // is the only thing that knows the person chose practitioner.
    const userType = await readPendingUserType(user?.email || email, { consume: true });

    // Favourites first — it is the step with something to lose. It never
    // deletes localStorage, so a failure here is invisible and retried at the
    // next sign-in.
    await migrateFavourites(user?.id);
    await ensureProfile(user?.id, userType);

    let destination = '/';
    try {
      destination = await resolveDestination(user, userType);
    } catch {
      // A lookup failure must not trap a verified user on the code screen.
      destination = userType === 'practitioner' ? '/auth/practitioner-setup' : '/';
    }

    router.replace(destination);
  }, [email, router]);

  // MAGIC LINK ARRIVAL. Clicking the link in the email verifies server-side and
  // redirects here with a session already established, so there is no code to
  // type and the six boxes would be a dead end. Finding a session on mount
  // means exactly that, so the completion path runs immediately.
  //
  // detectSessionInUrl resolves the token asynchronously after mount, so this
  // waits for the auth client to report rather than reading storage once and
  // concluding there is nobody there.
  useEffect(() => {
    let cancelled = false;

    const { data: subscription } = supabaseAuth.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') return;
      if (!session?.user) return;
      // Deferred out of the callback: supabase-js holds an internal lock here
      // and calling back into the client from inside it can deadlock.
      setTimeout(() => {
        if (!cancelled) complete();
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription?.subscription?.unsubscribe();
    };
  }, [complete]);

  const submit = useCallback(
    async (value) => {
      if (status !== 'idle') return;
      setStatus('verifying');
      setError(null);
      setExpired(false);

      const { error: verifyError } = await verifyOtp(email, value);

      if (verifyError) {
        const stale = expiryLikely(sentAtRef.current);
        setExpired(stale);
        setError(
          stale
            ? 'This code has expired. Request a new one.'
            : "That code didn't work. Please try again."
        );
        setDigits(EMPTY);
        submittedRef.current = null;
        setStatus('idle');
        return;
      }

      // Verified. Hand off to the shared completion path below.
      await complete();
    },
    [email, status, complete]
  );

  // Auto-submit is driven from the events that complete the code, not from an
  // effect watching it. Filling the last box IS the submission gesture, the way
  // pressing Enter is on an ordinary form; an effect would make it a reaction to
  // a state change and cascade a render to do it.
  //
  // Guarded on the code itself, so a re-render — or a stray change event on an
  // already-full row — cannot verify the same code twice.
  const maybeSubmit = useCallback(
    (next) => {
      const value = next.join('');
      if (value.length === LENGTH && !next.includes('') && submittedRef.current !== value) {
        submittedRef.current = value;
        submit(value);
      }
    },
    [submit]
  );

  const setDigit = (index, value) => {
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    return next;
  };

  const onChange = (index, raw) => {
    const typed = raw.replace(/\D/g, '');
    if (!typed) {
      setDigit(index, '');
      return;
    }
    // A phone keyboard can deliver several characters at once, and an autofill
    // drops the whole code into whichever box has focus — so spread anything
    // longer than one character across the remaining boxes instead of losing it.
    const next = [...digits];
    for (let i = 0; i < typed.length && index + i < LENGTH; i += 1) {
      next[index + i] = typed[i];
    }
    setDigits(next);
    inputsRef.current[Math.min(index + typed.length, LENGTH - 1)]?.focus();
    maybeSubmit(next);
  };

  const onKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      // Backspace in an empty box steps back and clears the one before, which
      // is what people expect from a code field — otherwise the caret sticks.
      if (!digits[index] && index > 0) {
        event.preventDefault();
        setDigit(index - 1, '');
        inputsRef.current[index - 1]?.focus();
      }
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const onPaste = (event) => {
    const pasted = (event.clipboardData.getData('text') || '').replace(/\D/g, '');
    if (!pasted) return;
    event.preventDefault();
    const next = [...EMPTY];
    for (let i = 0; i < Math.min(pasted.length, LENGTH); i += 1) next[i] = pasted[i];
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
    maybeSubmit(next);
  };

  const resend = useCallback(async () => {
    if (resending) return;
    setResending(true);
    setError(null);
    setExpired(false);

    const { error: sendError } = await signInWithOtp(email);

    if (sendError) {
      setError(sendError.message || 'We could not resend that code.');
    } else {
      sentAtRef.current = Date.now();
      setDigits(EMPTY);
      submittedRef.current = null;
      setResent(true);
      setTimeout(() => setResent(false), 4000);
      inputsRef.current[0]?.focus();
    }
    setResending(false);
  }, [email, resending]);

  const busy = status !== 'idle';

  return (
    <AuthShell>
      <h1 className="mt-8 text-3xl font-bold">Check your email</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-400">
        We sent a 6-digit code to{' '}
        <span className="font-semibold text-white">{email}</span>
      </p>

      <div
        onPaste={onPaste}
        className="mt-8 flex justify-center gap-2"
        role="group"
        aria-label="Six digit code"
      >
        {digits.map((digit, index) => (
          <input
            // Fixed positions in a fixed-length row; there is no id to key on.
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            // One character per box, but pattern stays permissive so a paste is
            // not rejected before onPaste can spread it.
            maxLength={LENGTH}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${index + 1}`}
            value={digit}
            disabled={busy}
            onChange={(e) => onChange(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(index, e)}
            onFocus={(e) => e.target.select()}
            // 6*44 + 5*8 = 304px, inside both the shell's 384px and the
            // ~342px available at a 390px viewport. (Eight boxes at this size
            // came to 408px and overflowed both, which is why the 8-digit
            // version had to shrink them.)
            className="h-14 w-11 rounded-xl border border-white/15 bg-[#111827] text-center text-xl font-semibold text-white caret-[#7c3aed] focus:border-[#7c3aed] focus:outline-none disabled:opacity-60"
          />
        ))}
      </div>

      <div className="mt-6 min-h-[48px]" aria-live="polite">
        {status === 'verifying' && <p className="text-sm text-gray-400">Checking your code…</p>}
        {status === 'finishing' && (
          <p className="text-sm text-gray-400">Signing you in and saving your library…</p>
        )}
        {error && (
          <p role="alert" className="text-sm leading-relaxed text-red-400">
            {error}
          </p>
        )}
        {resent && !error && <p className="text-sm text-emerald-400">Code resent</p>}
      </div>

      <div className="mt-2 flex flex-col gap-3 text-sm">
        <button
          type="button"
          onClick={resend}
          disabled={resending || busy}
          className={`font-semibold transition-colors disabled:opacity-50 ${
            expired ? 'text-[#a78bfa] hover:text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          {resending ? 'Resending…' : 'Resend code'}
        </button>

        <Link href="/auth/signup" className="text-gray-500 transition-colors hover:text-white">
          Wrong email? Go back
        </Link>
      </div>
    </AuthShell>
  );
}

// useSearchParams needs a Suspense boundary, or the whole route is forced to
// render dynamically and the build warns.
export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p className="mt-8 text-sm text-gray-500">Loading…</p>
        </AuthShell>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}

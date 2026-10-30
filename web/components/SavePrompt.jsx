'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { signInWithOtp, verifyOtp } from '../utils/supabaseAuth.js';
import { recordPendingUserType } from '../utils/onboarding.js';
import { USER_TYPES } from '../utils/userType.js';
import { SAVE_PROMPT_EVENT, clearPendingSave, setPendingSave } from '../utils/savePrompt.js';

// "Save it to your Library." — what a signed-out heart or Save opens, as in
// the app. Saving needs an account; browsing, search and everything else stay
// open to everyone.
//
// Signing in happens right here — email, then the 6-digit code — so the
// visitor never leaves the page they were on. The save they asked for waits
// in this tab (utils/savePrompt.js) and AuthSync makes it once the account's
// library has arrived.
//
// No "Explorer or Practitioner?" question: someone saving to a Library is
// signing up as an explorer. An existing practitioner signing in is never
// changed (ensureProfile leaves an existing row alone).

const LENGTH = 6;

export default function SavePrompt() {
  const titleId = useId();
  const descId = useId();
  const cardRef = useRef(null);
  const returnFocusRef = useRef(null);

  const [item, setItem] = useState(null); // { key, slug } while open
  const [step, setStep] = useState('ask'); // ask | email | code
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onAsk = (event) => {
      const detail = event.detail || {};
      if (!detail.key || !detail.slug) return;
      setItem({ key: detail.key, slug: String(detail.slug) });
      setStep('ask');
      setCode('');
      setError(null);
      setBusy(false);
    };
    window.addEventListener(SAVE_PROMPT_EVENT, onAsk);
    return () => window.removeEventListener(SAVE_PROMPT_EVENT, onAsk);
  }, []);

  // "Not now", Escape, the backdrop or the close button: nothing is saved.
  const close = useCallback(() => {
    clearPendingSave();
    setItem(null);
  }, []);

  const open = item !== null;

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    cardRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      const target = returnFocusRef.current;
      if (target && document.body.contains(target)) target.focus?.();
    };
  }, [open, close]);

  const startSignIn = () => {
    setPendingSave(item.key, item.slug);
    setStep('email');
    setError(null);
  };

  const sendCode = async (event) => {
    event.preventDefault();
    if (busy) return;
    const address = email.trim().toLowerCase();
    if (!address) return;
    setBusy(true);
    setError(null);
    // Recorded before the code is sent, as on /auth/signup.
    await recordPendingUserType(address, USER_TYPES.explorer);
    const { error: sendError } = await signInWithOtp(address);
    setBusy(false);
    if (sendError) {
      setError(sendError.message || 'We could not send that code. Please try again.');
      return;
    }
    setStep('code');
  };

  const checkCode = async (value) => {
    if (busy || value.length !== LENGTH) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await verifyOtp(email.trim().toLowerCase(), value);
    if (verifyError) {
      setBusy(false);
      setCode('');
      setError("That code didn't work. Please try again.");
      return;
    }
    // Signed in. AuthSync brings the library down and makes the save; the
    // visitor is still exactly where they were.
    setItem(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#111827] p-8 text-center shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <img
          referrerPolicy="no-referrer"
          src="/Spiritpedia_Header_Symbol.png"
          alt=""
          aria-hidden="true"
          className="mx-auto block h-10 w-10 object-contain"
        />

        <h2 id={titleId} className="mt-4 text-2xl font-bold leading-snug text-white">
          Save it to your Library.
        </h2>

        {step === 'ask' && (
          <>
            <p id={descId} className="mt-3 text-sm leading-relaxed text-gray-400">
              Create a free account so your saves follow you everywhere.
            </p>
            <div className="mt-7 flex flex-col gap-2">
              <button
                type="button"
                onClick={startSignIn}
                className="w-full rounded-full bg-[#7c3aed] px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-[#6d28d9] hover:scale-[1.02] active:scale-[0.98]"
              >
                Sign in / Create account
              </button>
              <button
                type="button"
                onClick={close}
                className="w-full rounded-full px-6 py-3 text-sm font-medium text-gray-400 transition-colors hover:text-white"
              >
                Not now
              </button>
            </div>
          </>
        )}

        {step === 'email' && (
          <form onSubmit={sendCode} className="mt-5 flex flex-col gap-3 text-left" noValidate>
            <p id={descId} className="text-center text-sm leading-relaxed text-gray-400">
              No password: we email you a 6-digit code. A new address becomes a free account.
            </p>
            <label htmlFor="save-prompt-email" className="sr-only">
              Email address
            </label>
            <input
              id="save-prompt-email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-full border border-white/10 bg-[#0a0f1d] px-5 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#7c3aed] focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="w-full rounded-full bg-[#7c3aed] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Sending…' : 'Email me a code'}
            </button>
            <p className="text-center text-xs leading-relaxed text-gray-500">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="underline underline-offset-2 hover:text-gray-300">
                Terms of Use
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-gray-300">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        )}

        {step === 'code' && (
          <div className="mt-5 flex flex-col gap-3">
            <p id={descId} className="text-sm leading-relaxed text-gray-400">
              Enter the 6-digit code we sent to{' '}
              <span className="font-semibold text-white">{email.trim().toLowerCase()}</span>.
            </p>
            <label htmlFor="save-prompt-code" className="sr-only">
              Six digit code
            </label>
            <input
              id="save-prompt-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={LENGTH}
              value={code}
              disabled={busy}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, LENGTH);
                setCode(value);
                if (value.length === LENGTH) checkCode(value);
              }}
              className="w-full rounded-2xl border border-white/15 bg-[#0a0f1d] px-5 py-3 text-center text-2xl font-semibold tracking-[0.5em] text-white caret-[#7c3aed] focus:border-[#7c3aed] focus:outline-none disabled:opacity-60"
            />
            {busy && <p className="text-sm text-gray-400">Signing you in and saving…</p>}
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Use a different email
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm leading-relaxed text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

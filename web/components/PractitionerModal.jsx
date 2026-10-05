'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { setUserType, USER_TYPES } from '../utils/userType.js';

// The first question of sign-up, asked before the email is.
//
// Knowing whether someone is a practitioner or an explorer changes what the
// signup form asks for, so it is settled up front rather than buried as a radio
// button on a long form. The answer rides in sessionStorage to /auth/signup.
//
// The wording under "Yes" is doing real work: a practitioner reading a
// two-button choice may reasonably fear that saying yes puts them on a
// different, narrower version of the site. It says plainly that it does not.

const SIGNUP_PATH = '/auth/signup';

export default function PractitionerModal({ open, onClose }) {
  const router = useRouter();
  const cardRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  // Where focus came from, so it can be handed back on close. Without this a
  // keyboard user who dismisses the modal is returned to the top of the
  // document rather than to the account button they just pressed.
  const returnFocusRef = useRef(null);

  const choose = useCallback(
    (type) => {
      // A failed write is not worth blocking sign-up over — /auth/signup asks
      // again when it finds nothing stored.
      setUserType(type);
      router.push(SIGNUP_PATH);
    },
    [router]
  );

  useEffect(() => {
    if (!open) return undefined;

    returnFocusRef.current = document.activeElement;

    // Move focus into the dialog so the next Tab lands inside it and a screen
    // reader starts reading here rather than continuing down the page behind.
    const card = cardRef.current;
    card?.focus();

    // Hold the page still underneath. Restored to whatever it was rather than
    // to '', so this cannot quietly clear a lock some other component set.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;

      // Focus trap. Tab from the last control wraps to the first and
      // Shift+Tab from the first wraps to the last, so focus cannot walk out
      // into the page behind while this is open.
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
      // Only steal focus back if it is still loose in the body — if something
      // else has claimed it in the meantime, leave it alone.
      const target = returnFocusRef.current;
      if (target && document.body.contains(target)) target.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    // The overlay is the click-outside target: a press that starts AND ends on
    // the backdrop closes. Checking both ends matters — a drag that begins on
    // the card and releases on the backdrop (selecting the heading text, say)
    // would otherwise dismiss the modal mid-sentence.
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#111827] p-8 text-center shadow-2xl outline-none sm:p-10"
      >
        <button
          type="button"
          onClick={onClose}
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

        {/* The same star the masthead carries, rather than a typographic
            lookalike — SiteLogo.jsx and AdminShell use this file too, so the
            mark stays one asset. Decorative: the heading below says what this
            is, and announcing the logo would add nothing. */}
        <img
          src="/Spiritpedia_Header_Symbol.png"
          alt=""
          aria-hidden="true"
          className="mx-auto block h-10 w-10 object-contain"
        />

        <h2 id={titleId} className="mt-4 text-2xl font-bold leading-snug text-white">
          Are you a practitioner?
        </h2>

        <p id={descId} className="mt-3 text-sm leading-relaxed text-gray-400">
          This shapes what we ask you next.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => choose(USER_TYPES.practitioner)}
            className="w-full rounded-full bg-[#7c3aed] px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-[#6d28d9] hover:scale-[1.02] active:scale-[0.98]"
          >
            Yes, I am a practitioner
          </button>

          {/* Sits under the Yes button because that is the choice that needs
              reassuring — saying yes does not trade away the explorer's site. */}
          <p className="-mt-1 text-xs leading-relaxed text-gray-500">
            (You can still explore, view and save content)
          </p>

          <button
            type="button"
            onClick={() => choose(USER_TYPES.explorer)}
            className="mt-2 w-full rounded-full border border-white/20 px-6 py-4 text-base font-semibold text-white transition-all duration-200 hover:border-white/40 hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98]"
          >
            No, I&apos;m here to explore
          </button>
        </div>
      </div>
    </div>
  );
}

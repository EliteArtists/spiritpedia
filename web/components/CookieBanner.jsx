'use client';

import { ACCEPTED, DECLINED, setConsent, useConsent, useCookieSettingsOpen } from '../utils/consent.js';

// The cookie notice.
//
// WHY THIS IS NOT A COSMETIC BANNER. Under UK GDPR and the ePrivacy rules,
// analytics cookies need consent BEFORE they are set — a notice shown while
// gtag is already running is not compliance, it is an admission. The answer it
// stores is the gate components/Analytics.jsx reads, and nothing is requested
// from Google until somebody has said yes.
//
// Two choices, no category modal. Granular consent is not required to be
// lawful, and a settings panel between a visitor and the site is worse for
// both of them.
export default function CookieBanner() {
  const consent = useConsent();
  const reopened = useCookieSettingsOpen();

  // undefined is "not known yet" — the server render and the frame before the
  // client reads storage. Rendering nothing there is what stops the banner
  // flashing at a returning visitor who answered months ago. "Cookie settings"
  // in the footer reopens it after a choice, so the choice can be changed.
  if (consent !== null && !reopened) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie notice"
      // Above the floating My Library button (z-40), below the practitioner
      // modal (z-100): a question about cookies should not cover a question
      // somebody is already answering.
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0a0f1d]/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">We use cookies</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-400">
            We use cookies to improve your experience and understand how Spiritpedia is used. You
            can accept all cookies or decline non-essential ones.
            {reopened && (consent === ACCEPTED || consent === DECLINED) && (
              <> You currently have them {consent === ACCEPTED ? 'accepted' : 'declined'}.</>
            )}
          </p>
        </div>

        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => setConsent(ACCEPTED)}
            className="rounded-full bg-[#7c3aed] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#6d28d9]"
          >
            Accept All
          </button>
          <button
            type="button"
            onClick={() => setConsent(DECLINED)}
            className="rounded-full border border-white/25 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/5"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

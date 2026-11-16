'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import StoreBadges from './StoreBadges';
import { APP_LINE, WELCOME_EVENT, WELCOME_KEY, sendAppDismiss, storesFor } from '@/utils/appStores';
import { useDevice } from '@/utils/useDevice';

// The one-time welcome card after a website sign-up (owner, 16 Nov 2026).
//
// utils/onboarding.js ensureProfile() sets the flag in sessionStorage when it
// has just made the account. The card shows on the first page they land on
// outside /auth/* (a practitioner's setup form is left alone until it's done)
// and stays on that page until × or a badge tap; on the next page it's gone.
// It floats above the My Library button, so nothing on the page moves.

function subscribe(onChange) {
  window.addEventListener(WELCOME_EVENT, onChange);
  return () => window.removeEventListener(WELCOME_EVENT, onChange);
}

function read() {
  try {
    return sessionStorage.getItem(WELCOME_KEY);
  } catch {
    return null;
  }
}

function write(value) {
  try {
    if (value) sessionStorage.setItem(WELCOME_KEY, value);
    else sessionStorage.removeItem(WELCOME_KEY);
  } catch {
    // Without storage the flag was never set, so there is no card to close.
  }
  window.dispatchEvent(new Event(WELCOME_EVENT));
}

export default function WelcomeAppCard() {
  const pathname = usePathname() || '';
  const flag = useSyncExternalStore(subscribe, read, () => null);
  const device = useDevice();
  const away = /^\/(admin|auth)(\/|$)/.test(pathname);
  const show = !away && (flag === '1' || flag === `shown:${pathname}`);

  // The first page it shows on is the only one: remember which.
  useEffect(() => {
    if (show && flag === '1') write(`shown:${pathname}`);
  }, [show, flag, pathname]);

  if (!show) return null;

  const stores = storesFor(device);
  const close = () => {
    write(null);
    sendAppDismiss('after_signup', stores.length === 1 ? stores[0] : 'both');
  };

  return (
    <div
      role="dialog"
      aria-label="Welcome to Spiritpedia"
      className="fixed inset-x-4 bottom-24 z-40 rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-2xl sm:left-auto sm:right-6 sm:max-w-sm"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute right-3 top-2 p-1 text-xl leading-none text-gray-500 transition-colors hover:text-white"
      >
        &times;
      </button>
      <p className="pr-6 text-base font-semibold text-white">Welcome to Spiritpedia.</p>
      <p className="mt-1 text-sm text-gray-300">{APP_LINE}.</p>
      {/* A badge tap closes it too, just after the tap: removing the link
          while it is being tapped could cancel the store opening. */}
      <div onClickCapture={() => setTimeout(() => write(null), 0)}>
        <StoreBadges placement="after_signup" className="mt-4" />
      </div>
    </div>
  );
}

'use client';

import { useSyncExternalStore } from 'react';

// COOKIE CONSENT, as one external store that two components read.
//
// The banner asks the question and the analytics component acts on the answer,
// and they sit in different parts of the tree. Putting the state here rather
// than lifting it means neither has to know the other exists, and both see a
// change in the same render.
//
// useSyncExternalStore rather than useState + useEffect, because that is
// precisely what this is: a value owned by something outside React, which can
// change without React being told. It also gives the right answer during
// hydration — the server snapshot is "unknown", so the server renders neither
// the banner nor the script, and the client re-reads immediately after.

export const CONSENT_KEY = 'sp_cookie_consent';
export const ACCEPTED = 'accepted';
export const DECLINED = 'declined';

// localStorage fires `storage` only in OTHER tabs. A choice made in this one
// has to be announced by hand, or the analytics component two elements away
// would not hear it until the next navigation.
const CONSENT_EVENT = 'sp:cookie-consent';

// Read once per change rather than per render. getSnapshot must return a value
// that is stable while nothing has changed, or React re-renders forever.
let snapshot = readStorage();

function readStorage() {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === ACCEPTED || value === DECLINED ? value : null;
  } catch {
    // A private window, or site data blocked. Treated as "not asked yet" rather
    // than as consent: the banner reappears and nothing is loaded. Erring the
    // other way would set cookies on someone who never agreed to any.
    return null;
  }
}

function refresh() {
  snapshot = readStorage();
}

function subscribe(onChange) {
  const handler = () => {
    refresh();
    onChange();
  };
  window.addEventListener('storage', handler);
  window.addEventListener(CONSENT_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(CONSENT_EVENT, handler);
  };
}

function getSnapshot() {
  return snapshot;
}

// undefined, not null: on the server nobody has been asked and nothing can be
// read, which is a different thing from "asked and not yet answered". Rendering
// null there would put the banner in the HTML for every visitor including the
// ones who answered months ago.
function getServerSnapshot() {
  return undefined;
}

// 'accepted' | 'declined' | null (not yet chosen) | undefined (not yet known).
export function useConsent() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Unwritable storage means the choice cannot outlive this page. It still
    // governs this page, which is the half that matters: declining has to work
    // even when it cannot be remembered.
  }
  refresh();
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

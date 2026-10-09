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
  const previous = snapshot;
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Unwritable storage means the choice cannot outlive this page. It still
    // governs this page, which is the half that matters: declining has to work
    // even when it cannot be remembered.
  }
  refresh();
  closeCookieSettings();
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));

  // WITHDRAWING CONSENT. Declining before accepting needs no teardown — gtag was
  // never loaded. Declining AFTER accepting (via Cookie settings) does: the
  // script is already on the page and its cookies are already set, and
  // unmounting <Analytics> removes neither. So delete the _ga cookies and
  // reload, which leaves a page that never loads gtag. The Privacy Policy
  // promises consent can be withdrawn at any time; this is what makes it true.
  if (previous === ACCEPTED && value === DECLINED) {
    clearAnalyticsCookies();
    window.location.reload();
  }
}

// GA sets _ga and _ga_<ID> on the widest domain it can (.spiritpedia.co), so
// a delete has to name that domain — a cookie is only removed by a write that
// matches the domain and path it was set with. Try the host and every parent.
function clearAnalyticsCookies() {
  const parts = window.location.hostname.split('.');
  const domains = [null];
  for (let i = 0; i < parts.length - 1; i += 1) domains.push(`.${parts.slice(i).join('.')}`);

  const names = document.cookie
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter((name) => /^_ga(_|$)/.test(name));

  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
    }
  }
}

// COOKIE SETTINGS — reopening the banner after a choice has been made.
//
// Not part of the consent value: "the banner is open" is a UI state for this
// page only, and must not survive a reload or reach other tabs. So it is a
// second, in-memory store beside the first. setConsent() closes it.
const SETTINGS_EVENT = 'sp:cookie-settings';
let settingsOpen = false;

function subscribeSettings(onChange) {
  window.addEventListener(SETTINGS_EVENT, onChange);
  return () => window.removeEventListener(SETTINGS_EVENT, onChange);
}

export function useCookieSettingsOpen() {
  return useSyncExternalStore(
    subscribeSettings,
    () => settingsOpen,
    () => false
  );
}

export function openCookieSettings() {
  settingsOpen = true;
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

function closeCookieSettings() {
  if (!settingsOpen) return;
  settingsOpen = false;
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

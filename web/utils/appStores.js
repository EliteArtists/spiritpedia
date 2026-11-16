// "Spiritpedia is even better on the app" (owner, 16 Nov 2026;
// docs/reports/2026-11-16-app-links-plan.md): the store links, the device
// rule and what /get-app/<store> counts (migration 0052).
//
// Plain ES module with no React or Next dependency, so it runs on the server
// (the /get-app redirects), in the browser (badges, the Android strip) and
// under `node --test` (utils/appStores.test.mjs).

// The App Store Apple ID, from the owner (16 Nov 2026), checked against
// apps.apple.com. The Play package is app/android/app/build.gradle.kts's
// applicationId.
export const APP_STORE_ID = '6821430226';
export const PLAY_PACKAGE = 'co.spiritpedia.app';
export const APP_STORE_URL = `https://apps.apple.com/app/spiritpedia/id${APP_STORE_ID}`;
export const GOOGLE_PLAY_URL = `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`;

// The owner's words, everywhere the site points to the app. Never "follow":
// the app has no follow button.
export const APP_LINE = 'Spiritpedia is even better on the app';

// Apple's and Google's trademark wording, in the small print wherever the
// badges have a page of their own (/about, /get-app).
export const TRADEMARKS =
  'Apple, the Apple logo, iPhone and iPad are trademarks of Apple Inc., registered in the U.S. and other countries. App Store is a service mark of Apple Inc. Google Play and the Google Play logo are trademarks of Google LLC.';

export const STORES = ['app_store', 'google_play'];
export const DEVICES = ['iphone', 'ipad', 'android', 'desktop', 'other'];
export const ACTIONS = ['tap', 'dismiss'];
// Where a tap came from. The database checks the same list.
export const PLACEMENTS = [
  'footer',
  'about',
  'after_signup',
  'welcome_email',
  'teacher_page',
  'library',
  'android_banner',
  'get_app_page',
];

// The Android strip (components/AppBanner.jsx): its element id, and the
// localStorage key holding when it may come back (a time in ms).
export const BANNER_ID = 'sp-app-banner';
export const BANNER_KEY = 'spiritpedia:app-banner';

// The one-time welcome card after a website sign-up
// (components/WelcomeAppCard.jsx): the sessionStorage flag that
// utils/onboarding.js sets on a new account, and the event that announces it.
export const WELCOME_KEY = 'spiritpedia:welcome-app';
export const WELCOME_EVENT = 'sp:welcome-app';

// The address segment of each store: /get-app/app-store, /get-app/google-play.
const SLUGS = { app_store: 'app-store', google_play: 'google-play' };

export const BADGES = {
  app_store: { src: '/badges/app-store.svg', email: '/email/app-store.png', alt: 'Download on the App Store', ratio: 119.66407 / 40 },
  google_play: { src: '/badges/google-play.svg', email: '/email/google-play.png', alt: 'Get it on Google Play', ratio: 238.96 / 70.87 },
};

// The browser's user-agent → 'iphone' | 'ipad' | 'android' | 'desktop' | 'other'.
// touchPoints is navigator.maxTouchPoints, known only in the browser: an iPad
// in desktop mode says it is a Mac, and only the touch screen gives it away.
// Android first, because its user-agent also says Linux.
export function deviceFromUserAgent(ua, touchPoints = 0) {
  const s = String(ua || '');
  if (/android/i.test(s)) return 'android';
  if (/iphone|ipod/i.test(s)) return 'iphone';
  if (/ipad/i.test(s)) return 'ipad';
  if (/macintosh/i.test(s) && touchPoints > 1) return 'ipad';
  if (/windows|macintosh|cros|linux|x11/i.test(s)) return 'desktop';
  return 'other';
}

// The store(s) a device is shown: one for a phone or tablet, both otherwise.
export function storesFor(device) {
  if (device === 'iphone' || device === 'ipad') return ['app_store'];
  if (device === 'android') return ['google_play'];
  return [...STORES];
}

export function isPlacement(value) {
  return PLACEMENTS.includes(value);
}

export function storeFromSlug(slug) {
  return Object.keys(SLUGS).find((k) => SLUGS[k] === slug) || null;
}

// Every on-site link to a store goes through the counting address, which
// counts the tap and sends the visitor on: /get-app/app-store?from=footer.
// site is '' on the website and the full origin in an email.
export function getAppHref(store, placement, site = '') {
  return `${site}/get-app/${SLUGS[store]}?from=${encodeURIComponent(placement)}`;
}

// Where /get-app/<store> sends the visitor. Play links carry the placement as
// an install referrer, so Play Console → Acquisition shows it too. The App
// Store needs a provider token for the same; without one, App Store Connect
// still shows "Web Referrer: spiritpedia.co".
export function storeUrl(store, placement) {
  if (store === 'google_play') {
    const referrer = `utm_source=spiritpedia&utm_medium=${isPlacement(placement) ? placement : 'website'}`;
    return `${GOOGLE_PLAY_URL}&referrer=${encodeURIComponent(referrer)}`;
  }
  return APP_STORE_URL;
}

// BROWSER ONLY. A close of the Android strip or the welcome card, counted in
// the background (/api/app-store-click), as AmazonBuyLink does: sendBeacon, or
// a keepalive fetch where it is missing. Counting never stops the close.
export function sendAppDismiss(placement, store) {
  try {
    const body = JSON.stringify({ placement, store });
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon?.('/api/app-store-click', blob)) return;
    fetch('/api/app-store-click', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
  } catch {
    // Nothing to do: the close has already happened.
  }
}

// A count → the four values log_app_store_click() takes, or null. 'both' is a
// store only for a dismiss, of a card that showed both badges.
export function cleanAppClick({ placement, store, device, action } = {}) {
  if (!isPlacement(placement) || !ACTIONS.includes(action)) return null;
  const storeOk = STORES.includes(store) || (action === 'dismiss' && store === 'both');
  if (!storeOk) return null;
  return {
    p_placement: placement,
    p_store: store,
    p_device: DEVICES.includes(device) ? device : 'other',
    p_action: action,
  };
}

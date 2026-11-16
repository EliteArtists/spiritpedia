'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { APP_LINE, BANNER_ID, BANNER_KEY, getAppHref, sendAppDismiss } from '@/utils/appStores';

// The Android "Get the app" strip (owner, 16 Nov 2026). Drawn on every page
// but hidden; the little script in components/AppBanner.jsx shows it before
// the first paint, so it never pushes the page down after the visitor has
// started reading. See AppBanner.jsx for who sees it.
//
// × hides it for 30 days, "Get the app" for 90 (they most likely have it
// now), remembered in this browser only (localStorage, no cookie). If storage
// is blocked it stays hidden: the script can't read the cookie answer either.
const DAY = 86400000;

function hideFor(days) {
  try {
    localStorage.setItem(BANNER_KEY, String(Date.now() + days * DAY));
  } catch {
    // Storage blocked: the script could not have shown the strip anyway.
  }
}

export default function AppBannerStrip() {
  const pathname = usePathname() || '';
  const [closed, setClosed] = useState(false);
  if (closed || /^\/(admin|auth)(\/|$)/.test(pathname)) return null;

  return (
    <div
      id={BANNER_ID}
      // The script adds data-show before React hydrates; React leaves it be.
      suppressHydrationWarning
      className="hidden h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-[#0a0f1d] px-4 data-show:flex"
    >
      <img src="/Spiritpedia_Header_Symbol.png" alt="" aria-hidden="true" className="h-8 w-8 shrink-0 object-contain" />
      <p className="min-w-0 flex-1 text-sm leading-snug text-gray-300">{APP_LINE}</p>
      <a
        href={getAppHref('google_play', 'android_banner')}
        rel="nofollow"
        // Not closed here: the strip stays while the store opens, and
        // removing the link mid-tap could cancel it.
        onClick={() => hideFor(90)}
        className="shrink-0 rounded-full bg-[#7c3aed] px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#6d28d9]"
      >
        Get the app
      </a>
      <button
        type="button"
        aria-label="Not now"
        onClick={() => {
          hideFor(30);
          setClosed(true);
          sendAppDismiss('android_banner', 'google_play');
        }}
        className="-mr-1 shrink-0 p-1 text-xl leading-none text-gray-500 transition-colors hover:text-white"
      >
        &times;
      </button>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Persistent My Library button, floating at the bottom of the viewport on every
// public page — the streaming-app pattern, where the way back to your own
// collection never scrolls out of reach.
//
// It lives here rather than in the navbar because the navbar now scrolls away.
// Client component for the same reason as SiteFooter: the root layout wraps
// /admin too, and a server layout is not told which route is rendering.
const HIDDEN_PREFIX = '/admin';

export default function LibraryBar() {
  const pathname = usePathname();
  if (pathname === HIDDEN_PREFIX || pathname?.startsWith(`${HIDDEN_PREFIX}/`)) return null;

  return (
    // Floats free of the page rather than sitting in a bar: no full-width panel,
    // so the content it passes over stays visible. The translucent ground plus
    // blur and shadow are what keep the label readable against whatever happens
    // to scroll beneath it.
    <Link
      href="/library"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-[#0a0f1d]/80 px-6 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-[#0a0f1d]/95 active:scale-95"
    >
      ✦ My Library
    </Link>
  );
}

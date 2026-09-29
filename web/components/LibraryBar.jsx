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
//
// Hidden on /admin, and on /auth: a sign-in screen should hold one task and
// nothing else, and inviting someone into a library they cannot open yet is a
// door that leads nowhere.
const HIDDEN_PREFIXES = ['/admin', '/auth'];

export default function LibraryBar() {
  const pathname = usePathname();
  const hidden = HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`)
  );
  if (hidden) return null;

  return (
    // Floats free of the page rather than sitting in a bar: no full-width panel,
    // so the content it passes over stays visible. It wears the same #7c3aed as
    // an active subject pill, which is the site's one "this is selected, act on
    // it" colour — solid, so it reads over whatever scrolls beneath rather than
    // relying on a blur.
    <Link
      href="/library"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-[#7c3aed] px-6 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-[#6d28d9] active:scale-95"
    >
      ✦ My Library
    </Link>
  );
}

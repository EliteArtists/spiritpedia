'use client';

import { usePathname } from 'next/navigation';
import { GoogleAnalytics } from '@next/third-parties/google';

// Google Analytics 4, kept off the admin dashboard.
//
// A client component for the same reason as SiteFooter and LibraryBar: the root
// layout wraps /admin too, and a server layout is not told which route is
// rendering. Without this every admin session would land in the analytics
// beside real visitors, and the numbers would partly be a record of Ross
// working.
//
// Rendered only when the measurement ID is set. Passing an undefined gaId
// injects a gtag script pointing at "undefined", which sends malformed hits to
// Google rather than doing nothing — a preview deploy or a fresh clone without
// the variable would otherwise do exactly that.
const HIDDEN_PREFIX = '/admin';

export default function Analytics() {
  const pathname = usePathname();
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!gaId) return null;
  if (pathname === HIDDEN_PREFIX || pathname?.startsWith(`${HIDDEN_PREFIX}/`)) return null;

  return <GoogleAnalytics gaId={gaId} />;
}

'use client';

import { usePathname } from 'next/navigation';
import { GoogleAnalytics } from '@next/third-parties/google';
import { ACCEPTED, useConsent } from '../utils/consent.js';

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
//
// AND ONLY AFTER CONSENT. Spiritpedia is UK/EU-facing, where an analytics
// cookie needs agreement BEFORE it is set. This used to render on every page
// load, which meant gtag was running while the visitor was still deciding — and
// a banner in front of a script that has already fired is not a gate.
//
// Not rendering the component is the whole mechanism: @next/third-parties
// injects the script tag, so with nothing rendered nothing is requested, no
// cookie is written, and there is no gtag on the page to opt out of later. A
// decline therefore needs no teardown, which is the quietest way to be correct.
const HIDDEN_PREFIX = '/admin';

export default function Analytics() {
  const pathname = usePathname();
  const consent = useConsent();
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!gaId) return null;
  if (consent !== ACCEPTED) return null;
  if (pathname === HIDDEN_PREFIX || pathname?.startsWith(`${HIDDEN_PREFIX}/`)) return null;

  return <GoogleAnalytics gaId={gaId} />;
}

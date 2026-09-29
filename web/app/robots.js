import { SITE_URL } from '@/utils/seo';

// Served at /robots.txt.
//
// The sitemap line is the point of the file: it is how a crawler that arrives
// without being told anything finds every public URL. SITE_URL rather than a
// literal, so the host cannot drift from the canonical tags and the sitemap's
// own <loc> values — a sitemap on a different host to the robots.txt naming it
// is discarded.
//
// Only /admin is disallowed. /library is NOT listed here on purpose: it already
// carries robots.index = false, and a page blocked in robots.txt cannot be
// crawled at all, so Google would never read the noindex it is relying on — a
// disallowed page can still be indexed from inbound links, showing as a bare
// URL with no description. Blocking it here would make it MORE indexable, not
// less.
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

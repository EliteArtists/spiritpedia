// Shared SEO / Open Graph helpers. Every route's generateMetadata builds on
// these so titles, descriptions and share images stay consistent across the
// site, and the site-wide constants live in exactly one place.

// Canonical origin. The apex domain 301s to www, so this is the host every
// absolute URL (og:url, og:image, canonical) should carry — a crawler that
// follows the redirect would otherwise see a mismatched og:url.
export const SITE_URL = 'https://www.spirit-pedia.com';
export const SITE_NAME = 'Spiritpedia';
export const DEFAULT_TITLE = 'Spiritpedia — Discover Wisdom. Explore Consciousness.';
export const DEFAULT_DESCRIPTION =
  'The spiritual encyclopedia for seekers, healers and curious minds.';

// Collapse whitespace and cap a description at a word boundary. Social cards
// clip around 200 characters and search snippets around 160, so 160 is the
// default ceiling. Returns the fallback when the source is empty.
export function truncate(text, max = 160, fallback = DEFAULT_DESCRIPTION) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return fallback;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// A usable image URL or null. Filters the 'NULL' string that legacy book rows
// carry in mock_cover_url, and anything that is not an absolute http(s) URL —
// crawlers cannot resolve a relative path or a bare filename. A null here
// makes buildMetadata fall back to the symbol. (A URL that is well-formed but
// 404s cannot be caught at metadata time without fetching it per request.)
export function pickImage(...candidates) {
  for (const c of candidates) {
    if (typeof c === 'string' && /^https?:\/\//i.test(c) && c !== 'NULL') return c;
  }
  return null;
}

// The site-wide share image: the golden star symbol in /public. It is the
// fallback for every surface — a healer with no portrait, a book with no
// cover, an offering or resource with no image, a publisher with no logo, and
// the homepage itself. Referenced by path; the root layout's metadataBase
// makes it absolute for crawlers.
export const DEFAULT_IMAGE_PATH = '/Transparent_Symbol.png';
export const DEFAULT_OG_IMAGE = { url: DEFAULT_IMAGE_PATH };
export const DEFAULT_TWITTER_IMAGE = { url: DEFAULT_IMAGE_PATH };

// Assemble a Next.js Metadata object for one page.
//   title       — page-specific; the root layout's template appends " | Spiritpedia"
//   description — already truncated, or raw (it is truncated here)
//   path        — site-relative path, e.g. '/healers/louise-hay'
//   image       — absolute URL of the entity's own image, or null
//   type        — og:type: 'website' (default) | 'article' | 'book' | 'profile'
//
// An image is ALWAYS set. Next does not merge a route's `openGraph` with the
// root layout's — it replaces it — so a route that sets openGraph without
// `images` silently loses the file-based default image too. Verified against a
// local build: /subject/[slug] rendered no og:image at all until this fallback.
export function buildMetadata({ title, description, path, image = null, type = 'website' }) {
  const desc = truncate(description);
  const url = `${SITE_URL}${path}`;
  const ogImage = image ? { url: image, alt: title } : { ...DEFAULT_OG_IMAGE, alt: DEFAULT_TITLE };
  const twImage = image ? { url: image, alt: title } : { ...DEFAULT_TWITTER_IMAGE, alt: DEFAULT_TITLE };
  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: SITE_NAME,
      title,
      description: desc,
      locale: 'en_GB',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [twImage],
    },
  };
}

// Metadata for a slug that resolved to nothing. The page itself will 404; this
// just keeps the <head> honest and tells crawlers not to index it.
export function notFoundMetadata(what = 'Page') {
  return { title: `${what} not found`, robots: { index: false, follow: false } };
}

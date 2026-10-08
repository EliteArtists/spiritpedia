// Amazon Associates — the one place an affiliate tag is decided.
//
// Plain ES module with no React or Next dependency, so `node --test` can import
// it directly (see utils/affiliate.test.mjs).
//
// THE TAG IS INJECTED AT RENDER, NEVER STORED. books.amazon_url records what
// the product is; how it is monetised lives here and in env. A tag change —
// account switch, new marketplace, campaign tag — is one env var, not a
// migration over 900 rows, and there is no half-migrated table where some rows
// earn and some do not.
//
// A STORE EARNS ONLY WHEN ITS ENV VAR IS SET. Associates accounts are
// per-marketplace: a .co.uk tag earns nothing on amazon.com and the link still
// works, so a wrong tag fails silently. Each host therefore names its own env
// var, and a host whose var is unset gets a clean, untagged link. Adding a
// marketplace is a new env var on the Vercel project — no code change — as long
// as its host is listed below.
//
// Env vars are read at render. Book pages are ISR-cached and the disclosure
// page is built statically, so a newly set var needs a redeploy to show.

const STORES = {
  'amazon.com': { env: 'AMAZON_TAG_US', name: 'Amazon.com' },
  'amazon.co.uk': { env: 'AMAZON_TAG_UK', name: 'Amazon.co.uk' },
  'amazon.es': { env: 'AMAZON_TAG_ES', name: 'Amazon.es' },
  'amazon.de': { env: 'AMAZON_TAG_DE', name: 'Amazon.de' },
  'amazon.fr': { env: 'AMAZON_TAG_FR', name: 'Amazon.fr' },
  'amazon.it': { env: 'AMAZON_TAG_IT', name: 'Amazon.it' },
  'amazon.ca': { env: 'AMAZON_TAG_CA', name: 'Amazon.ca' },
  'amazon.com.au': { env: 'AMAZON_TAG_AU', name: 'Amazon.com.au' },
};

// Subdomains that are the same storefront. us.amazon.com is amazon.com.
const HOST_PREFIX = /^(?:www|us|smile|m)\./;

// The path shapes ContentIngestion.jsx already recognises. Book 283 is stored
// as /gp/product/, so /dp/ alone would wrongly hide its button.
//
// The ASIN must END at a path or query boundary. Without that, book 633's
// malformed nine-character /dp/BFK6VHWVV would borrow the next character of a
// longer path and pass.
const ASIN_PATH = /\/(?:dp|gp\/product|product|ASIN)\/([A-Z0-9]{10})(?=[/?#]|$)/i;

function tagFor(store, env) {
  const tag = env[store.env];
  return typeof tag === 'string' && tag.trim() ? tag.trim() : null;
}

// The stores with a live tag, in STORES order. The disclosure page names
// exactly these, so it can never claim a programme the site is not in.
// `env` is injectable for tests.
export function activeStores(env = process.env) {
  return Object.values(STORES)
    .filter((store) => tagFor(store, env))
    .map((store) => store.name);
}

// "A", "A and B", "A, B and C".
export function formatStoreList(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// rawUrl → { url, tagged } | null.
//
// null means "not a usable Amazon product link" — a Goodreads URL stored in
// amazon_url, a malformed ASIN — and the caller hides the button rather than
// send someone somewhere misleading.
//
// Otherwise the link is rebuilt canonically as https://www.{host}/dp/{ASIN},
// dropping every stored query param (ref_, th, psc, dib — roughly 200
// characters of someone else's session). The tag is added only for an active
// store.
export function amazonAffiliateUrl(rawUrl, env = process.env) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(HOST_PREFIX, '');
  const store = STORES[host];
  if (!store) return null;

  const match = parsed.pathname.match(ASIN_PATH);
  if (!match) return null;

  const url = `https://www.${host}/dp/${match[1].toUpperCase()}`;
  const tag = tagFor(store, env);
  return tag
    ? { url: `${url}?tag=${encodeURIComponent(tag)}`, tagged: true }
    : { url, tagged: false };
}

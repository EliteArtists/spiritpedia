// Amazon "buy" clicks (migration 0046): what /api/amazon-click accepts.
//
// A tap on a Buy on Amazon button sends { platform, content_type,
// content_slug, url }. Only the store is kept from the link (amazon.com,
// amazon.co.uk, …), never the link itself. The database checks again.
//
// Plain ES module with no React or Next dependency, so `node --test` can
// import it (see utils/amazonClicks.test.mjs).

const TYPES = ['book', 'course'];
const SLUG = /^[a-z0-9][a-z0-9-]{0,199}$/;
const HOST_PREFIX = /^(?:www|us|smile|m)\./;
const STORE = /^amazon\.[a-z.]{2,8}$/;

// 'https://www.amazon.co.uk/dp/…' → 'amazon.co.uk'; anything else → null.
export function amazonStore(url) {
  try {
    const host = new URL(String(url)).hostname.toLowerCase().replace(HOST_PREFIX, '');
    return STORE.test(host) ? host : null;
  } catch {
    return null;
  }
}

// The body → the four values log_amazon_click() takes, or null.
export function cleanClick(body) {
  if (!body || typeof body !== 'object') return null;
  const platform = body.platform === 'app' ? 'app' : body.platform === 'web' ? 'web' : null;
  const type = TYPES.includes(body.content_type) ? body.content_type : null;
  const slug = typeof body.content_slug === 'string' && SLUG.test(body.content_slug) ? body.content_slug : null;
  const store = amazonStore(body.url);
  if (!platform || !type || !slug || !store) return null;
  return { p_platform: platform, p_content_type: type, p_content_slug: slug, p_store: store };
}

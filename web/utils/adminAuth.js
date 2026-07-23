// Shared admin-session helpers. This module runs in BOTH the Edge middleware
// and the Node route handlers, so it must rely only on the Web Crypto API
// (the global `crypto`), which exists in both runtimes — never `node:crypto`.

export const ADMIN_SESSION_COOKIE = 'spiritpedia-admin-session';

// Derive a deterministic session token from the admin password. The cookie
// never stores the raw password — only this SHA-256 digest of it. Because the
// token is derived (not random), the middleware can verify it statelessly: no
// shared store, and it survives server restarts and serverless cold starts.
// Rotating ADMIN_PASSWORD invalidates every existing session for free.
export async function computeSessionToken(password) {
  const data = new TextEncoder().encode(`spiritpedia-admin::${password ?? ''}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

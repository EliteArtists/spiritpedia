// Single source of truth for the localStorage keys backing "My Library".
//
// Plain ES module with no React or Next dependency, so `node --test` can import
// it directly (see utils/favorites.test.mjs).
//
// `videos` is deliberately the odd one out — it has always been stored under the
// singular `favorite_videos`, while the rest are `favorited_*`. Normalising the
// name would orphan every visitor's existing saved videos, so the inconsistency
// stays and is documented instead.
export const FAVORITE_KEYS = {
  healers: 'favorited_healers',
  publishers: 'favorited_publishers',
  books: 'favorited_books',
  readBooks: 'read_books',
  videos: 'favorite_videos',
  courses: 'favorited_courses',
  freeResources: 'favorited_free_resources',
};

// localStorage key -> the content_type recorded in user_favourites. The app
// uses the same content types, so a save made on either shows on both.
export const CONTENT_TYPES = {
  [FAVORITE_KEYS.healers]: 'healer',
  [FAVORITE_KEYS.publishers]: 'publisher',
  [FAVORITE_KEYS.books]: 'book',
  [FAVORITE_KEYS.readBooks]: 'book_read',
  [FAVORITE_KEYS.videos]: 'video',
  [FAVORITE_KEYS.courses]: 'course',
  [FAVORITE_KEYS.freeResources]: 'free_resource',
};

// EVERY SAVE IS A SLUG. Until October 2026 the hearts stored whatever was to
// hand: slugs for healers and publishers, but the numeric id for books (cards
// only — the book page saved the slug) and videos, and the UUID for courses and
// free resources. The app and user_favourites.content_slug are slugs, so the
// website now is too; normaliseLegacyFavourites (utils/favouritesSync.js)
// converts what older visitors still hold.

// Fired on window after any change made here, so the account sync and any
// mounted heart can follow. detail: { key, id, saved } for a toggle, or
// { key, replaced: true } when a whole list is rewritten.
export const FAVORITES_EVENT = 'spiritpedia:favorites';

function announce(detail) {
  try {
    window.dispatchEvent(new CustomEvent(FAVORITES_EVENT, { detail }));
  } catch {
    // No window (tests, SSR) — nothing is listening.
  }
}

// Read a key expected to hold a JSON array of ids. Always returns an array, even
// if the key is absent, malformed, or localStorage is unavailable (SSR, private
// mode, storage disabled).
export function readFavorites(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

// Replace a whole list (normalising, or taking the account's copy after sign-in).
// Returns false if it could not be written.
export function writeFavorites(key, ids) {
  try {
    const unique = [...new Set(ids.map(String).filter(Boolean))];
    localStorage.setItem(key, JSON.stringify(unique));
    announce({ key, replaced: true });
    return true;
  } catch {
    return false;
  }
}

// Add or remove an id, persist, and hand back the new array so the caller can
// derive its own state from it. Returns null if persistence failed, letting the
// caller leave its UI untouched rather than showing a toggle that did not stick.
export function toggleFavorite(key, id) {
  try {
    const current = readFavorites(key).map(String);
    const favId = String(id);
    const saved = !current.includes(favId);
    const next = saved
      ? [...current, favId]
      : current.filter((existing) => existing !== favId);
    localStorage.setItem(key, JSON.stringify(next));
    announce({ key, id: favId, saved });
    return next;
  } catch {
    return null;
  }
}

const NUMERIC = /^\d+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Which stored values in a list are legacy ids rather than slugs, by the shape
// each table's id has. Slugs are words, so neither shape can be a slug.
// Publishers always saved the slug, so there is nothing to convert there.
export function legacyIds(key, values) {
  const shape = {
    [FAVORITE_KEYS.healers]: NUMERIC,
    [FAVORITE_KEYS.books]: NUMERIC,
    [FAVORITE_KEYS.readBooks]: NUMERIC,
    [FAVORITE_KEYS.videos]: NUMERIC,
    [FAVORITE_KEYS.courses]: UUID,
    [FAVORITE_KEYS.freeResources]: UUID,
  }[key];
  return shape ? values.map(String).filter((v) => shape.test(v)) : [];
}

// Rewrite a list with ids swapped for slugs, keeping order, dropping duplicates
// the swap creates, and KEEPING anything with no match (content since deleted)
// rather than losing it — the library simply does not show it.
export function convertList(values, idToSlug) {
  const out = [];
  for (const raw of values) {
    const value = String(raw);
    const slug = idToSlug.get(value) || value;
    if (!out.includes(slug)) out.push(slug);
  }
  return out;
}

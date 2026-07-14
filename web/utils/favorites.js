// Single source of truth for the localStorage keys backing "My Library".
//
// `videos` is deliberately the odd one out — it has always been stored under the
// singular `favorite_videos`, while the rest are `favorited_*`. Normalising the
// name would orphan every visitor's existing saved videos, so the inconsistency
// stays and is documented instead.
export const FAVORITE_KEYS = {
  healers: 'favorited_healers',
  books: 'favorited_books',
  videos: 'favorite_videos',
  courses: 'favorited_courses',
  freeResources: 'favorited_free_resources',
};

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

// Add or remove an id, persist, and hand back the new array so the caller can
// derive its own state from it. Returns null if persistence failed, letting the
// caller leave its UI untouched rather than showing a toggle that did not stick.
export function toggleFavorite(key, id) {
  try {
    const current = readFavorites(key).map(String);
    const favId = String(id);
    const next = current.includes(favId)
      ? current.filter((existing) => existing !== favId)
      : [...current, favId];
    localStorage.setItem(key, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

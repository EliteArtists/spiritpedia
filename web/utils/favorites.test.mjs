// Run with `npm test` (node --test). The id → slug conversion of saved items.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTENT_TYPES,
  FAVORITE_KEYS,
  convertList,
  legacyIds,
  readFavorites,
  toggleFavorite,
  writeFavorites,
} from './favorites.js';

beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

test('legacy ids are recognised by each table’s id shape, slugs never are', () => {
  assert.deepEqual(legacyIds(FAVORITE_KEYS.books, ['the-power-of-now', '412', 412]), ['412', '412']);
  assert.deepEqual(legacyIds(FAVORITE_KEYS.videos, ['4091', 'a-talk']), ['4091']);
  assert.deepEqual(legacyIds(FAVORITE_KEYS.healers, ['eckhart-tolle', '17']), ['17']);
  assert.deepEqual(
    legacyIds(FAVORITE_KEYS.courses, ['3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b', 'breath-course', '12']),
    ['3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b']
  );
  assert.deepEqual(legacyIds(FAVORITE_KEYS.freeResources, ['17']), []);
  // Publishers always saved the slug.
  assert.deepEqual(legacyIds(FAVORITE_KEYS.publishers, ['17', 'hay-house']), []);
});

test('conversion keeps order, merges duplicates and keeps the unmatched', () => {
  const idToSlug = new Map([
    ['412', 'the-power-of-now'],
    ['9', 'a-new-earth'],
  ]);
  assert.deepEqual(
    convertList(['412', 'the-power-of-now', '9', '777', 'stillness-speaks'], idToSlug),
    ['the-power-of-now', 'a-new-earth', '777', 'stillness-speaks']
  );
});

test('every list maps to the content type the app uses', () => {
  assert.deepEqual(Object.values(CONTENT_TYPES).sort(), [
    'book',
    'book_read',
    'course',
    'free_resource',
    'healer',
    'publisher',
    'video',
  ]);
});

test('toggle and write keep a clean array', () => {
  assert.deepEqual(toggleFavorite(FAVORITE_KEYS.books, 'the-power-of-now'), ['the-power-of-now']);
  assert.deepEqual(toggleFavorite(FAVORITE_KEYS.books, 'the-power-of-now'), []);
  assert.equal(writeFavorites(FAVORITE_KEYS.videos, ['a', 'b', 'a', '']), true);
  assert.deepEqual(readFavorites(FAVORITE_KEYS.videos), ['a', 'b']);
  localStorage.setItem(FAVORITE_KEYS.healers, 'not json');
  assert.deepEqual(readFavorites(FAVORITE_KEYS.healers), []);
});

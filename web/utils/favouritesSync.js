'use client';

import { supabaseAuth } from './supabaseAuth.js';
import {
  CONTENT_TYPES,
  FAVORITE_KEYS,
  convertList,
  legacyIds,
  readFavorites,
  writeFavorites,
} from './favorites.js';

// My Library and the account — the website half of what the app does.
//
// localStorage stays what every heart and the library page read. Signed in,
// it is a copy of the account: user_favourites is the source of truth, each
// toggle is written through to it, and the account's list is pulled back down
// on every page load. Signed out, it is the library itself.

// Bumped if the conversion below ever changes. Set only after a run that
// converted everything it could, so a failed lookup is retried next load.
const NORMALISED_FLAG = 'favorites_slugs_v1';

// Set per account once this browser's own saves have been merged up. After
// that the account wins: an item removed on the phone is not re-added from a
// stale copy here. Cleared on sign-out, so saves made while signed out are
// merged up on the next sign-in.
const mergedFlag = (userId) => `favorites_merged:${userId}`;

const ID_LOOKUPS = {
  [FAVORITE_KEYS.healers]: { table: 'healers', slug: 'healer_slug' },
  [FAVORITE_KEYS.books]: { table: 'books', slug: 'slug' },
  [FAVORITE_KEYS.readBooks]: { table: 'books', slug: 'slug' },
  [FAVORITE_KEYS.videos]: { table: 'videos', slug: 'slug' },
  [FAVORITE_KEYS.courses]: { table: 'courses', slug: 'slug' },
  [FAVORITE_KEYS.freeResources]: { table: 'free_resources', slug: 'slug' },
};

function flag(name, value) {
  try {
    if (value === undefined) return localStorage.getItem(name);
    if (value === null) localStorage.removeItem(name);
    else localStorage.setItem(name, value);
  } catch {
    // Storage blocked — every step below is safe to repeat.
  }
  return null;
}

// Swap legacy ids for slugs in every list, once per browser. Content tables are
// public to read, so this works signed in or not.
export async function normaliseLegacyFavourites() {
  if (flag(NORMALISED_FLAG)) return;
  let complete = true;
  for (const [key, { table, slug }] of Object.entries(ID_LOOKUPS)) {
    const values = readFavorites(key);
    const ids = legacyIds(key, values);
    if (ids.length === 0) continue;
    const { data, error } = await supabaseAuth.from(table).select(`id, ${slug}`).in('id', ids);
    if (error) {
      complete = false;
      continue;
    }
    const idToSlug = new Map(
      (data || []).filter((row) => row[slug]).map((row) => [String(row.id), row[slug]])
    );
    if (!writeFavorites(key, convertList(values, idToSlug))) complete = false;
  }
  if (complete) flag(NORMALISED_FLAG, '1');
}

function localRows(userId) {
  const rows = [];
  for (const [key, contentType] of Object.entries(CONTENT_TYPES)) {
    for (const value of readFavorites(key)) {
      const slug = String(value).trim();
      if (slug) rows.push({ user_id: userId, content_type: contentType, content_slug: slug });
    }
  }
  return rows;
}

// Sign-in: merge this browser's saves up (once per account), then make
// localStorage the account's list. Nothing local is replaced unless the merge
// has succeeded at some point, so a failure here never loses a save.
export async function syncFavouritesWithAccount(userId) {
  if (!userId) return;
  await normaliseLegacyFavourites();

  if (!flag(mergedFlag(userId))) {
    const rows = localRows(userId);
    if (rows.length > 0) {
      const { error } = await supabaseAuth
        .from('user_favourites')
        .upsert(rows, { onConflict: 'user_id,content_type,content_slug', ignoreDuplicates: true });
      if (error) return;
    }
    flag(mergedFlag(userId), '1');
  }

  const { data, error } = await supabaseAuth
    .from('user_favourites')
    .select('content_type, content_slug, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) return;

  for (const [key, contentType] of Object.entries(CONTENT_TYPES)) {
    writeFavorites(
      key,
      (data || []).filter((r) => r.content_type === contentType).map((r) => r.content_slug)
    );
  }
}

// One heart, written through to the account. A failure is not surfaced: the
// next page load pulls the account's list back down, which is the honest state.
export async function writeThroughToggle(userId, key, slug, saved) {
  const contentType = CONTENT_TYPES[key];
  if (!userId || !contentType || !slug) return;
  if (saved) {
    await supabaseAuth
      .from('user_favourites')
      .upsert(
        { user_id: userId, content_type: contentType, content_slug: slug },
        { onConflict: 'user_id,content_type,content_slug', ignoreDuplicates: true }
      );
  } else {
    await supabaseAuth
      .from('user_favourites')
      .delete()
      .eq('user_id', userId)
      .eq('content_type', contentType)
      .eq('content_slug', slug);
  }
}

// Sign-out: this browser's library goes with the account, as on the phone —
// nothing personal is left for the next person at a shared computer, and a
// later sign-in cannot re-add something removed elsewhere from a stale copy.
// Cleared ONLY when this browser's saves are known to be in the account (the
// merge flag); otherwise they are kept, so a failed merge never loses a save.
// `userId` is who was signed in; unknown (an expired session) clears nothing.
export function clearSavesAfterSignOut(userId) {
  if (userId && flag(mergedFlag(userId))) {
    for (const key of Object.keys(CONTENT_TYPES)) writeFavorites(key, []);
  }
  forgetAccountMerge();
}

// Forget every account's merge, so the next sign-in merges what is saved here.
export function forgetAccountMerge() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const name = localStorage.key(i);
      if (name?.startsWith('favorites_merged:')) localStorage.removeItem(name);
    }
  } catch {
    // Storage blocked — nothing to forget.
  }
}

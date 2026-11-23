import { supabase } from '@/utils/supabase';
import { selectAllRows } from '@/data/subjects';
import { nearSlug } from '@/utils/nearSlug';

// The real listing a missing /healers/<slug> or /publishers/<slug> is very
// close to (utils/nearSlug.js), or null. Only asked after a 404, so the
// addresses are read then, and kept for ten minutes: a stream of mistyped or
// made-up addresses costs one read, not one each.

const KEEP_MS = 10 * 60 * 1000;
const kept = new Map();

async function slugsOf(table, column) {
  const hit = kept.get(table);
  if (hit && Date.now() - hit.at < KEEP_MS) return hit.slugs;
  const { data, error } = await selectAllRows(table, column, (q) => q, supabase);
  if (error && !data) return [];
  const slugs = (data || []).map((row) => row[column]).filter(Boolean);
  kept.set(table, { at: Date.now(), slugs });
  return slugs;
}

export async function nearListingSlug(kind, slug) {
  const [table, column] = kind === 'publisher' ? ['publishers', 'slug'] : ['healers', 'healer_slug'];
  try {
    return nearSlug(slug, await slugsOf(table, column));
  } catch (err) {
    console.error('[nearListing] looking for a close address failed:', err.message);
    return null;
  }
}

// The address to send them to, keeping what was after the "?".
export function withQuery(path, searchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    for (const v of [].concat(value)) if (v != null) query.append(key, v);
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

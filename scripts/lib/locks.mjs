// Listings locked "keep minimal" (migration 0053; owner, 18 Nov 2026): the
// owner of the listing asked for changes or removals, so no sprint, restore,
// image fix or ingest may add to it. Read through each script's own get().
// → Map of healer_slug → note. Before 0053 runs there is no table and
// nothing is locked.
export async function lockedListings(get) {
  try {
    const rows = await get('listing_locks?select=healer_slug,note');
    return new Map(rows.map((r) => [r.healer_slug, r.note]));
  } catch (e) {
    if (/PGRST205|42P01/.test(e.message)) return new Map();
    throw e;
  }
}

export const lockedLine = (slug, note) =>
  `${slug} is locked (${note}): an owner request. Nothing is added to it; switch the lock off in Admin → Content first.`;

// Co-authors (migration 0027). A book has one main author, books.healer_slug,
// and any number of co-authors, books.co_healer_slugs. A co-written book shows
// on every author's teacher page and publisher shelf, and its page names them
// all. Editing stays with the main author (contentOwner.js is unchanged).
// The app mirrors this in app/lib/data/book_authors.dart.

// Every author's slug, main author first, no repeats, no blanks.
export function bookAuthorSlugs(book) {
  const slugs = [book?.healer_slug, ...(book?.co_healer_slugs || [])].filter(Boolean);
  return [...new Set(slugs)];
}

// Healer slugs are lowercase letters, digits and hyphens; anything else is
// dropped so it can't break the PostgREST filter it goes into.
const safe = (slugs) => slugs.filter((s) => typeof s === 'string' && /^[a-z0-9-]+$/.test(s));

// PostgREST .or() filter: books where any of these healers is an author.
// → null when there's no usable slug (the caller skips the query).
export function booksByAuthorsFilter(healerSlugs) {
  const slugs = safe(healerSlugs || []);
  if (slugs.length === 0) return null;
  return `healer_slug.in.(${slugs.join(',')}),co_healer_slugs.ov.{${slugs.join(',')}}`;
}

// "A", "A and B", "A, B and C".
export function joinNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

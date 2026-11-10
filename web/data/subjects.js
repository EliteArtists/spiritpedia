import { supabase } from '../utils/supabase.js';
import { byTier } from '../utils/listings.js';
import { SHELVES, shelfQuery } from '../utils/subjectShelves.js';

// Function to fetch all subjects from the Supabase database (used by homepage and static generator)
export async function getAllSubjects() {
  const { data: subjects, error } = await supabase
    .from('subjects')
    .select('name, slug')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching subjects:', error);
    return []; 
  }

  return subjects;
}

// Every healer row, `columns` wide. PostgREST caps a response at 1,000 rows
// and truncates WITHOUT an error, and live passed that in Nov 2026 (1,013
// healers), so a plain select() silently lost the rest from the home page.
// Paged by `id` as web/app/sitemap.js does: id is unique, so pages neither
// overlap nor skip (created_at is not; bulk imports share a timestamp).
// `refine` narrows the query before it is paged; `client` is the public
// client unless a caller (an admin route) passes its own. Returns
// { data, error } like a single query; a failed page returns what came
// before it.
const PAGE = 1000;

export async function selectAllHealers(columns = '*', refine = (q) => q, client = supabase) {
  return selectAllRows('healers', columns, refine, client);
}

// The same paging for any table with a unique `id` (books, courses, free
// resources on the subject pages).
export async function selectAllRows(table, columns = '*', refine = (q) => q, client = supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await refine(
      client.from(table).select(columns).order('id', { ascending: true })
    ).range(from, from + PAGE - 1);
    if (error) return { data: rows.length ? rows : null, error };
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return { data: rows, error: null };
}

// Display names for every healer on the platform, keyed BOTH ways, because the
// content tables do not agree on how they point at a healer:
//
//   byId   — a Map, for offerings and free resources, which link by the
//            relational bigint healer_id. Server-side only.
//   bySlug — an ARRAY of [healer_slug, name] pairs, for videos, which link by
//            the text healer_slug. Pairs rather than a Map because this one
//            crosses into a client component, and an array is the shape the
//            homepage already hands to the same component.
//
// Deliberately spans the whole table, not the subject-filtered set: a course's
// author must still be nameable when the author themselves is not tagged with
// the subject being viewed, and a video's healer likewise. Paged
// (selectAllHealers), so nobody past the first 1,000 loses their name.
export async function getHealerNames() {
  const { data, error } = await selectAllHealers('id, name, healer_slug');

  if (error) {
    console.error('Error fetching healer names:', error);
    if (!data) return { byId: new Map(), bySlug: [] };
  }

  return {
    byId: new Map(data.map((h) => [h.id, h.name])),
    bySlug: data.filter((h) => h.healer_slug).map((h) => [h.healer_slug, h.name]),
  };
}

// Function to fetch content for a specific subject slug.
//
// TAG MATCHING — subject_slugs is a Postgres array column, so every filter here
// is an array-containment check (`.contains` → the `@>` operator), NOT a string
// comparison. Containment matches a slug as one whole element, which is what
// makes hyphenated tags such as 'eft-tapping' or 'law-of-attraction' safe: a
// LIKE/eq-style match would have to reason about the separator, and containment
// simply never sees one.
//
// VIDEOS ARE NOT HERE. They used to be, and the whole matching pool — up to a
// thousand rows — was serialised into the page's HTML so that twenty-four of
// them could be rendered. That alone put /subject/self-healing at 4.9MB. The
// VideoShelves client component fetches them on the client instead, which also
// lifts the thousand-row ceiling that was silently costing self-healing 45 of
// its 1,045 videos.
//
// OFFERINGS AND FREE RESOURCES ARE NOT HERE EITHER (owner, 10 Nov 2026).
// /subject/meditation carried 2,000 live courses and 1,000 free resources in
// its HTML; SubjectPagedShelf loads them in the browser a page at a time. Only
// how many each shelf holds is counted here (`counts`), so an empty shelf is
// not drawn and an empty subject still reads as empty.
//
// Books and healers are paged (selectAllRows): PostgREST caps a response at
// 1,000 rows and reports no error when it truncates.
// Only what BookCard and ContentShelf read.
const BOOK_COLUMNS = 'id, slug, title, description, mock_cover_url';

export async function getContentBySubjectSlug(subjectSlug) {
  // Every query issued concurrently — one round trip's latency for the whole page.
  const kinds = Object.keys(SHELVES);
  const [booksResult, healersResult, ...countResults] = await Promise.all([
    selectAllRows('books', BOOK_COLUMNS, (q) => q.contains('subject_slugs', [subjectSlug])),
    selectAllHealers('*', (q) => q.contains('subject_slugs', [subjectSlug])),
    ...kinds.map((kind) => shelfQuery(kind, subjectSlug, { columns: 'id', count: true })),
  ]);

  const results = [booksResult, healersResult, ...countResults];
  const failure = results.find((r) => r.error);
  if (failure) {
    console.error('Error in content query:', failure.error);
    return { books: [], healers: [], counts: {}, places: {} };
  }

  // Teachers in the site's tier order, then by name (owner, 10 Nov 2026); the
  // page re-sorts within each tier, nearest first, once the visitor's area is
  // known in the browser (components/SubjectHealersShelf.jsx). That needs
  // their towns, which come back as `places` (place id → place).
  const healers = byTier(healersResult.data);
  const placeIds = [...new Set(healers.map((h) => h.place_id).filter(Boolean))];
  const { data: placeRows } = placeIds.length
    ? await supabase.from('places').select('id, name, region, country, lat, lng').in('id', placeIds)
    : { data: [] };

  return {
    books: booksResult.data,
    healers,
    places: Object.fromEntries((placeRows || []).map((p) => [p.id, p])),
    counts: Object.fromEntries(kinds.map((kind, i) => [kind, countResults[i].count || 0])),
  };
}

// Function required by Next.js to pre-build every subject page statically.
export async function generateStaticParams() {
  // Rely on the successful getAllSubjects query result.
  const subjects = await getAllSubjects(); 
  
  // Returns an array of objects like: [{ slug: 'meditation' }, { slug: 'reiki' }]
  return subjects.map((subject) => ({
    slug: subject.slug,
  }));
}

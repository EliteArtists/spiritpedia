import { supabase } from '../utils/supabase.js';
import { byTier } from '../utils/listings.js';

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
// Books, courses, free resources and healers are all paged (selectAllRows):
// PostgREST caps a response at 1,000 rows and reports no error when it
// truncates, and self-healing was already at 547 courses and 465 books.
// Only what the cards read (BookCard, OfferingCard, FreeResourceCard,
// ContentShelf's id): with every row paged in, `*` made /subject/meditation
// (2,068 live courses, 1,022 free resources) far heavier than it needs to be.
const BOOK_COLUMNS = 'id, slug, title, description, mock_cover_url';
const COURSE_COLUMNS = 'id, slug, title, description, image_url, price, product_type, healer_id';
const FREE_COLUMNS = 'id, slug, title, description, image_url, resource_type, healer_id';

export async function getContentBySubjectSlug(subjectSlug) {
  // EXPIRATION WINDOW — mirrors the homepage: a paid offering or free resource
  // only surfaces while it is live (is_active, and either evergreen or not yet
  // past its end date). Recomputed per request so the window rolls forward.
  const today = new Date().toISOString().slice(0, 10);
  const liveWindow = `end_date.is.null,end_date.gte.${today}`;

  // Every query issued concurrently — one round trip's latency for the whole page.
  const [booksResult, healersResult, coursesResult, freeResourcesResult] =
    await Promise.all([
      selectAllRows('books', BOOK_COLUMNS, (q) => q.contains('subject_slugs', [subjectSlug])),
      selectAllHealers('*', (q) => q.contains('subject_slugs', [subjectSlug])),
      selectAllRows('courses', COURSE_COLUMNS, (q) =>
        q.contains('subject_slugs', [subjectSlug]).eq('is_active', true).or(liveWindow)
      ),
      // NOTE: no is_featured filter here. That flag is a homepage curation
      // control; on a subject page the visitor asked for this subject explicitly,
      // so they should see every live free resource carrying the tag.
      selectAllRows('free_resources', FREE_COLUMNS, (q) =>
        q.contains('subject_slugs', [subjectSlug]).eq('is_active', true).or(liveWindow)
      ),
    ]);

  const results = [booksResult, healersResult, coursesResult, freeResourcesResult];
  const failure = results.find((r) => r.error);
  if (failure) {
    console.error('Error in content query:', failure.error);
    return { books: [], healers: [], courses: [], freeResources: [], places: {} };
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
    courses: coursesResult.data,
    freeResources: freeResourcesResult.data,
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

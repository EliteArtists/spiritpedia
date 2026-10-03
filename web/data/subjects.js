import { supabase } from '../utils/supabase.js';

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
// the subject being viewed, and a video's healer likewise.
export async function getHealerNames() {
  const { data, error } = await supabase.from('healers').select('id, name, healer_slug');

  if (error) {
    console.error('Error fetching healer names:', error);
    return { byId: new Map(), bySlug: [] };
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
// TODO — the four queries below still have that ceiling. PostgREST caps a
// response at 1,000 rows and reports no error when it truncates, so the first
// subject whose books, courses, free resources or healers cross that line will
// quietly lose the remainder. self-healing is already at 547 courses and 465
// books, and consciousness at 386 courses. The fix is `.range()` paging on a
// unique, ordered column (id — created_at is not unique, bulk imports share a
// timestamp), as web/app/sitemap.js does. Out of scope here; a separate task.
export async function getContentBySubjectSlug(subjectSlug) {
  // EXPIRATION WINDOW — mirrors the homepage: a paid offering or free resource
  // only surfaces while it is live (is_active, and either evergreen or not yet
  // past its end date). Recomputed per request so the window rolls forward.
  const today = new Date().toISOString().slice(0, 10);
  const liveWindow = `end_date.is.null,end_date.gte.${today}`;

  // Every query issued concurrently — one round trip's latency for the whole page.
  const [booksResult, healersResult, coursesResult, freeResourcesResult] =
    await Promise.all([
      supabase.from('books').select('*').contains('subject_slugs', [subjectSlug]),
      supabase.from('healers').select('*').contains('subject_slugs', [subjectSlug]),
      supabase
        .from('courses')
        .select('*')
        .contains('subject_slugs', [subjectSlug])
        .eq('is_active', true)
        .or(liveWindow),
      // NOTE: no is_featured filter here. That flag is a homepage curation
      // control; on a subject page the visitor asked for this subject explicitly,
      // so they should see every live free resource carrying the tag.
      supabase
        .from('free_resources')
        .select('*')
        .contains('subject_slugs', [subjectSlug])
        .eq('is_active', true)
        .or(liveWindow),
    ]);

  const results = [booksResult, healersResult, coursesResult, freeResourcesResult];
  const failure = results.find((r) => r.error);
  if (failure) {
    console.error('Error in content query:', failure.error);
    return { books: [], healers: [], courses: [], freeResources: [] };
  }

  return {
    books: booksResult.data,
    healers: healersResult.data,
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
}// Function to fetch content for *client-side* filtering on the homepage
export async function getHomepageContent(subjectSlug) {
    if (!subjectSlug) {
        return { books: [], videos: [], healers: [] };
    }
    
    // Fetch all necessary data in one efficient query pattern (using Promise.all)
    // Same array-containment matching as getContentBySubjectSlug above.
    const results = await Promise.all([
        supabase.from('books').select('*').contains('subject_slugs', [subjectSlug]),
        supabase.from('videos').select('*').contains('subject_slugs', [subjectSlug]),
        supabase.from('healers').select('*').contains('subject_slugs', [subjectSlug]),
    ]);

    // Simple error check
    const [booksResult, videosResult, healersResult] = results;

    if (booksResult.error || videosResult.error || healersResult.error) {
        console.error('Error fetching homepage content:', booksResult.error || videosResult.error || healersResult.error);
        return { books: [], videos: [], healers: [] };
    }

    return { 
        books: booksResult.data, 
        videos: videosResult.data, 
        healers: healersResult.data 
    };
}
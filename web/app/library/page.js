import { supabase } from '@/utils/supabase';
import LibraryView from '@/components/LibraryView';

// NEVER prerender this page. Supabase queries go through fetch, so on a static
// route Next.js freezes their responses in the Data Cache at build time — the
// library then serves whatever the catalog looked like when the site was last
// built. That is not a staleness nicety here: a favourite is matched by id
// against the catalog, so any item added after the last build is simply absent
// from the catalog and the visitor's saved copy of it silently disappears from
// their library. Observed exactly that — a saved video 404'd out of the shelves
// because the baked snapshot predated it.
export const dynamic = 'force-dynamic';

// The library is per-visitor (localStorage), so a shared link shows an empty
// shelf to anyone else. Give it a proper title but keep it out of the index.
export const metadata = {
  title: 'My Library',
  description:
    'Your saved healers, publishers, books, videos and resources, organised by subject.',
  robots: { index: false, follow: true },
};
// Site-wide hourly ISR floor, declared for consistency with the other pages.
// force-dynamic above wins outright — the route still renders per request and
// its fetches stay uncached. If you are here to resolve the apparent conflict,
// delete THIS line, never the force-dynamic one.
export const revalidate = 3600;

// Server component: fetch the global site catalogs, then hand them to the client
// LibraryView, which matches them against the visitor's localStorage favourites.
//
// The favourites live only in the browser, so the server cannot know what the
// visitor saved — it ships the full catalog and the client does the intersection.
// PostgREST returns at most 1,000 rows per request, silently. With 2,269 videos
// and 963 books (Oct 2026), a plain select('*') left more than half the videos
// out of the catalog — a saved one never appeared here. Paged, ordered by id so
// the pages neither overlap nor skip.
async function selectAll(table) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return { data: rows.length ? rows : null, error };
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return { data: rows, error: null };
}

export default async function LibraryPage() {
  // Saved offerings still respect the live window: a course the visitor
  // favourited months ago should drop out of their library once it has expired,
  // rather than sitting there as a dead enrolment link.
  const today = new Date().toISOString().slice(0, 10);
  const liveWindow = `end_date.is.null,end_date.gte.${today}`;

  const [
    booksRes,
    videosRes,
    healersRes,
    subjectsRes,
    coursesRes,
    freeResourcesRes,
    publishersRes,
  ] = await Promise.all([
    selectAll('books'),
    selectAll('videos'),
    selectAll('healers'),
    supabase.from('subjects').select('name, slug'),
    supabase.from('courses').select('*').eq('is_active', true).or(liveWindow),
    // No is_featured filter: that flag curates the homepage shelf. If the
    // visitor saved a free resource, it belongs in their library either way.
    supabase.from('free_resources').select('*').eq('is_active', true).or(liveWindow),
    // The embedded aggregate carries the author count, so the saved card reads
    // identically to the one on the homepage.
    supabase.from('publishers').select('*, publisher_healers(count)'),
  ]);

  const healers = healersRes.data || [];

  return (
    <LibraryView
      books={booksRes.data || []}
      videos={videosRes.data || []}
      healers={healers}
      subjects={subjectsRes.data || []}
      courses={coursesRes.data || []}
      freeResources={freeResourcesRes.data || []}
      publishers={publishersRes.data || []}
      healerNames={healers.map((h) => ({ id: h.id, name: h.name }))}
    />
  );
}

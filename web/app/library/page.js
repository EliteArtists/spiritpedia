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

// Server component: fetch the global site catalogs, then hand them to the client
// LibraryView, which matches them against the visitor's localStorage favourites.
//
// The favourites live only in the browser, so the server cannot know what the
// visitor saved — it ships the full catalog and the client does the intersection.
export default async function LibraryPage() {
  // Saved offerings still respect the live window: a course the visitor
  // favourited months ago should drop out of their library once it has expired,
  // rather than sitting there as a dead enrolment link.
  const today = new Date().toISOString().slice(0, 10);
  const liveWindow = `end_date.is.null,end_date.gte.${today}`;

  const [booksRes, videosRes, healersRes, subjectsRes, coursesRes, freeResourcesRes] =
    await Promise.all([
      supabase.from('books').select('*'),
      supabase.from('videos').select('*'),
      supabase.from('healers').select('*'),
      supabase.from('subjects').select('name, slug'),
      supabase.from('courses').select('*').eq('is_active', true).or(liveWindow),
      // No is_featured filter: that flag curates the homepage shelf. If the
      // visitor saved a free resource, it belongs in their library either way.
      supabase.from('free_resources').select('*').eq('is_active', true).or(liveWindow),
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
      healerNames={healers.map((h) => ({ id: h.id, name: h.name }))}
    />
  );
}

import { supabase } from '@/utils/supabase';
import LibraryView from '@/components/LibraryView';

// Server component: fetch the global site catalogs, then hand them to the
// client LibraryView which matches them against the visitor's localStorage
// favorites and bucket-sorts everything by subject.
export default async function LibraryPage() {
  const [booksRes, videosRes, healersRes, subjectsRes] = await Promise.all([
    supabase.from('books').select('*'),
    supabase.from('videos').select('*'),
    supabase.from('healers').select('*'),
    supabase.from('subjects').select('name, slug'),
  ]);

  return (
    <LibraryView
      books={booksRes.data || []}
      videos={videosRes.data || []}
      healers={healersRes.data || []}
      subjects={subjectsRes.data || []}
    />
  );
}

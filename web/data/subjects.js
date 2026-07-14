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

// Function to fetch content for a specific subject slug.
//
// TAG MATCHING — subject_slugs is a Postgres array column, so every filter here
// is an array-containment check (`.contains` → the `@>` operator), NOT a string
// comparison. Containment matches a slug as one whole element, which is what
// makes hyphenated tags such as 'eft-tapping' or 'law-of-attraction' safe: a
// LIKE/eq-style match would have to reason about the separator, and containment
// simply never sees one.
export async function getContentBySubjectSlug(subjectSlug) {

  // Fetch all necessary data in one efficient query pattern (using Promise.all)
  const results = await Promise.all([
      supabase.from('books').select('*').contains('subject_slugs', [subjectSlug]),
      // select('*'), not a narrow projection: VideoPlayer keys its favourites off
      // video.id, and omitting the column silently collapsed every card onto the
      // single favourite id "undefined" — hearting one video hearted them all.
      supabase.from('videos').select('*').contains('subject_slugs', [subjectSlug]),
      supabase.from('healers').select('*').contains('subject_slugs', [subjectSlug]),
  ]);

  // Check for any errors
  const [booksResult, videosResult, healersResult] = results;

  if (booksResult.error || videosResult.error || healersResult.error) {
      console.error('Error in content query:', booksResult.error || videosResult.error || healersResult.error);
      return { books: [], videos: [], healers: [] };
  }

  return { 
      books: booksResult.data, 
      videos: videosResult.data, 
      healers: healersResult.data 
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
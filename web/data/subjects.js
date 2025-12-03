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

// Function to fetch content for a specific subject slug
export async function getContentBySubjectSlug(subjectSlug) {
    
  // Fetch all necessary data in one efficient query pattern (using Promise.all)
  const results = await Promise.all([
      supabase.from('books').select('*').eq('subject_slug', subjectSlug),
      supabase.from('videos').select('title, platform_url').eq('subject_slug', subjectSlug),
      supabase.from('healers').select('*').eq('subject_slug', subjectSlug),
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
    const results = await Promise.all([
        supabase.from('books').select('*').eq('subject_slug', subjectSlug),
        supabase.from('videos').select('title, platform_url').eq('subject_slug', subjectSlug),
        supabase.from('healers').select('*').eq('subject_slug', subjectSlug),
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
import { getAllSubjects } from '../data/subjects.js'; // The server-side function to get the list
import HomePageContent from '../components/HomePageContent.js'; // The client-side logic
import { Suspense } from 'react'; // Used to ensure the component loads correctly

// Next.js automatically runs this function before loading the page (Server Component).
export default async function Home({ searchParams }) {
  
  const subjects = await getAllSubjects();
  
  // The initial subject slug is read from the server-side URL params.
  // In Next.js 16 searchParams is a Promise and must be awaited before access.
  const resolvedSearchParams = await searchParams;
  const initialSubjectSlug = resolvedSearchParams?.subject || null;

  return (
    // We wrap the client component in Suspense for error handling and slow loading
    // The key logic is passing the data from the server to the client component.
    <Suspense> 
        <HomePageContent 
            allSubjects={subjects} 
            initialSubjectSlug={initialSubjectSlug} 
        />
    </Suspense>
  );
}
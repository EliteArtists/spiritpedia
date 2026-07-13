import { Suspense } from 'react';
import HomePageContent from '../components/HomePageContent.js';

// Server Component. HomePageContent issues every Supabase query itself (in a
// single Promise.all), so all this layer does is resolve the active subject
// filter off the URL and hand it down.
export default async function Home({ searchParams }) {
  // In Next.js 16 searchParams is a Promise and must be awaited before access.
  const resolvedSearchParams = await searchParams;
  const initialSubjectSlug = resolvedSearchParams?.subject || null;

  return (
    <Suspense>
      <HomePageContent initialSubjectSlug={initialSubjectSlug} />
    </Suspense>
  );
}

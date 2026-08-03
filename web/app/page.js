import { Suspense } from 'react';
import HomePageContent from '../components/HomePageContent.js';

// Ceiling on how stale the homepage catalog may ever be. Reading searchParams
// below already forces this route to render per-request, so today this changes
// nothing — it is here so that if the ?subject= filter ever moves client-side
// and the route flips to static, newly-ingested content still surfaces within
// the hour instead of waiting for the next deploy.
export const revalidate = 3600;

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

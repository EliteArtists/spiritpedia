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

  // The view state the URL carries: which tab, and which Explore More shelves
  // were open. Rebuilt into a search string and handed down so the first render
  // on the server already matches what the visitor is coming back to — without
  // it a refresh of /?tab=videos would paint Discover and correct itself a
  // frame later. Only these three keys are passed on; anything else in the URL
  // is not this page's business.
  const initialSearch = new URLSearchParams(
    Object.entries({
      subject: resolvedSearchParams?.subject,
      tab: resolvedSearchParams?.tab,
      shelves: resolvedSearchParams?.shelves,
    }).filter(([, value]) => typeof value === 'string' && value !== '')
  ).toString();

  return (
    <Suspense>
      <HomePageContent
        initialSubjectSlug={initialSubjectSlug}
        initialSearch={initialSearch ? `?${initialSearch}` : ''}
      />
    </Suspense>
  );
}

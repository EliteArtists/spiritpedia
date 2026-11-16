import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StoreBadges from '@/components/StoreBadges';
import { buildMetadata } from '@/utils/seo';
import { APP_LINE, TRADEMARKS, deviceFromUserAgent, getAppHref, isPlacement, storesFor } from '@/utils/appStores';

// /get-app — the short link to the app (spiritpedia.co/get-app), and where the
// teacher-page and My Library lines point (?from=<placement>).
//
// A phone goes straight on to its store through the counting address
// (/get-app/<store>, migration 0052), keeping the placement. A computer, or
// anything unrecognised, gets this page with both badges. Per request, since
// it reads the user-agent. Kept out of search results: a crawler that says it
// is an Android phone would only ever see a redirect.
export const dynamic = 'force-dynamic';

export const metadata = {
  ...buildMetadata({
    title: 'Get the Spiritpedia app',
    description: 'Free on iPhone, iPad and Android.',
    path: '/get-app',
  }),
  robots: { index: false, follow: true },
};

export default async function GetAppPage({ searchParams }) {
  const { from } = await searchParams;
  const placement = isPlacement(from) ? from : 'get_app_page';
  const stores = storesFor(deviceFromUserAgent((await headers()).get('user-agent')));
  if (stores.length === 1) redirect(getAppHref(stores[0], placement));

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0a0f1d] px-6 py-16 text-white">
      <div className="w-full max-w-2xl text-center">
        <Link href="/" aria-label="Spiritpedia home" className="inline-block">
          <img
            src="/Spiritpedia_Header_Symbol.png"
            alt=""
            aria-hidden="true"
            className="mx-auto h-14 w-14 object-contain transition-transform duration-200 hover:scale-105"
          />
        </Link>
        <h1 className="mt-8 text-3xl font-bold">Get the Spiritpedia app</h1>
        <p className="mt-4 text-gray-300">{APP_LINE}.</p>
        <p className="mt-1 text-sm text-gray-500">Free on iPhone, iPad and Android.</p>
        <StoreBadges placement={placement} className="mt-8 justify-center" />
        <p className="mx-auto mt-16 max-w-xl text-xs leading-relaxed text-gray-600">{TRADEMARKS}</p>
      </div>
    </main>
  );
}

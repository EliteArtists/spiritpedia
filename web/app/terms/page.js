import Link from 'next/link';
import { buildMetadata } from '@/utils/seo';

// Placeholder. Linked from the site-wide footer, so it must exist and must not
// 404 — a dead legal link reads worse than an honest holding page.
//
// noindex until there is real content: a page whose entire body says it is not
// ready has nothing to offer a search result, and indexing it now means waiting
// for a re-crawl to replace it later. Drop the robots line when the real policy
// lands.
export const metadata = {
  ...buildMetadata({
    title: 'Terms of Use',
    description: 'The terms you agree to when using Spiritpedia.',
    path: '/terms',
  }),
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0a0f1d] px-6 py-16 text-white">
      <div className="my-auto w-full max-w-lg text-center">
        <Link href="/" aria-label="Spiritpedia home" className="inline-block">
          <img
            src="/Spiritpedia_Header_Symbol.png"
            alt=""
            aria-hidden="true"
            className="mx-auto h-14 w-14 object-contain transition-transform duration-200 hover:scale-105"
          />
        </Link>

        <h1 className="mt-8 text-3xl font-bold">Terms of Use</h1>

        <p className="mt-4 text-sm leading-relaxed text-gray-400">
          This page is being prepared and will be published shortly.
        </p>

        <Link
          href="/"
          className="mt-8 inline-block text-sm font-semibold text-[#a78bfa] transition-colors hover:text-white"
        >
          Back to Spiritpedia
        </Link>
      </div>
    </main>
  );
}

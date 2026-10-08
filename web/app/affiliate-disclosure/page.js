import Link from 'next/link';
import { buildMetadata } from '@/utils/seo';
import { activeStores, formatStoreList } from '@/utils/affiliate';

// Linked from the site-wide footer and from the line under every tagged
// "Buy on Amazon" button. Indexable and in the sitemap: unlike /privacy and
// /terms this is finished copy, and a disclosure should be findable.
//
// The store list is generated from the AMAZON_TAG_* env vars, so the page only
// ever names a marketplace that has a live tag. It is rendered at build time,
// so a newly set var shows here after the next deploy — the same deploy that
// starts tagging that store's links.
export const metadata = buildMetadata({
  title: 'Affiliate Disclosure',
  description: 'How Spiritpedia earns from Amazon links, and why it never changes what we recommend.',
  path: '/affiliate-disclosure',
});

export default function AffiliateDisclosurePage() {
  const stores = activeStores();

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0a0f1d] px-6 py-16 text-white">
      <div className="my-auto w-full max-w-2xl">
        <div className="text-center">
          <Link href="/" aria-label="Spiritpedia home" className="inline-block">
            <img
              src="/Spiritpedia_Header_Symbol.png"
              alt=""
              aria-hidden="true"
              className="mx-auto h-14 w-14 object-contain transition-transform duration-200 hover:scale-105"
            />
          </Link>

          <h1 className="mt-8 text-3xl font-bold">Affiliate Disclosure</h1>
        </div>

        <div className="mt-8 space-y-5 text-sm leading-relaxed text-gray-300 md:text-base">
          <p>
            Spiritpedia is free to explore, and we&apos;d like to keep it that way. When you buy a
            book through one of our Amazon links, Amazon pays us a small commission. It costs you
            nothing extra, and it helps us keep curating.
          </p>

          {stores.length > 0 ? (
            <p>
              We take part in the Amazon Associates Programme in the following stores:{' '}
              {formatStoreList(stores)}. As an Amazon Associate, Spiritpedia earns from qualifying
              purchases.
            </p>
          ) : (
            // No AMAZON_TAG_* var is set, so no link on the site carries a tag.
            // Naming a programme here would be untrue.
            <p>We don&apos;t currently take part in any affiliate programme.</p>
          )}

          <p>
            Commissions never decide what appears here. Every teacher, book and practice on
            Spiritpedia is chosen because we believe it can genuinely help someone on their path —
            and a book earns its place the same way whether it has a link or not.
          </p>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-block text-sm font-semibold text-[#a78bfa] transition-colors hover:text-white"
          >
            Back to Spiritpedia
          </Link>
        </div>
      </div>
    </main>
  );
}

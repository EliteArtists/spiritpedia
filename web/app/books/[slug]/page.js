import { supabase } from '@/utils/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import ReadButton from '@/components/ReadButton';
import WantToReadButton from '@/components/WantToReadButton';
import { backContextQuery } from '@/utils/backContext';
import ShareButton from '@/components/ShareButton';
import { buildMetadata, notFoundMetadata, pickImage, SITE_URL } from '@/utils/seo';
import ReviewSection, { RatingRow } from '@/components/ReviewSection';
import { amazonAffiliateUrl } from '@/utils/affiliate';

// Hourly ceiling on staleness — see the note in app/page.js.
export const revalidate = 3600;

// Share card: "Title by Author", the synopsis, the cover. og:type 'book' is the
// Open Graph vertical for this page. pickImage drops the legacy 'NULL' cover.
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { data: book } = await supabase
    .from('books')
    .select('title, author, description, mock_cover_url')
    .eq('slug', slug)
    .single();
  if (!book) return notFoundMetadata('Book');

  return buildMetadata({
    title: book.author ? `${book.title} by ${book.author}` : book.title,
    description: book.description,
    path: `/books/${slug}`,
    image: pickImage(book.mock_cover_url),
    type: 'book',
  });
}

export default async function BookDetail({ params, searchParams }) {
  const { slug } = await params;
  // Contextual back navigation — whatever page linked here passes its own path
  // and label via ?from=&fromTitle=, so the back link returns the user there.
  const { from, fromTitle } = await searchParams;

  // Books link to a healer by the text `healer_slug` column, which is NOT a
  // declared foreign key — so a PostgREST embedded join (`healers (...)`) errors
  // with PGRST200 and would 404 every book. Fetch the book plainly, then resolve
  // the healer in a second query keyed off the slug, mirroring the rest of the app.
  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !book) {
    notFound();
  }

  const { data: healer } = book.healer_slug
    ? await supabase
        .from('healers')
        .select('name, healer_slug')
        .eq('healer_slug', book.healer_slug)
        .single()
    : { data: null };
  // Cover is stored under mock_cover_url; 'NULL' is a legacy sentinel for absent.
  const hasCover = book.mock_cover_url && book.mock_cover_url !== 'NULL';
  // Canonical /dp/ link, tagged only when that marketplace's env var is set.
  // null for anything that is not a real Amazon product link — a Goodreads URL
  // in the amazon_url column, a malformed ASIN — so the button is hidden rather
  // than sending someone somewhere misleading. See utils/affiliate.js.
  const amazon = amazonAffiliateUrl(book.amazon_url);

  return (
    <main className="relative min-h-screen bg-[#0a0f1d] pb-16">
      {/* Back link — anchored to the page's top-left, context-aware */}
      <div className="absolute top-8 left-6 md:left-8 z-10">
        <BackButton from={from} fromTitle={fromTitle} />
      </div>

      {/* Two-column body — fixed 280px cover column, fluid detail column */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-12 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10 items-start">
        {/* Left column — cover + shelf actions */}
        <div>
          {hasCover ? (
            <img
              src={book.mock_cover_url}
              alt={book.title}
              className="w-full rounded-xl object-cover shadow-2xl"
            />
          ) : (
            <div className="bg-[#111827] w-full h-[380px] rounded-xl flex items-center justify-center text-gray-600 text-sm">
              No cover available
            </div>
          )}

          <div className="mt-4">
            <WantToReadButton bookSlug={book.slug} />
            <ReadButton bookSlug={book.slug} />
          </div>
        </div>

        {/* Right column — title, author, rating, description, purchase links */}
        <div>
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              {book.title}
            </h1>
            <ShareButton
              className="shrink-0 mt-1"
              url={`${SITE_URL}/books/${book.slug}`}
              title={`${book.title} — Spiritpedia`}
            />
          </div>

          {healer ? (
            <Link
              href={`/healers/${healer.healer_slug}${backContextQuery(`/books/${book.slug}${backContextQuery(from, fromTitle)}`, book.title)}`}
              className="text-sm text-violet-400 hover:text-violet-300 mb-4 inline-block"
            >
              By {healer.name}
            </Link>
          ) : (
            book.author && <p className="text-sm text-gray-400 mb-4">By {book.author}</p>
          )}

          {/* Star rating row — empty until community reviews exist */}
          <RatingRow
          className="mb-6"
          contentType="book"
          contentSlug={book.slug}
        />

          {book.description && (
            <p className="text-base leading-relaxed text-gray-300 whitespace-pre-line mb-8">
              {book.description}
            </p>
          )}

          {/* Purchase links — each renders only when its URL is present */}
          <div className="flex flex-col gap-3">
            {amazon && (
              <div>
                {/* rel="sponsored" marks a paid link to search engines, as
                    Google's link guidelines require for affiliate links. */}
                <a
                  href={amazon.url}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="bg-[#FF9900] hover:bg-[#e68900] text-black font-bold text-sm rounded-xl py-3 px-6 text-center block w-full"
                >
                  Buy on Amazon
                </a>
                {/* Disclosure sits directly under the link it discloses, and
                    only when that link actually carries a tag. Required by the
                    Associates Operating Agreement and by FTC / UK ASA rules —
                    never ship a tag without it. */}
                {amazon.tagged && (
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">
                    <Link href="/affiliate-disclosure" className="transition-colors hover:text-gray-300">
                      As an Amazon Associate, Spiritpedia earns from qualifying purchases. It never
                      changes what we recommend.
                    </Link>
                  </p>
                )}
              </div>
            )}
            {book.goodreads_url && (
              <a
                href={book.goodreads_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#F4F1EA] hover:bg-[#e8e4dc] text-[#372213] font-bold text-sm rounded-xl border border-[#372213] py-3 px-6 text-center block w-full"
              >
                View on Goodreads
              </a>
            )}
            {book.worldofbooks_url && (
              <a
                href={book.worldofbooks_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#2d6a4f] hover:bg-[#235c42] text-white font-bold text-sm rounded-xl border border-white/10 hover:border-white/30 py-3 px-6 text-center block w-full"
              >
                Find at World of Books
              </a>
            )}
            {!amazon && !book.goodreads_url && !book.worldofbooks_url && (
              <span className="text-gray-500 text-sm mt-4 block">Purchase links coming soon.</span>
            )}
          </div>
        </div>
      </div>

      {/* Community reviews — empty state placeholder */}
      <ReviewSection contentType="book" contentSlug={book.slug} />

      {/* ──────────────────────────────────────────────────────────────────
          ONELINK — NOT YET ENABLED. Amazon's geo-redirect script loads here,
          on book pages only, once both Associates accounts are linked in
          OneLink. Add `import Script from 'next/script'` above, then:

            <Script
              src="https://z-na.amazon-adsystem.com/widgets/onejs?MarketPlace=US&adInstanceId=…"
              strategy="lazyOnload"
            />

          Copy the exact src from the OneLink dashboard rather than this
          placeholder. It is a third-party script on every book page, so the
          affiliate disclosure page should mention it when it goes live.
          ────────────────────────────────────────────────────────────────── */}
    </main>
  );
}

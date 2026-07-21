import { supabase } from '@/utils/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import ReadButton from '@/components/ReadButton';
import WantToReadButton from '@/components/WantToReadButton';
import { backContextQuery } from '@/utils/backContext';

// Filled-outline star glyph. Sized/coloured by the caller via className so the
// same shape serves the inline rating row and the large empty-state icon.
function Star({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </svg>
  );
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
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-2">
            {book.title}
          </h1>

          {healer ? (
            <Link
              href={`/healers/${healer.healer_slug}${backContextQuery(`/books/${book.slug}`, book.title)}`}
              className="text-sm text-violet-400 hover:text-violet-300 mb-4 inline-block"
            >
              By {healer.name}
            </Link>
          ) : (
            book.author && <p className="text-sm text-gray-400 mb-4">By {book.author}</p>
          )}

          {/* Star rating row — empty until community reviews exist */}
          <div className="mb-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="text-gray-600 w-5 h-5 inline" />
            ))}
            <span className="text-sm text-gray-500 ml-2">Be the first to review</span>
          </div>

          {book.description && (
            <p className="text-base leading-relaxed text-gray-300 whitespace-pre-line mb-8">
              {book.description}
            </p>
          )}

          {/* Purchase links — each renders only when its URL is present */}
          <div className="flex flex-col gap-3">
            {book.amazon_url && (
              <a
                href={book.amazon_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#FF9900] hover:bg-[#e68900] text-black font-bold text-sm rounded-xl py-3 px-6 text-center block w-full"
              >
                Buy on Amazon
              </a>
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
            {!book.amazon_url && !book.goodreads_url && !book.worldofbooks_url && (
              <span className="text-gray-500 text-sm mt-4 block">Purchase links coming soon.</span>
            )}
          </div>
        </div>
      </div>

      {/* Community reviews — empty state placeholder */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="border-t border-white/10 mb-10 mt-4" />
        <h2 className="text-xl font-bold text-white mb-2">Community Reviews</h2>
        <div className="flex items-center">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="text-gray-600 w-6 h-6 inline" />
          ))}
          <span className="text-gray-500 text-sm ml-2">0 ratings</span>
        </div>

        <div className="mt-8 bg-[#111827] rounded-2xl p-8 text-center max-w-xl mx-auto">
          <Star className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Be the first to review</h3>
          <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto mb-6">
            Reviews from the Spiritpedia community will appear here. Sign in to share your thoughts.
          </p>
          <span className="inline-block px-6 py-3 bg-[#111827] text-gray-500 text-sm border border-white/10 rounded-xl cursor-not-allowed">
            Write a Review — Coming Soon
          </span>
        </div>
      </div>
    </main>
  );
}

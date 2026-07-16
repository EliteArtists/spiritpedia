import { supabase } from '@/utils/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PublisherBooksGrid from '@/components/PublisherBooksGrid';

// First portrait for a linked healer. healers store an image_urls[] array plus a
// singular image_url; there is no portrait_url column.
function healerPortrait(h) {
  if (Array.isArray(h.image_urls) && h.image_urls[0]) return h.image_urls[0];
  return h.image_url || null;
}

function initial(name) {
  return (name || '?').trim().charAt(0).toUpperCase() || '?';
}

export default async function PublisherProfile({ params }) {
  const { slug } = await params;

  // 1. Resolve the publisher by slug.
  const { data: publisher, error } = await supabase
    .from('publishers')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !publisher) {
    notFound();
  }

  // 2. Linked healers via the publisher_healers join. The FK embed to healers
  //    resolves the author records in one round trip. (portrait_url does not
  //    exist — image_urls/image_url carry the portrait.)
  const { data: links } = await supabase
    .from('publisher_healers')
    .select('healer_id, healers (id, name, healer_slug, image_urls, image_url, tier)')
    .eq('publisher_id', publisher.id);

  const authors = (links || []).map((row) => row.healers).filter(Boolean);

  // 3. Auto-curated book list: every book authored by a linked healer. Books
  //    relate to a healer by the text healer_slug column (not healer_id), so
  //    match on the linked healers' slugs.
  const authorSlugs = authors.map((a) => a.healer_slug).filter(Boolean);
  let books = [];
  if (authorSlugs.length > 0) {
    const { data: bookRows } = await supabase
      .from('books')
      .select('*')
      .in('healer_slug', authorSlugs)
      .order('created_at', { ascending: false });
    books = bookRows || [];
  }

  return (
    <main className="min-h-screen bg-[#0a0f1d] text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-300 mb-8 block transition-colors">
          ← Back to Spiritpedia
        </Link>

        {/* Brand header */}
        <div className="flex flex-col md:flex-row gap-8 items-center border-b border-white/10 pb-8 mb-10">
          {publisher.logo_url ? (
            <div className="w-32 h-32 bg-[#111827] flex items-center justify-center p-4 border border-white/10 rounded-xl shrink-0">
              <img
                src={publisher.logo_url}
                alt={publisher.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-32 h-32 bg-[#111827] flex items-center justify-center border border-white/10 rounded-xl shrink-0 text-5xl font-bold text-violet-400">
              {initial(publisher.name)}
            </div>
          )}

          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-bold text-white">{publisher.name}</h1>

            {(publisher.founded_year || publisher.website_url) && (
              <div className="mt-2">
                {publisher.founded_year && (
                  <span className="text-sm text-gray-400">Founded {publisher.founded_year}</span>
                )}
                {publisher.website_url && (
                  <a
                    href={publisher.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 text-sm mt-2 block font-medium"
                  >
                    Visit Website →
                  </a>
                )}
              </div>
            )}

            {publisher.description && (
              <p className="text-base text-gray-400 mt-4 leading-relaxed max-w-2xl">
                {publisher.description}
              </p>
            )}
          </div>
        </div>

        {/* Linked healers */}
        {authors.length > 0 && (
          <div className="mb-12">
            <span className="text-lg font-bold text-white mb-4 block">Our Authors</span>
            <div className="flex gap-6 overflow-x-auto pb-2">
              {authors.map((a) => {
                const portrait = healerPortrait(a);
                return (
                  <Link
                    key={a.id}
                    href={`/healers/${a.healer_slug}`}
                    className="flex flex-col items-center gap-2 shrink-0 w-16 group"
                  >
                    {portrait ? (
                      <img
                        src={portrait}
                        alt={a.name}
                        className="w-12 h-12 rounded-full object-cover border border-white/10 group-hover:border-violet-400/60 transition-colors"
                      />
                    ) : (
                      <span className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-semibold">
                        {initial(a.name)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 text-center leading-tight truncate w-full group-hover:text-white transition-colors">
                      {a.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Auto-curated books */}
        <div>
          <span className="text-lg font-bold text-white mb-4 block">Published Titles</span>
          {books.length > 0 ? (
            <PublisherBooksGrid books={books} />
          ) : (
            <p className="text-gray-500 text-sm">No published titles linked yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}

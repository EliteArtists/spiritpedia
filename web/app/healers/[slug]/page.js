import { supabase } from '@/utils/supabase';
import BookCard from '@/components/BookCard';
import VideoPlayer from '@/components/VideoPlayer';
import Link from 'next/link';

export default async function HealerProfile({ params }) {
  const { slug } = await params;

  const { data: healer, error } = await supabase.from('healers').select('*').eq('healer_slug', slug).single();

  if (error || !healer) return <div className="p-20 text-center font-black uppercase tracking-widest text-gray-200">Healer not found.</div>;

  // Books and videos are now related to a healer via the relational `healer_slug`
  // column written by the admin "Link Healer / Author" system.
  const { data: books } = await supabase.from('books').select('*').eq('healer_slug', slug);
  const { data: videos } = await supabase.from('videos').select('*').eq('healer_slug', slug);

  // Up to 3 portraits for the hero gallery.
  const portraits = Array.isArray(healer.image_urls) ? healer.image_urls.filter(Boolean) : [];

  return (
    <main className="min-h-screen bg-white">
      {/* PRESERVED GRADIENT CANVAS — do not alter background fade styles */}
      <div className="w-full p-12 md:p-20 animate-gradient-slow text-white"
           style={{ background: 'linear-gradient(135deg, #0a2a66, #3f91ec, #a4c3ec, #0a2a66)', backgroundSize: '400% 400%' }}>
        <Link href="/" className="text-white/40 hover:text-white mb-12 inline-block uppercase text-[10px] font-black tracking-[0.3em]">&larr; Back to Spiritpedia</Link>

        {/* HERO GRID: text left, image gallery right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* LEFT: name, badge, bio */}
          <div>
            <h1 className="text-7xl font-black tracking-tighter mb-4 uppercase italic leading-none">{healer.name}</h1>

            {/* Primary tier badge — symmetry with the homepage badge motif */}
            <div className="mb-6">
              {healer.tier === 'superhero' ? (
                <span className="bg-[#FEF08A] text-amber-950 font-bold tracking-wider text-[11px] uppercase px-2.5 py-1 rounded-md shadow-sm">
                  SUPERHERO
                </span>
              ) : healer.tier === 'luminary' ? (
                <span className="bg-violet-600 text-white font-bold text-[11px] tracking-wider uppercase px-2.5 py-1 rounded-md shadow-sm">
                  LUMINARY
                </span>
              ) : (
                <span className="bg-emerald-500 text-white font-bold tracking-wider text-[11px] uppercase px-2.5 py-1 rounded-md shadow-sm">
                  LOCAL HERO
                </span>
              )}
            </div>

            <p className="text-xl opacity-90 max-w-2xl font-light leading-relaxed">{healer.bio}</p>

            {/* BOOKING ENQUIRIES / CONVERSION TILE — directly below the bio */}
            {(healer.contact_email || healer.contact_phone || healer.booking_url) && (
              <div className="mt-8 p-6 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-sm shadow-xl flex flex-col gap-4">
                {/* Integrated availability pills (replaces the heading) */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="bg-indigo-950/60 text-indigo-300 border border-transparent text-xs px-3 py-1 rounded-full font-medium">
                    In Person ({healer.city})
                  </span>
                  {healer.availability_type?.includes('Online') && (
                    <span className="bg-purple-950/60 text-purple-300 border border-purple-500/30 text-xs px-3 py-1 rounded-full font-medium">
                      Online Session available
                    </span>
                  )}
                </div>

                {healer.booking_url && (
                  <a
                    href={healer.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl shadow-lg transition-transform hover:scale-[1.01] active:scale-95 cursor-pointer block"
                  >
                    Connect with {healer.name.split(' ')[0]}
                  </a>
                )}

                <div className="flex justify-center text-center mx-auto w-full gap-6">
                  {healer.contact_email && (
                    <a
                      href={`mailto:${healer.contact_email}?subject=Inquiry via Spiritpedia`}
                      className="text-sm font-semibold text-white hover:text-emerald-300 underline underline-offset-4 transition-colors"
                    >
                      ✉️ {healer.contact_email}
                    </a>
                  )}
                  {healer.contact_phone && (
                    <a
                      href={`tel:${healer.contact_phone}`}
                      className="text-sm font-semibold text-white hover:text-emerald-300 underline underline-offset-4 transition-colors"
                    >
                      📞 {healer.contact_phone}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: multi-image portrait gallery (balanced aspect-ratio frames) */}
          <div className="grid grid-cols-2 gap-4">
            {portraits.length > 0 ? (
              portraits.slice(0, 3).map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${healer.name} portrait ${i + 1}`}
                  className={`w-full object-cover rounded-2xl shadow-2xl ${i === 0 ? 'col-span-2 aspect-[16/10]' : 'aspect-square'}`}
                />
              ))
            ) : (
              <img
                src="https://placehold.co/600x400?text=Spiritpedia"
                alt={healer.name}
                className="col-span-2 w-full aspect-[16/10] object-cover rounded-2xl shadow-2xl"
              />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 md:p-20 space-y-32">
        {/* CORE LITERARY REFERENCES — interactive BookCard swipe carousel */}
        <section>
          <div className="flex flex-row overflow-x-auto gap-6 pb-4 scroll-smooth snap-x snap-mandatory">
            {books?.length > 0 ? books.map((book) => (
              <div key={book.id} className="shrink-0 snap-start w-[240px]">
                <BookCard book={book} variant="light" />
              </div>
            )) : <p className="text-gray-400 font-black uppercase tracking-widest">No works found.</p>}
          </div>
        </section>

        {/* YOUTUBE VIDEOS — horizontal swipe carousel */}
        <section>
          <div className="flex flex-row overflow-x-auto gap-6 pb-4 scroll-smooth snap-x snap-mandatory">
            {videos?.length > 0 ? videos.map((video) => (
              <div key={video.id} className="shrink-0 snap-start w-[280px]">
                <VideoPlayer video={video} />
              </div>
            )) : <p className="text-gray-400 font-black uppercase tracking-widest">No videos yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

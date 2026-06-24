import { supabase } from '@/utils/supabase';
import BookCard from '@/components/BookCard';
import VideoPlayer from '@/components/VideoPlayer';
import Link from 'next/link';

// Lightweight inline SVG icons (no extra dependency) — sized via the parent's
// font color so they inherit the link button styling cleanly.
const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function GlobeIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-2C18.88 4 12 4 12 4s-6.88 0-8.59.42a2.78 2.78 0 0 0-1.95 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19c1.71.46 8.59.46 8.59.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" stroke="none" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg {...iconProps}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg {...iconProps}>
      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

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

  // SOCIAL + WEB LINKS — only entries with a populated column are kept, so an
  // icon button renders solely for channels the healer actually filled in.
  const socialLinks = [
    { key: 'website', label: 'Website', url: healer.website_url, icon: GlobeIcon },
    { key: 'youtube', label: 'YouTube', url: healer.youtube_url, icon: YoutubeIcon },
    { key: 'instagram', label: 'Instagram', url: healer.instagram_url, icon: InstagramIcon },
    { key: 'facebook', label: 'Facebook', url: healer.facebook_url, icon: FacebookIcon },
    { key: 'twitter', label: 'Twitter', url: healer.twitter_url, icon: TwitterIcon },
    { key: 'tiktok', label: 'TikTok', url: healer.tiktok_url, icon: TikTokIcon },
  ].filter((link) => link.url);

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

            {/* SOCIAL + WEB LINKS ROW — hidden entirely when no channels exist */}
            {socialLinks.length > 0 && (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {socialLinks.map(({ key, label, url, icon: Icon }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-transform hover:scale-110 active:scale-95"
                  >
                    <Icon />
                  </a>
                ))}
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

// Save this as your backup reference for: app/page.js (or components/HomePageContent.js)
import React, { suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import BookCard from './BookCard.js';
import VideoPlayer from './VideoPlayer.js';
import HealerCard from './HealerCard.js';

// Initialize the backend bridge client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Generic fallback avatar when a healer has no images.
const DEFAULT_AVATAR = 'https://placehold.co/400x400?text=Spiritpedia';

// 5-Pillar taxonomy: clusters database subject slugs under Master Keys for the
// premium hover-dropdown navigation.
const SUBJECT_TAXONOMY = {
  'Emotional Healing': [
    'shadow-work', 'self-healing', 'eft-tapping', 'breathwork', 'reiki', 'energy-medicine', 'conscious-relationships', 'quantum-touch',
  ],
  Consciousness: [
    'consciousness', 'conscious-science', 'spiritual-awakening', 'non-duality', 'meditation', 'mindfulness', 'astrology', 'spirituality',
  ],
  'Manifestation & Creation': [
    'manifestation', 'law-of-attraction', 'soul-purpose', 'human-design', 'life-coaching',
  ],
  'Mystical & Spiritual Exploration': [
    'akashic-records', 'mediumship-spirits', 'death-the-afterlife', 'dreamwork', 'mysticism', 'shamanism',
  ],
  'Body & Energy': [
    'tai-chi', 'qi-gong', 'yoga', 'ayurveda', 'sound-healing', 'plant-medicine', 'homeopathy',
  ],
};

// Deterministically pick a portrait from healer.image_urls based on the active
// subject filter AND the healer's own identifier. Mixing the per-healer seed in
// means the "View All" (no filter) state still shows a diverse rotation rather
// than every card landing on index 0.
function pickPortrait(imageUrls, subjectSlug, seed = '') {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) return DEFAULT_AVATAR;
  const key = `${subjectSlug || ''}${seed || ''}`;
  // Sum of character codes modulo array length = stable index per filter+healer.
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
  const index = sum % imageUrls.length;
  return imageUrls[index] || DEFAULT_AVATAR;
}

export default async function HomePage({ initialSubjectSlug }) {
  // The active subject slug is supplied by the parent server component (app/page.js),
  // which already awaited searchParams. We consume that prop directly here instead of
  // re-reading the async searchParams API, which fixes the data filter stream.
  const currentSubjectSlug = initialSubjectSlug || null;

  // 1. Concurrent fetching streams to secure all content instantly
  const [subjectsData, healersData, booksData, videosData] = await Promise.all([
    supabase.from('subjects').select('*').order('name', { ascending: true }),
    supabase.from('healers').select('*'),
    supabase.from('books').select('*'),
    supabase.from('videos').select('*')
  ]);

  const subjects = subjectsData.data || [];
  const allHealers = healersData.data || [];
  const allBooks = booksData.data || [];
  const allVideos = videosData.data || [];

  // 2. Filter content surgically based on the active top horizontal navigation scroller
  const filteredHealers = currentSubjectSlug
    ? allHealers.filter(healer => healer.subject_slugs?.includes(currentSubjectSlug))
    : allHealers;

  const filteredBooks = currentSubjectSlug
    ? allBooks.filter(book => book.subject_slugs?.includes(currentSubjectSlug))
    : allBooks;

  const filteredVideos = currentSubjectSlug
    ? allVideos.filter(video => video.subject_slugs?.includes(currentSubjectSlug))
    : allVideos;

  // Premium catalog = Superhero + Luminary tiers; Local Hero fills the third slot.
  // SAFE FALLBACK: any healer that is not explicitly premium (incl. NULL, empty,
  // or unexpected tier values during backfill) is treated as a Local Hero so no
  // grassroots practitioner silently disappears from the directory.
  const isPremium = (h) => h.tier === 'superhero' || h.tier === 'luminary';
  const premiumList = filteredHealers.filter(isPremium);
  const localList = filteredHealers.filter((h) => !isPremium(h));

  // Assemble slide pages: each page = 2 premium + 1 local (2+1 block).
  const pageCount = Math.max(Math.ceil(premiumList.length / 2), localList.length);
  const healerPages = Array.from({ length: pageCount }, (_, p) => ({
    premium: [premiumList[p * 2], premiumList[p * 2 + 1]],
    local: localList[p] || null,
  }));

  // Single practitioner media card (used for both tiers). Portrait is computed
  // server-side; the interactive favorite heart lives in the client HealerCard.
  const renderHealerCard = (healer) => {
    const portrait = pickPortrait(
      healer.image_urls,
      currentSubjectSlug,
      healer.healer_slug || String(healer.id)
    );
    return <HealerCard key={healer.id} healer={healer} portrait={portrait} />;
  };

  // Recruitment spotlight shown when a page has no local healer in slot 3.
  const renderSpotlight = (key) => (
    <div
      key={key}
      className="w-full h-72 rounded-2xl border border-dashed border-purple-400/40 bg-gradient-to-br from-purple-950/40 via-slate-900/50 to-indigo-950/40 p-6 flex flex-col justify-between items-center text-center cursor-pointer group hover:border-purple-400 transition-all duration-300"
    >
      <span className="text-xs uppercase tracking-widest text-purple-300/80 font-semibold">Are you a practitioner?</span>
      <span className="text-2xl font-black text-white leading-tight">Join Our Local Network</span>
      <span className="text-[11px] text-slate-400">Connect with seekers globally</span>
    </div>
  );

  return (
    <div
      className="relative min-h-screen animate-gradient-slow text-white font-sans"
      style={{ background: 'linear-gradient(135deg, #0a2a66, #3f91ec, #a4c3ec, #0a2a66)', backgroundSize: '400% 400%' }}
    >
      {/* MY LIBRARY PORTAL */}
      <a
        href="/library"
        className="absolute top-6 right-6 md:right-12 z-50 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md rounded-full transition-all duration-300 shadow-sm cursor-pointer hover:scale-105 active:scale-95"
      >
        ✨ My Library
      </a>

      {/* HEADER HERO ELEMENT */}
      <header className="py-16 text-center max-w-4xl mx-auto px-4">
        <h1 className="text-6xl font-extrabold tracking-wider mb-6 bg-clip-text text-transparent bg-gradient-to-r from-sky-500 via-purple-500 to-pink-500">
          SPIRITPEDIA
        </h1>
        <div className="relative max-w-xl mx-auto">
          <input
            type="text"
            placeholder="How are you feeling today?"
            className="w-full py-4 px-6 rounded-full bg-white/60 border border-white/50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300 backdrop-blur-md shadow-sm"
          />
        </div>
      </header>

      {/* TOP SCROLLER CATEGORIES */}
      <section className="max-w-6xl mx-auto px-6 mb-12">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-4 text-center">
          Explore by Subject
        </h3>
        <div className="flex flex-wrap gap-3 justify-center items-start">
          {/* View All resets the active filter */}
          <a
            href="?"
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap ${
              !currentSubjectSlug
                ? 'bg-white text-black border-transparent shadow-lg shadow-black/20'
                : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
            }`}
          >
            🌟 View All
          </a>

          {/* 5 Master Core Pills, each with a hover dropdown of its sub-subjects */}
          {Object.entries(SUBJECT_TAXONOMY).map(([pillar, slugs]) => {
            // Live subjects that belong to this pillar's cluster.
            const items = subjects.filter((sub) => slugs.includes(sub.slug));
            const pillarActive = currentSubjectSlug && slugs.includes(currentSubjectSlug);
            return (
              <div key={pillar} className="relative group">
                <button
                  type="button"
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border whitespace-nowrap ${
                    pillarActive
                      ? 'bg-white text-black border-transparent shadow-lg shadow-black/20'
                      : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                  }`}
                >
                  {pillar}
                </button>

                {/* Trans-glassmorphism dropdown */}
                <div className="absolute top-full left-0 mt-1 hidden group-hover:flex bg-white/90 backdrop-blur-md rounded-xl shadow-2xl p-4 z-50 min-w-[260px] md:min-w-[280px] flex-col gap-2 border border-white/20">
                  {items.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">Coming soon</span>
                  ) : (
                    items.map((sub) => (
                      <a
                        key={sub.id}
                        href={`?subject=${sub.slug}`}
                        aria-current={currentSubjectSlug === sub.slug ? 'true' : undefined}
                        className="w-full block text-left px-3 py-2 text-sm text-slate-700 font-medium hover:text-purple-600 hover:bg-slate-50 rounded-lg whitespace-nowrap transition-all duration-200"
                      >
                        {sub.name}
                      </a>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* RENDER DYNAMIC SHELVES */}
      <main className="max-w-6xl mx-auto px-6 pb-24 grid gap-16">
        
        {/* SHELF 1: HEALERS DIRECTORY — 2+1 matrix block-snapping shelf */}
        <section>
          <div className="flex flex-row overflow-x-auto gap-6 snap-x snap-mandatory scrollbar-hide w-full">
            {healerPages.map((page, p) => (
              <div
                key={p}
                className="w-full grid grid-cols-1 md:grid-cols-3 shrink-0 snap-start gap-6"
              >
                {/* Two premium slots (empty placeholder holds the column if absent) */}
                {[0, 1].map((i) =>
                  page.premium[i] ? (
                    renderHealerCard(page.premium[i])
                  ) : (
                    <div key={`empty-${p}-${i}`} className="hidden md:block" />
                  )
                )}
                {/* Third slot: a local healer, or the recruitment spotlight */}
                {page.local ? renderHealerCard(page.local) : renderSpotlight(`spotlight-${p}`)}
              </div>
            ))}
          </div>
        </section>

        {/* SHELF 2: CURATED ARCHIVE BOOKS — oversized card-less covers w/ modals */}
        <section>
          <div className="border-b border-slate-300/20 pb-3 mb-8 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>

        {/* SHELF 3: MULTIMEDIA VIDEO COMPONENT — inline native players */}
        <section>
          <div className="border-b border-slate-300/20 pb-3 mb-8 w-full" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <VideoPlayer key={video.id} video={video} />
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}

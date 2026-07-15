import { createClient } from '@supabase/supabase-js';
import BookCard from './BookCard.js';
import HealerCard from './HealerCard.js';
import HeroBillboard from './HeroBillboard.js';
import ContentShelf from './ContentShelf.js';
import FreeResourceCard from './FreeResourceCard.js';
import OfferingCard from './OfferingCard.js';
import SubjectPills from './SubjectPills.js';
import VideoGrid from './VideoGrid.js';

// Initialize the backend bridge client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DEFAULT_AVATAR = 'https://placehold.co/400x400?text=Spiritpedia';

// The videos grid reveals 24 at a time client-side; fetch a pool deep enough for
// a few "Load more" presses without pulling the whole table down the wire.
const VIDEO_POOL = 96;

// Deterministically pick a portrait from healer.image_urls based on the active
// subject filter AND the healer's own identifier. Mixing the per-healer seed in
// means the "View All" (no filter) state still shows a diverse rotation rather
// than every card landing on index 0.
function pickPortrait(imageUrls, subjectSlug, seed = '') {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) return DEFAULT_AVATAR;
  const key = `${subjectSlug || ''}${seed || ''}`;
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
  return imageUrls[sum % imageUrls.length] || DEFAULT_AVATAR;
}

export default async function HomePage({ initialSubjectSlug }) {
  const currentSubjectSlug = initialSubjectSlug || null;

  // EXPIRATION WINDOW — an offering only surfaces while it is live: the row must
  // be is_active, and either evergreen (end_date IS NULL) or not yet past its end
  // date. `today` is a YYYY-MM-DD string to match the DATE column format, and is
  // recomputed per request so the window rolls forward on its own.
  const today = new Date().toISOString().slice(0, 10);
  const liveWindow = `end_date.is.null,end_date.gte.${today}`;

  // Every query is issued concurrently — one round trip's worth of latency for
  // the whole page rather than eight stacked sequentially.
  const [subjectsRes, healersRes, booksRes, videosRes, freeResourcesRes, coursesRes] =
    await Promise.all([
      supabase.from('subjects').select('*').order('name', { ascending: true }),
      supabase.from('healers').select('*'),
      supabase.from('books').select('*').order('created_at', { ascending: false }),
      supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(VIDEO_POOL),
      supabase
        .from('free_resources')
        .select('*')
        .eq('is_featured', true)
        .eq('is_active', true)
        .or(liveWindow)
        .order('created_at', { ascending: false }),
      supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .or(liveWindow)
        .order('created_at', { ascending: false }),
    ]);

  const subjects = subjectsRes.data || [];
  const allHealers = healersRes.data || [];
  const allBooks = booksRes.data || [];
  const allVideos = videosRes.data || [];
  const allFreeResources = freeResourcesRes.data || [];
  const allCourses = coursesRes.data || [];

  // Offerings and free resources carry a bigint healer_id, so resolve display
  // names from the full (unfiltered) healer set — a course's author must still
  // be nameable when the subject filter has excluded them from the shelves.
  const healerNameById = new Map(allHealers.map((h) => [h.id, h.name]));

  // Subject filter — applied to every collection so a chosen pill narrows the
  // entire page, not just the healer shelves.
  const bySubject = (rows) =>
    currentSubjectSlug
      ? rows.filter((row) => row.subject_slugs?.includes(currentSubjectSlug))
      : rows;

  const healers = bySubject(allHealers);
  const books = bySubject(allBooks);
  const videos = bySubject(allVideos);
  const freeResources = bySubject(allFreeResources);
  const courses = bySubject(allCourses);

  // TIER SPLIT — the stored values are 'superhero' / 'luminary' / 'local_hero'
  // (the amber/violet/emerald names describe their badge colours, not the column).
  // SAFE FALLBACK: anything not explicitly Superhero or Luminary — including NULL
  // or an unexpected value mid-backfill — falls through to Local Hero, so no
  // grassroots practitioner silently vanishes from the directory.
  const isPremium = (h) => h.tier === 'superhero' || h.tier === 'luminary';
  const superheroes = healers.filter((h) => h.tier === 'superhero');
  const luminaries = healers.filter((h) => h.tier === 'luminary');
  const localHeroes = healers.filter((h) => !isPremium(h));

  // The single `courses` table stores every paid offering, distinguished by
  // product_type. Legacy rows predate the column, so an unset value is treated as
  // a course (the admin default) rather than being silently dropped.
  const courseOfferings = courses.filter((c) => !c.product_type || c.product_type === 'course');
  const retreatOfferings = courses.filter((c) => c.product_type === 'retreat');
  const downloadOfferings = courses.filter((c) => c.product_type === 'download');

  const renderHealer = (healer) => (
    <HealerCard
      healer={healer}
      portrait={pickPortrait(
        healer.image_urls,
        currentSubjectSlug,
        healer.healer_slug || String(healer.id)
      )}
    />
  );

  const renderOffering = (item) => (
    <OfferingCard item={item} healerName={healerNameById.get(item.healer_id)} />
  );

  // Preserve the active subject filter when handing off to the subject page.
  const seeAll = currentSubjectSlug ? `/subject/${currentSubjectSlug}` : null;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white font-sans">
      {/* 1. NAVIGATION BAR */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0f1d]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a
            href="/"
            className="bg-gradient-to-r from-sky-500 via-purple-500 to-pink-500 bg-clip-text text-2xl font-extrabold tracking-wider text-transparent"
          >
            SPIRITPEDIA
          </a>
          <a
            href="/library"
            className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-white/20 active:scale-95"
          >
            ✦ My Library
          </a>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6">
        {/* 2. EMOTIONAL SEARCH BAR — the sacred entry point. */}
        <section className="py-10">
          <input
            type="text"
            placeholder="How are you feeling today?"
            aria-label="How are you feeling today?"
            className="mx-auto block w-full max-w-2xl rounded-full border border-white/15 bg-[#111827] px-6 py-4 text-center text-lg text-white placeholder-gray-400 shadow-lg transition-all focus:border-[#7c3aed] focus:shadow-[0_0_25px_rgba(124,58,237,0.45)] focus:outline-none"
          />
        </section>

        {/* 3. SUBJECT PILLS */}
        <section className="pb-10">
          <SubjectPills subjects={subjects} currentSubjectSlug={currentSubjectSlug} />
        </section>

        {/* 4. HERO BILLBOARD */}
        <HeroBillboard healers={superheroes} />

        {/* 5. CONTENT SHELVES + 6. VIDEOS
            grid-cols-1 is load-bearing: an implicit auto column sizes itself to
            the max-content width of its items, so the shelves' un-wrapped card
            rows stretched the column (and the whole page) to ~48,000px wide. */}
        <main className="grid grid-cols-1 gap-14 py-14">
          <ContentShelf
            title="Worldwide"
            badge={
              <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider bg-[#fef08a] text-[#78350f] rounded-full mb-2 shadow-sm">
                SUPERHERO
              </span>
            }
            items={superheroes}
            seeAllHref={seeAll}
            renderItem={renderHealer}
            itemWidthClass="w-[260px]"
          />

          <ContentShelf
            title="Rising Voices"
            badge={
              <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider bg-violet-600 text-white rounded-full mb-2 shadow-sm">
                LUMINARY
              </span>
            }
            items={luminaries}
            seeAllHref={seeAll}
            renderItem={renderHealer}
            itemWidthClass="w-[260px]"
          />

          <ContentShelf
            title="Free Resources"
            subtitle="No Cost, No Catch"
            items={freeResources}
            renderItem={(item) => (
              <FreeResourceCard item={item} healerName={healerNameById.get(item.healer_id)} />
            )}
          />

          <ContentShelf
            title="Books & Literature"
            subtitle="The Curated Archive"
            items={books}
            seeAllHref={seeAll}
            renderItem={(book) => <BookCard book={book} />}
            itemWidthClass="w-[200px]"
          />

          <ContentShelf
            title="Courses & Programmes"
            subtitle="Go Deeper"
            items={courseOfferings}
            renderItem={renderOffering}
          />

          <ContentShelf
            title="Retreats & Live Events"
            subtitle="In Person"
            items={retreatOfferings}
            renderItem={renderOffering}
          />

          <ContentShelf
            title="Downloads & Audio"
            subtitle="Take It With You"
            items={downloadOfferings}
            renderItem={renderOffering}
          />

          <ContentShelf
            title="Practitioners Near You"
            badge={
              <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider bg-emerald-500 text-white rounded-full mb-2 shadow-sm">
                LOCAL HERO
              </span>
            }
            items={localHeroes}
            seeAllHref={seeAll}
            renderItem={renderHealer}
            itemWidthClass="w-[260px]"
          />

          <VideoGrid videos={videos} />
        </main>
      </div>
    </div>
  );
}

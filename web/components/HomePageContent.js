import { createClient } from '@supabase/supabase-js';
import HealerCard from './HealerCard.js';
import HeroBillboard from './HeroBillboard.js';
import ContentShelf from './ContentShelf.js';
import PublisherCard from './PublisherCard.jsx';
import EmotionSearch from './EmotionSearch.js';
import SubjectPills from './SubjectPills.js';
import ShareButton from './ShareButton.jsx';
import SiteLogo from './SiteLogo.jsx';
import ExploreMore from './ExploreMore.jsx';
import { SITE_URL, DEFAULT_TITLE } from '../utils/seo.js';

// Initialize the backend bridge client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DEFAULT_AVATAR = 'https://placehold.co/400x400?text=Spiritpedia';

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

  // The page fetches only what it renders on arrival: the subject list and the
  // healers. Books, videos, courses, retreats, downloads and free resources are
  // no longer pulled here at all — ExploreMore fetches each one from the client
  // when a visitor actually asks for it. That removed the bulk of an 8MB
  // document and the great majority of its images.
  const [subjectsRes, healersRes, publishersRes] = await Promise.all([
    supabase.from('subjects').select('*').order('name', { ascending: true }),
    supabase.from('healers').select('*'),
    // The embedded aggregate counts the publisher_healers junction rows per
    // publisher in the same round trip, so the card can say "18 authors"
    // without a second query or pulling the join table down whole.
    supabase
      .from('publishers')
      .select('*, publisher_healers(count)')
      .order('name', { ascending: true }),
  ]);

  const subjects = subjectsRes.data || [];
  const allHealers = healersRes.data || [];
  const allPublishers = publishersRes.data || [];

  // Offerings and free resources carry a bigint healer_id, so their cards need
  // display names. Sent to ExploreMore as id/name pairs built from the full
  // (unfiltered) healer set — a course's author must still be nameable when the
  // subject filter has excluded them from the shelves. A few KB, versus
  // re-querying healers from the client for every shelf that opens.
  const healerNames = allHealers.map((h) => [h.id, h.name]);

  // Subject filter — applied to every collection so a chosen pill narrows the
  // entire page, not just the healer shelves.
  const bySubject = (rows) =>
    currentSubjectSlug
      ? rows.filter((row) => row.subject_slugs?.includes(currentSubjectSlug))
      : rows;

  const healers = bySubject(allHealers);
  // Narrowed by the active pill like every other collection on the page.
  const publishers = bySubject(allPublishers);

  // TIER SPLIT — the stored values are 'superhero' / 'ascended_master' /
  // 'luminary' / 'local_hero' (the amber/gold/violet/emerald names describe
  // their badge colours, not the column).
  // SAFE FALLBACK: anything not explicitly a premium tier — including NULL or an
  // unexpected value mid-backfill — still surfaces in the Local Hero shelf, so
  // no practitioner silently vanishes from the directory. (The card itself
  // renders a neutral "Teacher" badge for such rows rather than Local Hero's.)
  const isPremium = (h) =>
    h.tier === 'superhero' || h.tier === 'ascended_master' || h.tier === 'luminary';

  // ENTITY SPLIT — `entity_type` separates people from platforms. 'channel'
  // (YouTube channels, collectives) and 'app' (Headspace) get their own shelf;
  // everything else is an individual. NULL is treated as individual so rows
  // predating the column — or a database without it yet — keep rendering in
  // the tier shelves exactly as before.
  const isPlatform = (h) => h.entity_type === 'channel' || h.entity_type === 'app';
  const individuals = healers.filter((h) => !isPlatform(h));
  const platforms = healers.filter(isPlatform);

  const superheroes = individuals.filter((h) => h.tier === 'superhero');
  const ascendedMasters = individuals.filter((h) => h.tier === 'ascended_master');
  // The billboard rotates through both tiers, interleaved so roughly every
  // fourth slide is an Ascended Master. Table order put all 14 Masters after
  // 50 Superheroes, which meant they only surfaced once a visitor had sat
  // through the whole Superhero run. Three Superheroes, then one Master,
  // repeating; whichever list runs out first, the remainder of the other is
  // appended so nobody is dropped.
  const billboardHealers = [];
  for (let s = 0, a = 0; s < superheroes.length || a < ascendedMasters.length; ) {
    for (let k = 0; k < 3 && s < superheroes.length; k += 1) billboardHealers.push(superheroes[s++]);
    if (a < ascendedMasters.length) billboardHealers.push(ascendedMasters[a++]);
  }

  // Where the rotation opens. Recomputed per request (the homepage renders
  // dynamically), so consecutive visits lead with different teachers.
  const billboardStart = billboardHealers.length
    ? Math.floor(Math.random() * billboardHealers.length)
    : 0;
  const luminaries = individuals.filter((h) => h.tier === 'luminary');
  const localHeroes = healers.filter((h) => !isPremium(h));

  // Card renderer factory — `cardProps` lets one shelf vary the card (the
  // Timeless Teachers shelf runs a taller card) without a second component.
  const healerRenderer = (cardProps = {}) => (healer) => (
    <HealerCard
      healer={healer}
      portrait={pickPortrait(
        healer.image_urls,
        currentSubjectSlug,
        healer.healer_slug || String(healer.id)
      )}
      {...cardProps}
    />
  );
  const renderHealer = healerRenderer();

  // Preserve the active subject filter when handing off to the subject page.
  const seeAll = currentSubjectSlug ? `/subject/${currentSubjectSlug}` : null;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white font-sans">
      {/* 1. NAVIGATION BAR */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0f1d]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <SiteLogo />
          <div className="flex items-center gap-3">
            {/* Share is desktop/tablet only — on a phone the OS share sheet is a
                tap away on every detail page, and the header needs the room. */}
            <div className="hidden md:flex">
              <ShareButton url={SITE_URL} title={DEFAULT_TITLE} />
            </div>
            <a
              href="/library"
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-white/20 active:scale-95"
            >
              ✦ My Library
            </a>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6">
        {/* The page's one H1. Visually hidden — the design leads with the
            search bar, but search engines and screen readers still need a
            heading that names the page. */}
        <h1 className="sr-only">Spiritpedia — Discover Wisdom. Explore Consciousness.</h1>

        {/* 2. EMOTIONAL SEARCH BAR — the sacred entry point. It carries its
            own one-line introduction, so the two stay together. */}
        <EmotionSearch />

        {/* 3. SUBJECT PILLS */}
        <section className="pb-10">
          <SubjectPills subjects={subjects} currentSubjectSlug={currentSubjectSlug} />
        </section>

        {/* 4. HERO BILLBOARD — the opening slide is chosen here, on the
            server, so the first paint is already a random face. Choosing it
            inside the component instead meant every visitor saw slide 0 until
            hydration finished, then watched it jump. */}
        <HeroBillboard healers={billboardHealers} startIndex={billboardStart} />

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

          {/* Deceased teachers whose work is foundational. Hidden until the
              first one is tagged — ContentShelf's emptyHide default. Runs a
              wider track and a much taller card than the other healer shelves
              (320×420 vs 260×288), and each card slowly crossfades through
              its portraits, so the row reads as its own cinematic moment. */}
          <ContentShelf
            title="Timeless Teachers"
            subtitle="Ascended Masters"
            items={ascendedMasters}
            seeAllHref={seeAll}
            renderItem={healerRenderer({ heightClass: 'h-[420px]', rotate: true })}
            itemWidthClass="w-[320px]"
          />

          {/* Publishing houses. Hidden outright when the table is empty, or
              when the active subject matches none of them — ContentShelf's
              emptyHide default. */}
          <ContentShelf
            title="Publishing Houses"
            subtitle="Publishers"
            items={publishers}
            renderItem={(publisher) => (
              <PublisherCard
                publisher={publisher}
                authorCount={publisher.publisher_healers?.[0]?.count ?? 0}
              />
            )}
            itemWidthClass="w-[260px]"
          />

          {/* Channels and apps, regardless of tier. Hidden outright when there
              are none — ContentShelf's emptyHide default handles that. */}
          <ContentShelf
            title="Explore These Channels"
            subtitle="Platforms & Channels"
            items={platforms}
            seeAllHref={seeAll}
            renderItem={renderHealer}
            itemWidthClass="w-[260px]"
          />

          {/* Everything below here is fetched on demand — see ExploreMore.
              None of it is in the initial payload. */}
          <ExploreMore subjectSlug={currentSubjectSlug} healerNames={healerNames} />
        </main>
      </div>
    </div>
  );
}

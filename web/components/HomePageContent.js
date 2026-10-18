import HealerCard from './HealerCard.js';
import HeroBillboard from './HeroBillboard.js';
import ContentShelf from './ContentShelf.js';
import PublisherCard from './PublisherCard.jsx';
import { Tipped } from './ListingBadges.jsx';
import { TIER_TIPS } from '../utils/badges.js';
import HomeMasthead from './HomeMasthead.jsx';
import ExploreMore from './ExploreMore.jsx';
import HomeTabs from './HomeTabs.jsx';
import NearYouShelf from './NearYouShelf.jsx';
import { SITE_URL, DEFAULT_TITLE } from '../utils/seo.js';

// The shared anonymous data client, not a second one built here.
//
// This file is a server component, and the client it used to create took the
// supabase-js defaults — persistSession and autoRefreshToken both true. Nothing
// ever signs in through it, so no session was ever stored, but a module-level
// singleton that CAN hold one lives in a long-running Node process shared by
// every visitor. utils/supabase.js exists precisely to be stateless, and this
// was the one place that bypassed it.
import { supabase } from '../utils/supabase.js';
import { authorCount, isPlatform, officialFirst } from '../utils/listings.js';

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

export default async function HomePage({ initialSubjectSlug, initialSearch = '' }) {
  const currentSubjectSlug = initialSubjectSlug || null;

  // The page fetches only what it renders on arrival: the subject list and the
  // healers. Books, videos, courses, retreats, downloads and free resources are
  // no longer pulled here at all — ExploreMore fetches each one from the client
  // when a visitor actually asks for it. That removed the bulk of an 8MB
  // document and the great majority of its images.
  const [subjectsRes, healersRes, publishersRes] = await Promise.all([
    supabase.from('subjects').select('*').order('name', { ascending: true }),
    supabase.from('healers').select('*'),
    // The embed brings each publisher's linked listings' types in the same
    // round trip, so the card can say "18 authors", counting people only
    // (utils/listings.js → authorCount).
    supabase
      .from('publishers')
      .select('*, publisher_healers(healers(entity_type))')
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

  // A SECOND map, keyed by slug rather than id. Videos link to a healer by the
  // text `healer_slug`, where courses and free resources use the bigint
  // `healer_id` — the two are not interchangeable, so the video shelves need
  // their own lookup. ~129 entries, a few KB, versus a query per card.
  const healerNamesBySlug = allHealers
    .filter((h) => h.healer_slug)
    .map((h) => [h.healer_slug, h.name]);

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
  // (YouTube channels, podcasts), 'app' (Headspace) and 'organisation' (The
  // Shift Network) get their own shelf, Spiritpedia Official first
  // (utils/listings.js, migration 0020); everything else is an individual.
  // NULL is treated as individual so rows predating the column keep rendering
  // in the tier shelves exactly as before.
  const individuals = healers.filter((h) => !isPlatform(h));
  const platforms = officialFirst(healers.filter(isPlatform));

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
  // People only: a channel or app approved at the default tier is not a
  // practitioner near anyone.
  const localHeroes = individuals.filter((h) => !isPremium(h));

  // Practitioners Near You is ordered in the browser, for the visitor's own
  // area (components/NearYouShelf.jsx). It needs their towns — the few the
  // shelf holds — and the portraits chosen here.
  const nearPlaceIds = [...new Set(localHeroes.map((h) => h.place_id).filter(Boolean))];
  const { data: nearPlaceRows } = nearPlaceIds.length
    ? await supabase.from('places').select('id, name, region, country, lat, lng').in('id', nearPlaceIds)
    : { data: [] };
  const nearPlaces = Object.fromEntries((nearPlaceRows || []).map((p) => [p.id, p]));
  const nearPortraits = Object.fromEntries(
    localHeroes.map((h) => {
      const seed = h.healer_slug || String(h.id);
      return [seed, pickPortrait(h.image_urls, currentSubjectSlug, seed)];
    })
  );

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

  // WHERE A DETAIL PAGE SHOULD SEND SOMEBODY BACK TO.
  //
  // The homepage used to tell its cards `from="/"`, which threw the filter away:
  // open a video from `/?subject=astrology`, press Back, and you landed on the
  // unfiltered homepage having lost what you were looking at. The subject filter
  // lives only in the URL, so the origin has to carry the query string or there
  // is nothing to come back to.
  //
  // (The browser's own back button was always fine — it restores the URL. This
  // is about the in-page "← Back to …" link, which is a real href and has to be
  // told.)
  // The LABEL is decided here, where the subject's display name is already in
  // hand. The PATH is not: it has to include the tab and the open shelves, and
  // those change without this server component re-rendering. HomeTabs and
  // ExploreMore each build it from the live URL instead — see
  // utils/homeViewState.js.
  const fromLabel =
    (currentSubjectSlug && subjects.find((s) => s.slug === currentSubjectSlug)?.name) ||
    'Spiritpedia';

  // Preserve the active subject filter when handing off to the subject page.
  const seeAll = currentSubjectSlug ? `/subject/${currentSubjectSlug}` : null;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white font-sans">
      {/* 1-3. MASTHEAD, SEARCH AND SUBJECT PILLS — one client component
          because the navbar and the pills hand the top of the viewport over to
          each other as you scroll. */}
      <HomeMasthead
        subjects={subjects}
        currentSubjectSlug={currentSubjectSlug}
        shareUrl={SITE_URL}
        shareTitle={DEFAULT_TITLE}
      />

      <div className="mx-auto max-w-7xl px-6 pt-10">
        {/* The masthead above stays put on both tabs — it is the page's hero,
            not part of either view. Everything below it swaps. */}
        <HomeTabs
          healerNames={healerNamesBySlug}
          subjectSlug={currentSubjectSlug}
          initialSearch={initialSearch}
          fromTitle={fromLabel}
        >
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
              <Tipped tip={TIER_TIPS['Superhero']} label="Superhero" placement="below" align="left">
                <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider bg-[#fef08a] text-[#78350f] rounded-full mb-2 shadow-sm">
                  SUPERHERO
                </span>
              </Tipped>
            }
            items={superheroes}
            seeAllHref={seeAll}
            renderItem={renderHealer}
            itemWidthClass="w-[260px]"
          />

          <ContentShelf
            title="Rising Voices"
            badge={
              <Tipped tip={TIER_TIPS['Luminary']} label="Luminary" placement="below" align="left">
                <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider bg-violet-600 text-white rounded-full mb-2 shadow-sm">
                  LUMINARY
                </span>
              </Tipped>
            }
            items={luminaries}
            seeAllHref={seeAll}
            renderItem={renderHealer}
            itemWidthClass="w-[260px]"
          />

          <NearYouShelf
            badge={
              <Tipped tip={TIER_TIPS['Local Hero']} label="Local Hero" placement="below" align="left">
                <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider bg-emerald-500 text-white rounded-full mb-2 shadow-sm">
                  LOCAL HERO
                </span>
              </Tipped>
            }
            practitioners={localHeroes}
            places={nearPlaces}
            portraits={nearPortraits}
            seeAllHref={seeAll}
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
                authorCount={authorCount(publisher)}
              />
            )}
            itemWidthClass="w-[260px]"
          />

          {/* Channels, apps and organisations, regardless of tier. Hidden outright when there
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
          <ExploreMore
            subjectSlug={currentSubjectSlug}
            healerNames={healerNames}
            initialSearch={initialSearch}
            fromTitle={fromLabel}
          />
        </main>
        </HomeTabs>
      </div>
    </div>
  );
}

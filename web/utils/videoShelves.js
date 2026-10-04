// The five homepage pillars, as video shelves.
//
// A pillar is a GROUP of subject slugs, not one subject — "Consciousness" is
// eight of them. So each shelf matches on array overlap (`subject_slugs &&
// ARRAY[...]`, PostgREST's .overlaps) rather than equality.
//
// Kept in step with SUBJECT_TAXONOMY in SubjectPills.js, which drives the
// filter bar above these shelves. Verified against the table: every pillar has
// between 368 and 1,657 videos, and no video is untagged.
export const VIDEO_PILLARS = [
  {
    title: 'Consciousness',
    slugs: [
      'consciousness', 'conscious-science', 'spiritual-awakening', 'non-duality',
      'meditation', 'mindfulness', 'astrology', 'spirituality',
    ],
  },
  {
    title: 'Emotional Healing',
    slugs: [
      'shadow-work', 'self-healing', 'eft-tapping', 'breathwork', 'reiki',
      'energy-medicine', 'conscious-relationships', 'quantum-touch',
    ],
  },
  {
    title: 'Manifestation & Creation',
    slugs: ['manifestation', 'law-of-attraction', 'soul-purpose', 'human-design', 'life-coaching'],
  },
  {
    title: 'Body & Energy',
    slugs: ['tai-chi', 'qi-gong', 'yoga', 'ayurveda', 'sound-healing', 'plant-medicine', 'homeopathy'],
  },
  {
    title: 'Mystical & Spiritual Exploration',
    slugs: [
      'akashic-records', 'mediumship-spirits', 'death-the-afterlife', 'dreamwork',
      'mysticism', 'shamanism',
    ],
  },
];

export const NEW_LIMIT = 24;
export const SHELF_LIMIT = 20;

// WHY THE PILLAR SHELVES DO NOT LEAD WITH THE NEWEST.
//
// They used to: each one took the twenty most recent videos touching its
// pillar. The filter was right and always had been — every row on the Emotional
// Healing shelf genuinely carried shadow-work or conscious-relationships — but
// four of the five shelves still opened with the same astrology batch, because
// that batch was the newest in the table and its videos carry a second tag that
// lands in a different pillar each time:
//
//   'Mars-Saturn Conjunction Transit Stories'    astrology + consciousness + shadow-work
//   'Venus-Jupiter Conjunction Transit Stories'  astrology + conscious-relationships + soul-purpose
//   'Roland Orzabal on Astrology, Fate, Tears'   astrology + soul-purpose + spirituality
//
// So "newest in this pillar" meant "newest in the table" five times over. The
// shelves were never identical — three to five rows in twenty — but they read
// as one batch, which is the complaint.
//
// A random window fixes it at the root and gives the shelves a different face
// each visit, the way the catch-all row already works. The offset is taken
// against each pillar's own count so the whole pillar is reachable, not just
// its recent end.
//
// The window is three times the shelf, read and then strided — every third row
// — rather than twenty consecutive ones. Ids are sequential within an ingest,
// and an ingest is one creator's back catalogue, so twenty in a row is twenty
// videos by the same person: the first pass at this produced a Consciousness
// shelf of twenty Tyler Henry readings and an Emotional Healing shelf of twenty
// Yoga With Kassandra classes. Correct, on-subject, and monotonous. A stride of
// three spans roughly three batches for the same twenty cards.
export const PILLAR_POOL = SHELF_LIMIT * 3;

// "Watch & Learn" is meant to be a different row each visit rather than the
// same twenty forever. The offset is bounded well inside the table's 2,269 rows
// so the window is always populated — no count query, and no empty shelf if the
// table shrinks a little.
export const MIXED_OFFSET_CEILING = 1000;

// SUBJECT-FILTERED MODE — when ?subject=<slug> is active the pillar shelves are
// replaced by one shelf per entity (healer, channel or app) that teaches that
// subject.
//
// Three is the floor because a shelf of one or two cards reads as a mistake
// rather than a collection; entities below it are dropped silently rather than
// shown half-empty. Twelve is the ceiling per shelf, enough to fill a row and
// scroll a little without pulling a whole catalogue.
export const FILTERED_MIN_VIDEOS = 3;
export const FILTERED_SHELF_LIMIT = 12;

// PostgREST truncates at 1,000 rows and says nothing about it, so the filtered
// query pages rather than trusting a single response. The largest subject today
// is `meditation` at 817 videos — under the cap, but only just.
export const PAGE_SIZE = 1000;

// ── "FOR YOU" ────────────────────────────────────────────────────────────
//
// Subject matching against what someone has already saved. Not a
// recommendation engine, and the scoring is the whole of it.
//
// RANKING BY RAW COUNT DOES NOT WORK HERE, which is worth stating because it
// is the obvious thing to try. Across the 1,092 healers and books people
// actually save from, self-healing is on 50% of items, spirituality 43%,
// consciousness 37%. Counting tags therefore measures what the catalogue is
// tagged with, not what the person likes: six accounts with entirely different
// libraries all came out with a top three inside the Consciousness pillar, and
// two came out byte-identical. The shelf would have been a second Consciousness
// row sitting above the first.
//
// Dividing by how common a slug is in the catalogue fixes it. The same six
// accounts then produce conscious-science / energy-medicine / meditation,
// soul-purpose / meditation / breathwork, ancient-wisdom / law-of-attraction /
// meditation — distinct, and recognisably their own.
//
// Measured once, by hand, from healers + books. Not read at runtime: it would
// be six count queries to re-derive numbers that move by a percentage point a
// month. Worth re-measuring after any large ingest.
export const GLOBAL_TAG_FREQUENCY = {
  'self-healing': 0.5,
  spirituality: 0.43,
  consciousness: 0.37,
  meditation: 0.27,
  mindfulness: 0.24,
  'spiritual-awakening': 0.24,
};

// For every other slug. Deliberately below the lowest measured value, so an
// unlisted tag is treated as rarer than the six that needed naming and gets a
// mild boost rather than a penalty.
export const DEFAULT_TAG_FREQUENCY = 0.15;

// A publishing house is tagged across half the taxonomy — Sounds True alone
// carries six Consciousness-pillar slugs — so one tap on a publisher would
// otherwise decide the whole ranking. Two slugs is enough to register that the
// save happened without letting it speak for the person.
export const PUBLISHER_SLUG_CAP = 2;

// THE SIGNAL THRESHOLD. Three saves is a visitor looking around; the shelf
// should not claim to know them. And breadth without depth — every slug
// contributed by exactly one item — is noise, because a single broadly-tagged
// healer can carry 28 slugs on its own.
export const FOR_YOU_MIN_FAVOURITES = 4;
export const FOR_YOU_TOP_SLUGS = 3;
export const FOR_YOU_MIN_VIDEOS = 3;

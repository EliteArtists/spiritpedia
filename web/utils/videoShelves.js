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

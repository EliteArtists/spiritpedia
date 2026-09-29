// The 42 canonical subject slugs, in the order the setup form shows them.
//
// Verified against public.subjects: the list below and the table match exactly,
// both ways, with no slug in one and not the other. That matters more than it
// looks — subject_slugs written here are matched against content with an array
// containment check, so a single slug that does not exist in the table would
// silently select a subject that returns nothing for the rest of time.
export const SUBJECT_SLUGS = [
  'akashic-records', 'ancient-wisdom', 'astrology', 'ayurveda', 'breathwork',
  'chakra-healing', 'channelled-teachings', 'conscious-relationships',
  'conscious-science', 'consciousness', 'death-the-afterlife', 'dreamwork',
  'eft-tapping', 'energy-medicine', 'hermeticism', 'homeopathy', 'human-design',
  'law-of-attraction', 'life-coaching', 'manifestation', 'polarity', 'meditation',
  'mediumship-spirits', 'mindfulness', 'mysticism', 'nde', 'non-duality',
  'plant-medicine', 'qi-gong', 'quantum-healing', 'quantum-touch', 'reiki',
  'sacred-geometry', 'self-healing', 'shadow-work', 'shamanism', 'soul-purpose',
  'sound-healing', 'spiritual-awakening', 'spirituality', 'tai-chi', 'yoga',
];

// Slugs are for the database; people read words. 'nde' and 'eft-tapping' in
// particular are unreadable as labels. Anything not listed falls back to a
// title-cased version of the slug, so a subject added to the table without a
// label here still renders as something legible.
const LABEL_OVERRIDES = {
  'nde': 'Near-Death Experience',
  'eft-tapping': 'EFT / Tapping',
  'death-the-afterlife': 'Death & the Afterlife',
  'mediumship-spirits': 'Mediumship & Spirits',
  'qi-gong': 'Qi Gong',
  'tai-chi': 'Tai Chi',
};

export function subjectLabel(slug) {
  if (LABEL_OVERRIDES[slug]) return LABEL_OVERRIDES[slug];
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Stored on user_profiles.availability_type. These are the same internal keys
// the admin dashboard uses in its own form state; AVAILABILITY_LABELS there
// converts them to the human strings healers.availability_type carries, which
// is the translation an admin applies when a profile becomes a healer row.
export const AVAILABILITY_OPTIONS = [
  { value: 'worldwide', label: 'Worldwide' },
  { value: 'local_online', label: 'Local and Online' },
  { value: 'local', label: 'Local Only' },
];

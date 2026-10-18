// Badges on every listing (migration 0023). README → "Badges explained".
//
//   Type      what it is: Practitioner, Channel, App, Organisation, Publisher.
//             Set by the admin at approval.
//   Tier      how big it is. Set by the admin; never for sale. The same three
//             stored values for everyone, named for people or for platforms:
//               superhero  → Superhero   / Superstar      (gold)
//               luminary   → Luminary    / Shining Star   (purple)
//               local_hero → Local Hero  / Rising Star    (green)
//             ascended_master stays as it is, for people only.
//   Verified  the owner has confirmed it is theirs (healers.verified,
//             publishers.verified). Automatic.
//   Official  Spiritpedia's own listing (healers.official). Automatic. It shows
//             no tier.
//
// The app has the same rules (app/lib/data/badges.dart). Plain ES module with
// no React dependency, so `node --test` can import it.

const PEOPLE = {
  superhero: 'Superhero',
  luminary: 'Luminary',
  local_hero: 'Local Hero',
  ascended_master: 'Ascended Master',
};

const PLATFORMS = {
  superhero: 'Superstar',
  luminary: 'Shining Star',
  local_hero: 'Rising Star',
};

// A publisher's card and page already say what it is, so it shows no type.
const TYPES = {
  channel: 'Channel',
  app: 'App',
  organisation: 'Organisation',
};

// A person: entity_type 'individual', or NULL as it always was. A publisher is
// passed as 'publisher' (it has its own table, not an entity_type).
export function isPerson(entityType) {
  return !entityType || entityType === 'individual';
}

// The tier's name for this kind of listing, or null when it has none to show.
export function tierName(tier, entityType) {
  return (isPerson(entityType) ? PEOPLE : PLATFORMS)[tier] || null;
}

// What it is, for anything that is not a person.
export function typeLabel(entityType) {
  return TYPES[entityType] || null;
}

// What the star says when a badge is tapped. Keyed by the tier's name. The
// top two tiers say the same for people and platforms.
const WORLDWIDE = 'A worldwide reach, with over a million followers across social media.';
const FUTURE = 'Hundreds of thousands of followers: the superstars of the future.';

export const TIER_TIPS = {
  Superhero: WORLDWIDE,
  Luminary: FUTURE,
  'Local Hero': 'A practitioner available in your area.',
  'Ascended Master': 'A timeless teacher whose legacy lives on.',
  Superstar: WORLDWIDE,
  'Shining Star': FUTURE,
  'Rising Star': 'A rising voice, and worth finding early: under a hundred thousand followers, for now.',
};

export function verifiedTip(name) {
  return `This page is run by ${name || 'its owner'} themselves. They’ve confirmed it’s theirs, so what you see here comes straight from them.`;
}

export const OFFICIAL_TIP =
  'This is my home: Spiritpedia’s own page. Our videos, our reviews, and where you can always find us.';

// Beside the admin's tier dropdown: the tips' own measures.
export const PLATFORM_TIER_GUIDANCE = [
  'Superstar: worldwide reach, 1M+ followers across social media',
  'Shining Star: hundreds of thousands of followers',
  'Rising Star: growing, under 100k',
];

export const PEOPLE_TIER_GUIDANCE = [
  'Superhero: worldwide reach, 1M+ followers across social media',
  'Luminary: hundreds of thousands of followers',
  'Local Hero: a practitioner available in their area',
];

// The guidance for this kind of listing.
export function tierGuidance(entityType) {
  return isPerson(entityType) ? PEOPLE_TIER_GUIDANCE : PLATFORM_TIER_GUIDANCE;
}

// The admin's tier dropdown for this kind of listing.
export function tierOptions(entityType) {
  if (isPerson(entityType)) {
    return ['superhero', 'ascended_master', 'luminary', 'local_hero'].map((value) => ({ value, label: PEOPLE[value] }));
  }
  return ['superhero', 'luminary', 'local_hero'].map((value) => ({ value, label: PLATFORMS[value] }));
}

// Every badge a listing wears, in order: the tier (never for Official), then
// the type, then Verified or Official. Each { kind, label, tier?, tip }.
export function listingBadges(listing, entityType = listing?.entity_type) {
  if (!listing) return [];
  const badges = [];
  if (listing.official) {
    badges.push({ kind: 'official', label: '✦ Official', tip: OFFICIAL_TIP });
    return badges;
  }
  const name = tierName(listing.tier, entityType);
  // Ascended Masters wear their lifespan instead; the pages draw that.
  if (name && listing.tier !== 'ascended_master') {
    badges.push({ kind: 'tier', tier: listing.tier, label: name, tip: TIER_TIPS[name] });
  }
  const type = typeLabel(entityType);
  if (type) badges.push({ kind: 'type', label: type, tip: null });
  if (listing.verified) {
    badges.push({ kind: 'verified', label: '✓ Verified', tip: verifiedTip(listing.name) });
  }
  return badges;
}

// "Book with Eckhart →" for a practitioner; "Visit {name} →" for everyone
// else, Spiritpedia included.
export function actionLabel(listing, entityType = listing?.entity_type) {
  if (isPerson(entityType) && !listing?.official) {
    const first = listing?.name?.split(' ')[0] || listing?.name;
    return `Book with ${first} →`;
  }
  return `Visit ${listing?.name} →`;
}

// Where that button goes: a practitioner's booking link; for everyone else
// their booking link or, failing that, their website.
export function actionUrl(listing, entityType = listing?.entity_type) {
  if (!listing) return null;
  const url = isPerson(entityType) && !listing.official ? listing.booking_url : listing.booking_url || listing.website_url;
  return withScheme(url);
}

// "www.example.com" typed without https:// would open as a page of this site.
export function withScheme(url) {
  const value = typeof url === 'string' ? url.trim() : '';
  if (!value) return null;
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  return `https://${value.replace(/^\/+/, '')}`;
}

// "Spiritpedia", whatever the capitals, spaces or punctuation: a name only
// Spiritpedia's own account may review under. The database has the same rule
// (review_name_reserved, migration 0023).
export function reviewNameReserved(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .includes('spiritpedia');
}

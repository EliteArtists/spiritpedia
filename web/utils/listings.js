// Listings of every kind: practitioners, channels, podcasts, apps, publishers
// and organisations (migration 0020).
//
// Everyone who shares their work signs up the same way, as user_type
// 'practitioner'. The KIND of listing lives on the listing — healers.entity_type,
// or a publishers row — and the admin sets it at approval, pre-filled from the
// applicant's optional "What best describes you?" (user_profiles.described_as).
// The app has the same platform rule (app/lib/data/models.dart → isPlatform).
//
// Plain ES module with no React dependency, so `node --test` can import it.

// "What best describes you?" — user_profiles.described_as (0020 checks these).
export const DESCRIBED_AS_OPTIONS = [
  { value: 'practitioner', label: 'A practitioner or teacher' },
  { value: 'channel', label: 'A YouTube channel' },
  { value: 'podcast', label: 'A podcast' },
  { value: 'app', label: 'An app' },
  { value: 'publisher', label: 'A publisher' },
  { value: 'organisation', label: 'An organisation or network' },
  { value: 'not_sure', label: 'Not sure' },
];

export function describedAsLabel(value) {
  return DESCRIBED_AS_OPTIONS.find((o) => o.value === value)?.label || null;
}

// What the admin can make an application into. 'publisher' is not an
// entity_type: approving one creates or links a publishers row instead.
export const LISTING_TYPES = [
  { value: 'individual', label: 'Practitioner' },
  { value: 'channel', label: 'Channel or podcast' },
  { value: 'app', label: 'App' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'publisher', label: 'Publisher' },
];

export const ENTITY_TYPES = ['individual', 'channel', 'app', 'organisation'];

// The admin's dropdown, pre-filled from the applicant's own answer. "Not sure"
// and no answer leave it for the admin to choose ('').
const SUGGESTED = {
  practitioner: 'individual',
  channel: 'channel',
  podcast: 'channel',
  app: 'app',
  organisation: 'organisation',
  publisher: 'publisher',
};

export function suggestedListingType(describedAs) {
  return SUGGESTED[describedAs] || '';
}

// Channels, apps and organisations share Explore These Channels; everything
// else is a person. NULL is a person, as it always was.
export function isPlatform(healer) {
  const t = healer?.entity_type;
  return t === 'channel' || t === 'app' || t === 'organisation';
}

// Spiritpedia Official first, everything else in the order it came.
export function officialFirst(healers) {
  const list = Array.isArray(healers) ? healers : [];
  return [...list.filter((h) => h?.official), ...list.filter((h) => !h?.official)];
}

// "Do you offer sessions in person?" (and, if so, "online too?") as the
// availability key user_profiles stores (utils/practitionerSubjects.js).
export function availabilityFor({ inPerson, online }) {
  if (!inPerson) return 'worldwide';
  return online ? 'local_online' : 'local';
}

export function inPersonFrom(availability) {
  return { inPerson: availability === 'local' || availability === 'local_online', online: availability !== 'local' };
}

// One claim from the listings an email matched, or none. More than one match —
// across healers and publishers together — is no claim at all: guessing between
// two listings could hand someone a colleague's. They can ask instead.
export function chooseClaim(healerSlugs, publisherSlugs) {
  const found = [
    ...(healerSlugs || []).map((slug) => ({ kind: 'healer', slug })),
    ...(publisherSlugs || []).map((slug) => ({ kind: 'publisher', slug })),
  ];
  if (found.length === 1) return found[0];
  return found.length > 1 ? { ambiguous: true } : null;
}

export function claimPath(claim) {
  if (!claim?.slug) return null;
  const kind = claim.kind === 'publisher' ? '&kind=publisher' : '';
  return `/auth/claim?slug=${encodeURIComponent(claim.slug)}${kind}`;
}

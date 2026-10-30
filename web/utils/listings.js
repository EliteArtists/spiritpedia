// Listings of every kind: practitioners, channels, podcasts, apps, publishers,
// organisations (migration 0020) and schools (0029).
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
  { value: 'individual', label: 'Individual' },
  { value: 'channel', label: 'Channel or podcast' },
  { value: 'app', label: 'App' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'school', label: 'School' },
  { value: 'publisher', label: 'Publisher' },
];

export const ENTITY_TYPES = ['individual', 'channel', 'app', 'organisation', 'school'];

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

// Channels, apps, organisations and schools are not people: they are listed
// apart from the teachers (search, subject pages, My Library, a publisher's
// channels). Everything else is a person. NULL is a person, as it always was.
export function isPlatform(healer) {
  const t = healer?.entity_type;
  return t === 'channel' || t === 'app' || t === 'organisation' || t === 'school';
}

// A school (0029): its own Schools & Academies shelf on Discover, rather than
// Explore These Channels, and "Our Teachers" on its page.
export function isSchool(healer) {
  return healer?.entity_type === 'school';
}

// "8 teachers", counted from school_teachers rows ({ school_id }) for one
// school.
export function teacherCount(school, links) {
  return (Array.isArray(links) ? links : []).filter((l) => l?.school_id === school?.id).length;
}

// A publisher's "N authors": the people among its linked listings, never its
// channels or apps. Reads the embed publisher_healers(healers(entity_type)).
export function authorCount(publisher) {
  const links = Array.isArray(publisher?.publisher_healers) ? publisher.publisher_healers : [];
  return links.filter((link) => link?.healers && !isPlatform(link.healers)).length;
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

// Addresses that say nothing about who someone works for. A domain match on any
// of these would hand out claims to whichever healer happened to list a Gmail
// address — so for these, only an exact contact_email match counts.
const FREE_MAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'hotmail.co.uk',
  'live.com', 'live.co.uk', 'msn.com', 'yahoo.com', 'yahoo.co.uk', 'ymail.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com',
  'pm.me', 'gmx.com', 'gmx.co.uk', 'mail.com', 'yandex.com', 'zoho.com',
  'btinternet.com', 'sky.com', 'virginmedia.com', 'talktalk.net', 'tutanota.com',
]);

// Does this email look like it belongs to a listing already on Spiritpedia —
// any listing, a healer of any kind or a publisher (migration 0020)?
//
// Two tests, strongest first:
//   1. The listing's contact_email matches exactly. Unambiguous.
//   2. The email's domain appears in the listing's website (or, for healers,
//      YouTube) link — but only for a domain the person could plausibly own.
//      karina@karinagrant.co.uk matching karinagrant.co.uk is evidence;
//      anyone@gmail.com matching a healer who listed a Gmail address is not.
//
// More than one match, across healers and publishers together, returns no
// claim. Two practitioners sharing a clinic domain is ordinary, and guessing
// between them would invite someone to claim a colleague's profile. They go
// through the normal setup and can request a claim there.
//
// The database re-checks all of this when the claim is made
// (claim_healer_profile / claim_publisher_profile); this only decides where to
// send them, and whether the practitioner welcome waits for the claim. client
// is any Supabase client: listings are public.
export async function findClaimableListing(client, email) {
  const address = (email || '').trim().toLowerCase();
  if (!address.includes('@')) return null;
  // ilike treats % and _ as wildcards; an address may contain an underscore.
  const exactPattern = address.replace(/[\\%_]/g, (c) => `\\${c}`);

  const [{ data: exactHealers }, { data: exactPublishers }] = await Promise.all([
    client.from('healers').select('healer_slug').ilike('contact_email', exactPattern).limit(2),
    client.from('publishers').select('slug').ilike('contact_email', exactPattern).limit(2),
  ]);
  const exact = chooseClaim(
    (exactHealers || []).map((r) => r.healer_slug),
    (exactPublishers || []).map((r) => r.slug)
  );
  if (exact) return exact.ambiguous ? null : exact;

  const domain = address.split('@')[1];
  if (!domain || FREE_MAIL_DOMAINS.has(domain)) return null;

  const [{ data: domainHealers }, { data: domainPublishers }] = await Promise.all([
    client
      .from('healers')
      .select('healer_slug')
      .or(`website_url.ilike.%${domain}%,youtube_url.ilike.%${domain}%`)
      .limit(2),
    client.from('publishers').select('slug').ilike('website_url', `%${domain}%`).limit(2),
  ]);
  const byDomain = chooseClaim(
    (domainHealers || []).map((r) => r.healer_slug),
    (domainPublishers || []).map((r) => r.slug)
  );
  return byDomain && !byDomain.ambiguous ? byDomain : null;
}

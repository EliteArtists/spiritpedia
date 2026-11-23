// An application that is really a claim (owner, 23 Nov 2026, after Flying
// Cloud Zen applied as a new organisation instead of claiming its listing).
// Admin → Inbox → the application → "Listing" → choose the existing listing:
// Approve then links the account to it and marks it claimed, instead of
// making a second listing (/api/admin/practitioner, healerSlug).
//
// Pure, so the rules are tested (applicationClaim.test.mjs).

import { siteKey } from './neverAgain.js';

// What user_profiles.availability_type stores → the label healers carry. As
// /api/admin/practitioner writes them for a new listing.
const AVAILABILITY_LABELS = {
  worldwide: 'Worldwide (Online Sessions)',
  local: 'Local Only (In-Person)',
  local_online: 'Local & Online Sessions',
};

// "US" → "United States", as listings write it; a name stays a name.
export function countryName(value) {
  const text = (value || '').trim();
  if (!/^[A-Za-z]{2}$/.test(text)) return text || null;
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(text.toUpperCase()) || text;
  } catch {
    return text;
  }
}

// What the application changes on the listing when "Use what they wrote" is
// ticked: their bio, their pictures (first, ahead of the listing's own), and
// their place and whether they meet in person and online. Only what they
// filled in, and only what differs. Videos, books, offerings, subjects and
// the listing's contact address are never touched.
export function fillFromApplication(profile, listing) {
  const changes = {};
  const bio = (profile?.bio || '').trim();
  if (bio && bio !== (listing?.bio || '').trim()) changes.bio = bio;

  const theirs = (profile?.image_urls || []).filter(Boolean);
  if (theirs.length) {
    const images = [...theirs, ...(listing?.image_urls || []).filter((url) => url && !theirs.includes(url))];
    if (JSON.stringify(images) !== JSON.stringify(listing?.image_urls || [])) changes.image_urls = images;
  }

  const city = (profile?.location_city || '').trim();
  const country = countryName(profile?.location_country);
  if (city && city !== listing?.city) changes.city = city;
  if (country && country !== listing?.country) changes.country = country;

  const availability = AVAILABILITY_LABELS[profile?.availability_type];
  if (availability && availability !== listing?.availability_type) changes.availability_type = availability;
  return changes;
}

const tidyName = (name) =>
  (name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(the|community|sangha|centre|center)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const domainOf = (email) => {
  const domain = (email || '').split('@')[1]?.toLowerCase() || '';
  return /^(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|aol|proton|protonmail)\./.test(domain) ? null : domain || null;
};

// Listings the application may really be, best first, each with why:
// the same website, the same address, a listing address on their email's
// own domain (not gmail and the like), or the same name.
export function likelyListings(profile, email, listings) {
  const site = siteKey(profile?.website_url);
  const host = site?.split('/')[0] || null;
  const name = tidyName(profile?.full_name);
  const address = (email || '').trim().toLowerCase();
  const domain = domainOf(address);
  const found = [];
  for (const listing of listings || []) {
    const why = [];
    const theirSite = siteKey(listing.website_url);
    if (site && theirSite && (theirSite === site || theirSite.split('/')[0] === host)) why.push('same website');
    const theirEmail = (listing.contact_email || '').toLowerCase();
    if (address && theirEmail === address) why.push('same email');
    else if (domain && theirEmail.endsWith(`@${domain}`)) why.push('email on the same domain');
    if (name && tidyName(listing.name) === name) why.push('same name');
    if (why.length) found.push({ ...listing, why });
  }
  return found.sort((a, b) => b.why.length - a.why.length).slice(0, 5);
}

// Admin → Ingestion → Add Listing (owner, 11 Nov 2026): the sprint ingest's
// rules for a new listing (scripts/ingest.mjs, README §18.4), as pure
// functions the form and its route share. One listing of any kind: a person,
// a channel, an app, an organisation, a school, or a publisher (its own
// table). Plain ES module with no React dependency, so `node --test` can
// import it.

import { isPerson, tierOptions } from './badges.js';

export const KINDS = [
  { value: 'individual', label: 'Individual (a person)' },
  { value: 'channel', label: 'Channel (YouTube or podcast)' },
  { value: 'app', label: 'App' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'school', label: 'School' },
  { value: 'publisher', label: 'Publisher' },
];

export const MAX_SUBJECTS = 3;
// Teachers link to these (hub_teachers, migrations 0029, 0030).
export const HUB_KINDS = ['school', 'organisation'];
export const HUB_ROLES = ['founder', 'instructor'];
// Every living person, school and organisation has a published base, or a
// reason there is none (owner, 3 Nov 2026), so Near You can find them.
const BASE_KINDS = ['individual', 'school', 'organisation'];

export const isHub = (kind) => HUB_KINDS.includes(kind);
export const isPublisher = (kind) => kind === 'publisher';

// The same slug rules as the sprint ingest: accents folded first ("día" →
// "dia"), dashes and slashes turned into hyphens.
export function slugify(v) {
  return (v || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‐-―/]/g, '-')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const isUrl = (v) => /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(String(v || '').trim());
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

// A site, compared on host and path: no scheme, no www, no trailing slash, no
// query. "https://www.Example.com/about/" and "http://example.com/about" match.
export function siteKey(url) {
  const s = String(url || '').trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:/i.test(s) ? s : `https://${s}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = u.pathname.replace(/\/+$/, '').toLowerCase();
    return `${host}${path}`;
  } catch {
    return null;
  }
}

// A YouTube channel link, compared on its handle or channel id.
export function youtubeKey(url) {
  const s = String(url || '').trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:/i.test(s) ? s : `https://${s}`);
    if (!/(^|\.)youtube\.com$/i.test(u.hostname)) return null;
    const [a, b] = u.pathname.split('/').filter(Boolean);
    if (a?.startsWith('@')) return decodeURIComponent(a).toLowerCase();
    if ((a === 'channel' || a === 'c' || a === 'user') && b) return `${a}/${b}`.toLowerCase();
    return null;
  } catch {
    return null;
  }
}

const sameName = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

// What's already on Spiritpedia with the same slug, name, website or YouTube
// channel. `rows` are listings ({ name, healer_slug | slug, website_url,
// youtube_url, kind }). → [{ field, name, slug, kind }].
export function findDuplicates(input, rows) {
  const out = [];
  const site = siteKey(input.website_url);
  const yt = youtubeKey(input.youtube_url);
  for (const r of rows || []) {
    const slug = r.healer_slug || r.slug;
    const hit = (field) => out.push({ field, name: r.name, slug, kind: r.kind || r.entity_type || 'individual' });
    if (slug && slug === input.slug) hit('slug');
    else if (sameName(r.name, input.name)) hit('name');
    else if (site && siteKey(r.website_url) === site) hit('website');
    else if (yt && youtubeKey(r.youtube_url) === yt) hit('YouTube channel');
  }
  return out;
}

// Everything the sprint ingest refuses, for one new listing. `subjectSlugs` is
// the set of subjects that exist (null to skip that check). → { problems,
// warnings }: problems stop the insert; warnings are shown and allowed.
export function checkListing(input, { subjectSlugs = null } = {}) {
  const problems = [];
  const warnings = [];
  const kind = input.kind;
  const publisher = isPublisher(kind);

  if (!KINDS.some((k) => k.value === kind)) problems.push(`Kind "${kind}" isn't one of ${KINDS.map((k) => k.value).join(', ')}.`);
  if (!String(input.name || '').trim()) problems.push('Name is required.');
  if (!input.slug) problems.push('Slug is required.');
  else if (input.slug !== slugify(input.slug)) problems.push(`Slug "${input.slug}" isn't web-safe; it would be "${slugify(input.slug)}".`);

  // The tier, named for this kind (badges.js).
  const tiers = tierOptions(publisher ? 'publisher' : kind).map((t) => t.value);
  if (!tiers.includes(input.tier)) problems.push(`Pick a tier (${tierOptions(publisher ? 'publisher' : kind).map((t) => t.label).join(', ')}).`);
  if (input.tier === 'ascended_master') {
    if (!isPerson(kind)) problems.push('An Ascended Master must be a person.');
    if (!input.death_year) problems.push('An Ascended Master needs a death year (and a birth year if known).');
  } else if (input.birth_year || input.death_year) {
    problems.push('Birth and death years are only for Ascended Masters.');
  }

  // Subjects: 1 to 3, all real.
  const subjects = input.subjects || [];
  if (subjects.length === 0) problems.push('Pick at least one subject.');
  if (subjects.length > MAX_SUBJECTS) problems.push(`At most ${MAX_SUBJECTS} subjects (README §18.4).`);
  if (subjectSlugs) for (const s of subjects) if (!subjectSlugs.has(s)) problems.push(`Subject "${s}" doesn't exist.`);

  // Links must be links.
  for (const [field, label] of [
    ['website_url', 'Website'],
    ['youtube_url', 'YouTube'],
    ['booking_url', 'Booking link'],
    ['instagram_url', 'Instagram'],
    ['facebook_url', 'Facebook'],
    ['twitter_url', 'Twitter'],
    ['tiktok_url', 'TikTok'],
    ['contact_form_url', 'Contact form'],
    ['contact_email_source', 'Where the email is published'],
    ['location_source', 'Where the base is published'],
  ]) {
    if (input[field] && !isUrl(input[field])) problems.push(`${label} must be a full http(s) link.`);
  }
  for (const [i, url] of (input.image_urls || []).entries()) {
    if (url && !isUrl(url)) problems.push(`Image ${i + 1} must be a full http(s) link.`);
  }
  if (!(input.image_urls || []).some(Boolean)) warnings.push(publisher ? 'No logo yet.' : 'No photo yet: the card will show a placeholder.');

  // Contact (README §18.4, owner 11 Nov 2026): a published email, with the
  // page that publishes it, or the listing's own contact form. A phone number
  // or postal address alone fails. Protected or obfuscated addresses are
  // never decoded, so one can't be entered here either.
  const email = String(input.contact_email || '').trim();
  if (email && !isEmail(email)) problems.push(`"${email}" isn't an email address.`);
  if (/cdn-cgi|email-protection|\[at\]|\(at\)/i.test(`${email} ${input.contact_email_source || ''}`)) {
    problems.push('That address is protected or obfuscated on its page: never decode it. Use the contact form instead.');
  }
  if (!publisher) {
    if (!email && !input.contact_form_url) problems.push('Contact: a published email or a contact form is needed (a phone or address alone fails).');
    if (email && !input.contact_email_source) problems.push('Add where the email is published (the page link).');
  } else if (!email) {
    warnings.push('No contact email: the publisher can still be claimed, but outreach has nowhere to write.');
  }

  // The base.
  if (!publisher) {
    const city = String(input.city || '').trim();
    const country = String(input.country || '').trim();
    const needsBase = BASE_KINDS.includes(kind) && input.tier !== 'ascended_master';
    if (/\d/.test(city)) problems.push(`Base: "${city}" looks like an address; city level only.`);
    if (country && !input.location_source) problems.push('Base: add the page that publishes the city and country.');
    if (needsBase && !country && !String(input.no_public_base || '').trim()) {
      problems.push('Base: no country. Give the published city and country, or say why there is no public base.');
    }
    if (input.tier === 'ascended_master' && (city || country)) warnings.push('Ascended Masters keep no base; the city and country will be left out.');
  }

  // Teachers, for a school or an organisation.
  const teachers = input.teachers || [];
  if (teachers.length && !isHub(kind)) problems.push('Only a school or an organisation has teachers.');
  for (const t of teachers) if (!HUB_ROLES.includes(t.role)) problems.push(`${t.name || t.slug}: role "${t.role}" isn't founder or instructor.`);
  if (input.bio && String(input.bio).trim().length < 80) warnings.push('The bio is very short.');

  return { problems, warnings };
}

// Shared by the admin routes and the daily cron, so "has this been claimed?"
// and "what is due next?" cannot drift between them.

import { JOURNEY_EMAILS, JOURNEY_SCHEDULE } from './email.js';
import { outreachFirstName } from './emailTemplates.js';
import { booksByAuthorsFilter } from './bookAuthors.js';
import { isPlatform } from './listings.js';

export const DAY_MS = 24 * 60 * 60 * 1000;

// THE STOP SIGNAL. A claim writes user_profiles.linked_healer_slug (or, for a
// publisher, linked_publisher_id, migration 0020) and nothing else — healers
// carries no owner column — so this is the only way to know, and it needs the
// service role: user_profiles RLS is own-row-only, so the anon key reads
// nothing here and would report every listing as unclaimed.
//
// `target` is a healer slug (as before) or { slug } / { publisherId }.
export async function isClaimed(supabase, target) {
  const { slug, publisherId } = journeyTarget(target);
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq(publisherId ? 'linked_publisher_id' : 'linked_healer_slug', publisherId || slug)
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

// A healer slug, or { slug } / { publisherId } → { slug, publisherId }.
export function journeyTarget(target) {
  if (typeof target === 'string') return { slug: target, publisherId: null };
  return { slug: target?.slug || null, publisherId: target?.publisherId || null };
}

// Stop reasons that mean "never write to this listing again": they asked us to
// stop, asked for the listing to be removed, or their address bounced or
// complained. A journey that ended this way blocks any new one.
export const DO_NOT_CONTACT = {
  asked_to_stop: 'They asked us to stop emailing.',
  removal_requested: 'They asked for the listing to be removed.',
  suppressed: 'Their address bounced or marked an email as spam.',
};

// The reason a listing must not be written to again, or null. By listing;
// for the same rule by address, see doNotContactByAddress.
export async function doNotContactReason(supabase, target) {
  const { slug, publisherId } = journeyTarget(target);
  const { data } = await supabase
    .from('healer_journeys')
    .select('stop_reason')
    .eq(publisherId ? 'publisher_id' : 'healer_slug', publisherId || slug)
    .eq('status', 'stopped')
    .in('stop_reason', Object.keys(DO_NOT_CONTACT))
    .limit(1);
  const reason = Array.isArray(data) && data[0]?.stop_reason;
  return reason ? DO_NOT_CONTACT[reason] : null;
}

// ACROSS JOURNEYS. One inbox can sit behind several listings: a school and
// its founder, or a publisher and a channel, often publish the same address.
// Somebody who asked us to stop (or for removal, or whose address bounced)
// through one of them must not be written to through another. → the reason,
// or null. Addresses compare case-insensitively.
export async function doNotContactByAddress(supabase, email) {
  // ilike for case, with its wildcards escaped: "_" is common in addresses.
  const address = (email || '').trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  if (!address) return null;
  const [{ data: healers }, { data: publishers }] = await Promise.all([
    supabase.from('healers').select('healer_slug').ilike('contact_email', address),
    supabase.from('publishers').select('id').ilike('contact_email', address),
  ]);
  const slugs = (healers || []).map((h) => h.healer_slug);
  const ids = (publishers || []).map((p) => p.id);
  for (const [column, values] of [
    ['healer_slug', slugs],
    ['publisher_id', ids],
  ]) {
    if (!values.length) continue;
    const { data } = await supabase
      .from('healer_journeys')
      .select('stop_reason')
      .in(column, values)
      .eq('status', 'stopped')
      .in('stop_reason', Object.keys(DO_NOT_CONTACT))
      .limit(1);
    const reason = Array.isArray(data) && data[0]?.stop_reason;
    if (reason) return `${DO_NOT_CONTACT[reason]} (through another listing with the same address)`;
  }
  return null;
}

// WHO THE OUTREACH EMAILS MAY GO TO.
//
// Every kind of listing can have a journey (publishers too, owner 11 Nov
// 2026: healer_journeys.publisher_id, migration 0020). Individuals have the
// practitioner sequence; channels, apps, organisations, schools and
// publishers have the shared sequence (utils/emailTemplates.js →
// sharedOutreachEmail), installed 11 Nov 2026 and SWITCHED OFF.
//
// THE SWITCH, AND THE ONLY ONE. The owner turns the shared journeys on when
// the app is in both stores. To do it, add the kinds to this list, e.g.
//   export const OUTREACH_KINDS_APPROVED = ['individual', 'channel', 'app', 'organisation', 'school', 'publisher'];
// and deploy. Start buttons, the start route and the daily job all read it;
// journeys the daily job paused as kind_not_approved are resumed by hand.
export const OUTREACH_KINDS = ['individual', 'channel', 'app', 'organisation', 'school', 'publisher'];
export const OUTREACH_KINDS_APPROVED = ['individual'];

// A listing with no entity_type predates the column and is a person.
export function outreachKind(entityType) {
  return entityType || 'individual';
}

export function outreachAllowedFor(entityType) {
  return OUTREACH_KINDS_APPROVED.includes(outreachKind(entityType));
}

const KIND_WORDS = {
  channel: 'channels',
  app: 'apps',
  organisation: 'organisations',
  school: 'schools',
  publisher: 'publishers',
};

// Why Start is off for this kind, or null when it is allowed.
export function outreachRefusal(entityType) {
  if (outreachAllowedFor(entityType)) return null;
  const words = KIND_WORDS[outreachKind(entityType)] || 'this kind of listing';
  return `Switched off. The approved wording for ${words} is installed, but journeys for ${words} stay off until the owner turns them on.`;
}

// What the greeting calls them (utils/emailTemplates.js): a person by their
// first name, anything else "Hello,".
export { outreachFirstName };

// THE DAILY JOB'S CHECKS, in order, before each send. Pure, so the order is
// tested rather than trusted:
//   listing gone            → stop, healer_removed
//   claimed                 → stop, claimed
//   kind no longer approved → pause, kind_not_approved (an admin may have
//                             changed an individual into an organisation
//                             since the journey began; the wording no longer
//                             fits, so nothing more goes until it does)
//   no address              → stop, no_contact_email
//   otherwise               → send whatever is due
export function cronDecision({ listing, claimed, entityType }) {
  if (!listing) return { stop: 'healer_removed' };
  if (claimed) return { stop: 'claimed' };
  if (!outreachAllowedFor(entityType)) return { pause: 'kind_not_approved' };
  if (!listing.contact_email) return { stop: 'no_contact_email' };
  return { send: true };
}

// One word for where a journey stands, for the Outreach list and its filter.
// Claimed and replied outrank the status: they are what the journey was for.
export const JOURNEY_STATES = {
  running: 'Running',
  paused: 'Paused',
  replied: 'Replied',
  claimed: 'Claimed',
  form: 'Contacted via form',
  complete: 'Sequence complete',
  do_not_contact: 'Do not contact',
  stopped: 'Stopped',
};

export function journeyState(journey, { claimed = false } = {}) {
  if (journey.channel === 'form') return 'form';
  if (journey.replied_at) return 'replied';
  if (claimed || journey.stop_reason === 'claimed') return 'claimed';
  if (journey.status === 'running') return 'running';
  if (journey.status === 'paused') return 'paused';
  if (journey.stop_reason === 'sequence_complete') return 'complete';
  if (DO_NOT_CONTACT[journey.stop_reason]) return 'do_not_contact';
  return 'stopped';
}

// A column or table that migration 0044 adds, and the database has not got
// yet: Postgres says 42703/42P01, PostgREST PGRST204/PGRST205. The routes
// then carry on without it and say plainly what is missing.
export function isMissingSchema(error) {
  return ['42703', '42P01', 'PGRST204', 'PGRST205'].includes(error?.code);
}

export const MIGRATION_NEEDED =
  'This needs migration 0044 (supabase/migrations/0044_outreach_tracking.sql). Run it on this database first.';

export function sentAtColumn(n) {
  return `email_${n}_sent_at`;
}

// When email n is due, counted from started_at rather than from the previous
// send: a late send must not push the rest of the sequence back with it.
export function dueAt(journey, n) {
  const days = JOURNEY_SCHEDULE[n - 1];
  if (days === undefined) return null;
  return new Date(new Date(journey.started_at).getTime() + days * DAY_MS);
}

// The lowest-numbered email that has not gone and is now due. Lowest-numbered
// on purpose: if a cron run is missed, the backlog is worked through one a day
// rather than three at once landing in somebody's inbox together.
export function nextDue(journey, now = new Date()) {
  for (let n = 1; n <= JOURNEY_EMAILS; n += 1) {
    if (journey[sentAtColumn(n)]) continue;
    const due = dueAt(journey, n);
    if (due && due <= now) return n;
    return null;
  }
  return null;
}

// Every email with its state, for the admin card and the Outreach list.
// `messages` are the journey's journey_messages rows (migration 0044), if
// any: what Resend said happened to each email after it was sent.
export function schedule(journey, messages = []) {
  return Array.from({ length: JOURNEY_EMAILS }, (_, i) => {
    const n = i + 1;
    const sentAt = journey[sentAtColumn(n)];
    const message = messages.find((m) => m.email_number === n) || null;
    return {
      number: n,
      sentAt: sentAt || null,
      dueAt: dueAt(journey, n)?.toISOString() || null,
      deliveredAt: message?.delivered_at || null,
      bouncedAt: message?.bounced_at || null,
      bounceType: message?.bounce_type || null,
    };
  });
}

// Record that Resend accepted email n, so its webhook can find it. Never
// fails the send: before migration 0044 the table is missing and the email
// has still gone.
export async function recordMessage(supabase, { resendId, journeyId, emailNumber }) {
  if (!resendId) return;
  const { error } = await supabase
    .from('journey_messages')
    .upsert({ resend_id: resendId, journey_id: journeyId, email_number: emailNumber }, { onConflict: 'resend_id' });
  if (error && !isMissingSchema(error)) console.error('[journey] message not recorded:', error);
}

// journey_messages for these journeys, grouped by journey id. `ready` is false
// before migration 0044 (no table yet), so the admin can say "not tracked yet"
// rather than imply nothing was delivered.
export async function messagesFor(supabase, journeyIds) {
  const byJourney = {};
  if (!journeyIds.length) return { byJourney, ready: true };
  const { data, error } = await supabase
    .from('journey_messages')
    .select('journey_id, email_number, sent_at, delivered_at, bounced_at, bounce_type')
    .in('journey_id', journeyIds);
  if (error) return { byJourney, ready: !isMissingSchema(error) };
  for (const row of data || []) (byJourney[row.journey_id] ||= []).push(row);
  return { byJourney, ready: true };
}

// What is actually on a listing, for the shared sequence's C4 sentence
// (utils/emailTemplates.js → listingDetail). Stored relationships only:
//   channel                 its videos rows, split by host into videos and
//                           podcast episodes (every row is YouTube today)
//   organisation, school    hub_teachers rows with it as the hub
//   publisher               books by the authors linked to it, the same
//                           books its own page lists (publisher_healers →
//                           books.healer_slug / co_healer_slugs; books carry
//                           no publisher of their own)
// An app needs nothing: it always has its own sentence. A failed read counts
// as nothing there, so the email falls back to the general sentence rather
// than claim something it could not check.
const EPISODE_HOSTS = /(^|\.)(open\.spotify\.com|podcasts\.apple\.com|podbean\.com|buzzsprout\.com|anchor\.fm|soundcloud\.com|libsyn\.com|simplecast\.com|transistor\.fm|captivate\.fm|megaphone\.fm)$/i;

export function isEpisodeUrl(url) {
  try {
    return EPISODE_HOSTS.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export async function listingFacts(supabase, { entityType, healerId, healerSlug, publisherId }) {
  const facts = { videos: 0, episodes: 0, teachers: 0, books: 0 };
  if (entityType === 'channel' && healerSlug) {
    const { data } = await supabase.from('videos').select('platform_url').eq('healer_slug', healerSlug);
    for (const row of data || []) {
      if (isEpisodeUrl(row.platform_url)) facts.episodes += 1;
      else facts.videos += 1;
    }
  }
  if ((entityType === 'organisation' || entityType === 'school') && healerId) {
    const { count } = await supabase
      .from('hub_teachers')
      .select('id', { count: 'exact', head: true })
      .eq('hub_id', healerId);
    facts.teachers = count || 0;
  }
  if (publisherId) {
    const { data: links } = await supabase
      .from('publisher_healers')
      .select('healers (healer_slug, entity_type)')
      .eq('publisher_id', publisherId);
    const authors = (links || []).map((row) => row.healers).filter((h) => h && !isPlatform(h));
    const filter = booksByAuthorsFilter(authors.map((a) => a.healer_slug).filter(Boolean));
    if (filter) {
      const { count } = await supabase.from('books').select('id', { count: 'exact', head: true }).or(filter);
      facts.books = count || 0;
    }
  }
  return facts;
}

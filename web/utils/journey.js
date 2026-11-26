// Shared by the admin routes and the daily cron, so "has this been claimed?"
// and "what is due next?" cannot drift between them.

import { JOURNEY_EMAILS, JOURNEY_SCHEDULE } from './email.js';
import { outreachFirstName } from './emailTemplates.js';
import { booksByAuthorsFilter } from './bookAuthors.js';
import { isPlatform } from './listings.js';
import { RECIPIENT_TYPES } from './recipientTypes.js';
import { DO_NOT_CONTACT_NOTE, isDoNotContactEmail } from './neverAgain.js';

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

// A CLAIM STOPS THE JOURNEY (owner, 18 Nov 2026): called wherever an account
// is linked to a listing (an instant claim, a claim request or an application
// approved), so a claimed listing gets no further email even if the daily
// job hasn't run yet. Migration 0053's trigger on user_profiles does the same
// in the database (0054 widens it as below).
//
// CLAIMED WINS (owner, 20 Nov 2026): whatever state the journey was in
// (running, paused, replied, contacted via form, sequence complete,
// stopped), it becomes stopped, "claimed". replied_at is left alone, so a
// reply before the claim still shows. The never-again reasons
// (DO_NOT_CONTACT) keep their stop reason, so the block outlives a revoked
// claim; journeyState shows those as Claimed all the same.
// → how many journeys were marked.
export function marksClaimed(journey) {
  return journey.stop_reason !== 'claimed' && !DO_NOT_CONTACT[journey.stop_reason];
}

export async function stopJourneyOnClaim(supabase, target) {
  const { slug, publisherId } = journeyTarget(target);
  if (!slug && !publisherId) return 0;
  const { data: journeys, error: readError } = await supabase
    .from('healer_journeys')
    .select('id, status, stop_reason')
    .eq(publisherId ? 'publisher_id' : 'healer_slug', publisherId || slug);
  if (readError) {
    console.error('[journey] reading a claimed listing\'s journeys failed:', readError.message);
    return 0;
  }
  const ids = (journeys || []).filter(marksClaimed).map((j) => j.id);
  if (!ids.length) return 0;
  const { data, error } = await supabase
    .from('healer_journeys')
    .update({ status: 'stopped', stop_reason: 'claimed' })
    .in('id', ids)
    .select('id');
  if (error) console.error('[journey] stopping a claimed journey failed:', error.message);
  return data?.length || 0;
}

// A healer slug, or { slug } / { publisherId } → { slug, publisherId }.
export function journeyTarget(target) {
  if (typeof target === 'string') return { slug: target, publisherId: null };
  return { slug: target?.slug || null, publisherId: target?.publisherId || null };
}

// Stop reasons that mean "never write to this listing again": they asked us to
// stop, asked for the listing to be removed, their address bounced or
// complained, or the owner marked the address do not contact (0055). A
// journey that ended this way blocks any new one.
export const DO_NOT_CONTACT = {
  asked_to_stop: 'They asked us to stop emailing.',
  removal_requested: 'They asked for the listing to be removed.',
  suppressed: 'Their address bounced or marked an email as spam.',
  do_not_contact_email: DO_NOT_CONTACT_NOTE,
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
//
// First, the owner's do-not-contact list (0055), which holds whether or not
// any listing still shows the address. A failed lookup refuses too.
export async function doNotContactByAddress(supabase, email) {
  const listed = await isDoNotContactEmail(email, supabase);
  if (listed) return DO_NOT_CONTACT_NOTE;
  if (listed === null) return 'Could not check the do-not-contact list. Try again in a minute.';
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
// sharedOutreachEmail), installed 11 Nov 2026, switched on 17 Nov 2026.
//
// THE SWITCH, AND THE ONLY ONE. The owner turns the shared journeys on when
// the app is in both stores. To do it, add the kinds to this list, e.g.
//   export const OUTREACH_KINDS_APPROVED = ['individual', 'channel', 'app', 'organisation', 'school', 'publisher'];
// and deploy. Start buttons, the start route and the daily job all read it;
// journeys the daily job paused as kind_not_approved are resumed by hand.
//
// SWITCHED ON for every kind (owner, 17 Nov 2026). Nothing starts by itself:
// the owner presses Start on each listing.
export const OUTREACH_KINDS = ['individual', 'channel', 'app', 'organisation', 'school', 'publisher'];
export const OUTREACH_KINDS_APPROVED = ['individual', 'channel', 'app', 'organisation', 'school', 'publisher'];

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

// WHOSE INBOX IT IS (migration 0048): utils/recipientTypes.js.
export { RECIPIENT_TYPES };

// The shared journey goes only to published business or organisation inboxes
// (docs/email-copy-2026-11-11-shared-journey.md); a named person's address
// published by the business counts, pending the solicitor's answer on named
// business inboxes.
const SHARED_RECIPIENT_TYPES = ['business', 'organisation', 'personal_business'];

// May this address be written to, before any send? Pure, so the rules are
// tested. → { problems, warnings }: any problem refuses the start.
//
// ONLY THREE THINGS BLOCK (owner, 11 Nov 2026): no email at all, an address
// that asked to stop, or one that bounced. The last two are do-not-contact
// (doNotContactReason, doNotContactByAddress); here it is only "no email".
// Everything else about the address is a warning shown before Start:
//   - no record of the page the address is published on (README §18.4 still
//     asks new listings to record it; older ones are not backfilled)
//   - the recipient type: for the shared journey (every kind but a person)
//     the doc's business or organisation inboxes; for anyone, missing or
//     "unknown"
// recipientType undefined means migration 0048 has not run: then the type
// is not asked for, and the warning says so.
export function outreachEligibility({ entityType, email, source, recipientType }) {
  const problems = [];
  const warnings = [];
  if (!email) problems.push('No contact email.');
  if (email && !source) {
    warnings.push('No record of the page this email is published on (Profile → Where the email is published).');
  }
  const person = outreachKind(entityType) === 'individual';
  if (recipientType === undefined) {
    warnings.push("The recipient type isn't recorded yet (migration 0048 has not been run).");
  } else if (!recipientType || recipientType === 'unknown') {
    warnings.push(
      person
        ? 'The recipient type is not set for this address.'
        : 'The recipient type is not set: the shared journey is meant for business or organisation inboxes.'
    );
  } else if (!person && !SHARED_RECIPIENT_TYPES.includes(recipientType)) {
    warnings.push("This is a private individual's address; the shared journey is meant for business or organisation inboxes.");
  }
  return { problems, warnings };
}

// Why Start can't be pressed, first reason first, or null. The order a
// person reads it in: switched off, then claimed, do not contact, already
// running, then the address itself. The start route checks the same again.
export function startBlocker({ kindRefusal, claimed, doNotContact, running, eligibility }) {
  if (kindRefusal) return kindRefusal;
  if (claimed) return 'This listing has been claimed.';
  if (doNotContact) return `Not to be emailed again. ${doNotContact}`;
  if (running) return `A journey is already ${running}.`;
  if (eligibility?.problems?.length) return eligibility.problems.join(' ');
  return null;
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
  replaced: 'Replaced by a newer journey',
  stopped: 'Stopped',
};

// Claimed comes first (owner, 20 Nov 2026): a listing that replied, or was
// contacted through its form, and then claimed counts as Claimed, so the
// Outreach filter matches Admin → Claims and People. The replied date still
// shows on the row.
//
// Replaced outranks even Claimed (owner, 26 Nov 2026; 0057): an older journey
// to a listing that was started again (Nigel Gee: his old address, then his
// new one) is history, so a claimed listing counts once, on its newest one.
export function journeyState(journey, { claimed = false } = {}) {
  if (journey.stop_reason === 'replaced') return 'replaced';
  if (claimed || journey.stop_reason === 'claimed') return 'claimed';
  if (journey.channel === 'form') return 'form';
  if (journey.replied_at) return 'replied';
  if (journey.status === 'running') return 'running';
  if (journey.status === 'paused') return 'paused';
  if (journey.stop_reason === 'sequence_complete') return 'complete';
  if (DO_NOT_CONTACT[journey.stop_reason]) return 'do_not_contact';
  return 'stopped';
}

// PARTNERSHIPS: NO COLD EMAIL (owner, 18 Nov 2026). Listings the owner
// contacts personally. They are never in Up next, and Start refuses them
// (start route, and the listing's Outreach tab shows why). By healer slug.
export const PARTNERSHIP_NOTE = 'Partnership — no cold email. The owner contacts them personally.';
export const NO_COLD_EMAIL = new Set(['the-shift-network', 'insight-timer']);

export function partnershipNote(slug) {
  return NO_COLD_EMAIL.has(slug) ? PARTNERSHIP_NOTE : null;
}

// UP NEXT (owner, 18 Nov 2026): the daily outreach list on Admin → Outreach.
// The owner starts up to DAILY_STARTS journeys a day, by hand, one Start
// button each; nothing here sends.
export const DAILY_STARTS = 50;

// Organisations and schools first, then practitioners, then the rest. Within
// a kind, by tier, then by name.
const UP_NEXT_KINDS = ['organisation', 'school', 'individual', 'channel', 'app', 'publisher'];
const UP_NEXT_TIERS = ['superhero', 'ascended_master', 'luminary', 'local_hero'];
const rank = (list, value) => {
  const i = list.indexOf(value);
  return i === -1 ? list.length : i;
};
const address = (email) => (email || '').trim().toLowerCase();

// Listings with an email that have never been contacted, in order. Pure.
//   listings  { key, kind, name, email, tier, deceased, claimed }
//   journeys  every journey ever, of any channel or state: { key }, where key
//             is the listing's (healer slug, or "publisher:<id>")
// Left out, and counted in `left`:
//   contacted     any journey at all, a form contact included
//   claimed       they have joined
//   deceased      a person who has died: email 1 asks them for an interview
//   sameAddress   the address was already written to through another listing
//                 (one inbox can sit behind a school and its founder)
//   switchedOff   a kind not in OUTREACH_KINDS_APPROVED
//   partnership   NO_COLD_EMAIL: named in `partnerships` instead
//   doNotContact  the address is on the owner's do-not-contact list (0055):
//                 `blocked`, a Set of lower-case addresses
// Two uncontacted listings with one address: the first in order stays, and
// the others are named on it (alsoAt), so the inbox gets one journey.
export function upNext({ listings, journeys, blocked = new Set() }) {
  const contacted = new Set(journeys.map((j) => j.key));
  const written = new Set(listings.filter((l) => contacted.has(l.key)).map((l) => address(l.email)));
  const left = { contacted: 0, claimed: 0, deceased: 0, sameAddress: 0, switchedOff: 0, partnership: 0, doNotContact: 0 };
  const candidates = [];
  const partnerships = [];
  for (const l of listings) {
    if (!address(l.email)) continue;
    if (blocked.has(address(l.email))) left.doNotContact += 1;
    else if (NO_COLD_EMAIL.has(l.key)) {
      left.partnership += 1;
      partnerships.push(l.name);
    } else if (contacted.has(l.key)) left.contacted += 1;
    else if (l.claimed) left.claimed += 1;
    else if (l.deceased && l.kind === 'individual') left.deceased += 1;
    else if (written.has(address(l.email))) left.sameAddress += 1;
    else if (!outreachAllowedFor(l.kind)) left.switchedOff += 1;
    else candidates.push(l);
  }
  candidates.sort(
    (a, b) =>
      rank(UP_NEXT_KINDS, a.kind) - rank(UP_NEXT_KINDS, b.kind) ||
      rank(UP_NEXT_TIERS, a.tier) - rank(UP_NEXT_TIERS, b.tier) ||
      (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' })
  );
  const byAddress = new Map();
  const list = [];
  for (const l of candidates) {
    const first = byAddress.get(address(l.email));
    if (first) {
      first.alsoAt.push(l.name);
      left.sameAddress += 1;
    } else {
      const row = { ...l, alsoAt: [] };
      byAddress.set(address(l.email), row);
      list.push(row);
    }
  }
  return { list, left, partnerships };
}

// The owner's day, for "started today": Portugal and the UK share a clock.
export function outreachDay(value) {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
}

// Email journeys started on the same day as `now`. Form contacts are not
// emails and don't count; a journey stopped since (a bounce) still does.
export function startedToday(journeys, now = new Date()) {
  const todayIs = outreachDay(now);
  return journeys.filter(
    (j) => (j.channel || 'email') === 'email' && j.started_at && outreachDay(j.started_at) === todayIs
  ).length;
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
      sentTo: message?.sent_to || null,
    };
  });
}

// The address a journey went to (0057): its own record, else that of its
// newest email that has one. Null for a journey from before 0057 that
// Resend couldn't fill in; the admin then says it shows the listing's email
// today.
export function sentToOf(journey, messages = []) {
  if (journey?.sent_to) return journey.sent_to;
  const newest = [...messages].filter((m) => m.sent_to).sort((a, b) => b.email_number - a.email_number)[0];
  return newest?.sent_to || null;
}

// Record that Resend accepted email n, so its webhook can find it. Never
// fails the send: before migration 0044 the table is missing and the email
// has still gone.
//
// With `sentTo`, the address it went to, on the email and on the journey
// (0057). Before 0057 those columns are missing: the email is recorded
// without it, as before.
export async function recordMessage(supabase, { resendId, journeyId, emailNumber, sentTo = null }) {
  if (!resendId) return;
  const row = { resend_id: resendId, journey_id: journeyId, email_number: emailNumber };
  let { error } = await supabase
    .from('journey_messages')
    .upsert(sentTo ? { ...row, sent_to: sentTo } : row, { onConflict: 'resend_id' });
  if (error && sentTo && isMissingSchema(error)) {
    ({ error } = await supabase.from('journey_messages').upsert(row, { onConflict: 'resend_id' }));
  }
  if (error && !isMissingSchema(error)) console.error('[journey] message not recorded:', error);
  if (sentTo) {
    const { error: journeyError } = await supabase.from('healer_journeys').update({ sent_to: sentTo }).eq('id', journeyId);
    if (journeyError && !isMissingSchema(journeyError)) console.error('[journey] sent_to not recorded:', journeyError);
  }
}

// Before Start begins a new journey (owner, 26 Nov 2026): a running or
// paused one to the same listing stops as "Replaced by a newer journey".
// → how many.
export async function replaceLiveJourneys(supabase, target) {
  const { slug, publisherId } = journeyTarget(target);
  if (!slug && !publisherId) return 0;
  let query = supabase
    .from('healer_journeys')
    .update({ status: 'stopped', stop_reason: 'replaced' })
    .in('status', ['running', 'paused']);
  query = publisherId ? query.eq('publisher_id', publisherId) : query.eq('healer_slug', slug).is('publisher_id', null);
  const { data, error } = await query.select('id');
  if (error) throw new Error(`Could not stop the journey already running: ${error.message}`);
  return data?.length || 0;
}

// journey_messages for these journeys, grouped by journey id. `ready` is false
// before migration 0044 (no table yet), so the admin can say "not tracked yet"
// rather than imply nothing was delivered.
export async function messagesFor(supabase, journeyIds) {
  const byJourney = {};
  if (!journeyIds.length) return { byJourney, ready: true };
  const { data, error } = await supabase
    .from('journey_messages')
    .select('journey_id, email_number, sent_at, delivered_at, bounced_at, bounce_type, sent_to')
    .in('journey_id', journeyIds);
  if (error && isMissingSchema(error)) return messagesBefore0057(supabase, journeyIds);
  if (error) return { byJourney, ready: true };
  for (const row of data || []) (byJourney[row.journey_id] ||= []).push(row);
  return { byJourney, ready: true };
}

// The same without sent_to, on a database without 0057.
async function messagesBefore0057(supabase, journeyIds) {
  const byJourney = {};
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

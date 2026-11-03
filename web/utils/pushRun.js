// SERVER ONLY (it is handed the service-role client).
//
// The push package's moving parts (the rules themselves are pure, in
// utils/pushRules.js):
//   runPushHour       the hourly run (/api/cron/push, called by Supabase
//                     pg_cron): first whatever was waiting for quiet hours to
//                     end, then, for everyone whose local time is 10:00 or
//                     19:00, the one discovery or the welcome the rules allow.
//   sendAccountUpdate an approval, from the admin routes: at once, or queued
//                     until 08:00 where they are.
//   composeAdminPush  Admin → Notifications: one message to everyone with
//                     Discoveries on, within the weekly limit and their hours.
//
// Every send is recorded in push_sends (migration 0032) with references to
// what it pointed at, never its words, so the limit and repeat rules can be
// kept. A send that reached no device (none registered, or the switch is off)
// records nothing.

import { sendToUser } from './push.js';
import { loadCatalogue, topLearnedSubjects } from './discoveryData.js';
import {
  NEW_WINDOW_DAYS,
  DISCOVERY_HOUR,
  WELCOME_HOUR,
  discoveryBlocked,
  fillName,
  greetingName,
  localClock,
  nextAllowed,
  planForPerson,
  strongSubjects,
} from './pushRules.js';

const DAY = 24 * 60 * 60 * 1000;
const PAGE = 1000;
const HISTORY_DAYS = 120;

// Which switch each kind answers to. The welcome is a discovery for the
// weekly limit but sits under Account updates (owner, 3 Nov 2026).
const ACCOUNT_KINDS = new Set(['first_visit', 'review_approved', 'listing_approved', 'claim_approved']);
export const switchFor = (kind) => (ACCOUNT_KINDS.has(kind) ? 'general' : 'discoveries');

async function everyRow(query) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return rows;
  }
}

// Who among `ids` has a phone registered, asked in batches (a long list
// would not fit in one request's URL).
async function withPhones(supabase, ids) {
  const out = new Set();
  for (let i = 0; i < ids.length; i += 200) {
    const rows = await everyRow(() => supabase.from('push_tokens').select('user_id').in('user_id', ids.slice(i, i + 200)));
    for (const r of rows) out.add(r.user_id);
  }
  return out;
}

// Send now and record it. → 'sent' | 'failed' | 'opted_out' | 'no_devices' | 'not_configured'
async function sendAndRecord(supabase, userId, { kind, category, notification, refs = [] }, options = {}) {
  const result = await sendToUser(supabase, userId, notification, { category: switchFor(kind), ...options });
  if (!result.configured) return 'not_configured';
  if (result.skipped) return result.skipped;
  if (!result.sent && !result.failed) return 'no_devices';
  const outcome = result.sent ? 'sent' : 'failed';
  await supabase.from('push_sends').insert({
    user_id: userId,
    kind,
    category,
    refs,
    status: outcome,
    sent_at: outcome === 'sent' ? new Date().toISOString() : null,
  });
  return outcome;
}

async function hasDevices(supabase, userId) {
  const { count } = await supabase.from('push_tokens').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  return Boolean(count);
}

async function wants(supabase, userId, column) {
  const { data } = await supabase
    .from('notification_preferences')
    .select('general, discoveries')
    .eq('user_id', userId)
    .maybeSingle();
  return data ? Boolean(data[column]) : column === 'general';
}

async function offsetOf(supabase, userId) {
  const { data } = await supabase.from('push_state').select('utc_offset_minutes').eq('user_id', userId).maybeSingle();
  return data?.utc_offset_minutes ?? null;
}

// Send at once, or queue until quiet hours end where they are.
async function sendOrQueue(supabase, userId, message, { now = new Date(), ...options } = {}) {
  const when = nextAllowed(now, await offsetOf(supabase, userId));
  if (when.getTime() <= now.getTime()) return sendAndRecord(supabase, userId, message, options);
  if (!(await hasDevices(supabase, userId))) return 'no_devices';
  if (!(await wants(supabase, userId, switchFor(message.kind)))) return 'opted_out';
  const { error } = await supabase.from('push_sends').insert({
    user_id: userId,
    kind: message.kind,
    category: message.category,
    refs: message.refs || [],
    status: 'queued',
    payload: message.notification,
    send_after: when.toISOString(),
  });
  return error ? 'failed' : 'queued';
}

/**
 * An account update (review, listing or claim approved). Positive news only;
 * declines are email only and never come here. Never throws: the decision it
 * follows must stand whatever happens to the notification.
 * @param kind 'review_approved' | 'listing_approved' | 'claim_approved'
 */
export async function sendAccountUpdate(supabase, userId, kind, notification, refs = [], options = {}) {
  try {
    if (!userId) return 'no_account';
    return await sendOrQueue(supabase, userId, { kind, category: 'account', notification, refs }, options);
  } catch (err) {
    console.error('[push] account update failed:', err?.message || err);
    return 'failed';
  }
}

// What was waiting for its hour, sent now (the switch is checked again: they
// may have turned it off since).
async function sendQueued(supabase, now, options) {
  const { data: due } = await supabase
    .from('push_sends')
    .select('id, user_id, kind, payload')
    .eq('status', 'queued')
    .lte('send_after', now.toISOString())
    .order('send_after')
    .limit(500);
  const counts = { sent: 0, failed: 0, skipped: 0 };
  for (const row of due || []) {
    let result;
    try {
      result = await sendToUser(supabase, row.user_id, row.payload || {}, { category: switchFor(row.kind), ...options });
    } catch {
      result = { configured: true, sent: 0, failed: 1 };
    }
    if (!result.configured) break;
    const status = result.sent ? 'sent' : result.failed ? 'failed' : 'skipped';
    counts[status] += 1;
    await supabase
      .from('push_sends')
      .update({ status, sent_at: status === 'sent' ? new Date().toISOString() : null, payload: null })
      .eq('id', row.id);
  }
  return counts;
}

// Everything added in the last NEW_WINDOW_DAYS that belongs to a listing, as
// pickNewFromSaved wants it: books count for every author.
async function loadNewItems(supabase, now) {
  const since = new Date(now.getTime() - NEW_WINDOW_DAYS * DAY).toISOString();
  const today = now.toISOString().slice(0, 10);
  const [videos, books, courses, free] = await Promise.all([
    everyRow(() => supabase.from('videos').select('slug, title, healer_slug, subject_slugs, created_at').gte('created_at', since)),
    everyRow(() =>
      supabase.from('books').select('slug, title, healer_slug, co_healer_slugs, subject_slugs, created_at').gte('created_at', since)
    ),
    everyRow(() =>
      supabase
        .from('courses')
        .select('slug, title, healer_id, subject_slugs, created_at, is_active, end_date')
        .gte('created_at', since)
    ),
    everyRow(() =>
      supabase
        .from('free_resources')
        .select('slug, title, healer_id, subject_slugs, created_at, is_active, end_date')
        .gte('created_at', since)
    ),
  ]);
  const ids = [...new Set([...courses, ...free].map((r) => r.healer_id).filter(Boolean))];
  const slugById = new Map();
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await supabase.from('healers').select('id, healer_slug').in('id', ids.slice(i, i + 300));
    for (const h of data || []) slugById.set(h.id, h.healer_slug);
  }
  const current = (r) => r.slug && r.is_active !== false && (!r.end_date || r.end_date >= today);
  return [
    ...videos.filter((v) => v.slug && v.healer_slug).map((v) => ({ type: 'video', ref: v.slug, title: v.title, healerSlugs: [v.healer_slug], subject_slugs: v.subject_slugs, created_at: v.created_at })),
    ...books
      .filter((b) => b.slug)
      .map((b) => ({ type: 'book', ref: b.slug, title: b.title, healerSlugs: [b.healer_slug, ...(b.co_healer_slugs || [])].filter(Boolean), subject_slugs: b.subject_slugs, created_at: b.created_at })),
    ...courses.filter(current).map((c) => ({ type: 'course', ref: c.slug, title: c.title, healerSlugs: [slugById.get(c.healer_id)].filter(Boolean), subject_slugs: c.subject_slugs, created_at: c.created_at })),
    ...free.filter(current).map((f) => ({ type: 'free_resource', ref: f.slug, title: f.title, healerSlugs: [slugById.get(f.healer_id)].filter(Boolean), subject_slugs: f.subject_slugs, created_at: f.created_at })),
  ];
}

// One person's own inputs to planForPerson.
async function loadPushPerson(supabase, userId, now) {
  const since = new Date(now.getTime() - HISTORY_DAYS * DAY).toISOString();
  const [{ data: prefs }, { data: profile }, { data: interests }, { data: uprefs }, favourites, { data: sends }, { data: editions }, { data: day4 }] =
    await Promise.all([
      supabase.from('notification_preferences').select('general, discoveries').eq('user_id', userId).maybeSingle(),
      supabase.from('user_profiles').select('full_name').eq('id', userId).maybeSingle(),
      supabase.from('user_interests').select('subjects, hidden_subjects').eq('user_id', userId).maybeSingle(),
      supabase.from('user_preferences').select('learning_enabled').eq('user_id', userId).maybeSingle(),
      everyRow(() => supabase.from('user_favourites').select('content_type, content_slug, created_at').eq('user_id', userId)),
      supabase
        .from('push_sends')
        .select('kind, category, refs, status, sent_at, created_at')
        .eq('user_id', userId)
        .gte('created_at', since)
        .order('created_at', { ascending: false }),
      supabase.from('discovery_editions').select('picks, sent_at').eq('user_id', userId).eq('status', 'sent'),
      supabase.from('email_sends').select('sent_at').eq('kind', 'explorer_day4').eq('ref', userId).maybeSingle(),
    ]);
  let learning = [];
  if (uprefs?.learning_enabled) {
    const { data: affinity } = await supabase.from('subject_affinity').select('subject_slug, score, updated_at').eq('user_id', userId);
    learning = topLearnedSubjects(affinity);
  }
  const emailTimes = [...(editions || []).map((e) => e.sent_at), day4?.sent_at].filter(Boolean).sort();
  return {
    prefs: { general: prefs ? Boolean(prefs.general) : true, discoveries: Boolean(prefs?.discoveries) },
    name: greetingName(profile?.full_name),
    moreOf: interests?.subjects || [],
    hidden: interests?.hidden_subjects || [],
    learning,
    favourites,
    sends: sends || [],
    editionPicks: (editions || []).flatMap((e) => e.picks || []),
    lastDiscoveryEmailAt: emailTimes.at(-1) || null,
  };
}

/**
 * The hourly run. `dry`: decide and count, send nothing, record nothing.
 * → { queue, considered, sent: { kind: n }, skipped: { reason: n } }
 */
export async function runPushHour(supabase, { now = new Date(), dry = false, ...options } = {}) {
  const summary = { queue: null, considered: 0, sent: {}, skipped: {} };
  const bump = (bucket, key) => (summary[bucket][key] = (summary[bucket][key] || 0) + 1);
  if (!dry) summary.queue = await sendQueued(supabase, now, options);

  // Only people whose clock says 10:00 or 19:00 now, and who have a phone.
  const states = await everyRow(() =>
    supabase.from('push_state').select('user_id, utc_offset_minutes, last_opened_at, first_visit_at').not('utc_offset_minutes', 'is', null)
  );
  const due = states.filter((s) => [DISCOVERY_HOUR, WELCOME_HOUR].includes(localClock(now, s.utc_offset_minutes).hour));
  if (!due.length) return summary;
  const withPhone = await withPhones(supabase, due.map((s) => s.user_id));
  const people = due.filter((s) => withPhone.has(s.user_id));
  if (!people.length) return summary;

  const { catalogue, saveCounts, broken } = await loadCatalogue(supabase);
  const newItems = await loadNewItems(supabase, now);
  const healerNames = new Map(catalogue.healers.map((h) => [h.healer_slug, h.name]));

  for (const state of people) {
    summary.considered += 1;
    try {
      const p = await loadPushPerson(supabase, state.user_id, now);
      const plan = planForPerson({
        now,
        userId: state.user_id,
        name: p.name,
        prefs: p.prefs,
        state,
        sends: p.sends,
        lastDiscoveryEmailAt: p.lastDiscoveryEmailAt,
        editionPicks: p.editionPicks,
        subjects: strongSubjects({ moreOf: p.moreOf, learning: p.learning, hidden: p.hidden }),
        subjectNames: catalogue.subjects,
        hidden: p.hidden,
        saved: new Set(p.favourites.map((f) => `${f.content_type}:${f.content_slug}`)),
        catalogue,
        broken,
        saveCounts,
        savedListings: p.favourites
          .filter((f) => f.content_type === 'healer' && healerNames.has(f.content_slug))
          .map((f) => ({ slug: f.content_slug, name: healerNames.get(f.content_slug), savedAt: f.created_at })),
        newItems,
      });
      if (plan.skip) {
        bump('skipped', plan.skip);
        continue;
      }
      if (dry) {
        bump('sent', plan.kind);
        continue;
      }
      const outcome = await sendAndRecord(supabase, state.user_id, plan, options);
      outcome === 'sent' ? bump('sent', plan.kind) : bump('skipped', outcome);
    } catch (err) {
      console.error('[push] run failed for one person:', err?.message || err);
      bump('skipped', 'error');
    }
  }
  return summary;
}

/**
 * Admin → Notifications. A test goes at once to one account and is not
 * recorded. A real message goes to everyone with Discoveries on and a phone,
 * skipping anyone who had a discovery in the last week; for anyone in quiet
 * hours it waits until 08:00 where they are. It counts toward the limit.
 * @param message { title, body, bodyNoName, route }
 * @param options { testUserId?, dry? }
 */
export async function composeAdminPush(supabase, message, { testUserId = null, dry = false, now = new Date(), ...options } = {}) {
  const build = (name) => ({
    title: message.title ? fillName(message.title, message.title.replaceAll(/,?\s*\{name\}/g, ''), name) : undefined,
    body: fillName(message.body, message.bodyNoName, name),
    data: message.route ? { route: message.route } : {},
  });
  const nameOf = async (userId) => {
    const { data } = await supabase.from('user_profiles').select('full_name').eq('id', userId).maybeSingle();
    return greetingName(data?.full_name);
  };

  if (testUserId) {
    const result = await sendToUser(supabase, testUserId, build(await nameOf(testUserId)), { category: 'general', ...options });
    return { test: true, ...result };
  }

  const prefs = await everyRow(() => supabase.from('notification_preferences').select('user_id').eq('discoveries', true));
  const audience = [...(await withPhones(supabase, prefs.map((r) => r.user_id)))];
  const out = { audience: audience.length, sent: 0, queued: 0, skipped_limit: 0, failed: 0 };
  const since = new Date(now.getTime() - 8 * DAY).toISOString();
  for (const userId of audience) {
    const { data: sends } = await supabase
      .from('push_sends')
      .select('kind, category, status, sent_at, created_at')
      .eq('user_id', userId)
      .gte('created_at', since);
    if (discoveryBlocked(sends || [], now)) {
      out.skipped_limit += 1;
      continue;
    }
    if (dry) {
      out.sent += 1;
      continue;
    }
    const outcome = await sendOrQueue(
      supabase,
      userId,
      { kind: 'admin', category: 'discovery', notification: build(await nameOf(userId)), refs: [] },
      { now, ...options }
    );
    if (outcome === 'sent') out.sent += 1;
    else if (outcome === 'queued') out.queued += 1;
    else out.failed += 1;
  }
  return out;
}

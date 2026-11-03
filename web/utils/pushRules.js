// The push notification package (app 1.0.1): every rule, as pure functions.
// Everything they need is passed in — the server loads it (utils/pushRun.js)
// — so each rule is tested without a database or a phone (pushRules.test.mjs).
//
// INVITATIONS ONLY, NEVER REMINDERS OF THINGS UNDONE. Nothing here says "you
// haven't…", counts streaks, or nudges about something left unfinished.
//
// THE TWO SWITCHES (notification_preferences, migration 0032)
//   Discoveries (off until turned on): new from someone they saved; a free
//   resource for what they love; the two invitations back. At most ONE
//   discovery a week, counting the welcome and admin messages too, and none
//   within 48 hours of a discovery email, never repeating its picks.
//   Account updates (`general`, on by default): their review, listing or claim
//   approved — not limited — and the once-only welcome, which does count
//   toward the weekly limit (owner, 3 Nov 2026). Declines are email only.
//
// TIME. Each phone tells the server its offset from UTC whenever it opens
// (push_state). Discoveries go at DISCOVERY_HOUR local time, the welcome at
// WELCOME_HOUR; account updates go at once unless it is quiet hours where they
// are, and then at QUIET_END. A person whose offset is unknown gets no
// discovery and no welcome (there is no evening to aim for).
//
// WHAT IS NEVER USED: Never show subjects (anywhere); learned subjects
// without consent (the caller passes none); search words of any kind, so a
// search the crisis intercept caught, or a distressing one, can never be
// named; TENDER_SUBJECTS from learning; anything they've saved; titles that
// read as a health claim; anything recommended in the last RECENT_DAYS, or in
// a discovery email.

import { readsAsHealthClaim, youtubeId } from './discoverySelect.js';

export const LIMIT_DAYS = 7;
export const EMAIL_HOLD_HOURS = 48;
export const QUIET_START = 21;
export const QUIET_END = 8;
export const DISCOVERY_HOUR = 10;
export const WELCOME_HOUR = 19;
export const WELCOME_WINDOW_DAYS = 3;
export const RETURN_FIRST_DAYS = 10;
export const RETURN_SECOND_DAYS = 14;
export const RECENT_DAYS = 90;
export const NEW_WINDOW_DAYS = 14;

// Subjects a push never names or recommends from what was LEARNED: what
// someone explores around death and loss may be grief. Chosen in More of,
// they are theirs to see.
export const TENDER_SUBJECTS = new Set(['death-the-afterlife', 'nde', 'mediumship-spirits']);

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/* ── Words ─────────────────────────────────────────────────────────────── */

// The owner's approved wording (3 Nov 2026). No title where none was given:
// the banner already says "Spiritpedia".
export const COPY = {
  newFromSaved: (teacher) => ({ body: `Something new on Spiritpedia from ${teacher}` }),
  freeResource: (subject) => ({
    body: `I’ve found a free ${subject} resource you may enjoy. Shall we explore?`,
  }),
  returnFirstNamed: (name) => ({ body: `How are you feeling today, ${name}?` }),
  returnFirst: (item, subject) => ({
    body: `I’ve picked out ${item} for you. A little ${subject} to explore at your own pace.`,
  }),
  returnSecond: (item, subject) => ({
    body: `Shall we discover something new? ${item} offers another way into ${subject}. I thought you might enjoy exploring it.`,
  }),
  firstVisit: (name) => ({
    body: name
      ? `It was lovely getting to know you, ${name}. I’m here whenever you need me.`
      : 'It was lovely getting to know you. I’m here whenever you need me.',
  }),
  reviewApproved: (item) => ({
    title: 'Your review is live.',
    body: `Your review of ${item} is now on Spiritpedia. Thank you for adding your voice.`,
  }),
  listingApproved: (listing) => ({
    title: 'Your listing is live.',
    body: `${listing} has been approved and is now on Spiritpedia.`,
  }),
  claimApproved: (listing) => ({
    title: 'Your listing is ready to manage.',
    body: `Your request to manage ${listing} has been approved.`,
  }),
};

// The name they gave (user_profiles.full_name), first word only, or null.
export function greetingName(fullName) {
  const first = String(fullName || '').trim().split(/\s+/)[0] || '';
  return first && first.length <= 40 ? first : null;
}

// An admin message: {name} filled in, or the no-name version when they gave
// none (or when the message has no {name} at all, the text as it is).
export function fillName(text, noNameText, name) {
  if (!String(text).includes('{name}')) return String(text);
  if (name) return String(text).replaceAll('{name}', name);
  return String(noNameText || '').trim() || String(text).replaceAll(/,?\s*\{name\}/g, '');
}

/* ── Time ──────────────────────────────────────────────────────────────── */

// Their clock: the hour (0–23) and the date ('YYYY-MM-DD') where they are.
export function localClock(now, offsetMinutes) {
  const local = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  return { hour: local.getUTCHours(), day: local.toISOString().slice(0, 10) };
}

export const isQuiet = (hour) => hour >= QUIET_START || hour < QUIET_END;

// When something may reach them: now, or QUIET_END where they are.
export function nextAllowed(now, offsetMinutes) {
  if (offsetMinutes == null) return now;
  const { hour } = localClock(now, offsetMinutes);
  if (!isQuiet(hour)) return now;
  const local = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  const morning = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), QUIET_END));
  if (hour >= QUIET_START) morning.setUTCDate(morning.getUTCDate() + 1);
  return new Date(morning.getTime() - offsetMinutes * 60 * 1000);
}

/* ── Limits ────────────────────────────────────────────────────────────── */

const at = (s) => Date.parse(s.sent_at || s.created_at);

// Why no discovery may go now, or null. `sends` are their push_sends;
// `lastDiscoveryEmailAt` is their latest discovery email (an edition or
// Day 4), or null.
export function discoveryBlocked(sends, now, lastDiscoveryEmailAt = null) {
  const since = now.getTime() - LIMIT_DAYS * DAY;
  const counted = (sends || []).some(
    (s) => s.category === 'discovery' && (s.status === 'sent' || s.status === 'queued') && at(s) > since
  );
  if (counted) return 'weekly_limit';
  if (lastDiscoveryEmailAt && now.getTime() - Date.parse(lastDiscoveryEmailAt) < EMAIL_HOLD_HOURS * HOUR) {
    return 'discovery_email';
  }
  return null;
}

// Where they are with the invitations back: null (not away), 'first' or
// 'second' (one is due), 'waiting' (sent one, not yet time for the next) or
// 'paused' (both sent: nothing more until they come back).
export function returnStage(state, sends, now) {
  const opened = state?.last_opened_at ? Date.parse(state.last_opened_at) : null;
  if (!opened) return null;
  const sinceOpen = (sends || []).filter((s) => s.status === 'sent' && at(s) > opened);
  const second = sinceOpen.find((s) => s.kind === 'return_second');
  if (second) return 'paused';
  const first = sinceOpen.find((s) => s.kind === 'return_first');
  if (first) return now.getTime() - at(first) >= RETURN_SECOND_DAYS * DAY ? 'second' : 'waiting';
  return now.getTime() - opened >= RETURN_FIRST_DAYS * DAY ? 'first' : null;
}

/* ── What to recommend ─────────────────────────────────────────────────── */

function seededRank(seed, key) {
  let h = 2166136261;
  const text = `${seed}:${key}`;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const ROUTES = {
  video: (slug) => `/videos/${slug}`,
  free_resource: (slug) => `/free-resources/${slug}`,
  book: (slug) => `/books/${slug}`,
  course: (slug) => `/offerings/${slug}`,
  healer: (slug) => `/healers/${slug}`,
};

// Their subjects, strongest first: More of, then learned (only passed with
// consent; tender ones dropped). Never show subjects never.
export function strongSubjects({ moreOf = [], learning = [], hidden = [] }) {
  const out = [];
  const no = new Set(hidden);
  for (const s of moreOf) if (!no.has(s) && !out.includes(s)) out.push(s);
  for (const s of learning || []) if (!no.has(s) && !TENDER_SUBJECTS.has(s) && !out.includes(s)) out.push(s);
  return out;
}

// Everything recently put in front of them: push refs within RECENT_DAYS and
// the picks of their discovery emails.
export function recentlyShown(sends, editionPicks, now) {
  const since = now.getTime() - RECENT_DAYS * DAY;
  const keys = new Set();
  for (const s of sends || []) {
    if (at(s) <= since) continue;
    for (const r of s.refs || []) keys.add(`${r.type}:${r.ref}`);
  }
  for (const p of editionPicks || []) keys.add(`${p.type}:${p.ref}`);
  return keys;
}

const live = (f, today) =>
  f.is_active !== false && f.slug && (!f.start_date || f.start_date <= today) && (!f.end_date || f.end_date >= today);

/**
 * The strongest recommendation for them, or null. Videos and free resources
 * in their strong subjects, subject order first, then the most saved, then a
 * shuffle fixed by the person and the day.
 * @param input { userId, subjects, subjectNames, hidden, saved: Set('type:slug'),
 *   shown: Set('type:slug'), catalogue: { videos, freeResources }, broken, today,
 *   types?: ['video','free_resource'], saveCounts }
 * @returns { type, ref, title, subject, subjectName, route } | null
 */
export function pickRecommendation(input) {
  const types = input.types || ['video', 'free_resource'];
  const hidden = new Set(input.hidden || []);
  const counts = input.saveCounts || {};
  const seed = `${input.userId}:${input.today}`;
  const ok = (type, ref, subjects, title) =>
    ref &&
    !input.saved.has(`${type}:${ref}`) &&
    !input.shown.has(`${type}:${ref}`) &&
    !(subjects || []).some((s) => hidden.has(s)) &&
    !input.broken?.[type]?.has(ref) &&
    !readsAsHealthClaim(title);
  for (const subject of input.subjects) {
    const name = input.subjectNames[subject];
    if (!name) continue;
    const found = [];
    if (types.includes('video')) {
      for (const v of input.catalogue.videos || []) {
        if ((v.subject_slugs || []).includes(subject) && youtubeId(v.platform_url) && ok('video', v.slug, v.subject_slugs, v.title)) {
          found.push({ type: 'video', ref: v.slug, title: v.title });
        }
      }
    }
    if (types.includes('free_resource')) {
      for (const f of input.catalogue.freeResources || []) {
        if ((f.subject_slugs || []).includes(subject) && live(f, input.today) && ok('free_resource', f.slug, f.subject_slugs, f.title)) {
          found.push({ type: 'free_resource', ref: f.slug, title: f.title });
        }
      }
    }
    if (!found.length) continue;
    found.sort(
      (a, b) =>
        (counts[b.type]?.[b.ref] || 0) - (counts[a.type]?.[a.ref] || 0) ||
        seededRank(seed, `${a.type}:${a.ref}`) - seededRank(seed, `${b.type}:${b.ref}`)
    );
    const best = found[0];
    return { ...best, subject, subjectName: name, route: ROUTES[best.type](best.ref) };
  }
  return null;
}

/**
 * New from someone they saved: the saved listing with the most new things
 * since they saved it (and within NEW_WINDOW_DAYS), grouped into one
 * notification. Nothing already notified, saved, Never show or read as a
 * health claim. → { healer, items: [{ type, ref, title }], route } | null
 * @param input { savedListings: [{ slug, name, savedAt }], newItems: [{ type,
 *   ref, title, healerSlugs: [], subject_slugs, created_at }], saved, shown,
 *   hidden, now }
 */
export function pickNewFromSaved(input) {
  const hidden = new Set(input.hidden || []);
  const windowStart = input.now.getTime() - NEW_WINDOW_DAYS * DAY;
  let best = null;
  for (const listing of input.savedListings || []) {
    const from = Math.max(windowStart, Date.parse(listing.savedAt) || 0);
    const items = (input.newItems || [])
      .filter((i) => i.healerSlugs.includes(listing.slug))
      .filter((i) => Date.parse(i.created_at) > from)
      .filter((i) => !input.saved.has(`${i.type}:${i.ref}`) && !input.shown.has(`${i.type}:${i.ref}`))
      .filter((i) => !(i.subject_slugs || []).some((s) => hidden.has(s)))
      .filter((i) => !readsAsHealthClaim(i.title))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    if (!items.length) continue;
    const newest = Date.parse(items[0].created_at);
    if (!best || items.length > best.items.length || (items.length === best.items.length && newest > best.newest)) {
      best = { healer: listing, items, newest };
    }
  }
  if (!best) return null;
  const only = best.items.length === 1 ? best.items[0] : null;
  return {
    healer: best.healer,
    items: best.items.map(({ type, ref, title }) => ({ type, ref, title })),
    route: only ? ROUTES[only.type](only.ref) : ROUTES.healer(best.healer.slug),
  };
}

/* ── One person, this hour ─────────────────────────────────────────────── */

/**
 * What (if anything) goes to one person in this hourly run. Pure.
 * @param p {
 *   now: Date, userId, name: string | null,
 *   prefs: { general, discoveries }, state: push_state row | null,
 *   sends: push_sends rows (newest first, last ~120 days),
 *   lastDiscoveryEmailAt, editionPicks,
 *   subjects: strong subjects, subjectNames, hidden, saved: Set,
 *   catalogue, broken, saveCounts, savedListings, newItems
 * }
 * @returns { kind, category, notification: { title?, body, data: { route? } }, refs } | { skip }
 */
export function planForPerson(p) {
  const offset = p.state?.utc_offset_minutes;
  if (offset == null) return { skip: 'no_time_zone' };
  const { hour, day } = localClock(p.now, offset);
  const blocked = discoveryBlocked(p.sends, p.now, p.lastDiscoveryEmailAt);

  // The once-only welcome: the evening after a first real visit.
  if (hour === WELCOME_HOUR) {
    const first = p.state?.first_visit_at;
    const done = (p.sends || []).some((s) => s.kind === 'first_visit' && (s.status === 'sent' || s.status === 'queued'));
    if (!first || done || !p.prefs.general) return { skip: 'no_welcome_due' };
    const firstDay = localClock(new Date(first), offset).day;
    const daysSince = (Date.parse(day) - Date.parse(firstDay)) / DAY;
    if (daysSince < 1 || daysSince > WELCOME_WINDOW_DAYS) return { skip: 'no_welcome_due' };
    if (blocked) return { skip: blocked };
    return { kind: 'first_visit', category: 'discovery', notification: { ...COPY.firstVisit(p.name), data: {} }, refs: [] };
  }

  if (hour !== DISCOVERY_HOUR) return { skip: 'not_their_hour' };
  if (!p.prefs.discoveries) return { skip: 'discoveries_off' };
  if (blocked) return { skip: blocked };

  const shown = recentlyShown(p.sends, p.editionPicks, p.now);
  const recommend = (types) =>
    pickRecommendation({
      userId: p.userId,
      subjects: p.subjects,
      subjectNames: p.subjectNames,
      hidden: p.hidden,
      saved: p.saved,
      shown,
      catalogue: p.catalogue,
      broken: p.broken,
      saveCounts: p.saveCounts,
      today: day,
      types,
    });
  const refOf = (r) => [{ type: r.type, ref: r.ref }];

  // Away: the invitations back come first, and only with a strong
  // recommendation; otherwise nothing at all.
  const stage = returnStage(p.state, p.sends, p.now);
  if (stage === 'paused' || stage === 'waiting') return { skip: `away_${stage}` };
  if (stage === 'first') {
    const r = recommend();
    if (!r) return { skip: 'away_nothing_strong' };
    if (p.name) {
      return {
        kind: 'return_first',
        category: 'discovery',
        notification: { ...COPY.returnFirstNamed(p.name), data: { route: '/feel' } },
        refs: refOf(r),
      };
    }
    return {
      kind: 'return_first',
      category: 'discovery',
      notification: { ...COPY.returnFirst(r.title, r.subjectName), data: { route: r.route } },
      refs: refOf(r),
    };
  }
  if (stage === 'second') {
    // A DIFFERENT recommendation: the first one's ref is in `shown` already.
    const r = recommend();
    if (!r) return { skip: 'away_nothing_strong' };
    return {
      kind: 'return_second',
      category: 'discovery',
      notification: { ...COPY.returnSecond(r.title, r.subjectName), data: { route: r.route } },
      refs: refOf(r),
    };
  }

  const fresh = pickNewFromSaved({
    savedListings: p.savedListings,
    newItems: p.newItems,
    saved: p.saved,
    shown,
    hidden: p.hidden,
    now: p.now,
  });
  if (fresh) {
    return {
      kind: 'new_from_saved',
      category: 'discovery',
      notification: { ...COPY.newFromSaved(fresh.healer.name), data: { route: fresh.route } },
      refs: fresh.items.map(({ type, ref }) => ({ type, ref })),
    };
  }

  const free = recommend(['free_resource']);
  if (free) {
    return {
      kind: 'free_resource',
      category: 'discovery',
      notification: { ...COPY.freeResource(free.subjectName), data: { route: free.route } },
      refs: refOf(free),
    };
  }
  return { skip: 'nothing_strong' };
}

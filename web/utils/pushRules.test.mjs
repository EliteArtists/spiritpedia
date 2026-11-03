import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COPY,
  discoveryBlocked,
  fillName,
  greetingName,
  localClock,
  nextAllowed,
  pickNewFromSaved,
  pickRecommendation,
  planForPerson,
  returnStage,
  strongSubjects,
} from './pushRules.js';

const DAY = 24 * 60 * 60 * 1000;
// 3 Nov 2026, 10:05 UTC: 10 o'clock in London (offset 0).
const now = new Date('2026-11-03T10:05:00Z');
const ago = (days) => new Date(now.getTime() - days * DAY).toISOString();
const sent = (kind, days, extra = {}) => ({
  kind,
  category: ['review_approved', 'listing_approved', 'claim_approved'].includes(kind) ? 'account' : 'discovery',
  status: 'sent',
  sent_at: ago(days),
  created_at: ago(days),
  refs: [],
  ...extra,
});

const catalogue = {
  videos: [
    { slug: 'breath-1', title: 'Morning Breath', subject_slugs: ['breathwork'], platform_url: 'https://youtube.com/watch?v=a1' },
    { slug: 'breath-2', title: 'Box Breathing', subject_slugs: ['breathwork'], platform_url: 'https://youtube.com/watch?v=a2' },
    { slug: 'heal-1', title: 'Heal Your Back Pain', subject_slugs: ['breathwork'], platform_url: 'https://youtube.com/watch?v=a3' },
    { slug: 'death-1', title: 'On Dying', subject_slugs: ['death-the-afterlife'], platform_url: 'https://youtube.com/watch?v=a4' },
  ],
  freeResources: [
    { slug: 'free-breath', title: 'Breath Guide', subject_slugs: ['breathwork'], is_active: true },
    { slug: 'old-retreat', title: 'Past Day', subject_slugs: ['breathwork'], is_active: true, end_date: '2026-10-01' },
  ],
};
const subjectNames = { breathwork: 'Breathwork', 'death-the-afterlife': 'Death & the Afterlife', reiki: 'Reiki' };

const person = (over = {}) => ({
  now,
  userId: 'u1',
  name: null,
  prefs: { general: true, discoveries: true },
  state: { utc_offset_minutes: 0, last_opened_at: ago(1), first_visit_at: null },
  sends: [],
  lastDiscoveryEmailAt: null,
  editionPicks: [],
  subjects: ['breathwork'],
  subjectNames,
  hidden: [],
  saved: new Set(),
  catalogue,
  broken: {},
  saveCounts: { video: { 'breath-2': 5 } },
  savedListings: [],
  newItems: [],
  ...over,
});

test('the approved words', () => {
  assert.equal(COPY.newFromSaved('Tara Brach').body, 'Something new on Spiritpedia from Tara Brach');
  assert.equal(COPY.freeResource('Breathwork').body, 'I’ve found a free Breathwork resource you may enjoy. Shall we explore?');
  assert.equal(COPY.returnFirstNamed('Ross').body, 'How are you feeling today, Ross?');
  assert.equal(COPY.firstVisit(null).body, 'It was lovely getting to know you. I’m here whenever you need me.');
  assert.deepEqual(COPY.reviewApproved('Reiki Basics'), {
    title: 'Your review is live.',
    body: 'Your review of Reiki Basics is now on Spiritpedia. Thank you for adding your voice.',
  });
  assert.equal(COPY.claimApproved('Sun Studio').title, 'Your listing is ready to manage.');
});

test('names: first word only; {name} filled, or the no-name version', () => {
  assert.equal(greetingName('  Ross Baiken '), 'Ross');
  assert.equal(greetingName(''), null);
  assert.equal(fillName('Happy Diwali, {name}', 'Happy Diwali', 'Ross'), 'Happy Diwali, Ross');
  assert.equal(fillName('Happy Diwali, {name}', 'Happy Diwali to you', null), 'Happy Diwali to you');
  assert.equal(fillName('Happy Diwali, {name}!', '', null), 'Happy Diwali!');
  assert.equal(fillName('No placeholder', '', null), 'No placeholder');
});

test('their clock, and quiet hours move a send to 8 in their morning', () => {
  assert.deepEqual(localClock(now, -300), { hour: 5, day: '2026-11-03' });
  assert.equal(nextAllowed(now, 0).toISOString(), now.toISOString());
  // 05:05 in New York: 08:00 there is 13:00 UTC.
  assert.equal(nextAllowed(now, -300).toISOString(), '2026-11-03T13:00:00.000Z');
  // 21:05 in Sydney (+11): 08:00 tomorrow there.
  assert.equal(nextAllowed(new Date('2026-11-03T10:05:00Z'), 660).toISOString(), '2026-11-03T21:00:00.000Z');
  assert.equal(nextAllowed(now, null).toISOString(), now.toISOString());
});

test('one discovery a week, admin messages and the welcome included; account updates not', () => {
  assert.equal(discoveryBlocked([sent('admin', 3)], now), 'weekly_limit');
  assert.equal(discoveryBlocked([sent('first_visit', 6.9)], now), 'weekly_limit');
  assert.equal(discoveryBlocked([sent('free_resource', 7.1)], now), null);
  assert.equal(discoveryBlocked([sent('review_approved', 1)], now), null);
  assert.equal(discoveryBlocked([], now, ago(1)), 'discovery_email');
  assert.equal(discoveryBlocked([], now, ago(2.1)), null);
});

test('invitations back: 10 days away, then 14 days after the first, then pause until they return', () => {
  const state = (days) => ({ last_opened_at: ago(days) });
  assert.equal(returnStage(state(9), [], now), null);
  assert.equal(returnStage(state(10), [], now), 'first');
  assert.equal(returnStage(state(20), [sent('return_first', 10)], now), 'waiting');
  assert.equal(returnStage(state(24), [sent('return_first', 14)], now), 'second');
  assert.equal(returnStage(state(40), [sent('return_second', 1), sent('return_first', 15)], now), 'paused');
  // Came back after the first: it starts again.
  assert.equal(returnStage(state(2), [sent('return_first', 14)], now), null);
});

test('strong subjects: More of, then learned without tender ones; never Never show', () => {
  assert.deepEqual(
    strongSubjects({ moreOf: ['reiki', 'yoga'], learning: ['nde', 'breathwork', 'yoga'], hidden: ['yoga'] }),
    ['reiki', 'breathwork']
  );
});

test('a recommendation: in their subjects, most saved first; never saved, shown, health claims or past dates', () => {
  const base = {
    userId: 'u1',
    subjects: ['breathwork'],
    subjectNames,
    hidden: [],
    saved: new Set(),
    shown: new Set(),
    catalogue,
    broken: {},
    saveCounts: { video: { 'breath-2': 5 } },
    today: '2026-11-03',
  };
  assert.equal(pickRecommendation(base).ref, 'breath-2');
  assert.equal(pickRecommendation({ ...base, saved: new Set(['video:breath-2']) }).ref !== 'breath-2', true);
  const freeOnly = pickRecommendation({ ...base, types: ['free_resource'] });
  assert.equal(freeOnly.ref, 'free-breath');
  assert.equal(freeOnly.route, '/free-resources/free-breath');
  const none = pickRecommendation({
    ...base,
    shown: new Set(['video:breath-1', 'video:breath-2', 'free_resource:free-breath']),
  });
  assert.equal(none, null);
  assert.equal(pickRecommendation({ ...base, hidden: ['breathwork'] }), null);
});

test('new from someone saved: grouped, only after the save, opens the item or their page', () => {
  const items = [
    { type: 'video', ref: 'v1', title: 'New talk', healerSlugs: ['tara'], subject_slugs: [], created_at: ago(2) },
    { type: 'book', ref: 'b1', title: 'New book', healerSlugs: ['tara', 'jack'], subject_slugs: [], created_at: ago(1) },
    { type: 'video', ref: 'v0', title: 'Older', healerSlugs: ['tara'], subject_slugs: [], created_at: ago(30) },
  ];
  const one = pickNewFromSaved({
    savedListings: [{ slug: 'jack', name: 'Jack', savedAt: ago(100) }],
    newItems: items,
    saved: new Set(),
    shown: new Set(),
    hidden: [],
    now,
  });
  assert.equal(one.route, '/books/b1');
  const many = pickNewFromSaved({
    savedListings: [
      { slug: 'jack', name: 'Jack', savedAt: ago(100) },
      { slug: 'tara', name: 'Tara', savedAt: ago(100) },
    ],
    newItems: items,
    saved: new Set(),
    shown: new Set(),
    hidden: [],
    now,
  });
  assert.equal(many.healer.slug, 'tara');
  assert.deepEqual(many.items.map((i) => i.ref), ['b1', 'v1']);
  assert.equal(many.route, '/healers/tara');
  // Saved after the book went in: only what came after counts.
  const later = pickNewFromSaved({
    savedListings: [{ slug: 'jack', name: 'Jack', savedAt: ago(0.5) }],
    newItems: items,
    saved: new Set(),
    shown: new Set(),
    hidden: [],
    now,
  });
  assert.equal(later, null);
});

test('the plan: nothing outside their hour, nothing without a time zone or with Discoveries off', () => {
  assert.equal(planForPerson(person({ state: { utc_offset_minutes: null } })).skip, 'no_time_zone');
  assert.equal(planForPerson(person({ state: { utc_offset_minutes: 60, last_opened_at: ago(1) } })).skip, 'not_their_hour');
  assert.equal(planForPerson(person({ prefs: { general: true, discoveries: false } })).skip, 'discoveries_off');
});

test('the plan at 10: new from saved first, then a free resource', () => {
  const withNew = person({
    savedListings: [{ slug: 'tara', name: 'Tara Brach', savedAt: ago(100) }],
    newItems: [{ type: 'video', ref: 'v1', title: 'New talk', healerSlugs: ['tara'], subject_slugs: [], created_at: ago(2) }],
  });
  const a = planForPerson(withNew);
  assert.equal(a.kind, 'new_from_saved');
  assert.equal(a.notification.body, 'Something new on Spiritpedia from Tara Brach');
  assert.equal(a.notification.data.route, '/videos/v1');
  const b = planForPerson(person());
  assert.equal(b.kind, 'free_resource');
  assert.equal(b.notification.body, 'I’ve found a free Breathwork resource you may enjoy. Shall we explore?');
  assert.equal(planForPerson(person({ sends: [sent('admin', 2)] })).skip, 'weekly_limit');
});

test('the plan when away: with a name, how are you feeling; without, the item; then a different one; nothing weak', () => {
  const away = { utc_offset_minutes: 0, last_opened_at: ago(11) };
  const named = planForPerson(person({ state: away, name: 'Ross' }));
  assert.equal(named.kind, 'return_first');
  assert.equal(named.notification.body, 'How are you feeling today, Ross?');
  assert.equal(named.notification.data.route, '/feel');
  const unnamed = planForPerson(person({ state: away }));
  assert.equal(unnamed.notification.body, 'I’ve picked out Box Breathing for you. A little Breathwork to explore at your own pace.');
  const second = planForPerson(
    person({
      state: { utc_offset_minutes: 0, last_opened_at: ago(25) },
      sends: [sent('return_first', 14, { refs: [{ type: 'video', ref: 'breath-2' }] })],
    })
  );
  assert.equal(second.kind, 'return_second');
  assert.equal(
    second.notification.body,
    'Shall we discover something new? Morning Breath offers another way into Breathwork. I thought you might enjoy exploring it.'
  );
  assert.equal(planForPerson(person({ state: away, subjects: [] })).skip, 'away_nothing_strong');
});

test('the welcome: 7pm their time the day after a first real visit, once, under Account updates', () => {
  const evening = new Date('2026-11-03T19:05:00Z');
  const state = { utc_offset_minutes: 0, last_opened_at: ago(1), first_visit_at: '2026-11-02T12:00:00Z' };
  const w = planForPerson(person({ now: evening, state, name: 'Ross', prefs: { general: true, discoveries: false } }));
  assert.equal(w.kind, 'first_visit');
  assert.equal(w.notification.body, 'It was lovely getting to know you, Ross. I’m here whenever you need me.');
  assert.equal(planForPerson(person({ now: evening, state, sends: [sent('first_visit', 0.5)] })).skip, 'no_welcome_due');
  assert.equal(
    planForPerson(person({ now: evening, state: { ...state, first_visit_at: '2026-11-03T12:00:00Z' } })).skip,
    'no_welcome_due'
  );
  assert.equal(planForPerson(person({ now: evening, state, prefs: { general: false, discoveries: true } })).skip, 'no_welcome_due');
});

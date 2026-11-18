import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOURNEY_EMAILS, JOURNEY_SCHEDULE, outreachLinks } from './email.js';
import {
  DAY_MS,
  cronDecision,
  isMissingSchema,
  journeyState,
  journeyTarget,
  nextDue,
  outreachAllowedFor,
  outreachEligibility,
  startBlocker,
  outreachFirstName,
  outreachRefusal,
  schedule,
  upNext,
  outreachDay,
  startedToday,
  DAILY_STARTS,
} from './journey.js';
import { outreachEmail } from './emailTemplates.js';

const START = '2026-10-21T08:00:00.000Z';
const at = (days) => new Date(new Date(START).getTime() + days * DAY_MS);

test('eight emails at days 0, 21, 42, 63, 84, 105, 126 and 147', () => {
  assert.equal(JOURNEY_EMAILS, 8);
  assert.deepEqual(JOURNEY_SCHEDULE, [0, 21, 42, 63, 84, 105, 126, 147]);
  const steps = schedule({ started_at: START });
  assert.equal(steps.length, 8);
  assert.equal(steps[7].dueAt, at(147).toISOString());
});

test('the next email is the lowest unsent one that is due', () => {
  const journey = { started_at: START, email_1_sent_at: START };
  for (let n = 2; n <= 7; n += 1) journey[`email_${n}_sent_at`] = START;
  assert.equal(nextDue(journey, at(146)), null);
  assert.equal(nextDue(journey, at(147)), 8);
  journey.email_8_sent_at = START;
  assert.equal(nextDue(journey, at(400)), null);
});

test('outreach is for every kind (switched on, owner 17 Nov 2026)', () => {
  assert.equal(outreachAllowedFor('individual'), true);
  assert.equal(outreachAllowedFor(null), true);
  assert.equal(outreachAllowedFor('channel'), true);
});

test('the links are on www and the claim link names the listing', () => {
  assert.deepEqual(outreachLinks('jane-doe'), {
    profileUrl: 'https://www.spiritpedia.co/healers/jane-doe',
    claimUrl: 'https://www.spiritpedia.co/auth/claim?slug=jane-doe',
  });
});

test('no kind is switched off', () => {
  for (const kind of ['channel', 'app', 'organisation', 'school', 'publisher', 'individual', undefined]) {
    assert.equal(outreachAllowedFor(kind), true, kind);
    assert.equal(outreachRefusal(kind), null, kind);
  }
});

test('a person is greeted by first name; anything else "Hello,"', () => {
  assert.equal(outreachFirstName('individual', 'Dr Jane Smith'), 'Jane');
  assert.equal(outreachFirstName(null, 'Jane Smith'), 'Jane');
  for (const kind of ['channel', 'app', 'organisation', 'school', 'publisher']) {
    assert.equal(outreachFirstName(kind, 'White Tiger Qigong'), '', kind);
  }
  const email = outreachEmail(1, {
    firstName: outreachFirstName('organisation', 'White Tiger Qigong'),
    profileUrl: 'p',
    claimUrl: 'c',
  });
  assert.match(email.text, /^Hello,/);
  assert.doesNotMatch(email.text, /Hi White/);
});

test('the daily job checks gone, claimed, kind, address, in that order', () => {
  const person = { contact_email: 'a@b.c' };
  assert.deepEqual(cronDecision({ listing: null, claimed: false, entityType: 'individual' }), { stop: 'healer_removed' });
  assert.deepEqual(cronDecision({ listing: person, claimed: true, entityType: 'school' }), { stop: 'claimed' });
  assert.deepEqual(cronDecision({ listing: person, claimed: false, entityType: 'organisation' }), { send: true });
  assert.deepEqual(cronDecision({ listing: person, claimed: false, entityType: 'publisher' }), { send: true });
  assert.deepEqual(cronDecision({ listing: {}, claimed: false, entityType: 'individual' }), { stop: 'no_contact_email' });
  assert.deepEqual(cronDecision({ listing: person, claimed: false, entityType: null }), { send: true });
});

test('a journey state: form, replied and claimed come before the status', () => {
  assert.equal(journeyState({ channel: 'form', status: 'stopped' }), 'form');
  assert.equal(journeyState({ status: 'stopped', stop_reason: 'replied', replied_at: START }), 'replied');
  assert.equal(journeyState({ status: 'running' }, { claimed: true }), 'claimed');
  assert.equal(journeyState({ status: 'running' }), 'running');
  assert.equal(journeyState({ status: 'paused' }), 'paused');
  assert.equal(journeyState({ status: 'stopped', stop_reason: 'sequence_complete' }), 'complete');
  assert.equal(journeyState({ status: 'stopped', stop_reason: 'asked_to_stop' }), 'do_not_contact');
  assert.equal(journeyState({ status: 'stopped', stop_reason: 'stopped_by_admin' }), 'stopped');
});

test('the schedule carries what Resend reported for each email', () => {
  const steps = schedule({ started_at: START, email_1_sent_at: START }, [
    { email_number: 1, delivered_at: START, bounced_at: null, bounce_type: null },
  ]);
  assert.equal(steps[0].deliveredAt, START);
  assert.equal(steps[1].deliveredAt, null);
});

test('targets and a missing migration are recognised', () => {
  assert.deepEqual(journeyTarget('jane'), { slug: 'jane', publisherId: null });
  assert.deepEqual(journeyTarget({ publisherId: 'x' }), { slug: null, publisherId: 'x' });
  assert.equal(isMissingSchema({ code: 'PGRST204' }), true);
  assert.equal(isMissingSchema({ code: '42P01' }), true);
  assert.equal(isMissingSchema({ code: '23505' }), false);
});

test("a publisher's links go to /publishers and claim as a publisher", () => {
  assert.deepEqual(outreachLinks('hay-house', { publisher: true }), {
    profileUrl: 'https://www.spiritpedia.co/publishers/hay-house',
    claimUrl: 'https://www.spiritpedia.co/auth/claim?slug=hay-house&kind=publisher',
  });
});

test('eligibility: only a missing email blocks; source and inbox type only warn, for every kind', () => {
  const sourced = { email: 'info@x.org', source: 'https://x.org/contact' };
  // A person: a missing source or a missing or unknown type only warns.
  assert.deepEqual(outreachEligibility({ entityType: 'individual', ...sourced, recipientType: 'personal' }), { problems: [], warnings: [] });
  assert.equal(outreachEligibility({ entityType: 'individual', ...sourced, recipientType: null }).problems.length, 0);
  assert.match(outreachEligibility({ entityType: 'individual', ...sourced, recipientType: 'unknown' }).warnings.join(), /not set/);
  {
    const noSource = outreachEligibility({ entityType: 'individual', email: 'a@b.c', source: '', recipientType: 'business' });
    assert.deepEqual(noSource.problems, []);
    assert.match(noSource.warnings.join(), /published on/);
    // Never a block for the shared kinds either (owner, 11 Nov 2026).
    const school = outreachEligibility({ entityType: 'school', email: 'a@b.c', source: '', recipientType: 'organisation' });
    assert.deepEqual(school.problems, []);
    assert.match(school.warnings.join(), /published on/);
  }
  // The shared kinds.
  for (const type of ['business', 'organisation', 'personal_business']) {
    assert.deepEqual(outreachEligibility({ entityType: 'school', ...sourced, recipientType: type }).problems, [], type);
  }
  // The inbox type only warns, for every kind (owner, 11 Nov 2026).
  {
    const personal = outreachEligibility({ entityType: 'publisher', ...sourced, recipientType: 'personal' });
    assert.deepEqual(personal.problems, []);
    assert.match(personal.warnings.join(), /private individual/);
    const unset = outreachEligibility({ entityType: 'channel', ...sourced, recipientType: null });
    assert.deepEqual(unset.problems, []);
    assert.match(unset.warnings.join(), /not set/);
  }
  // No email at all is the one address problem that blocks.
  assert.match(outreachEligibility({ entityType: 'school', email: '', source: '', recipientType: 'business' }).problems.join(), /No contact email/);
  assert.deepEqual(outreachEligibility({ entityType: 'app', ...sourced, recipientType: 'unknown' }).problems, []);
  // Before migration 0048: the type isn't asked for, and a warning says why.
  const before = outreachEligibility({ entityType: 'organisation', ...sourced, recipientType: undefined });
  assert.deepEqual(before.problems, []);
  assert.match(before.warnings.join(), /0048/);
  assert.match(outreachEligibility({ entityType: 'school', email: '', source: '' }).problems.join(), /No contact email/);
});

test('Start is blocked by the first reason a person would read', () => {
  const ok = { eligibility: { problems: [], warnings: ['w'] } };
  assert.equal(startBlocker(ok), null);
  assert.match(startBlocker({ ...ok, kindRefusal: 'Switched off.', claimed: true }), /^Switched off/);
  assert.match(startBlocker({ ...ok, claimed: true, doNotContact: 'x' }), /claimed/);
  assert.match(startBlocker({ ...ok, doNotContact: 'They asked us to stop emailing.' }), /Not to be emailed again/);
  assert.match(startBlocker({ ...ok, running: 'running' }), /already running/);
  assert.match(startBlocker({ eligibility: { problems: ['No source.'], warnings: [] } }), /No source/);
});

// UP NEXT (owner, 18 Nov 2026).
const listing = (key, extra = {}) => ({ key, kind: 'individual', name: key, email: `${key}@example.com`, tier: 'local_hero', ...extra });

test('up next: organisations and schools first, then practitioners by tier and name, then the rest', () => {
  const { list } = upNext({
    listings: [
      listing('zoe'),
      listing('channel-a', { kind: 'channel' }),
      listing('amy'),
      listing('big-name', { tier: 'superhero' }),
      listing('school-a', { kind: 'school' }),
      listing('org-b', { kind: 'organisation', name: 'B org' }),
      listing('org-a', { kind: 'organisation', name: 'a org' }),
    ],
    journeys: [],
  });
  assert.deepEqual(
    list.map((l) => l.key),
    ['org-a', 'org-b', 'school-a', 'big-name', 'amy', 'zoe', 'channel-a']
  );
});

test('up next: never contacted means no journey of any kind, a form contact included', () => {
  const { list, left } = upNext({
    listings: [listing('emailed'), listing('formed'), listing('new'), listing('no-email', { email: null })],
    journeys: [{ key: 'emailed' }, { key: 'formed' }],
  });
  assert.deepEqual(list.map((l) => l.key), ['new']);
  assert.equal(left.contacted, 2);
});

test('up next: claimed, a person who has died, and an address already written to are left out', () => {
  const { list, left } = upNext({
    listings: [
      listing('joined', { claimed: true }),
      listing('late', { deceased: true }),
      listing('late-school', { kind: 'school', deceased: true }),
      listing('founder', { email: 'Hello@School.org' }),
      listing('school', { kind: 'school', email: 'hello@school.org ' }),
    ],
    journeys: [{ key: 'founder' }],
  });
  assert.deepEqual(list.map((l) => l.key), ['late-school']);
  assert.deepEqual(left, { contacted: 1, claimed: 1, deceased: 1, sameAddress: 1, switchedOff: 0 });
});

test('up next: two new listings with one address get one journey, the other is named on it', () => {
  const { list, left } = upNext({
    listings: [listing('founder', { email: 'a@x.org', name: 'The Founder' }), listing('school', { kind: 'school', email: 'A@x.org' })],
    journeys: [],
  });
  assert.deepEqual(list.map((l) => [l.key, l.alsoAt]), [['school', ['The Founder']]]);
  assert.equal(left.sameAddress, 1);
});

test('started today: email journeys on the owner’s day, form contacts not counted', () => {
  const now = new Date('2026-11-18T23:30:00Z'); // 23:30 in London
  assert.equal(
    startedToday(
      [
        { channel: 'email', started_at: '2026-11-18T00:10:00Z' },
        { channel: 'email', started_at: '2026-11-18T10:00:00Z', status: 'stopped' },
        { started_at: '2026-11-18T12:00:00Z' },
        { channel: 'form', started_at: '2026-11-18T12:00:00Z' },
        { channel: 'email', started_at: '2026-11-17T23:59:00Z' },
      ],
      now
    ),
    3
  );
  // Summer time: 23:30 UTC on 1 July is already 2 July in London.
  assert.equal(outreachDay('2026-07-01T23:30:00Z'), '2026-07-02');
  assert.equal(DAILY_STARTS, 50);
});

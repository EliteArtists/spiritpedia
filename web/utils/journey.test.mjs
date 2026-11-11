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
  outreachFirstName,
  outreachRefusal,
  schedule,
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

test('outreach is for individuals only', () => {
  assert.equal(outreachAllowedFor('individual'), true);
  assert.equal(outreachAllowedFor(null), true);
  assert.equal(outreachAllowedFor('channel'), false);
});

test('the links are on www and the claim link names the listing', () => {
  assert.deepEqual(outreachLinks('jane-doe'), {
    profileUrl: 'https://www.spiritpedia.co/healers/jane-doe',
    claimUrl: 'https://www.spiritpedia.co/auth/claim?slug=jane-doe',
  });
});

test('every kind but individuals waits for its approved wording', () => {
  for (const kind of ['channel', 'app', 'organisation', 'school', 'publisher']) {
    assert.equal(outreachAllowedFor(kind), false, kind);
    assert.match(outreachRefusal(kind), /Waiting for the approved wording/);
  }
  assert.equal(outreachRefusal('individual'), null);
  assert.equal(outreachRefusal(undefined), null);
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
  assert.deepEqual(cronDecision({ listing: person, claimed: false, entityType: 'organisation' }), { pause: 'kind_not_approved' });
  assert.deepEqual(cronDecision({ listing: person, claimed: false, entityType: 'publisher' }), { pause: 'kind_not_approved' });
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

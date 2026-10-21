import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOURNEY_EMAILS, JOURNEY_SCHEDULE, outreachLinks } from './email.js';
import { DAY_MS, nextDue, outreachAllowedFor, schedule } from './journey.js';

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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPermanentBounce, messageUpdate, signPayload, verifyWebhook } from './resendWebhook.js';

// A made-up secret in Svix's format, for these tests only.
const SECRET = `whsec_${Buffer.from('a test secret of some length').toString('base64')}`;
const NOW = Date.UTC(2026, 10, 11, 12, 0, 0);
const TS = String(NOW / 1000);
const BODY = JSON.stringify({ type: 'email.delivered', data: { email_id: 'abc' } });

function signed(overrides = {}) {
  const base = { secret: SECRET, id: 'msg_1', timestamp: TS, body: BODY, now: NOW };
  const sig = `v1,${signPayload(SECRET, base.id, base.timestamp, base.body)}`;
  return { ...base, signature: sig, ...overrides };
}

test('a correctly signed, recent request is accepted', () => {
  assert.equal(verifyWebhook(signed()), true);
  // Svix may send several signatures, space-separated.
  const one = signed();
  assert.equal(verifyWebhook({ ...one, signature: `v1,bm9wZQ== ${one.signature}` }), true);
});

test('a changed body, a wrong secret or a missing header is refused', () => {
  assert.equal(verifyWebhook(signed({ body: BODY.replace('abc', 'abd') })), false);
  assert.equal(verifyWebhook({ ...signed(), secret: `whsec_${Buffer.from('another').toString('base64')}` }), false);
  assert.equal(verifyWebhook(signed({ id: null })), false);
  assert.equal(verifyWebhook(signed({ signature: '' })), false);
  assert.equal(verifyWebhook({ ...signed(), secret: '' }), false);
});

test('an old or future timestamp is refused (no replays)', () => {
  const late = signed();
  assert.equal(verifyWebhook({ ...late, now: NOW + 6 * 60 * 1000 }), false);
  assert.equal(verifyWebhook({ ...late, now: NOW - 6 * 60 * 1000 }), false);
  assert.equal(verifyWebhook({ ...late, now: NOW + 4 * 60 * 1000 }), true);
});

test('only delivered and bounced are recorded', () => {
  assert.deepEqual(messageUpdate({ type: 'email.delivered', created_at: 'T' }), { delivered_at: 'T' });
  assert.deepEqual(
    messageUpdate({ type: 'email.bounced', created_at: 'T', data: { bounce: { type: 'Permanent' } } }),
    { bounced_at: 'T', bounce_type: 'Permanent' }
  );
  assert.equal(messageUpdate({ type: 'email.opened' }), null);
  assert.equal(messageUpdate({ type: 'email.clicked' }), null);
});

test('only a permanent bounce stops a journey', () => {
  assert.equal(isPermanentBounce({ bounced_at: 'T', bounce_type: 'Permanent' }), true);
  assert.equal(isPermanentBounce({ bounced_at: 'T', bounce_type: 'Transient' }), false);
  assert.equal(isPermanentBounce({ delivered_at: 'T' }), false);
});

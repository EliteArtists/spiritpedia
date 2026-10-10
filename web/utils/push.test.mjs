// Run with `npm test` (node --test). Push sending, with a fake FCM endpoint and
// an in-memory stand-in for the three tables — no network, no Firebase.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import {
  WELCOME,
  buildAssertion,
  buildMessage,
  isDeadToken,
  pushConfig,
  sendToUser,
  sendWelcomePush,
} from './push.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' });
const ENV = {
  FIREBASE_PROJECT_ID: 'spiritpedia-test',
  FIREBASE_CLIENT_EMAIL: 'sender@spiritpedia-test.iam.gserviceaccount.com',
  // As Vercel often stores it: one line with literal \n.
  FIREBASE_PRIVATE_KEY: PEM.replace(/\n/g, '\\n'),
};

// ── An in-memory Supabase: just the calls push.js makes ──────────────────────
function fakeDb() {
  const tables = { push_tokens: [], notification_preferences: [], notification_sends: [] };
  let nextId = 1;
  const db = {
    tables,
    from(name) {
      const rows = tables[name];
      const filters = [];
      const matches = (r) => filters.every(([col, op, v]) => (op === 'eq' ? r[col] === v : v.includes(r[col])));
      const q = {
        _op: 'select',
        select(_cols, opts) { if (q._op === 'select') q._head = opts?.head; q._returning = true; return q; },
        eq(col, v) { filters.push([col, 'eq', v]); return q; },
        in(col, v) { filters.push([col, 'in', v]); return q; },
        insert(row) { q._op = 'insert'; q._row = row; return q; },
        delete() { q._op = 'delete'; return q; },
        async maybeSingle() { return { data: rows.find(matches) || null, error: null }; },
        async single() {
          if (q._op === 'insert') {
            if (name === 'notification_sends' && rows.some((r) => r.user_id === q._row.user_id && r.kind === q._row.kind)) {
              return { data: null, error: { code: '23505' } };
            }
            const row = { id: nextId++, ...q._row };
            rows.push(row);
            return { data: { id: row.id }, error: null };
          }
          return { data: rows.find(matches) || null, error: null };
        },
        then(resolve) {
          if (q._op === 'delete') {
            for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i])) rows.splice(i, 1);
            return resolve({ error: null });
          }
          const found = rows.filter(matches);
          return resolve(q._head ? { count: found.length, error: null } : { data: found, error: null });
        },
      };
      return q;
    },
  };
  return db;
}

// ── A fake Google: token endpoint + FCM ──────────────────────────────────────
function fakeGoogle({ deadTokens = [], failing = [] } = {}) {
  const sent = [];
  const fetchImpl = async (url, init) => {
    if (url.includes('oauth2.googleapis.com')) {
      return { ok: true, status: 200, json: async () => ({ access_token: 'at-123', expires_in: 3600 }) };
    }
    const body = JSON.parse(init.body);
    const token = body.message.token;
    if (deadTokens.includes(token)) {
      return { ok: false, status: 404, json: async () => ({ error: { details: [{ errorCode: 'UNREGISTERED' }] } }) };
    }
    if (failing.includes(token)) {
      return { ok: false, status: 503, json: async () => ({ error: { message: 'unavailable' } }) };
    }
    assert.equal(init.headers.Authorization, 'Bearer at-123');
    assert.match(url, /\/v1\/projects\/spiritpedia-test\/messages:send$/);
    sent.push(body.message);
    return { ok: true, status: 200, json: async () => ({ name: 'projects/x/messages/1' }) };
  };
  return { fetchImpl, sent };
}

let db;
beforeEach(() => {
  db = fakeDb();
});

test('config: all three values needed; literal \\n in the key is accepted', () => {
  assert.equal(pushConfig({}), null);
  assert.equal(pushConfig({ ...ENV, FIREBASE_PRIVATE_KEY: '' }), null);
  const c = pushConfig(ENV);
  assert.equal(c.projectId, 'spiritpedia-test');
  assert.ok(c.privateKey.includes('\n-----END PRIVATE KEY-----') || c.privateKey.endsWith('-----END PRIVATE KEY-----'));
});

test('the OAuth assertion is a valid RS256 JWT for the messaging scope', () => {
  const jwt = buildAssertion(pushConfig(ENV), 1_800_000_000);
  const [h, c, s] = jwt.split('.');
  const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
  assert.equal(JSON.parse(Buffer.from(h, 'base64url').toString()).alg, 'RS256');
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/firebase.messaging');
  assert.equal(claims.exp - claims.iat, 3600);
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${h}.${c}`);
  assert.ok(verifier.verify(publicKey, Buffer.from(s, 'base64url')));
});

test('a message carries the channel, brand colour and string-only data', () => {
  const m = buildMessage('tok', { title: 'T', body: 'B', data: { route: '/library', n: 3 } }).message;
  assert.equal(m.android.notification.channel_id, 'general');
  assert.equal(m.android.notification.color, '#7C3AED');
  assert.deepEqual(m.data, { route: '/library', n: '3' });
});

test('dead tokens are recognised; temporary failures are not', () => {
  assert.equal(isDeadToken(404, {}), true);
  assert.equal(isDeadToken(400, { error: { details: [{ errorCode: 'UNREGISTERED' }] } }), true);
  assert.equal(isDeadToken(400, { error: { message: 'The registration token is not a valid FCM registration token', details: [{ errorCode: 'INVALID_ARGUMENT' }] } }), true);
  assert.equal(isDeadToken(400, { error: { message: 'Invalid JSON payload', details: [{ errorCode: 'INVALID_ARGUMENT' }] } }), false);
  assert.equal(isDeadToken(503, {}), false);
  assert.equal(isDeadToken(429, { error: { details: [{ errorCode: 'QUOTA_EXCEEDED' }] } }), false);
});

test('sendToUser reaches every device, removes dead tokens, keeps failing ones', async () => {
  db.tables.push_tokens.push(
    { id: 1, user_id: 'u1', token: 'phone' },
    { id: 2, user_id: 'u1', token: 'old-tablet' },
    { id: 3, user_id: 'u1', token: 'flaky' },
    { id: 4, user_id: 'u2', token: 'someone-else' }
  );
  const google = fakeGoogle({ deadTokens: ['old-tablet'], failing: ['flaky'] });
  const r = await sendToUser(db, 'u1', WELCOME, { env: ENV, fetchImpl: google.fetchImpl });
  assert.deepEqual(r, { configured: true, sent: 1, failed: 1, removed: 1 });
  assert.deepEqual(google.sent.map((m) => m.token), ['phone']);
  assert.deepEqual(db.tables.push_tokens.map((t) => t.token), ['phone', 'flaky', 'someone-else']);
});

test('an account that turned General off gets nothing', async () => {
  db.tables.push_tokens.push({ id: 1, user_id: 'u1', token: 'phone' });
  db.tables.notification_preferences.push({ user_id: 'u1', general: false, iam_affirmations: false });
  const google = fakeGoogle();
  const r = await sendToUser(db, 'u1', WELCOME, { env: ENV, fetchImpl: google.fetchImpl });
  assert.equal(r.skipped, 'opted_out');
  assert.equal(google.sent.length, 0);
});

test('welcome: exactly once, however many times it is asked for', async () => {
  db.tables.push_tokens.push({ id: 1, user_id: 'u1', token: 'phone' }, { id: 2, user_id: 'u1', token: 'ipad' });
  const google = fakeGoogle();
  const first = await sendWelcomePush(db, 'u1', { env: ENV, fetchImpl: google.fetchImpl });
  const again = await Promise.all([
    sendWelcomePush(db, 'u1', { env: ENV, fetchImpl: google.fetchImpl }),
    sendWelcomePush(db, 'u1', { env: ENV, fetchImpl: google.fetchImpl }),
  ]);
  assert.equal(first.status, 'sent');
  assert.deepEqual(again.map((r) => r.status), ['already_sent', 'already_sent']);
  // Both of the account's devices, once each.
  assert.deepEqual(google.sent.map((m) => m.token).sort(), ['ipad', 'phone']);
  assert.equal(google.sent[0].notification.title, 'Welcome to Spiritpedia ✨');
  assert.match(google.sent[0].notification.body, /guiding star/);
});

test('welcome: nothing recorded without a device, so a later opt-in still gets it', async () => {
  const google = fakeGoogle();
  assert.equal((await sendWelcomePush(db, 'u1', { env: ENV, fetchImpl: google.fetchImpl })).status, 'no_devices');
  assert.equal(db.tables.notification_sends.length, 0);
  db.tables.push_tokens.push({ id: 1, user_id: 'u1', token: 'phone' });
  assert.equal((await sendWelcomePush(db, 'u1', { env: ENV, fetchImpl: google.fetchImpl })).status, 'sent');
});

test('welcome: if every send fails, the claim is released for a later try', async () => {
  db.tables.push_tokens.push({ id: 1, user_id: 'u1', token: 'flaky' });
  const r = await sendWelcomePush(db, 'u1', { env: ENV, fetchImpl: fakeGoogle({ failing: ['flaky'] }).fetchImpl });
  assert.equal(r.status, 'failed');
  assert.equal(db.tables.notification_sends.length, 0);
});

test('welcome: not configured, opted out → nothing recorded', async () => {
  db.tables.push_tokens.push({ id: 1, user_id: 'u1', token: 'phone' });
  assert.equal((await sendWelcomePush(db, 'u1', { env: {} })).status, 'not_configured');
  db.tables.notification_preferences.push({ user_id: 'u1', general: false });
  assert.equal((await sendWelcomePush(db, 'u1', { env: ENV, fetchImpl: fakeGoogle().fetchImpl })).status, 'opted_out');
  assert.equal(db.tables.notification_sends.length, 0);
});

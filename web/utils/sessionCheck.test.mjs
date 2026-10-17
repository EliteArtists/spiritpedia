import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSession, sessionVerdict, SIGNED_IN, SIGNED_OUT, UNKNOWN } from './sessionCheck.js';

// A stand-in for supabase-js's auth: a saved session in "storage", and a
// server answer for getUser().
function fakeAuth({ saved = { access_token: 't' }, answer }) {
  const auth = {
    saved,
    signOuts: [],
    async getSession() {
      return { data: { session: auth.saved }, error: null };
    },
    async getUser() {
      if (answer instanceof Error && !answer.status && !answer.code) throw answer;
      return answer;
    },
    async signOut(options) {
      auth.signOuts.push(options);
      auth.saved = null;
      return { error: null };
    },
  };
  return auth;
}

const refused = (status, code, name = 'AuthApiError') => ({ data: { user: null }, error: { name, status, code } });

// The two pages as they decide. /account: no user → /auth/signup, an error →
// "Try again". /auth/signup: a saved session → /account.
async function visit(auth, start = '/account', limit = 6) {
  const trail = [start];
  let page = start;
  for (let i = 0; i < limit; i++) {
    if (page === '/account') {
      const { data, error } = await checkSession(auth);
      if (data) return [...trail, 'account shown'];
      if (error) return [...trail, 'try again'];
      page = '/auth/signup';
    } else {
      const { data } = await auth.getSession();
      if (!data.session) return [...trail, 'welcome shown'];
      page = '/account';
    }
    trail.push(page);
  }
  return [...trail, 'LOOP'];
}

test('a saved session Supabase refuses: cleared, and the welcome stays put', async () => {
  for (const answer of [
    refused(403, 'user_not_found'), // the account was deleted
    refused(403, 'bad_jwt'), // signed with a key that is no longer used
    refused(403, 'session_not_found'),
    refused(401, undefined),
    refused(400, 'refresh_token_not_found'),
  ]) {
    const auth = fakeAuth({ answer });
    assert.deepEqual(await visit(auth), ['/account', '/auth/signup', 'welcome shown'], answer.error.code);
    assert.equal(auth.saved, null);
    assert.deepEqual(auth.signOuts, [{ scope: 'local' }]); // this browser only
  }
});

test('arriving at the welcome with a stale session: one trip, never a loop', async () => {
  const auth = fakeAuth({ answer: refused(403, 'user_not_found') });
  assert.deepEqual(await visit(auth, '/auth/signup'), [
    '/auth/signup',
    '/account',
    '/auth/signup',
    'welcome shown',
  ]);
});

test('offline or Supabase down: the session is kept and the page offers to try again', async () => {
  for (const answer of [
    { data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 0 } },
    { data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 503 } },
    new TypeError('Failed to fetch'),
  ]) {
    const auth = fakeAuth({ answer });
    assert.deepEqual(await visit(auth), ['/account', 'try again']);
    assert.ok(auth.saved, 'the saved session is not thrown away');
    assert.deepEqual(auth.signOuts, []);
  }
});

test('a good session shows the account; no session shows the welcome', async () => {
  const user = { id: 'u1', email: 'seeker+test@spiritpedia.co' };
  assert.deepEqual(await visit(fakeAuth({ answer: { data: { user }, error: null } })), [
    '/account',
    'account shown',
  ]);
  const none = fakeAuth({
    saved: null,
    answer: { data: { user: null }, error: { name: 'AuthSessionMissingError', status: 400 } },
  });
  assert.deepEqual(await visit(none), ['/account', '/auth/signup', 'welcome shown']);
  assert.deepEqual(none.signOuts, []); // nothing saved, nothing to clear
});

test('the verdicts', () => {
  assert.equal(sessionVerdict({ id: 'u' }, null), SIGNED_IN);
  assert.equal(sessionVerdict(null, null), SIGNED_OUT);
  assert.equal(sessionVerdict(null, { name: 'AuthSessionMissingError' }), SIGNED_OUT);
  assert.equal(sessionVerdict(null, { code: 'session_expired', status: 403 }), SIGNED_OUT);
  assert.equal(sessionVerdict(null, { status: 500 }), UNKNOWN);
  assert.equal(sessionVerdict(null, { status: 0 }), UNKNOWN);
  assert.equal(sessionVerdict(null, new Error('?')), UNKNOWN);
});

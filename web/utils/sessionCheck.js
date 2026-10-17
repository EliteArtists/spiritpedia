// What a session check against Supabase means, and what to do about it.
//
// THE BUG THIS FIXES. /account asks Supabase (getUser) and sends anyone it
// does not recognise to /auth/signup; /auth/signup only reads the saved
// session (getSession) and sends anyone who has one to /account. A saved
// session Supabase no longer accepts — a deleted user, a token signed with an
// old key — satisfied the second and failed the first, so the two pages sent
// the visitor back and forth for ever ("Checking your session…", the welcome,
// again). supabase-js clears the saved copy itself only for a missing
// session, not for these.
//
// So: a session Supabase has refused is cleared from this browser on the
// spot, and every page then agrees the visitor is signed out. A check that
// could not be made at all (offline, Supabase down) is neither answer — the
// saved session is kept and the page offers to try again.
//
// Plain functions with the auth client passed in, so it is tested without
// one (sessionCheck.test.mjs).

export const SIGNED_IN = 'signed_in';
export const SIGNED_OUT = 'signed_out';
export const UNKNOWN = 'unknown';

// Supabase's own answers that mean "this session is not valid".
const REFUSED_CODES = new Set([
  'bad_jwt',
  'no_authorization',
  'session_not_found',
  'session_expired',
  'user_not_found',
  'user_banned',
  'refresh_token_not_found',
  'refresh_token_already_used',
]);

const REFUSED_NAMES = new Set(['AuthSessionMissingError', 'AuthInvalidJwtError', 'AuthInvalidTokenResponseError']);

export function sessionVerdict(user, error) {
  if (!error) return user ? SIGNED_IN : SIGNED_OUT;
  if (REFUSED_NAMES.has(error.name) || REFUSED_CODES.has(error.code)) return SIGNED_OUT;
  if ([400, 401, 403, 404].includes(error.status)) return SIGNED_OUT;
  // A failed fetch (status 0), a 5xx, a timeout, anything unrecognised.
  return UNKNOWN;
}

// getUser(), made safe to redirect on: { data: user | null, error }.
// data null with no error means signed out (and nothing stale is left
// behind); data null WITH an error means the answer is not known.
export async function checkSession(auth) {
  let result;
  try {
    result = await auth.getUser();
  } catch (error) {
    return { data: null, error };
  }
  const { data, error } = result || {};
  const verdict = sessionVerdict(data?.user, error);
  if (verdict === SIGNED_IN) return { data: data.user, error: null };
  if (verdict === UNKNOWN) return { data: null, error };

  // Refused. A missing session has nothing saved to clear (supabase-js has
  // already done it); anything else is a saved session that has to go.
  if (error && error.name !== 'AuthSessionMissingError') {
    try {
      await auth.signOut({ scope: 'local' });
    } catch {
      // Clearing is best effort; the visitor is signed out either way.
    }
  }
  return { data: null, error: null };
}

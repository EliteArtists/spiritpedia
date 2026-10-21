// The practitioner/explorer choice, held between the modal and the signup page.
//
// sessionStorage rather than localStorage on purpose: this is an answer to a
// question asked once during a single sign-up, not a fact about the person. It
// should not still be sitting in the browser a week later, quietly deciding
// what a returning visitor sees. The durable copy is user_profiles.user_type,
// written once they have an account.
//
// Every access is guarded. sessionStorage throws outright in some privacy
// modes, and a signup flow must not die because storage is unavailable — the
// page can always ask again.
export const USER_TYPE_KEY = 'userType';

export const USER_TYPES = {
  practitioner: 'practitioner',
  explorer: 'explorer',
};

export function setUserType(value) {
  try {
    sessionStorage.setItem(USER_TYPE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

// Returns null when unset, unreadable, or holding anything we did not write.
export function getUserType() {
  try {
    const stored = sessionStorage.getItem(USER_TYPE_KEY);
    return stored === USER_TYPES.practitioner || stored === USER_TYPES.explorer ? stored : null;
  } catch {
    return null;
  }
}

// THE LISTING A CLAIM LINK WAS FOR, carried across sign-up. An outreach email's
// claim link reaches /auth/claim signed out; the visitor is sent through
// sign-up and the code, and this brings them back to the same listing. The
// code is typed in the same tab, so sessionStorage covers it. Taken once.
const PENDING_CLAIM_KEY = 'pendingClaim';

export function setPendingClaim(slug, kind) {
  try {
    if (slug) sessionStorage.setItem(PENDING_CLAIM_KEY, JSON.stringify({ slug, kind: kind || null }));
  } catch {
    // Without storage the claim is found by email instead, as before.
  }
}

// → { slug, kind } or null, and forgets it.
export function takePendingClaim() {
  try {
    const raw = sessionStorage.getItem(PENDING_CLAIM_KEY);
    sessionStorage.removeItem(PENDING_CLAIM_KEY);
    const value = raw ? JSON.parse(raw) : null;
    return typeof value?.slug === 'string' && value.slug ? value : null;
  } catch {
    return null;
  }
}

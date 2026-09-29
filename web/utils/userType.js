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

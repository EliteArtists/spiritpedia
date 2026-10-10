'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabaseAuth } from '../utils/supabaseAuth.js';
import { ensureProfile, migrateFavourites, readPendingUserType } from '../utils/onboarding.js';
import { FAVORITES_EVENT } from '../utils/favorites.js';
import {
  clearSavesAfterSignOut,
  normaliseLegacyFavourites,
  writeThroughToggle,
} from '../utils/favouritesSync.js';

// Makes "having a session" the thing that guarantees a profile row, rather than
// "having passed through /auth/verify".
//
// THE BUG THIS FIXES. Profile creation and the favourites migration lived only
// at the end of the verify page. Every other way of arriving with a session
// skipped them:
//   • Clicking the magic link in the OTP email instead of typing the code. The
//     auth client has detectSessionInUrl on, so the link signs you in wherever
//     it lands — never touching /auth/verify.
//   • Any returning visit, where the stored session is restored on load and no
//     verification happens at all.
// Observed in the live database: one confirmed auth user, zero user_profiles
// rows. That person had an account and no profile, and their saved library was
// never migrated.
//
// Mounted from the root layout, so it runs on every public page. It renders
// nothing.
const HIDDEN_PREFIX = '/admin';

export default function AuthSync() {
  const pathname = usePathname();
  // User ids already handled in this page's lifetime. Token refreshes fire the
  // same SIGNED_IN-shaped events repeatedly, and without this the work would
  // repeat for as long as the tab stayed open.
  const syncedRef = useRef(new Set());
  // The signed-in user, for writing each heart through to their account.
  const userRef = useRef(null);

  const active = !(pathname === HIDDEN_PREFIX || pathname?.startsWith(`${HIDDEN_PREFIX}/`));

  useEffect(() => {
    if (!active) return undefined;

    let cancelled = false;

    // Every visitor, signed in or not: convert hearts saved as ids before
    // October 2026 to slugs. Once per browser; a no-op after that.
    normaliseLegacyFavourites().catch(() => {});

    // Signed in, every heart is written through to the account as it is
    // tapped. Signed out there is no one to write to and this does nothing.
    const onFavorite = (event) => {
      const { key, id, saved } = event.detail || {};
      const userId = userRef.current;
      if (!userId || !id) return;
      writeThroughToggle(userId, key, id, saved).catch(() => {});
    };
    window.addEventListener(FAVORITES_EVENT, onFavorite);

    const sync = async (userId, email) => {
      if (!userId || cancelled || syncedRef.current.has(userId)) return;
      // Claimed before awaiting anything, so two events arriving in the same
      // tick cannot both get through.
      syncedRef.current.add(userId);

      try {
        // Favourites first: it is the step with something to lose. Local saves
        // are replaced by the account's list only after the account has taken
        // them, so a failure here is invisible and simply tried again on the
        // next load. That retry is the second thing this listener buys us.
        await migrateFavourites(userId);

        // The same recorded choice the verify page reads, and for the same
        // reason — but this listener runs everywhere, so it may well get there
        // first. ensureProfile is ON CONFLICT DO NOTHING, meaning whichever of
        // the two wins decides the user_type permanently; if this one guessed
        // 'explorer' from an empty sessionStorage it would quietly demote a
        // practitioner who clicked their magic link on another device.
        //
        // Read without consuming: the verify page deletes the row once it has
        // routed on it, and deleting here could pull it out from under that.
        const userType = await readPendingUserType(email);
        await ensureProfile(userId, userType);
      } catch {
        // Background repair. It must never surface an error over whatever the
        // visitor is actually reading, and the next page load tries again.
        syncedRef.current.delete(userId);
      }
    };

    const { data: subscription } = supabaseAuth.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearSavesAfterSignOut(userRef.current);
        userRef.current = null;
        // Let a later sign-in — possibly a different person on a shared
        // machine — sync again rather than being skipped as already done.
        syncedRef.current.clear();
        return;
      }

      // INITIAL_SESSION is what heals an account that already exists without a
      // profile: it fires on mount for a restored session, with no sign-in
      // needed. SIGNED_IN covers a fresh one. Token refreshes and user updates
      // are deliberately ignored.
      if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') return;

      const userId = session?.user?.id;
      if (!userId) return;
      userRef.current = userId;
      const email = session?.user?.email;

      // Deferred out of the callback on purpose. supabase-js runs these inside
      // an internal lock, and calling back into the client from within it can
      // deadlock; a zero timeout puts the work on the next tick, outside it.
      setTimeout(() => sync(userId, email), 0);
    });

    return () => {
      cancelled = true;
      window.removeEventListener(FAVORITES_EVENT, onFavorite);
      subscription?.subscription?.unsubscribe();
    };
  }, [active]);

  return null;
}

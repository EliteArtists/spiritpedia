'use client';

import { supabaseAuth } from './supabaseAuth.js';
import { syncFavouritesWithAccount } from './favouritesSync.js';
import { USER_TYPES, getUserType } from './userType.js';

// Everything that happens in the seconds after a code is accepted: move what
// the visitor saved while anonymous onto their account, give them a profile
// row, and work out where they should land.

// Move saved items to the account, then make this browser's library the
// account's. utils/favouritesSync.js does the work; this name stays because the
// verify page and AuthSync both call it at the moment a session appears.
//
// Nothing local is replaced unless the account accepted this browser's saves,
// so a failure costs the visitor nothing and the next sign-in tries again.
export async function migrateFavourites(userId) {
  if (!userId) return;
  await syncFavouritesWithAccount(userId);
}

// Ask the server to send a welcome. The API key is server-only, so the browser
// can do no more than this — and each route identifies the recipient by the
// caller's own access token rather than by anything sent in the body.
async function sendWelcome(path) {
  const { data } = await supabaseAuth.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return;

  await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Create the profile row if it is not already there.
//
// Written with the auth client, so RLS sees the new user as themselves. The
// insert trigger pins verification_status to 'pending' and linked_healer_slug
// to NULL whatever is sent, which is why neither is passed.
//
// ONE STATEMENT, not a read followed by a write. Two callers race here now —
// the verify page and the app-wide AuthSync listener both run this the moment a
// session appears — and a select-then-insert would let both read "no row" and
// both try to create one, the loser failing on the primary key. INSERT ... ON
// CONFLICT DO NOTHING is decided by the database instead.
//
// ignoreDuplicates is the important half: an existing row is left completely
// alone. Without it a returning practitioner whose sessionStorage has expired
// would be rewritten as an explorer on their next visit, silently demoting
// them.
export async function ensureProfile(userId, userType) {
  if (!userId) return { error: { message: 'No user.' } };

  const isPractitioner = userType === USER_TYPES.practitioner;

  // .select() turns this into the only reliable "was the account created just
  // now?" signal there is. ON CONFLICT DO NOTHING returns the row it inserted
  // and nothing at all when it collided, so exactly one of the two racing
  // callers sees a row back — which is precisely the one that should send the
  // welcome. Without it, the welcome would go out on every single sign-in.
  const { data: inserted, error } = await supabaseAuth
    .from('user_profiles')
    .upsert(
      {
        id: userId,
        user_type: isPractitioner ? USER_TYPES.practitioner : USER_TYPES.explorer,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    .select('id');

  if (error) return { error };

  const created = Array.isArray(inserted) && inserted.length > 0;

  // The welcome, once, for a brand new account — the practitioner one or the
  // explorer one, decided by the same answer that decided the row.
  //
  // Fired here rather than at either call site because this is the one place
  // that knows the row is new, and because firing it twice from two racing
  // callers would be two emails. Not awaited: a new member should never wait on
  // an email, and the route reports nothing they could act on.
  if (created) {
    sendWelcome(
      isPractitioner ? '/api/email/practitioner-welcome' : '/api/email/explorer-welcome'
    ).catch(() => {});
  }

  // UPGRADE AN EXISTING ROW, never downgrade one.
  //
  // ignoreDuplicates leaves an existing profile completely untouched, which is
  // what protects a practitioner from being reset to explorer by an empty
  // sessionStorage. But it also means someone who already had a row before
  // choosing practitioner — anyone who signed in once as an explorer, or whose
  // row was created by AuthSync a moment earlier — keeps saying explorer while
  // being routed to the practitioner setup form. Observed exactly that.
  //
  // Narrowed to rows currently reading 'explorer', so this can only ever move
  // in one direction. A pending answer of 'explorer' changes nothing at all.
  if (isPractitioner) {
    await supabaseAuth
      .from('user_profiles')
      .update({ user_type: USER_TYPES.practitioner })
      .eq('id', userId)
      .eq('user_type', USER_TYPES.explorer);
  }

  return { error: null };
}

// THE CHOICE, CARRIED ACROSS THE GAP between submitting an email and verifying
// it. sessionStorage alone cannot do this: clicking the magic link in the email
// may open a different browser, or a phone when the choice was made on a
// desktop, and sessionStorage is per-tab. pending_user_types is keyed by email,
// so it survives all of that.
//
// Written through /api/pending-user-type rather than directly — see the note in
// that route for why an anonymous client cannot reliably write this table.
export async function recordPendingUserType(email, userType) {
  try {
    const res = await fetch('/api/pending-user-type', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userType }),
    });
    return { ok: res.ok };
  } catch {
    // Never block sign-up for this. sessionStorage still covers the common
    // case of finishing in the same tab, and the type defaults to explorer.
    return { ok: false };
  }
}

// Read the recorded choice back, once authenticated.
//
// The RLS policy only returns the row whose email matches the caller's own JWT,
// so this cannot be used to ask what anyone else chose. sessionStorage is the
// fallback, not the primary: it is right more often in the same-tab case but
// absent entirely on a magic link opened elsewhere.
//
// `consume` deletes the row after reading, so a stale answer cannot outlive the
// sign-up it belonged to.
export async function readPendingUserType(email, { consume = false } = {}) {
  const address = (email || '').trim().toLowerCase();
  if (!address) return getUserType();

  try {
    const { data } = await supabaseAuth
      .from('pending_user_types')
      .select('user_type')
      .eq('email', address)
      .maybeSingle();

    if (consume && data) {
      await supabaseAuth.from('pending_user_types').delete().eq('email', address);
    }

    if (data?.user_type) return data.user_type;
  } catch {
    // Fall through to sessionStorage.
  }

  return getUserType();
}

// Addresses that say nothing about who someone works for. A domain match on any
// of these would hand out claims to whichever healer happened to list a Gmail
// address — so for these, only an exact contact_email match counts.
const FREE_MAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'hotmail.co.uk',
  'live.com', 'live.co.uk', 'msn.com', 'yahoo.com', 'yahoo.co.uk', 'ymail.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com',
  'pm.me', 'gmx.com', 'gmx.co.uk', 'mail.com', 'yandex.com', 'zoho.com',
  'btinternet.com', 'sky.com', 'virginmedia.com', 'talktalk.net', 'tutanota.com',
]);

// Does this email look like it belongs to a healer already on Spiritpedia?
//
// Two tests, strongest first:
//   1. healers.contact_email matches exactly. Unambiguous.
//   2. The email's domain appears in website_url or youtube_url — but only for
//      a domain the person could plausibly own. karina@karinagrant.co.uk
//      matching karinagrant.co.uk is evidence; anyone@gmail.com matching a
//      healer who listed a Gmail address is not.
//
// A domain matching MORE THAN ONE healer returns no claim. Two practitioners
// sharing a clinic domain is ordinary, and guessing between them would invite
// someone to claim a colleague's profile. They go through the normal setup and
// can ask for a claim there.
export async function findClaimableHealer(email) {
  const address = (email || '').trim().toLowerCase();
  if (!address.includes('@')) return { slug: null, reason: 'no-email' };

  const { data: exact } = await supabaseAuth
    .from('healers')
    .select('healer_slug')
    .ilike('contact_email', address)
    .limit(2);

  if (exact?.length === 1) return { slug: exact[0].healer_slug, reason: 'contact-email' };
  if (exact?.length > 1) return { slug: null, reason: 'ambiguous-email' };

  const domain = address.split('@')[1];
  if (!domain || FREE_MAIL_DOMAINS.has(domain)) return { slug: null, reason: 'free-domain' };

  const { data: byDomain } = await supabaseAuth
    .from('healers')
    .select('healer_slug')
    .or(`website_url.ilike.%${domain}%,youtube_url.ilike.%${domain}%`)
    .limit(2);

  if (byDomain?.length === 1) return { slug: byDomain[0].healer_slug, reason: 'domain' };
  if (byDomain?.length > 1) return { slug: null, reason: 'ambiguous-domain' };

  return { slug: null, reason: 'no-match' };
}

// Where a newly verified user goes next.
export async function resolveDestination(user, userType) {
  if (userType !== USER_TYPES.practitioner) return '/';

  const { slug } = await findClaimableHealer(user?.email);
  return slug ? `/auth/claim?slug=${encodeURIComponent(slug)}` : '/auth/practitioner-setup';
}

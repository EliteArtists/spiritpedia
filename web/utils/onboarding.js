'use client';

import { supabaseAuth } from './supabaseAuth.js';
import { FAVORITE_KEYS, readFavorites } from './favorites.js';
import { USER_TYPES } from './userType.js';

// Everything that happens in the seconds after a code is accepted: move what
// the visitor saved while anonymous onto their account, give them a profile
// row, and work out where they should land.

// localStorage key -> the content_type recorded in user_favourites.
//
// Read from FAVORITE_KEYS rather than spelled out here, because one of them is
// not what you would guess: videos live under the singular `favorite_videos`,
// while everything else is `favorited_*`. Hard-coding the plural would migrate
// every category except videos and look like it had worked.
const FAVOURITE_SOURCES = [
  [FAVORITE_KEYS.healers, 'healer'],
  [FAVORITE_KEYS.publishers, 'publisher'],
  [FAVORITE_KEYS.books, 'book'],
  [FAVORITE_KEYS.videos, 'video'],
  [FAVORITE_KEYS.courses, 'course'],
  [FAVORITE_KEYS.freeResources, 'free_resource'],
];

// Move saved items to the account.
//
// NOTHING IS DELETED FROM localStorage, here or anywhere else. The brief asks
// that local data survive a failed write; the simplest way to guarantee that is
// never to remove it at all. The library still reads from localStorage, so a
// partial or failed migration costs the visitor nothing — they do not notice,
// and the next sign-in tries again. Clearing it becomes safe only once the
// library reads from Supabase instead, which is a later step.
//
// Upserted on (user_id, content_type, content_slug), so signing in on a second
// device merges that device's saves rather than duplicating the first's.
export async function migrateFavourites(userId) {
  if (!userId) return { attempted: 0, saved: 0, error: null };

  const rows = [];
  for (const [key, contentType] of FAVOURITE_SOURCES) {
    for (const id of readFavorites(key)) {
      const value = String(id).trim();
      if (value) rows.push({ user_id: userId, content_type: contentType, content_slug: value });
    }
  }

  if (rows.length === 0) return { attempted: 0, saved: 0, error: null };

  const { error } = await supabaseAuth
    .from('user_favourites')
    .upsert(rows, { onConflict: 'user_id,content_type,content_slug', ignoreDuplicates: true });

  // A failure is reported, not thrown. Losing the migration must never cost
  // someone the account they just created — localStorage still holds it all.
  return { attempted: rows.length, saved: error ? 0 : rows.length, error: error || null };
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

  const { error } = await supabaseAuth.from('user_profiles').upsert(
    {
      id: userId,
      user_type:
        userType === USER_TYPES.practitioner ? USER_TYPES.practitioner : USER_TYPES.explorer,
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  return { error: error || null };
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

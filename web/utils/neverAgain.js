import { createClient } from '@supabase/supabase-js';

// NEVER AGAIN (owner, 20 Nov 2026; migration 0055), after BSWA asked to be
// removed. Two lists, both service role only:
//
//   do_not_contact_emails  addresses Spiritpedia never writes to again,
//                          whatever listing they are on, even after the
//                          listing is deleted. Admin → "Do not contact this
//                          email address" (a listing's Outreach tab, and
//                          Admin → Outreach).
//   do_not_revive          listings removed at the owner's request, never
//                          researched or added again (README §18.7). Admin →
//                          Delete → "Removed at owner's request — never
//                          re-add".
//
// The database is the backstop for both (0055's triggers): a do-not-contact
// address is cleared from any listing it is written to, and a healer from
// the do-not-revive list can't be created again. Everything here is the
// check before that, so the admin and the scripts can say why.

export const DO_NOT_CONTACT_NOTE = 'The owner marked this address do not contact.';

// Lower case, no spaces, or null when it isn't an address.
export function normaliseEmail(email) {
  const value = (email || '').trim().toLowerCase();
  return value.includes('@') ? value : null;
}

// A website as 0055's site_key compares it: no scheme, no www., no trailing
// slash. bswa.org and https://www.bswa.org/ are one site; bswa.org/teachers/x
// is another page, so a teacher on the same site isn't caught.
export function siteKey(url) {
  const value = (url || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/+$/, '');
  return value || null;
}

// The do-not-revive row a listing matches, by slug, name or website, or null.
// Pure, so the rule is tested.
export function reviveMatch(list, { slug, name, website }) {
  const wantName = (name || '').trim().toLowerCase();
  const wantSite = siteKey(website);
  return (
    (list || []).find(
      (row) =>
        (slug && row.healer_slug === slug) ||
        (wantName && (row.name || '').trim().toLowerCase() === wantName) ||
        (wantSite && siteKey(row.website_url) === wantSite)
    ) || null
  );
}

// A table 0055 adds that the database hasn't got yet (Postgres 42P01,
// PostgREST PGRST205).
export function isMissingTable(error) {
  return ['42P01', 'PGRST205'].includes(error?.code);
}

// The service role client, made here rather than through supabaseAdmin.js so
// that utils/email.js can use it without pulling in next/headers.
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Is any of these addresses do not contact?
//   true   one is: send nothing
//   false  none is (or 0055 hasn't run, so there is no list yet)
//   null   the lookup failed: send nothing now
export async function isDoNotContactEmail(addresses, supabase = serviceClient()) {
  const wanted = [...new Set((Array.isArray(addresses) ? addresses : [addresses]).map(normaliseEmail).filter(Boolean))];
  if (!wanted.length) return false;
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('do_not_contact_emails').select('email').in('email', wanted).limit(1);
    if (error) {
      if (isMissingTable(error)) return false;
      console.error('[never-again] do-not-contact lookup failed:', error.message);
      return null;
    }
    return data.length > 0;
  } catch (err) {
    console.error('[never-again] do-not-contact lookup failed:', err);
    return null;
  }
}

// Every do-not-contact address, as a Set, for lists like Up next. Empty
// before 0055.
export async function doNotContactEmails(supabase) {
  const { data, error } = await supabase.from('do_not_contact_emails').select('email');
  if (error) {
    if (isMissingTable(error)) return new Set();
    throw error;
  }
  return new Set((data || []).map((row) => row.email));
}

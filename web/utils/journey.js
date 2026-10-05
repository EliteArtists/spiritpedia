// Shared by the admin routes and the daily cron, so "has this been claimed?"
// and "what is due next?" cannot drift between them.

import { JOURNEY_EMAILS, JOURNEY_SCHEDULE } from './email.js';

export const DAY_MS = 24 * 60 * 60 * 1000;

// THE STOP SIGNAL. A claim writes user_profiles.linked_healer_slug and nothing
// else — healers carries no owner column — so this is the only way to know, and
// it needs the service role: user_profiles RLS is own-row-only, so the anon key
// reads nothing here and would report every healer as unclaimed.
export async function isClaimed(supabase, slug) {
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('linked_healer_slug', slug)
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

export function sentAtColumn(n) {
  return `email_${n}_sent_at`;
}

// When email n is due, counted from started_at rather than from the previous
// send: a late send must not push the rest of the sequence back with it.
export function dueAt(journey, n) {
  const days = JOURNEY_SCHEDULE[n - 1];
  if (days === undefined) return null;
  return new Date(new Date(journey.started_at).getTime() + days * DAY_MS);
}

// The lowest-numbered email that has not gone and is now due. Lowest-numbered
// on purpose: if a cron run is missed, the backlog is worked through one a day
// rather than three at once landing in somebody's inbox together.
export function nextDue(journey, now = new Date()) {
  for (let n = 1; n <= JOURNEY_EMAILS; n += 1) {
    if (journey[sentAtColumn(n)]) continue;
    const due = dueAt(journey, n);
    if (due && due <= now) return n;
    return null;
  }
  return null;
}

// Every email with its state, for the admin card.
export function schedule(journey) {
  return Array.from({ length: JOURNEY_EMAILS }, (_, i) => {
    const n = i + 1;
    const sentAt = journey[sentAtColumn(n)];
    return {
      number: n,
      sentAt: sentAt || null,
      dueAt: dueAt(journey, n)?.toISOString() || null,
    };
  });
}

// The explorer unsubscribe (email_preferences, migration 0025): the links and
// headers an opt-out email carries, and who may still be sent one. Plain
// functions with no imports beyond emailParts, so they are tested on their own
// (unsubscribe.test.mjs).

import { SITE } from './emailParts.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isToken(value) {
  return typeof value === 'string' && UUID.test(value);
}

// The page a person lands on from the link in the email. It asks before it
// unsubscribes, because mail scanners open every link they find.
export function unsubscribePageUrl(token) {
  return `${SITE}/unsubscribe?token=${encodeURIComponent(token)}`;
}

// One-click unsubscribe (RFC 8058): Gmail and Apple Mail POST to this from
// their own "Unsubscribe" button, with no page in between.
export function unsubscribeHeaders(token) {
  return {
    'List-Unsubscribe': `<${SITE}/api/email/unsubscribe?token=${encodeURIComponent(token)}>, <mailto:love@spiritpedia.co?subject=Unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

// Day 4 goes to explorers only — never to anyone who has applied as a
// practitioner, including a declined applicant (whose account reads explorer
// again but keeps verification_status 'rejected'), and never to anyone who
// manages a listing.
export function isExplorerForDay4(profile) {
  return (
    profile?.user_type === 'explorer' &&
    profile.verification_status !== 'rejected' &&
    !profile.linked_healer_slug &&
    !profile.linked_publisher_id
  );
}

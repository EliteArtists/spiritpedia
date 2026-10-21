import { getResend } from './resend.js';
import { claimDecisionMessage } from './claimRequests.js';
import { submissionDecisionMessage } from './contentSubmissions.js';
import { SITE } from './emailParts.js';
import {
  OUTREACH_EMAILS,
  applicationApproved,
  explorerWelcome,
  outreachEmail,
  practitionerFirstName,
  practitionerWelcome,
  reviewApproved,
  reviewReceived,
  reviewRejected,
  reviewReported,
} from './emailTemplates.js';

// SERVER ONLY, because utils/resend.js is. Importing this from a client
// component would put the SDK in a public bundle and leave RESEND_API_KEY
// undefined besides.
//
// Everything Spiritpedia sends goes through sendEmail, so the from address,
// the reply-to and the failure policy are decided once. The support address is
// love@spiritpedia.co everywhere — app/account/page.js, PractitionerDashboard.jsx
// and the legal pages — and a copy per template is how those once drifted apart.
//
// NOT the sign-in codes. Those are sent by Supabase Auth from inside Supabase's
// own infrastructure and never touch this file.

// The sending identity lives on a subdomain so that a deliverability problem
// with transactional mail cannot damage the reputation of the root domain the
// team send from by hand.
const FROM = 'Spiritpedia <hello@accounts.spiritpedia.co>';

// Where a reply lands. Deliberately not the from address: nobody reads
// accounts@, and an email people cannot answer is a dead end.
const REPLY_TO = 'love@spiritpedia.co';

// Admin notifications. A constant rather than an env var for now, because it
// is a Spiritpedia address rather than a deployment detail — but it is the one
// line to change if that stops being true.
export const ADMIN_EMAIL = 'love@spiritpedia.co';

// A blind copy of everything the platform sends, so there is an archive of what
// went out while nothing in the schema records it. Blind rather than cc: the
// recipient should not see an internal address on their welcome email, and
// replying to all should not reach it.
//
// Worth revisiting when volume grows — this inbox receives one message per
// member action, forever.
const BCC = 'spiritpedialove@gmail.com';

// A FAILED EMAIL MUST NEVER FAIL THE ACTION THAT TRIGGERED IT.
//
// Approving a practitioner publishes them; whether the congratulations arrived
// is a separate question with a separate answer. Resend being down must not
// roll that back, so this swallows everything and logs. The same reasoning as
// migrateFavourites: "a failure is reported, not thrown".
//
// The consequence, stated plainly: there is no record of a send and no retry.
// Nothing in the schema remembers that an email went out, so a lost one is
// lost. That is acceptable while these are courtesies; it stops being
// acceptable the moment anything depends on receipt.
// `from` overrides the default identity for the one case that needs it: cold
// outreach, which must come from a person's address rather than accounts@. Every
// other sender omits it and is unaffected.
// `headers` carries List-Unsubscribe on the emails someone can opt out of.
export async function sendEmail({ to, subject, html, text, from = FROM, headers }) {
  if (!process.env.RESEND_API_KEY) {
    console.error('[email] RESEND_API_KEY is not set — nothing sent');
    return { sent: false, error: 'no_api_key' };
  }

  try {
    // Constructed here, not at module load: the client must not exist until
    // something actually sends, or `next build` evaluates this file without an
    // environment and the constructor throws.
    const { data, error } = await getResend().emails.send({
      from,
      replyTo: REPLY_TO,
      bcc: BCC,
      to,
      subject,
      html,
      text,
      ...(headers ? { headers } : {}),
    });

    // The SDK resolves rather than throws for a rejected send — an unverified
    // domain comes back in `error`, not as an exception — so a try/catch alone
    // would report success for an email that was never accepted.
    if (error) {
      console.error('[email] send rejected:', error);
      return { sent: false, error };
    }

    return { sent: true, id: data?.id || null };
  } catch (err) {
    console.error('[email] send failed:', err);
    return { sent: false, error: err };
  }
}

// What to call someone. full_name is free text and often absent, so this takes
// the first word, or '' when there is none — and greeting() (utils/emailParts.js)
// then says "Hello," rather than "Hi null" or "Hi there".
export function firstNameFrom(fullName) {
  const name = (fullName || '').trim();
  if (!name) return '';
  return name.split(/\s+/)[0] || name;
}

/* ── 1. EXPLORER WELCOME ───────────────────────────────────────────────── */

// The app and website versions differ; platform is user_profiles.signup_platform.
export async function sendExplorerWelcome({ email, firstName, platform }) {
  return sendEmail({ to: email, ...explorerWelcome({ firstName, platform }) });
}

// Where a review's subject lives on the public site, keyed by content_type.
// The paths are not derivable from the type — 'course' lives under /offerings
// and 'free_resource' under /free-resources — so they are written out.
const CONTENT_PATHS = {
  book: '/books',
  video: '/videos',
  course: '/offerings',
  free_resource: '/free-resources',
};

export function contentUrl(contentType, contentSlug) {
  const path = CONTENT_PATHS[contentType];
  return path ? `${SITE}${path}/${contentSlug}` : SITE;
}

/* ── 2. PRACTITIONER WELCOME ───────────────────────────────────────────── */

export async function sendPractitionerWelcome({ email, firstName }) {
  return sendEmail({ to: email, ...practitionerWelcome({ firstName }) });
}

/* ── 3. REVIEW RECEIVED ────────────────────────────────────────────────── */

export async function sendReviewReceived({ email, firstName, title, creatorName }) {
  return sendEmail({ to: email, ...reviewReceived({ firstName, title, creatorName }) });
}

/* ── 4. REVIEW APPROVED ────────────────────────────────────────────────── */

export async function sendReviewApproved({ email, firstName, title, creatorName, url }) {
  return sendEmail({ to: email, ...reviewApproved({ firstName, title, creatorName, url }) });
}

/* ── 5. REVIEW REJECTED ────────────────────────────────────────────────── */

// reason is what the admin wrote for the reviewer (D11), never a private note.
export async function sendReviewRejected({ email, firstName, title, creatorName, reason }) {
  return sendEmail({ to: email, ...reviewRejected({ firstName, title, creatorName, reason }) });
}

/* ── 5b. CLAIM DECIDED ─────────────────────────────────────────────────── */

// A "Request to claim it" was approved or rejected in the Inbox
// (/api/admin/claim-request). The wording is in utils/claimRequests.js.
export async function sendClaimDecision({ email, firstName, decision, listingName, reason }) {
  const message = claimDecisionMessage({ decision, firstName, listingName, reason });
  return sendEmail({ to: email, ...message });
}

/* ── 5c. LISTING LIVE ──────────────────────────────────────────────────── */

// The admin approved someone's listing (/api/admin/practitioner): D3 in the
// approved copy, utils/emailTemplates.js.
export async function sendListingLive({ email, firstName, listingName, listingPath }) {
  return sendEmail({
    to: email,
    ...applicationApproved({ firstName, listingName, listingUrl: `${SITE}${listingPath}` }),
  });
}

/* ── 5d. CONTENT DECIDED ───────────────────────────────────────────────── */

// The admin approved or turned down something an owner added or changed
// (/api/admin/submissions, migration 0024). The wording is in
// utils/contentSubmissions.js.
export async function sendSubmissionDecision({
  email,
  firstName,
  decision,
  kind,
  title,
  what,
  contentType,
  slug,
  reason,
  note,
}) {
  const message = submissionDecisionMessage({
    decision,
    kind,
    firstName,
    title,
    what,
    itemUrl: contentUrl(contentType, slug),
    accountUrl: `${SITE}/account`,
    reason,
    note,
    supportEmail: ADMIN_EMAIL,
  });
  return sendEmail({ to: email, ...message });
}

/* ── 6. REVIEW REPORTED (to the admin) ─────────────────────────────────── */

// A member reported a review from the app (review_reports, migration 0015).
// To the admin, at once: Apple's guideline 1.2 expects reports to be acted on
// within 24 hours, and the Terms promise it. renderEmail escapes everything.
const REPORT_REASONS = {
  spam: 'Spam or advertising',
  offensive: 'Offensive or hateful',
  harassment: 'Harassment or bullying',
  misleading: 'False or misleading',
  other: 'Something else',
};


export async function sendReviewReported({ report, title, adminUrl }) {
  return sendEmail({
    to: ADMIN_EMAIL,
    ...reviewReported({
      title,
      reviewId: report.review_id,
      reportId: report.id,
      reason: REPORT_REASONS[report.reason] || report.reason,
      reportedAt: report.created_at,
      adminUrl,
    }),
  });
}

/* ── HEALER OUTREACH JOURNEY ───────────────────────────────────────────── */

// Cold outreach to a practitioner who has a listing but has not joined: C1–C8
// in the approved copy (utils/emailTemplates.js → outreachEmail).
//
// FROM A PERSON, NOT A SYSTEM. Every other email here comes from
// accounts@spiritpedia.co, which is right for a receipt and wrong for a letter
// asking somebody if they would like to talk. This one comes from the address
// that replies land in, so the whole exchange happens in one thread.
//
// THE WORDING IS LOAD-BEARING. The recipient has not joined, has not approved
// anything and has not agreed to be listed. Every template says so plainly and
// offers removal in the same breath.
const JOURNEY_FROM = 'Spiritpedia <love@spiritpedia.co>';

// Days from started_at. Index 0 is email 1, which goes immediately.
export const JOURNEY_SCHEDULE = [0, 21, 42, 63, 84, 105, 126, 147];

export const JOURNEY_EMAILS = OUTREACH_EMAILS;

// The links every outreach email carries. The claim link works signed out:
// /auth/claim sends a visitor with no account through sign-up and back.
export function outreachLinks(healerSlug) {
  const slug = encodeURIComponent(healerSlug);
  return {
    profileUrl: `${SITE}/healers/${slug}`,
    claimUrl: `${SITE}/auth/claim?slug=${slug}`,
  };
}

// Has this address bounced or complained before? Resend keeps that list
// (suppressions), and a send to an address on it is accepted and then never
// delivered — so the journey asks first.
//   true  — on the list: stop writing to it
//   false — not on it
//   null  — the lookup failed: send nothing now and try again tomorrow
export async function isSuppressed(address) {
  if (!process.env.RESEND_API_KEY) return null;
  try {
    const { data, error } = await getResend().suppressions.get(address);
    if (data) return true;
    if (error?.name === 'not_found' || error?.statusCode === 404) return false;
    console.error('[email] suppression lookup failed:', error);
    return null;
  } catch (err) {
    console.error('[email] suppression lookup failed:', err);
    return null;
  }
}

// → { sent, recipient } on success, or { sent: false, suppressed: true } when
// the practitioner's address is on the suppression list (the caller stops the
// journey), or { sent: false, error } for anything to retry.
export async function sendJourneyEmail({ emailNumber, to, healerName, healerSlug }) {
  // A TEST OVERRIDE THAT CANNOT BE FORGOTTEN BY ACCIDENT. While
  // JOURNEY_TEST_EMAIL is set, every journey email goes there instead of to the
  // practitioner — so a mistake during setup reaches one inbox rather than a
  // stranger's. Unset it in production and real outreach begins.
  const recipient = process.env.JOURNEY_TEST_EMAIL || to;
  if (!to || !recipient) return { sent: false, error: 'no_recipient' };

  const template = outreachEmail(emailNumber, {
    firstName: practitionerFirstName(healerName),
    ...outreachLinks(healerSlug),
  });
  if (!template) {
    return { sent: false, error: `journey email ${emailNumber} has no template` };
  }

  // The practitioner's own address is what decides whether the journey goes
  // on, even while the test inbox receives the emails.
  const suppressed = await isSuppressed(to);
  if (suppressed === true) return { sent: false, suppressed: true, recipient };
  if (suppressed === null) return { sent: false, error: 'suppression_check_failed', recipient };
  if (recipient !== to && (await isSuppressed(recipient)) !== false) {
    return { sent: false, error: 'test_inbox_suppressed_or_unknown', recipient };
  }

  // No html key at all, not an empty one: Resend builds a text/plain message
  // when html is absent, and a multipart one the moment it is present.
  const result = await sendEmail({
    to: recipient,
    from: JOURNEY_FROM,
    subject: template.subject,
    text: template.text,
  });

  return { ...result, recipient };
}

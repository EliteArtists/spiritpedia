import { getResend } from './resend.js';
import { claimDecisionMessage } from './claimRequests.js';
import { submissionDecisionMessage } from './contentSubmissions.js';
import { SITE, greeting } from './emailParts.js';
import {
  applicationApproved,
  explorerWelcome,
  practitionerWelcome,
  reviewApproved,
  reviewReceived,
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
export async function sendEmail({ to, subject, html, text, from = FROM }) {
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

// The old wording until the admin can record a reason for the member (the
// approved copy's D11 needs one); only the greeting follows the new rule.
export async function sendReviewRejected({ email, firstName, title, creatorName }) {
  const hi = greeting(firstName);
  const byLine = (name) => (name ? ` by ${name}` : '');
  return sendEmail({
    to: email,
    subject: `An update on your review of ${title}`,
    text: `${hi}

Thank you for taking the time to review ${title}${byLine(creatorName)}.

After assessing your submission, we're unable to publish your review.

Please email ${ADMIN_EMAIL} for more information. Or reply to this email.

If you think we've misunderstood your review, please do reply to this email.

With love,
The Spiritpedia team`,
    html: `<p>${hi}</p><p>Thank you for taking the time to review ${title}${byLine(creatorName)}.</p><p>After assessing your submission, we're unable to publish your review.</p><p>Please email <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a> for more information. Or reply to this email.</p><p>If you think we've misunderstood your review, please do reply to this email.</p><p>With love,<br>The Spiritpedia team</p>`,
  });
}

/* ── 5b. CLAIM DECIDED ─────────────────────────────────────────────────── */

// A "Request to claim it" was approved or rejected in the Inbox
// (/api/admin/claim-request). The wording is in utils/claimRequests.js.
export async function sendClaimDecision({ email, firstName, decision, listingName }) {
  const message = claimDecisionMessage({
    decision,
    firstName,
    listingName,
    supportEmail: ADMIN_EMAIL,
  });
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

// Cold outreach to a practitioner who has a listing but has not joined.
//
// FROM A PERSON, NOT A SYSTEM. Every other email here comes from
// accounts@spiritpedia.co, which is right for a receipt and wrong for a letter
// asking somebody if they would like to talk. This one comes from the address
// that replies land in, so the whole exchange happens in one thread.
//
// THE WORDING IS LOAD-BEARING. The recipient has not joined, has not approved
// anything and has not agreed to be listed. Every template has to say so
// plainly and offer removal in the same breath; anything that implies consent
// they never gave is both untrue and the fastest way to be reported as spam.
const JOURNEY_FROM = 'Spiritpedia <love@spiritpedia.co>';

// Days from started_at. Index 0 is email 1, which goes immediately.
export const JOURNEY_SCHEDULE = [0, 21, 42, 63, 84];

export const JOURNEY_EMAILS = 5;

// PLAIN TEXT, NO HTML, AND THAT IS THE POINT.
//
// A multipart email with an HTML body and anchor tags is what Gmail's tabbed
// inbox reads as marketing, and it sorts it into Promotions where cold outreach
// dies unseen. These carry a text part only, no markup and no links at all —
// every call to action is "reply to this email", which is also the honest ask:
// the reply is the conversation we actually want.
//
// It has a second effect worth naming. With nothing to click, the practitioner
// cannot be sent anywhere they did not choose to go, and the listing's address
// is only given to somebody who asks for it.
function journeyTemplates({ firstName }) {
  const hi = greeting(firstName);
  return {
    1: {
      subject: 'We came across your work',
      text: `${hi}

We came across your work on social sites and wanted to get in contact.

Spiritpedia is a place where people can discover spiritual teachers, practitioners, explore their work and pay for their services. We'd love to interview you about what you do and the people you help.

Would you be open to a conversation? You can simply reply to this email.

We've also made a short public listing for you from information available online. You can view on the website. Please reply to this email and we will send you the link.

You haven't joined Spiritpedia or approved the listing. If you'd like to take charge of it, you can claim the account by replying to this email.

If anything is inaccurate, or you'd rather we remove the listing, reply to me and I'll take care of it.

The interview is entirely optional.

With love,
The Spiritpedia team`,
    },

    2: {
      subject: 'A place for your work on Spiritpedia',
      text: `${hi}

We wanted to follow up on our invitation to Spiritpedia.

Users can explore the work of Eckhart Tolle, Abraham Hicks, Ram Dass and other established teachers here, alongside practitioners they may be discovering for the first time. We'd love your work to be part of that discovery.

We've created a short public listing for you, but you haven't joined or approved it. Reply to this email if you would like to claim your account.

If you'd prefer us to remove it or stop these emails, simply reply and we'll take care of it.

With love,
The Spiritpedia team`,
    },

    3: {
      subject: 'Help people find your services on Spiritpedia',
      text: `${hi}

Finding a practitioner often starts with a question: who can help me with what I'm going through?

Spiritpedia brings spiritual teachings and practitioner services into the same place. Someone exploring a subject that matters to them can discover a practitioner whose work speaks to that interest, then find out how to get in touch or book a session.

We'd love people to discover what you offer, whether you work online or in person.

Please reply to this email if you would like to claim your account.

If you'd prefer us to remove it or stop these emails, simply reply.

With love,
The Spiritpedia team`,
    },

    4: {
      subject: 'Let people discover your work',
      text: `${hi}

Before someone books a session, they may want to understand your approach and get a feel for the person behind the work.

A Spiritpedia profile can bring your introduction, videos, resources and links together, giving people a place to explore before they get in touch.

The short public listing we created for you is only a starting point. We'd love you to take charge of how your work is represented.

Please reply to this email if you would like to claim your account.

Our invitation to an interview is still open too. If that interests you, just reply.

If you'd prefer us to remove the listing or stop these emails, reply and we'll take care of it.

With love,
The Spiritpedia team`,
    },

    5: {
      subject: 'A final invitation from Spiritpedia',
      text: `${hi}

This is our final follow up about your Spiritpedia listing.

We'd still love to welcome you and hear about your work. If you'd like to speak with us about an interview, simply reply. You're welcome to claim your profile whether or not you choose to be interviewed.

Please reply to this email if you would like to claim your account.

If the timing isn't right, there's nothing you need to do. We won't send any more reminders in this sequence.

If you'd like the public listing removed, reply and we'll take care of it.

With love,
The Spiritpedia team`,
    },
  };
}

// healerSlug is still accepted and no longer read: the templates carry no links
// at all now. Kept in the signature because every caller passes it, and the day
// a template needs the listing's address again it should not take a change at
// four call sites to get it back.
export async function sendJourneyEmail({ emailNumber, to, healerName, healerSlug }) {
  // A TEST OVERRIDE THAT CANNOT BE FORGOTTEN BY ACCIDENT. While
  // JOURNEY_TEST_EMAIL is set, every journey email goes there instead of to the
  // practitioner — so a mistake during setup reaches one inbox rather than a
  // stranger's. Unset it in production and real outreach begins.
  const recipient = process.env.JOURNEY_TEST_EMAIL || to;
  if (!recipient) return { sent: false, error: 'no_recipient' };

  const template = journeyTemplates({ firstName: firstNameFrom(healerName) })[emailNumber];

  if (!template) {
    return { sent: false, error: `journey email ${emailNumber} has no template yet` };
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

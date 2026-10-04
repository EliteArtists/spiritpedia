import { getResend } from './resend.js';

// SERVER ONLY, because utils/resend.js is. Importing this from a client
// component would put the SDK in a public bundle and leave RESEND_API_KEY
// undefined besides.
//
// Everything Spiritpedia sends goes through sendEmail, so the from address,
// the reply-to and the failure policy are decided once. Two files already
// disagree about the support address — app/account/page.js says
// love@spiritpedia.co and PractitionerDashboard.jsx says hello@spiritpedia.co —
// and a third copy per template would make that permanent.
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
export async function sendEmail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY) {
    console.error('[email] RESEND_API_KEY is not set — nothing sent');
    return { sent: false, error: 'no_api_key' };
  }

  try {
    // Constructed here, not at module load: the client must not exist until
    // something actually sends, or `next build` evaluates this file without an
    // environment and the constructor throws.
    const { data, error } = await getResend().emails.send({
      from: FROM,
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
// the first word and falls back twice rather than greeting anybody "Hi null".
export function firstNameFrom(fullName) {
  const name = (fullName || '').trim();
  if (!name) return 'there';
  return name.split(/\s+/)[0] || name;
}

/* ── 1. EXPLORER WELCOME ───────────────────────────────────────────────── */

export async function sendExplorerWelcome({ email, firstName }) {
  return sendEmail({
    to: email,
    subject: 'Welcome to Spiritpedia',
    text: `Hi ${firstName},

Welcome to Spiritpedia. It's a place to follow the teachers, practices and ideas that speak to you, and to discover where they lead next.

Start by adding a few favourites. You can save people, platforms and resources to My Library. As your library grows, the discoveries we share with you will become more personal.

Explore Spiritpedia: https://spiritpedia.co

With love,
The Spiritpedia team`,
    html: `<p>Hi ${firstName},</p><p>Welcome to Spiritpedia. It's a place to follow the teachers, practices and ideas that speak to you, and to discover where they lead next.</p><p>Start by adding a few favourites. You can save people, platforms and resources to My Library. As your library grows, the discoveries we share with you will become more personal.</p><p><a href="https://spiritpedia.co">Explore Spiritpedia</a></p><p>With love,<br>The Spiritpedia team</p>`,
  });
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

const SITE = 'https://spiritpedia.co';

/* ── 2. PRACTITIONER WELCOME ───────────────────────────────────────────── */

export async function sendPractitionerWelcome({ email, firstName }) {
  const link = `${SITE}/auth/practitioner-setup`;

  return sendEmail({
    to: email,
    subject: 'Welcome to Spiritpedia',
    text: `Hi ${firstName},

Welcome to Spiritpedia. We're glad you're here both as a practitioner and as someone who can explore the work of others.

Your practitioner space is where you can tell people about your work and manage the information you share on Spiritpedia. We'll guide you through the next steps from there.

Continue your practitioner setup: ${link}

With love,
The Spiritpedia team`,
    html: `<p>Hi ${firstName},</p><p>Welcome to Spiritpedia. We're glad you're here both as a practitioner and as someone who can explore the work of others.</p><p>Your practitioner space is where you can tell people about your work and manage the information you share on Spiritpedia. We'll guide you through the next steps from there.</p><p><a href="${link}">Continue your practitioner setup</a></p><p>With love,<br>The Spiritpedia team</p>`,
  });
}

/* ── 3. REVIEW RECEIVED ────────────────────────────────────────────────── */

// `by {creator}` is dropped entirely rather than rendered empty when the
// creator is unknown — "your review of X by " reads as a bug.
function byLine(creatorName) {
  return creatorName ? ` by ${creatorName}` : '';
}

export async function sendReviewReceived({ email, firstName, title, creatorName }) {
  return sendEmail({
    to: email,
    subject: `We've received your review of ${title}`,
    text: `Hi ${firstName},

Thank you for reviewing ${title}${byLine(creatorName)}.

Your review is now with our team for assessment. We'll email you once we've reviewed it.

With love,
The Spiritpedia team`,
    html: `<p>Hi ${firstName},</p><p>Thank you for reviewing ${title}${byLine(creatorName)}.</p><p>Your review is now with our team for assessment. We'll email you once we've reviewed it.</p><p>With love,<br>The Spiritpedia team</p>`,
  });
}

/* ── 4. REVIEW APPROVED ────────────────────────────────────────────────── */

export async function sendReviewApproved({ email, firstName, title, creatorName, url }) {
  return sendEmail({
    to: email,
    subject: `Your review of ${title} is now live`,
    text: `Hi ${firstName},

Your review of ${title}${byLine(creatorName)} has been accepted and is now live on Spiritpedia.

Thank you for sharing your experience. Your perspective helps others decide what they'd like to explore.

View your review: ${url}

With love,
The Spiritpedia team`,
    html: `<p>Hi ${firstName},</p><p>Your review of ${title}${byLine(creatorName)} has been accepted and is now live on Spiritpedia.</p><p>Thank you for sharing your experience. Your perspective helps others decide what they'd like to explore.</p><p><a href="${url}">View your review</a></p><p>With love,<br>The Spiritpedia team</p>`,
  });
}

/* ── 5. REVIEW REJECTED ────────────────────────────────────────────────── */

export async function sendReviewRejected({ email, firstName, title, creatorName }) {
  return sendEmail({
    to: email,
    subject: `An update on your review of ${title}`,
    text: `Hi ${firstName},

Thank you for taking the time to review ${title}${byLine(creatorName)}.

After assessing your submission, we're unable to publish your review.

Please email ${ADMIN_EMAIL} for more information. Or reply to this email.

If you think we've misunderstood your review, please do reply to this email.

With love,
The Spiritpedia team`,
    html: `<p>Hi ${firstName},</p><p>Thank you for taking the time to review ${title}${byLine(creatorName)}.</p><p>After assessing your submission, we're unable to publish your review.</p><p>Please email <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a> for more information. Or reply to this email.</p><p>If you think we've misunderstood your review, please do reply to this email.</p><p>With love,<br>The Spiritpedia team</p>`,
  });
}

// The approved wording (docs/email-copy-2026-10-21.md). Copy is final: change
// it there first, then here. Each function returns { subject, text, html } and
// sends nothing — utils/email.js does that — so every template is tested
// without Resend (emailTemplates.test.mjs).

import { SITE, greeting, renderEmail } from './emailParts.js';

// "by [creator name]" is dropped entirely when there is no creator.
function by(creatorName) {
  return creatorName ? ` by ${creatorName}` : '';
}

/* ── B1. EXPLORER WELCOME, Day 0 ───────────────────────────────────────── */

// platform is user_profiles.signup_platform. Only 'app' gets the app version;
// anything else, including an account from before migration 0021, gets the
// website's.
export function explorerWelcome({ firstName, platform }) {
  const body =
    platform === 'app'
      ? [
          'I am your guiding star. We met just a second ago.',
          "Wherever you are in Spiritpedia, tap me once and I'll bring you home. Tap and hold, and I'll take you straight to your Library, where everything you save is waiting for you.",
        ]
      : [
          'I am your guiding star.',
          'Your Library is where everything you save is waiting for you. You can open it using the floating My Library button on the website.',
        ];
  return renderEmail({
    subject: 'Welcome to Spiritpedia ✦',
    blocks: [
      greeting(firstName),
      ...body,
      'As we get to know each other, the discoveries I share will become more personal.',
    ],
    signOff: 'starFarewell',
  });
}

/* ── D1. PRACTITIONER WELCOME ──────────────────────────────────────────── */

export function practitionerWelcome({ firstName }) {
  const name = (firstName || '').trim();
  return renderEmail({
    subject: name ? `Welcome to Spiritpedia, ${name}` : 'Welcome to Spiritpedia',
    blocks: [
      greeting(name),
      "Welcome to Spiritpedia. We're glad you're here.",
      "You're joining a place where people can discover spiritual teachings, explore different approaches and find practitioners whose work speaks to them.",
      'Your account is where you can begin sharing your work and manage your presence on Spiritpedia. Any listing you submit will be reviewed before it goes live.',
      "If you have a question along the way, simply reply. We're here to help.",
      { button: 'Visit your account', url: `${SITE}/account` },
    ],
  });
}

/* ── D3. APPLICATION APPROVED (listing live) ───────────────────────────── */

export function applicationApproved({ firstName, listingName, listingUrl }) {
  const name = listingName || 'Your listing';
  return renderEmail({
    subject: `${name} is now live on Spiritpedia`,
    blocks: [
      greeting(firstName),
      listingName
        ? `Your application for ${listingName} has been approved, and your listing is now live on Spiritpedia.`
        : 'Your application has been approved, and your listing is now live on Spiritpedia.',
      'People can now discover your work and explore the information you\'ve shared.',
      { button: 'View your listing', url: listingUrl },
      "You can manage your listing through your account. We're delighted to welcome your work to Spiritpedia.",
    ],
  });
}

/* ── D7. CLAIM APPROVED ────────────────────────────────────────────────── */

export function claimApproved({ firstName, listingName }) {
  const name = listingName || 'your listing';
  return renderEmail({
    subject: `You can now manage ${name} on Spiritpedia`,
    blocks: [
      greeting(firstName),
      `Your request to manage ${name} has been approved.`,
      "You can now sign in to your Spiritpedia account and manage the listing. Please take a look at the information already there and make any updates you'd like people to see.",
      { button: 'Manage your listing', url: `${SITE}/account` },
      'If you need a hand, simply reply to this email.',
    ],
  });
}

/* ── D9. REVIEW RECEIVED ───────────────────────────────────────────────── */

export function reviewReceived({ firstName, title, creatorName }) {
  return renderEmail({
    subject: `We've received your review of ${title}`,
    blocks: [
      greeting(firstName),
      `Thank you for sharing your thoughts on ${title}${by(creatorName)}.`,
      "Your review is now with the Spiritpedia team for assessment. I'll let you know once they've reviewed it.",
      "Your experience could help another explorer decide what they'd like to discover next.",
    ],
    signOff: 'star',
  });
}

/* ── D10. REVIEW APPROVED ──────────────────────────────────────────────── */

export function reviewApproved({ firstName, title, creatorName, url }) {
  return renderEmail({
    subject: `Your review of ${title} is now live`,
    blocks: [
      greeting(firstName),
      `Your review of ${title}${by(creatorName)} has been approved by the Spiritpedia team and is now live.`,
      'Thank you for adding your voice. Your perspective may help someone else find their next discovery.',
      { button: 'View your review', url },
    ],
    signOff: 'star',
  });
}

/* ── D12. REVIEW REPORTED (to the admin) ───────────────────────────────── */

// Admin only. Nothing about the reporter is in it, so it can never be passed
// on to the reviewed practitioner by mistake.
export function reviewReported({ title, reviewId, reportId, reason, reportedAt, adminUrl }) {
  return renderEmail({
    subject: `Review reported on ${title}`,
    blocks: [
      'Hello,',
      'A review has been reported and needs assessment.',
      [
        `Item: ${title}`,
        `Review reference: ${reviewId ?? 'not recorded'}`,
        `Report reference: ${reportId}`,
        `Reported reason: ${reason}`,
        `Reported at: ${formatWhen(reportedAt)}`,
      ].join('\n'),
      { button: 'Review report in admin', url: adminUrl },
      'A report is a request for assessment. It does not, by itself, mean the review should be removed.',
    ],
    signOff: 'plain',
  });
}

// "21 October 2026, 14:05 UTC". UTC rather than a guess at the reader's zone.
export function formatWhen(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'not recorded';
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return `${day}, ${time} UTC`;
}

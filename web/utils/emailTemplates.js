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

/* ── C1–C8. PRACTITIONER OUTREACH ──────────────────────────────────────── */

// The first name in a listing's name, past any title: "Dr Jane Smith" → Jane.
// '' when there is nothing usable, and the greeting is then "Hello,".
const TITLES = new Set(['dr', 'mr', 'mrs', 'ms', 'miss', 'mx', 'prof', 'professor', 'rev', 'revd', 'sir', 'dame']);
export function practitionerFirstName(listingName) {
  const words = (listingName || '').trim().split(/\s+/).filter(Boolean);
  const first = words.find((word) => !TITLES.has(word.toLowerCase().replace(/\.$/, '')));
  return first || '';
}

// Removal and stopping are offered in every email, and nothing promises
// bookings, exposure or prices: the wording is the approved copy, unchanged.
const OUTREACH = {
  1: {
    subject: 'An invitation from Spiritpedia',
    body: ({ profileUrl, claimUrl }) => [
      'We came across your work on social sites and wanted to get in contact.',
      "Spiritpedia is a place where people can discover spiritual teachers and practitioners, explore their work and find out how to book their services. We'd love to interview you about what you do and the people you help. Would you be open to a conversation? You can simply reply to this email.",
      `We've also made a short public listing for you from information available online. You can view it here: ${profileUrl}. You haven't joined Spiritpedia or approved the listing. If you'd like to take charge of it, you can claim it here: ${claimUrl}.`,
      "If anything is inaccurate, or you'd rather we remove the listing, reply and we'll take care of it. The interview is entirely optional.",
    ],
  },
  2: {
    subject: 'A place for your work on Spiritpedia',
    body: ({ profileUrl, claimUrl }) => [
      'We wanted to follow up on our invitation to Spiritpedia.',
      "People can explore the work of Eckhart Tolle, Abraham Hicks, Ram Dass and other established teachers here, alongside practitioners they may be discovering for the first time. We'd love your work to be part of that discovery.",
      `We've created a short public listing for you, but you haven't joined or approved it. You can view it here: ${profileUrl}.`,
      `If you'd like to take charge of it, you can claim it here: ${claimUrl}.`,
      "If you'd prefer us to remove it or stop these emails, simply reply and we'll take care of it.",
    ],
  },
  3: {
    subject: 'Help people find the services you offer',
    body: ({ profileUrl, claimUrl }) => [
      "Finding a practitioner often starts with a question: who can help me with what I'm going through?",
      'Spiritpedia brings spiritual teachings and practitioner services into the same place. Someone exploring a subject that matters to them can discover a practitioner whose work speaks to that interest, then find out how to get in touch or book a session.',
      "We'd love people to discover what you offer, whether you work online or in person.",
      `Here's the public listing we made for you: ${profileUrl}.`,
      `You can claim it here: ${claimUrl}.`,
      "If you'd prefer us to remove it or stop these emails, simply reply.",
    ],
  },
  4: {
    subject: 'Let people get to know your work',
    body: ({ profileUrl, claimUrl }) => [
      'Before someone books a session, they may want to understand your approach and get a feel for the person behind the work.',
      'A Spiritpedia profile can bring your introduction, videos, resources and links together, giving people a place to explore before they get in touch.',
      "The short public listing we created for you is only a starting point. We'd love you to take charge of how your work is represented.",
      links(profileUrl, claimUrl),
      'Our invitation to an interview is still open too. If that interests you, just reply.',
      "If you'd prefer us to remove the listing or stop these emails, reply and we'll take care of it.",
    ],
  },
  5: {
    subject: 'Give people a reason to return to your work',
    body: ({ profileUrl, claimUrl }) => [
      'Not everyone is ready to book a session the first time they discover a practitioner.',
      'They might want to watch a video, explore a resource or simply save your profile for another day. On Spiritpedia, people can keep their favourites in their own Library, making it easier to return to the work that interests them.',
      'Your listing gives them somewhere to begin, and somewhere to come back to when they want to learn more or get in touch.',
      links(profileUrl, claimUrl),
      "If you'd prefer us to remove the listing or stop these emails, simply reply.",
    ],
  },
  6: {
    subject: "We'd love to hear the story behind your work",
    body: ({ profileUrl, claimUrl }) => [
      'What brought you to the work you do today?',
      "That's part of what we'd love to explore in an interview: how you began, what your approach involves, and what you'd like people to understand before working with you.",
      "It's a chance for people to hear from you directly and get to know the person behind the profile.",
      "If you're interested, reply and we can talk about what would work for you. You don't need to claim your listing to discuss an interview, and you don't need to do an interview to claim it.",
      links(profileUrl, claimUrl),
      "If you'd prefer us to remove the listing or stop these emails, simply reply.",
    ],
  },
  7: {
    subject: 'Your work, in your own words',
    body: ({ profileUrl, claimUrl }) => [
      "The public listing we created uses information available online. It may not tell the whole story of your work, and we haven't assumed that you approve it.",
      'Claiming the listing begins the process of putting you in charge of how your work is represented on Spiritpedia.',
      "Perhaps there's something you'd like to clarify about your approach, the services you offer or how people should contact you. We'd love the page to reflect what you want people to know.",
      links(profileUrl, claimUrl),
      "You can also reply with a correction or removal request without claiming anything. If you'd like us to stop these emails, just let us know.",
    ],
  },
  8: {
    subject: 'A final invitation from Spiritpedia',
    body: ({ profileUrl, claimUrl }) => [
      'This is our final follow-up about your Spiritpedia listing.',
      "We'd still love to welcome you and hear about your work. If you'd like to speak with us about an interview, simply reply. You're welcome to claim your profile whether or not you choose to be interviewed.",
      links(profileUrl, claimUrl),
      "If the timing isn't right, there's nothing you need to do. We won't send any more reminders in this sequence.",
      "If you'd like the public listing removed, reply and we'll take care of it.",
    ],
  },
};

function links(profileUrl, claimUrl) {
  return `View your listing: ${profileUrl}\nClaim your profile: ${claimUrl}`;
}

export const OUTREACH_EMAILS = Object.keys(OUTREACH).length;

// PLAIN TEXT ONLY: { subject, text }, no html. A multipart email with markup
// is what Gmail's tabbed inbox files under Promotions, where cold outreach
// goes unseen; the two links are written out in full and mail clients make
// them clickable. null for a number with no template.
export function outreachEmail(n, { firstName, profileUrl, claimUrl }) {
  const template = OUTREACH[n];
  if (!template) return null;
  const { text } = renderEmail({
    subject: template.subject,
    blocks: [greeting(firstName), ...template.body({ profileUrl, claimUrl })],
  });
  return { subject: template.subject, text };
}

/* ── D2. APPLICATION RECEIVED ──────────────────────────────────────────── */

export function applicationReceived({ firstName, listingName }) {
  return renderEmail({
    subject: listingName ? `We've received your application for ${listingName}` : "We've received your application",
    blocks: [
      greeting(firstName),
      listingName
        ? `Thank you for submitting ${listingName} to Spiritpedia.`
        : 'Thank you for submitting your application to Spiritpedia.',
      "Your application is now with our team for review. We'll email you when we've made a decision, or if we need anything else from you.",
      "There's nothing more you need to do for now.",
    ],
  });
}

/* ── D4. APPLICATION DECLINED ──────────────────────────────────────────── */

// reason is what the admin wrote for the applicant, never a private note.
export function applicationDeclined({ firstName, listingName, reason }) {
  return renderEmail({
    subject: 'An update on your Spiritpedia application',
    blocks: [
      greeting(firstName),
      listingName
        ? `Thank you for your application for ${listingName}.`
        : 'Thank you for your application.',
      "After reviewing it, we're unable to approve the listing at this time.",
      `Reason: ${reason}`,
      "If you think we've misunderstood something, or you'd like to clarify the information you submitted, please reply to this email.",
    ],
    signOff: 'plain',
  });
}

/* ── D5. CLAIM REQUEST RECEIVED ────────────────────────────────────────── */

export function claimRequestReceived({ firstName, listingName }) {
  const name = listingName || 'a listing';
  return renderEmail({
    subject: `We've received your request to manage ${name}`,
    blocks: [
      greeting(firstName),
      `Thank you for asking to manage ${name} on Spiritpedia.`,
      "We've received your request and will check that you're authorised to manage the listing before giving you access. We may contact you or the email address published on the listing to confirm ownership.",
      "We'll email you once your request has been reviewed. You don't need to submit another request.",
    ],
  });
}

/* ── D6. OWNERSHIP CONFIRMATION ────────────────────────────────────────── */

// To the listing's own published address, never the claimant's. A reply is
// read by the admin; nothing in it grants access by itself.
export function ownershipCheck({ claimantEmail, listingName, listingUrl }) {
  return renderEmail({
    subject: `Please confirm a request to manage ${listingName}`,
    blocks: [
      'Hello,',
      `We've received a request from ${claimantEmail} to manage this Spiritpedia listing:`,
      `${listingName}\n${listingUrl}`,
      'Before we give anyone access, please reply to confirm whether this person is authorised to manage the listing on your behalf.',
      "If that's you, simply tell us that you made the request.",
      "If you don't recognise the request, let us know. No access has been granted through this request, and we won't approve it without completing our checks.",
    ],
    signOff: 'plain',
  });
}

/* ── D8. CLAIM DECLINED ────────────────────────────────────────────────── */

export function claimDeclined({ firstName, listingName, reason }) {
  const name = listingName || 'the listing';
  return renderEmail({
    subject: `An update on your request to manage ${name}`,
    blocks: [
      greeting(firstName),
      `We've reviewed your request to manage ${name} on Spiritpedia and are unable to approve it at this time.`,
      `Reason: ${reason}`,
      'Access to the listing has not been granted through this request.',
      "If you can provide further information confirming that you're authorised to manage it, or you think we've misunderstood your request, please reply.",
    ],
    signOff: 'plain',
  });
}

/* ── D11. REVIEW REJECTED ──────────────────────────────────────────────── */

export function reviewRejected({ firstName, title, creatorName, reason }) {
  return renderEmail({
    subject: `An update on your review of ${title}`,
    blocks: [
      greeting(firstName),
      `Thank you for taking the time to review ${title}${by(creatorName)}.`,
      "After assessing your submission, we're unable to publish your review.",
      `Reason: ${reason}`,
      "If you think we've misunderstood your review, please reply to this email.",
    ],
    signOff: 'plain',
  });
}

/* ── D13. ACCOUNT DELETED ──────────────────────────────────────────────── */

export function accountDeleted({ firstName }) {
  return renderEmail({
    subject: 'Your Spiritpedia account has been deleted',
    blocks: [
      greeting(firstName),
      'Your Spiritpedia account has been deleted.',
      "You won't receive any further welcome or personalised discovery emails for this account.",
      "If you didn't request this deletion, please contact us at love@spiritpedia.co.",
    ],
    signOff: 'plain',
  });
}

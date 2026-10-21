import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greeting, renderEmail, SITE } from './emailParts.js';
import {
  applicationApproved,
  claimApproved,
  explorerWelcome,
  formatWhen,
  practitionerWelcome,
  reviewApproved,
  reviewReceived,
  reviewReported,
} from './emailTemplates.js';

// No template may ever show a bracketed placeholder, "Hi there", "Hi ," or
// "undefined"/"null" — whatever is missing.
function assertClean(m) {
  for (const part of [m.subject, m.text, m.html]) {
    assert.doesNotMatch(part, /\[[^\]]*\]|Hi there|Hi ,|undefined|null/);
  }
}

test('greeting: "Hi name," with a name, "Hello," without', () => {
  assert.equal(greeting('Jane'), 'Hi Jane,');
  assert.equal(greeting('  '), 'Hello,');
  assert.equal(greeting(null), 'Hello,');
});

test('every link is on www', () => {
  assert.equal(SITE, 'https://www.spiritpedia.co');
});

test('renderEmail: buttons, headings, escaping, sign-offs', () => {
  const m = renderEmail({
    subject: 's',
    blocks: ['Hello,', { heading: 'Head' }, 'Body <b>', { button: 'Go', url: 'https://x.test/?a=1&b=2' }],
    signOff: 'starFarewell',
  });
  assert.match(m.text, /Head\nBody <b>/);
  assert.match(m.text, /Go: https:\/\/x\.test\/\?a=1&b=2/);
  assert.match(m.text, /See you among the stars,\n\nYour Guiding Star ✦\nand the Spiritpedia Constellation$/);
  assert.match(m.html, /<strong>Head<\/strong><br>Body &lt;b&gt;/);
  assert.match(m.html, /href="https:\/\/x\.test\/\?a=1&amp;b=2"/);
  assert.match(m.html, /See you among the stars,<\/p><p>Your Guiding Star ✦<br>and the Spiritpedia Constellation<\/p>$/);
});

test('B1: the app version speaks of tap and hold; the website version of the button', () => {
  const app = explorerWelcome({ firstName: 'Jane', platform: 'app' });
  assert.equal(app.subject, 'Welcome to Spiritpedia ✦');
  assert.match(app.text, /^Hi Jane,\n\nI am your guiding star\. We met just a second ago\./);
  assert.match(app.text, /Tap and hold/);
  const web = explorerWelcome({ firstName: '', platform: 'web' });
  assert.match(web.text, /^Hello,\n\nI am your guiding star\.\n\nYour Library/);
  assert.match(web.text, /floating My Library button/);
  assert.doesNotMatch(web.text, /Tap and hold/);
  // No platform recorded (before migration 0021): the website version.
  assert.match(explorerWelcome({ platform: null }).text, /floating My Library button/);
  assertClean(app);
  assertClean(web);
});

test('D1: the name is in the subject only when there is one', () => {
  assert.equal(practitionerWelcome({ firstName: 'Jane' }).subject, 'Welcome to Spiritpedia, Jane');
  const m = practitionerWelcome({ firstName: '' });
  assert.equal(m.subject, 'Welcome to Spiritpedia');
  assert.match(m.text, /Visit your account: https:\/\/www\.spiritpedia\.co\/account/);
  assert.match(m.text, /With love,\nThe Spiritpedia team$/);
  assertClean(m);
});

test('D3: live, with the listing button', () => {
  const m = applicationApproved({
    firstName: 'Jane',
    listingName: 'Jane Doe Healing',
    listingUrl: `${SITE}/healers/jane-doe-healing`,
  });
  assert.equal(m.subject, 'Jane Doe Healing is now live on Spiritpedia');
  assert.match(m.text, /View your listing: https:\/\/www\.spiritpedia\.co\/healers\/jane-doe-healing/);
  assertClean(m);
  assertClean(applicationApproved({ listingUrl: SITE }));
});

test('D7: manage your listing goes to the account', () => {
  const m = claimApproved({ firstName: 'Jane', listingName: 'Tom & <Jerry>' });
  assert.equal(m.subject, 'You can now manage Tom & <Jerry> on Spiritpedia');
  assert.match(m.html, /Tom &amp; &lt;Jerry&gt;/);
  assertClean(claimApproved({}));
});

test('D9 and D10: the Guiding Star, and "by" only with a creator', () => {
  const got = reviewReceived({ firstName: 'Sam', title: 'The Power of Now', creatorName: 'Eckhart Tolle' });
  assert.match(got.text, /your thoughts on The Power of Now by Eckhart Tolle\./);
  assert.match(got.text, /Your Guiding Star ✦\nand the Spiritpedia Constellation$/);
  assert.match(reviewReceived({ title: 'X' }).text, /your thoughts on X\./);
  const live = reviewApproved({ title: 'X', url: `${SITE}/books/x` });
  assert.match(live.text, /^Hello,/);
  assert.match(live.text, /View your review: https:\/\/www\.spiritpedia\.co\/books\/x/);
  assertClean(got);
  assertClean(live);
});

test('D12: the references, the time in UTC, and no reporter', () => {
  const m = reviewReported({
    title: 'The Power of Now',
    reviewId: 41,
    reportId: 7,
    reason: 'Spam or advertising',
    reportedAt: '2026-10-21T14:05:00Z',
    adminUrl: `${SITE}/admin/flags`,
  });
  assert.equal(m.subject, 'Review reported on The Power of Now');
  assert.match(m.text, /^Hello,/);
  assert.match(m.text, /Review reference: 41\nReport reference: 7\nReported reason: Spam or advertising\nReported at: 21 October 2026, 14:05 UTC/);
  assert.match(m.text, /The Spiritpedia team$/);
  assert.doesNotMatch(m.text, /With love/);
  assert.equal(formatWhen('nonsense'), 'not recorded');
});

import { OUTREACH_EMAILS, outreachEmail, practitionerFirstName } from './emailTemplates.js';

const LINKS = {
  profileUrl: 'https://www.spiritpedia.co/healers/jane-doe',
  claimUrl: 'https://www.spiritpedia.co/auth/claim?slug=jane-doe',
};

test('C1–C8: eight plain-text emails, each with both links, removal and the team sign-off', () => {
  assert.equal(OUTREACH_EMAILS, 8);
  const subjects = [];
  for (let n = 1; n <= 8; n += 1) {
    const m = outreachEmail(n, { firstName: 'Jane', ...LINKS });
    subjects.push(m.subject);
    assert.equal(m.html, undefined, `email ${n} must be text only`);
    assert.match(m.text, /^Hi Jane,\n\n/);
    assert.ok(m.text.includes(LINKS.profileUrl), `email ${n} profile link`);
    assert.ok(m.text.includes(LINKS.claimUrl), `email ${n} claim link`);
    assert.match(m.text, /remov/i, `email ${n} offers removal`);
    assert.match(m.text, /With love,\nThe Spiritpedia team$/);
    assert.doesNotMatch(m.text, /\[|\]|undefined|pay for/);
  }
  assert.deepEqual(subjects, [
    'An invitation from Spiritpedia',
    'A place for your work on Spiritpedia',
    'Help people find the services you offer',
    'Let people get to know your work',
    'Give people a reason to return to your work',
    "We'd love to hear the story behind your work",
    'Your work, in your own words',
    'A final invitation from Spiritpedia',
  ]);
  assert.equal(outreachEmail(9, { firstName: 'Jane', ...LINKS }), null);
});

test('C4–C8 put the two links on their own lines', () => {
  const m = outreachEmail(4, { firstName: '', ...LINKS });
  assert.match(m.text, /^Hello,/);
  assert.ok(m.text.includes(`View your listing: ${LINKS.profileUrl}\nClaim your profile: ${LINKS.claimUrl}`));
});

test('outreach first name skips titles; nothing usable means "Hello,"', () => {
  assert.equal(practitionerFirstName('Dr. Jane Smith'), 'Jane');
  assert.equal(practitionerFirstName('Prof Ann Lee'), 'Ann');
  assert.equal(practitionerFirstName('Jane'), 'Jane');
  assert.equal(practitionerFirstName('  '), '');
  assert.equal(practitionerFirstName(null), '');
});

import {
  accountDeleted,
  applicationDeclined,
  applicationReceived,
  claimDeclined,
  claimRequestReceived,
  ownershipCheck,
  reviewRejected,
} from './emailTemplates.js';

test('D2: the listing name in the subject, team sign-off', () => {
  const m = applicationReceived({ firstName: 'Jane', listingName: 'Jane Doe Healing' });
  assert.equal(m.subject, "We've received your application for Jane Doe Healing");
  assert.match(m.text, /There's nothing more you need to do for now\.\n\nWith love,\nThe Spiritpedia team$/);
  assertClean(applicationReceived({}));
});

test('D4, D8, D11: the reason after "Reason:", plain sign-off', () => {
  for (const m of [
    applicationDeclined({ firstName: 'Jane', listingName: 'Jane Doe Healing', reason: 'Not a fit.' }),
    claimDeclined({ firstName: 'Jane', listingName: 'Hay House', reason: 'Not a fit.' }),
    reviewRejected({ firstName: 'Sam', title: 'X', creatorName: 'Y', reason: 'Not a fit.' }),
  ]) {
    assert.match(m.text, /\n\nReason: Not a fit\.\n\n/);
    assert.match(m.text, /\n\nThe Spiritpedia team$/);
    assert.doesNotMatch(m.text, /With love/);
    assertClean(m);
  }
  assert.equal(applicationDeclined({ reason: 'r' }).subject, 'An update on your Spiritpedia application');
  assert.equal(reviewRejected({ title: 'X', reason: 'r' }).subject, 'An update on your review of X');
});

test('D5: received, nothing more to submit', () => {
  const m = claimRequestReceived({ firstName: 'Jane', listingName: 'Hay House' });
  assert.equal(m.subject, "We've received your request to manage Hay House");
  assert.match(m.text, /You don't need to submit another request\./);
  assertClean(m);
});

test('D6: "Hello,", the claimant, the listing and its link, and no access granted', () => {
  const m = ownershipCheck({
    claimantEmail: 'someone@example.com',
    listingName: 'Hay House',
    listingUrl: 'https://www.spiritpedia.co/publishers/hay-house',
  });
  assert.equal(m.subject, 'Please confirm a request to manage Hay House');
  assert.match(m.text, /^Hello,\n\nWe've received a request from someone@example\.com/);
  assert.match(m.text, /Hay House\nhttps:\/\/www\.spiritpedia\.co\/publishers\/hay-house/);
  assert.match(m.text, /No access has been granted/);
  assertClean(m);
});

test('D13: deleted, no more welcome or discovery emails', () => {
  const m = accountDeleted({ firstName: '' });
  assert.equal(m.subject, 'Your Spiritpedia account has been deleted');
  assert.match(m.text, /^Hello,/);
  assert.match(m.text, /love@spiritpedia\.co/);
  assertClean(m);
});

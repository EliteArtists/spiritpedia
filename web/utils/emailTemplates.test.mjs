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

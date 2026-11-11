import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JOURNEY_EMAILS, journeyTemplate } from './email.js';
import { LISTING_KIND_WORDS, listingDetail, sharedOutreachEmail } from './emailTemplates.js';
import { OUTREACH_KINDS_APPROVED, isEpisodeUrl, outreachAllowedFor, outreachRefusal } from './journey.js';

// The shared C1–C8 for channels, apps, organisations, schools and publishers
// against the owner's approved copy itself, so a drift in either is caught.
const DOC = fs.readFileSync(new URL('../../docs/email-copy-2026-11-11-shared-journey.md', import.meta.url), 'utf8');
const KINDS = ['channel', 'app', 'organisation', 'school', 'publisher'];
const NONE = { videos: 0, episodes: 0, teachers: 0, books: 0 };
const ALL = { videos: 3, episodes: 0, teachers: 2, books: 5 };

const squash = (text) => text.replace(/\s+/g, ' ').trim();

// Email n's subject and body (between "Hello," and the sign-off) in the doc.
function docEmail(n) {
  const start = DOC.indexOf(`# C${n} Day`);
  const end = n < 8 ? DOC.indexOf(`# C${n + 1} Day`) : DOC.indexOf('# Questions for the solicitor');
  const section = DOC.slice(start, end);
  const subject = section.match(/\*\*Subject:\*\* (.+)/)[1].trim();
  const body = section.slice(section.indexOf('Hello,') + 'Hello,'.length, section.indexOf('With love, The Spiritpedia team'));
  return { subject, body: body.replace(/\\\[/g, '[').replace(/\\\]/g, ']') };
}

function render(n, kind, facts) {
  return journeyTemplate(n, {
    entityType: kind === 'publisher' ? undefined : kind,
    publisher: kind === 'publisher',
    healerName: 'White Tiger Qigong',
    healerSlug: 'white-tiger-qigong',
    facts,
  });
}

test('every shared email, for every kind, is the approved copy word for word', () => {
  for (const kind of KINDS) {
    for (const facts of [NONE, ALL]) {
      for (let n = 1; n <= JOURNEY_EMAILS; n += 1) {
        const email = render(n, kind, facts);
        const doc = docEmail(n);
        const links =
          kind === 'publisher'
            ? ['https://www.spiritpedia.co/publishers/white-tiger-qigong', 'https://www.spiritpedia.co/auth/claim?slug=white-tiger-qigong&kind=publisher']
            : ['https://www.spiritpedia.co/healers/white-tiger-qigong', 'https://www.spiritpedia.co/auth/claim?slug=white-tiger-qigong'];
        const expected = doc.body
          .replaceAll('Claim your profile:', 'Claim your listing:')
          .replaceAll('[listing kind]', LISTING_KIND_WORDS[kind])
          .replace(/\[listing\s+name\]/g, 'White Tiger Qigong')
          .replaceAll('[listing link]', links[0])
          .replaceAll('[claim link]', links[1])
          .replaceAll('[listing detail]', listingDetail(kind, facts));

        assert.equal(email.subject, doc.subject, `C${n} ${kind} subject`);
        assert.ok(email.text.startsWith('Hello,\n\n'), `C${n} ${kind} greeting`);
        assert.ok(email.text.endsWith('\n\nWith love,\nThe Spiritpedia team'), `C${n} ${kind} sign-off`);
        const body = email.text.slice('Hello,'.length, email.text.lastIndexOf('With love,'));
        assert.equal(squash(body), squash(expected), `C${n} ${kind} body`);
        assert.doesNotMatch(email.text, /\[|\]|undefined|null/, `C${n} ${kind} placeholder`);
        assert.doesNotMatch(email.text, /Claim your profile/, `C${n} ${kind} claim line`);
        assert.doesNotMatch(email.text, /<[a-z]/i, `C${n} ${kind} plain text`);
      }
    }
  }
});

test('the claim line reads "Claim your listing:" wherever the copy lists the links', () => {
  for (const n of [2, 3, 4, 5, 7, 8]) {
    assert.match(render(n, 'school', NONE).text, /\nClaim your listing: https:\/\/www\.spiritpedia\.co\/auth\/claim\?slug=/);
  }
});

test('C1 and C8 add "To stop these emails, simply reply."; every email offers a way out', () => {
  for (let n = 1; n <= 8; n += 1) {
    const text = render(n, 'organisation', NONE).text;
    assert.equal(text.includes('To stop these emails, simply reply.'), n === 1 || n === 8, `C${n}`);
    assert.match(text, /stop these emails|remove/i, `C${n} opt-out`);
  }
});

test('[listing detail]: only what is on the listing, else the fallback', () => {
  const fallback = (word) =>
    `Your listing introduces your ${word} and gives people a place to find out more about your work.`;
  assert.equal(listingDetail('channel', { videos: 4 }), 'Your listing brings together an introduction to your channel and the videos listed on Spiritpedia.');
  assert.equal(listingDetail('channel', { episodes: 2 }), 'Your listing brings together an introduction to your channel and the episodes listed on Spiritpedia.');
  assert.equal(
    listingDetail('channel', { videos: 1, episodes: 1 }),
    'Your listing brings together an introduction to your channel and the videos and episodes listed on Spiritpedia.'
  );
  assert.equal(listingDetail('channel', NONE), fallback('channel'));
  assert.equal(listingDetail('organisation', { teachers: 1 }), 'Your listing brings together an introduction to your organisation and the teachers linked to it.');
  assert.equal(listingDetail('organisation', NONE), fallback('organisation'));
  assert.equal(listingDetail('school', { teachers: 3 }), 'Your listing brings together an introduction to your school and the teachers linked to it.');
  assert.equal(listingDetail('school', { teachers: 0 }), fallback('school'));
  assert.equal(
    listingDetail('publisher', { books: 1 }),
    'Your listing brings together an introduction to your publishing house and the books we list from your catalogue.'
  );
  assert.equal(listingDetail('publisher', NONE), fallback('publishing house'));
  // An app always has its own sentence, whatever else is counted.
  for (const facts of [NONE, ALL]) {
    assert.equal(listingDetail('app', facts), 'Your listing introduces your app, its approach and where people can find out more.');
  }
  // Teachers say nothing for a channel; videos nothing for a school.
  assert.equal(listingDetail('channel', { teachers: 5 }), fallback('channel'));
  assert.equal(listingDetail('school', { videos: 5 }), fallback('school'));
});

test('only C4 carries the detail sentence', () => {
  for (let n = 1; n <= 8; n += 1) {
    assert.equal(render(n, 'school', ALL).text.includes('teachers linked to it'), n === 4, `C${n}`);
  }
});

test('a podcast host is an episode; YouTube is a video', () => {
  assert.equal(isEpisodeUrl('https://open.spotify.com/episode/abc'), true);
  assert.equal(isEpisodeUrl('https://podcasts.apple.com/gb/podcast/x/id1'), true);
  assert.equal(isEpisodeUrl('https://www.youtube.com/watch?v=x'), false);
  assert.equal(isEpisodeUrl('not a url'), false);
});

test('nothing is sent with a gap: no name or no link means no email', () => {
  const base = { kind: 'school', listingName: 'A', profileUrl: 'p', claimUrl: 'c', facts: NONE };
  assert.equal(sharedOutreachEmail(1, { ...base, listingName: ' ' }), null);
  assert.equal(sharedOutreachEmail(1, { ...base, claimUrl: '' }), null);
  assert.equal(sharedOutreachEmail(1, { ...base, kind: 'individual' }), null);
  assert.equal(sharedOutreachEmail(9, base), null);
});

test('individuals keep the practitioner sequence, unchanged', () => {
  const email = journeyTemplate(1, { entityType: 'individual', healerName: 'Dr Jane Smith', healerSlug: 'jane' });
  assert.ok(email.text.startsWith('Hi Jane,'));
  assert.match(email.text, /We came across your work on social sites/);
  assert.match(journeyTemplate(4, { healerName: 'Jane', healerSlug: 'jane' }).text, /\nClaim your profile: /);
});

test('installed, switched off: only individuals may be emailed, and the admin is told why', () => {
  assert.deepEqual(OUTREACH_KINDS_APPROVED, ['individual']);
  for (const kind of KINDS) {
    assert.equal(outreachAllowedFor(kind), false, kind);
    assert.match(outreachRefusal(kind), /wording for .+ is installed, but journeys for .+ stay off until the owner turns them on/);
  }
});

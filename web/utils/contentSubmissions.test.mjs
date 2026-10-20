import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTENT_KINDS,
  SUBMISSION_RETENTION_MONTHS,
  abandonedUploads,
  amazonProductUrl,
  changedFields,
  checkSubmission,
  cleanSubjects,
  httpsUrl,
  kindOf,
  nextFreeSlug,
  purgeDecidedSubmissions,
  slugify,
  submissionCutoff,
  submissionDecisionMessage,
  typeWord,
  youtubeWatchUrl,
} from './contentSubmissions.js';

const SUBJECTS = ['meditation', 'healing', 'tarot', 'yoga', 'breathwork', 'astrology'];

test('six things an owner can add, in four tables', () => {
  assert.deepEqual(Object.keys(CONTENT_KINDS), ['video', 'book', 'course', 'retreat', 'membership', 'free_resource']);
  assert.equal(CONTENT_KINDS.retreat.table, 'courses');
  assert.equal(CONTENT_KINDS.membership.productType, 'membership');
});

test('links: https only, typed by them, never guessed', () => {
  assert.equal(httpsUrl('https://example.com/course'), 'https://example.com/course');
  assert.equal(httpsUrl('http://example.com'), null);
  assert.equal(httpsUrl('example.com'), null);
  assert.equal(httpsUrl('javascript:alert(1)'), null);
  assert.equal(httpsUrl('https://localhost'), null);
});

test('YouTube links become the standard watch link; other sites are refused', () => {
  const watch = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  assert.equal(youtubeWatchUrl('https://youtu.be/dQw4w9WgXcQ?t=3'), watch);
  assert.equal(youtubeWatchUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'), watch);
  assert.equal(youtubeWatchUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x'), watch);
  assert.equal(youtubeWatchUrl('https://vimeo.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(youtubeWatchUrl('https://evil.example/youtu.be/dQw4w9WgXcQ'), null);
});

test('Amazon links: a product page on a store we know, stored without anyone’s tag', () => {
  assert.equal(
    amazonProductUrl('https://www.amazon.co.uk/Power-Now-Eckhart-Tolle/dp/0340733500/ref=sr_1_1?tag=someone-21'),
    'https://www.amazon.co.uk/dp/0340733500'
  );
  assert.equal(amazonProductUrl('https://amazon.com/gp/product/B000FC0SIM'), 'https://www.amazon.com/dp/B000FC0SIM');
  assert.equal(amazonProductUrl('https://www.amazon.co.jp/dp/0340733500'), null);
  assert.equal(amazonProductUrl('https://www.goodreads.com/book/show/6708'), null);
  assert.equal(amazonProductUrl('https://amazon.com.evil.example/dp/0340733500'), null);
});

test('subjects: 1 to 5, from the existing list only, no repeats', () => {
  assert.deepEqual(cleanSubjects(['tarot', 'nope', 'tarot', 'yoga'], SUBJECTS), ['tarot', 'yoga']);
  assert.equal(cleanSubjects(SUBJECTS, SUBJECTS).length, 5);
});

test('a video needs a YouTube link, a title and a subject', () => {
  const { errors } = checkSubmission('video', { platform_url: 'https://vimeo.com/1' }, { knownSubjects: SUBJECTS });
  assert.deepEqual(Object.keys(errors).sort(), ['platform_url', 'subjects', 'title']);
  const ok = checkSubmission(
    'video',
    { platform_url: 'https://youtu.be/dQw4w9WgXcQ', title: '  A talk  ' },
    { subjects: ['meditation'], knownSubjects: SUBJECTS }
  );
  assert.deepEqual(ok.errors, {});
  assert.equal(ok.fields.title, 'A talk');
  assert.equal(ok.fields.platform_url, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});

test('a retreat needs its dates, and can’t end before it starts', () => {
  const base = { title: 'Retreat', course_url: 'https://example.com/r', description: 'A week away' };
  const opts = { subjects: ['yoga'], knownSubjects: SUBJECTS };
  assert.ok(checkSubmission('retreat', base, opts).errors.start_date);
  const backwards = checkSubmission('retreat', { ...base, start_date: '2027-05-10', end_date: '2027-05-01' }, opts);
  assert.ok(backwards.errors.end_date);
  const fine = checkSubmission('retreat', { ...base, start_date: '2027-05-01', end_date: '2027-05-07' }, opts);
  assert.deepEqual(fine.errors, {});
  // A course's dates are optional.
  assert.deepEqual(checkSubmission('course', base, opts).errors, {});
});

test('a free resource needs a known type and a description', () => {
  const { errors } = checkSubmission(
    'free_resource',
    { title: 'Guide', resource_url: 'https://example.com/g', resource_type: 'spell' },
    { subjects: ['healing'], knownSubjects: SUBJECTS }
  );
  assert.deepEqual(Object.keys(errors).sort(), ['description', 'resource_type']);
});

test('an edit: what was already live and left alone isn’t their problem, or a change', () => {
  const live = {
    title: 'Old course',
    course_url: 'http://old-site.example/course',
    description: null,
    price: '£10',
    start_date: '2026-01-01',
    end_date: null,
    subject_slugs: ['tarot'],
    product_type: 'course',
  };
  const form = { title: 'New title', course_url: 'http://old-site.example/course', description: '', price: '£10' };
  const { fields, errors } = checkSubmission('course', form, { subjects: ['tarot'], knownSubjects: SUBJECTS, live });
  assert.deepEqual(errors, {});
  assert.equal(fields.course_url, live.course_url);
  // Not on the form: kept.
  assert.equal(fields.start_date, '2026-01-01');
  assert.deepEqual(changedFields('course', live, fields), { title: { before: 'Old course', after: 'New title' } });
});

test('an edit that changes an old link must make it a good one', () => {
  const live = { title: 'T', course_url: 'http://old.example', description: 'D', subject_slugs: ['tarot'] };
  const { errors } = checkSubmission('course', { ...live, course_url: 'http://new.example' }, { subjects: ['tarot'], knownSubjects: SUBJECTS, live });
  assert.ok(errors.course_url);
});

test('changedFields: only editable columns, subjects compared as a set', () => {
  const live = { title: 'A', platform_url: 'x', subject_slugs: ['a', 'b'], slug: 'a', healer_slug: 'h' };
  assert.deepEqual(changedFields('video', live, { title: 'A', subject_slugs: ['b', 'a'], slug: 'new', healer_slug: 'other' }), {});
  assert.deepEqual(Object.keys(changedFields('video', live, { subject_slugs: ['a'] })), ['subject_slugs']);
});

test('kindOf: a live course row is edited with its own kind', () => {
  assert.equal(kindOf('course', { product_type: 'retreat' }), 'retreat');
  assert.equal(kindOf('course', { product_type: 'download' }), 'course');
  assert.equal(kindOf('book', {}), 'book');
});

test('slugs: as ingestion makes them, never clashing', () => {
  assert.equal(slugify('The Power of Now: A Guide!'), 'the-power-of-now-a-guide');
  assert.equal(nextFreeSlug('talk', []), 'talk');
  assert.equal(nextFreeSlug('talk', ['talk', 'talk-2']), 'talk-3');
});

test('the emails: approved and turned down, new and edit', () => {
  const common = {
    firstName: 'Jane',
    title: 'Morning <Calm>',
    itemUrl: 'https://spiritpedia.co/videos/morning-calm',
    accountUrl: 'https://spiritpedia.co/account',
    supportEmail: 'love@spiritpedia.co',
  };
  const live = submissionDecisionMessage({ ...common, decision: 'approved', kind: 'new', what: 'video' });
  assert.equal(live.subject, 'Your video “Morning <Calm>” is now live on Spiritpedia');
  assert.match(live.text, /See it here: https:\/\/spiritpedia\.co\/videos\/morning-calm/);
  assert.match(live.html, /Morning &lt;Calm&gt;/);
  assert.doesNotMatch(live.html, /<Calm>/);

  const changed = submissionDecisionMessage({ ...common, decision: 'approved', kind: 'edit', what: 'video' });
  assert.equal(changed.subject, 'Your changes to “Morning <Calm>” are live');

  const no = submissionDecisionMessage({
    ...common,
    decision: 'rejected',
    kind: 'edit',
    what: 'video',
    reason: 'The link doesn’t work.',
    note: 'Try the public link.',
  });
  assert.equal(no.subject, 'We couldn’t change “Morning <Calm>”');
  assert.match(no.text, /The reason: The link doesn’t work\./);
  assert.match(no.text, /A note from us: Try the public link\./);
  assert.match(no.text, /live version is unchanged/);
  assert.doesNotMatch(no.text, /\n\n\n/);
});

test('typeWord', () => {
  assert.equal(typeWord('course', 'retreat'), 'retreat');
  assert.equal(typeWord('free_resource'), 'free resource');
});

test('retention: 12 months after the decision', () => {
  assert.equal(SUBMISSION_RETENTION_MONTHS, 12);
  assert.equal(submissionCutoff(new Date('2027-10-20T05:00:00Z')), '2026-10-20T05:00:00.000Z');
});

test('purge: decided only, older than a year, with their images', async () => {
  const now = new Date('2027-10-20T05:00:00Z');
  const rows = [
    { id: 1, status: 'pending', decided_at: null, image_path: 'u/a.jpg' },
    { id: 2, status: 'rejected', decided_at: '2026-01-01T00:00:00Z', image_path: 'u/b.jpg' },
    { id: 3, status: 'approved', decided_at: '2027-09-01T00:00:00Z', image_path: null },
    { id: 4, status: 'withdrawn', decided_at: '2025-01-01T00:00:00Z', image_path: null },
  ];
  const removed = [];
  const filters = [];
  const q = {
    delete: () => q,
    neq: (c, v) => (filters.push((r) => r[c] !== v), q),
    not: (c, op, v) => (filters.push((r) => r[c] !== v), q),
    lt: (c, v) => (filters.push((r) => r[c] < v), q),
    select: async () => ({ data: rows.filter((r) => filters.every((f) => f(r))), error: null }),
  };
  const supabase = {
    from: (name) => (assert.equal(name, 'content_submissions'), q),
    storage: { from: () => ({ remove: async (paths) => removed.push(...paths) }) },
  };
  const result = await purgeDecidedSubmissions(supabase, now);
  assert.deepEqual(result, { deleted: 2, images: 1 });
  assert.deepEqual(removed, ['u/b.jpg']);
});

test('abandoned uploads: unreferenced and over two days old', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  const files = [
    { path: 'u/old.jpg', created_at: '2026-10-17T12:00:00Z' },
    { path: 'u/new.jpg', created_at: '2026-10-20T11:00:00Z' },
    { path: 'u/used.jpg', created_at: '2026-10-01T12:00:00Z' },
  ];
  assert.deepEqual(abandonedUploads(files, ['u/used.jpg'], now), ['u/old.jpg']);
});

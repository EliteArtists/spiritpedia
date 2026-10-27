// Run with `npm test` (node --test).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUDIT_TABLES,
  describeImageCheck,
  isPlaceholderImage,
  pickShard,
  todayShard,
  videoThumbnail,
} from './brokenImages.js';

const tuesday = new Date('2026-10-27T07:00:00Z');

test('a scheduled run (no ?shard=) checks today’s seventh, not shard 0', () => {
  assert.equal(todayShard(tuesday), 2);
  assert.equal(pickShard(null, tuesday), 2);
  assert.equal(pickShard(undefined, tuesday), 2);
  assert.equal(pickShard('', tuesday), 2);
});

test('?shard= picks a seventh when it is one, and today’s otherwise', () => {
  assert.equal(pickShard('0', tuesday), 0);
  assert.equal(pickShard('6', tuesday), 6);
  assert.equal(pickShard('7', tuesday), 2);
  assert.equal(pickShard('x', tuesday), 2);
  assert.equal(pickShard('1.5', tuesday), 2);
});

test('the seven days cover all seven shards', () => {
  const seen = new Set();
  for (let d = 25; d < 32; d++) seen.add(pickShard(null, new Date(`2026-10-${d}T07:00:00Z`)));
  assert.equal(seen.size, 7);
});

test('a stand-in picture is known by its file name', () => {
  assert.equal(isPlaceholderImage('https://dryofg8nmyqjw.cloudfront.net/images/no-cover.png'), true);
  assert.equal(isPlaceholderImage('https://example.com/img/No_Image.jpg?x=1'), true);
  assert.equal(isPlaceholderImage('https://example.com/placeholder.webp'), true);
});

test('a real photo with a placeholder setting in its URL is not one', () => {
  assert.equal(
    isPlaceholderImage(
      'https://ik.imagekit.io/panmac/tr:f-auto,di-placeholder_portrait_aMjPtD9YZ.jpg,ar-350-531,fo-auto,w-750/contributor/26817.jpg'
    ),
    false
  );
  assert.equal(isPlaceholderImage('https://m.media-amazon.com/images/I/4198qnb0CPL.jpg'), false);
  assert.equal(isPlaceholderImage('not a url'), false);
  assert.equal(isPlaceholderImage(null), false);
});

test('a video is checked by the thumbnail the site shows', () => {
  assert.equal(
    videoThumbnail('https://www.youtube.com/watch?v=bT_48UXsKyo&t=3'),
    'https://img.youtube.com/vi/bT_48UXsKyo/mqdefault.jpg'
  );
  assert.equal(videoThumbnail('https://youtu.be/bT_48UXsKyo'), 'https://img.youtube.com/vi/bT_48UXsKyo/mqdefault.jpg');
  assert.equal(videoThumbnail('https://www.youtube.com/watch?'), null);
  assert.equal(videoThumbnail(null), null);
  const videos = AUDIT_TABLES.find((t) => t.table === 'videos');
  assert.deepEqual(videos.urls({ platform_url: 'https://vimeo.com/1' }), []);
});

test('the Inbox line says when the check ran and which seventh', () => {
  const run = { ran_at: '2026-10-27T07:00:40Z', shard: 2, shards: 7, checked: 1150, skipped: 0, undetermined: 0, recovered: 3 };
  const line = describeImageCheck(run, new Date('2026-10-27T12:00:00Z'));
  assert.equal(line.stale, false);
  assert.match(line.text, /27 Oct.*07:00 UTC · shard 3 of 7 · 1150 checked · 3 cleared/);
});

test('the Inbox line turns amber when overdue, cut short or failed', () => {
  const run = { ran_at: '2026-10-25T07:00:00Z', shard: 0, shards: 7, checked: 900, skipped: 0 };
  assert.equal(describeImageCheck(run, new Date('2026-10-27T12:00:00Z')).stale, true);
  assert.match(describeImageCheck(run, new Date('2026-10-27T12:00:00Z')).text, /overdue/);
  const short = { ...run, ran_at: '2026-10-27T07:00:00Z', skipped: 40 };
  assert.equal(describeImageCheck(short, new Date('2026-10-27T08:00:00Z')).stale, true);
  const failed = { ran_at: '2026-10-27T07:00:00Z', error: 'healers: timeout' };
  assert.equal(describeImageCheck(failed, new Date('2026-10-27T08:00:00Z')).stale, true);
  assert.equal(describeImageCheck(null), null);
});

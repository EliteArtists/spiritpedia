import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amazonStore, cleanClick } from './amazonClicks.js';

test('the store is the Amazon host, without www', () => {
  assert.equal(amazonStore('https://www.amazon.co.uk/dp/B000000001?tag=x'), 'amazon.co.uk');
  assert.equal(amazonStore('https://amazon.com/dp/B000000001'), 'amazon.com');
  assert.equal(amazonStore('https://smile.amazon.de/dp/B000000001'), 'amazon.de');
});

test('a non-Amazon or broken link has no store', () => {
  assert.equal(amazonStore('https://www.goodreads.com/book/1'), null);
  assert.equal(amazonStore('https://amazon.evil.example/dp/1'), null);
  assert.equal(amazonStore('not a url'), null);
  assert.equal(amazonStore(undefined), null);
});

test('a good click becomes the four values; only the store survives from the link', () => {
  assert.deepEqual(
    cleanClick({ platform: 'web', content_type: 'book', content_slug: 'the-power-of-now', url: 'https://www.amazon.com/dp/B000000001?tag=spiritpedia-20' }),
    { p_platform: 'web', p_content_type: 'book', p_content_slug: 'the-power-of-now', p_store: 'amazon.com' }
  );
});

test('anything off is refused whole', () => {
  const ok = { platform: 'web', content_type: 'course', content_slug: 'a-course', url: 'https://www.amazon.com/dp/B000000001' };
  assert.ok(cleanClick(ok));
  assert.equal(cleanClick({ ...ok, platform: 'tv' }), null);
  assert.equal(cleanClick({ ...ok, content_type: 'video' }), null);
  assert.equal(cleanClick({ ...ok, content_slug: 'Bad Slug' }), null);
  assert.equal(cleanClick({ ...ok, url: 'https://example.com' }), null);
  assert.equal(cleanClick(null), null);
});

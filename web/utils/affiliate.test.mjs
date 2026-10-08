// Run with `npm test` (node --test). Every URL below is a real books.amazon_url
// value read out of production on 8 October 2026, with its book id.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amazonAffiliateUrl, activeStores, formatStoreList } from './affiliate.js';

const LIVE = { AMAZON_TAG_US: 'spiritpedia-20', AMAZON_TAG_UK: 'spiritpedia03-21' };
const NONE = {};

test('book 10 — .com with ref_/th/psc/dib cruft is rebuilt canonically and tagged', () => {
  const raw =
    'https://www.amazon.com/Ask-Given-Learning-Manifest-Attraction-ebook/dp/B00DJ735O4?ref_=ast_author_dp_rw&th=1&psc=1&dib=eyJ2IjoiMSJ9.CtcZ3_4YZSZDpMKvFxk7brzbqdCNhVrLZUpD15ZeWh_9d_iD4noDD9q_mAZ2oCu9CoVBsK_th-EfMUU6dAivn0Yr2Q-KOjzAQQvXklaLt58QZWmpXS833QN04X02A_wC5sOECa3VZtVFF8XcDTT9zuT7TMh-kj9lI53oKS7x86zQHbE3BhyLUqpEylZaz4UcgH9hUunbGAJ2xpAqP3S-CU-nn92-0xUpMHrWU4sAZiw.OWle18mp-Ul8CAS41y_sTzZ9ytQJeKjPCJbr65FyroQ&dib_tag=AUTHOR';
  assert.deepEqual(amazonAffiliateUrl(raw, LIVE), {
    url: 'https://www.amazon.com/dp/B00DJ735O4?tag=spiritpedia-20',
    tagged: true,
  });
});

test('book 9 — clean .com URL gets the US tag', () => {
  assert.deepEqual(
    amazonAffiliateUrl('https://www.amazon.com/Oneness-All-Life-Inspirational-Selections/dp/0452296080', LIVE),
    { url: 'https://www.amazon.com/dp/0452296080?tag=spiritpedia-20', tagged: true }
  );
});

test('book 14 — .co.uk URL with /ref= path and search cruft gets the UK tag', () => {
  const raw =
    'https://www.amazon.co.uk/Magic-Guitar-Book-Challenge-Code-ebook/dp/B084TVZ1SB/ref=sr_1_1?crid=3DG82TBZK7K0Y&dib=eyJ2IjoiMSJ9.Jh4UZwf1-_qlGc-N7U0gKw.6ecenXREHz_xkXrYVbtH44zxFTIyVkX2EBN84dXkPKk&dib_tag=se&keywords=The+magic+Guitar+Karina+Grant&qid=1781447682&sprefix=the+magic+guitar+karina+grant%2Caps%2C112&sr=8-1';
  assert.deepEqual(amazonAffiliateUrl(raw, LIVE), {
    url: 'https://www.amazon.co.uk/dp/B084TVZ1SB?tag=spiritpedia03-21',
    tagged: true,
  });
});

test('book 915 — us.amazon.com is treated as amazon.com', () => {
  assert.deepEqual(
    amazonAffiliateUrl('https://us.amazon.com/Human-Design-System-Ra-Uru/dp/1466480793', LIVE),
    { url: 'https://www.amazon.com/dp/1466480793?tag=spiritpedia-20', tagged: true }
  );
});

test('book 283 — /gp/product/ is accepted and rebuilt as /dp/', () => {
  assert.deepEqual(amazonAffiliateUrl('https://www.amazon.com/gp/product/0307986950', LIVE), {
    url: 'https://www.amazon.com/dp/0307986950?tag=spiritpedia-20',
    tagged: true,
  });
});

test('books 114, 115, 133, 169, 171 — Goodreads URLs stored as amazon_url are rejected', () => {
  for (const raw of [
    'https://www.goodreads.com/book/show/36425463-the-happy-healthy-plant-based-eating-guide',
    'https://www.goodreads.com/book/show/53244472-boho-beautiful-yoga-journey-handbook',
    'https://www.goodreads.com/book/show/33060785-the-first-new-universe',
    'https://www.goodreads.com/book/show/25320862-aspects-the-speed-of-light',
    'https://www.goodreads.com/book/show/58800774-nakshatras-the-speed-of-light',
  ]) {
    assert.equal(amazonAffiliateUrl(raw, LIVE), null, raw);
  }
});

test('book 633 — nine-character ASIN is rejected', () => {
  assert.equal(amazonAffiliateUrl('https://www.amazon.com/dp/BFK6VHWVV', LIVE), null);
  // and cannot borrow a character from a longer path
  assert.equal(amazonAffiliateUrl('https://www.amazon.com/dp/BFK6VHWVV/ref=x', LIVE), null);
  assert.equal(amazonAffiliateUrl('https://www.amazon.com/dp/BFK6VHWVVX1', LIVE), null);
});

test('inactive store — known host, no env var: clean untagged link', () => {
  assert.deepEqual(amazonAffiliateUrl('https://www.amazon.de/dp/3442217695?psc=1', LIVE), {
    url: 'https://www.amazon.de/dp/3442217695',
    tagged: false,
  });
});

test('no tags set at all — every store is clean and untagged', () => {
  assert.deepEqual(
    amazonAffiliateUrl('https://www.amazon.com/Oneness-All-Life-Inspirational-Selections/dp/0452296080', NONE),
    { url: 'https://www.amazon.com/dp/0452296080', tagged: false }
  );
  assert.deepEqual(amazonAffiliateUrl('https://www.amazon.co.uk/dp/B084TVZ1SB/ref=sr_1_1', NONE), {
    url: 'https://www.amazon.co.uk/dp/B084TVZ1SB',
    tagged: false,
  });
  // a blank var is not a tag
  assert.equal(amazonAffiliateUrl('https://www.amazon.com/dp/0452296080', { AMAZON_TAG_US: '  ' }).tagged, false);
});

test('unknown hosts and junk are rejected', () => {
  for (const raw of [
    null,
    undefined,
    '',
    'not a url',
    'https://amzn.to/3abcdef',
    'https://www.amazon.nl/dp/0452296080',
    'https://evilamazon.com/dp/0452296080',
    'https://www.amazon.com/',
  ]) {
    assert.equal(amazonAffiliateUrl(raw, LIVE), null, String(raw));
  }
});

test('activeStores names only stores with a live tag', () => {
  assert.deepEqual(activeStores(LIVE), ['Amazon.com', 'Amazon.co.uk']);
  assert.deepEqual(activeStores(NONE), []);
  assert.deepEqual(activeStores({ AMAZON_TAG_DE: 'x-21' }), ['Amazon.de']);
});

test('formatStoreList', () => {
  assert.equal(formatStoreList([]), '');
  assert.equal(formatStoreList(['Amazon.com']), 'Amazon.com');
  assert.equal(formatStoreList(['Amazon.com', 'Amazon.co.uk']), 'Amazon.com and Amazon.co.uk');
  assert.equal(formatStoreList(['A', 'B', 'C']), 'A, B and C');
});

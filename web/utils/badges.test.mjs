import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFICIAL_TIP,
  TIER_TIPS,
  actionLabel,
  actionUrl,
  listingBadges,
  reviewNameReserved,
  tierName,
  tierOptions,
  typeLabel,
  verifiedTip,
  withScheme,
} from './badges.js';

test('the same three tiers, named for people or for platforms', () => {
  assert.equal(tierName('superhero', 'individual'), 'Superhero');
  assert.equal(tierName('luminary', null), 'Luminary');
  assert.equal(tierName('local_hero', undefined), 'Local Hero');
  assert.equal(tierName('superhero', 'channel'), 'Superstar');
  assert.equal(tierName('luminary', 'app'), 'Shining Star');
  assert.equal(tierName('local_hero', 'organisation'), 'Rising Star');
  assert.equal(tierName('superhero', 'publisher'), 'Superstar');
  // Ascended Master is for people only.
  assert.equal(tierName('ascended_master', 'individual'), 'Ascended Master');
  assert.equal(tierName('ascended_master', 'channel'), null);
});

test('every tier has the star’s tip, in the approved words', () => {
  for (const name of ['Superhero', 'Luminary', 'Local Hero', 'Superstar', 'Shining Star', 'Rising Star']) {
    assert.ok(TIER_TIPS[name], name);
  }
  const worldwide = 'A worldwide reach, with over a million followers across social media.';
  const future = 'Hundreds of thousands of followers: the superstars of the future.';
  assert.equal(TIER_TIPS.Superstar, worldwide);
  assert.equal(TIER_TIPS.Superhero, worldwide);
  assert.equal(TIER_TIPS['Shining Star'], future);
  assert.equal(TIER_TIPS.Luminary, future);
  assert.equal(TIER_TIPS['Local Hero'], 'A practitioner available in your area.');
  assert.equal(TIER_TIPS['Rising Star'], 'A rising voice, and worth finding early: under a hundred thousand followers, for now.');
  assert.equal(
    verifiedTip('Jane Doe'),
    'This page is run by Jane Doe themselves. They’ve confirmed it’s theirs, so what you see here comes straight from them.'
  );
  assert.match(OFFICIAL_TIP, /^This is my home: Spiritpedia’s own page\./);
});

test('a teacher: the tier, and Verified once claimed; never a type', () => {
  const badges = listingBadges({ name: 'Jane Doe', tier: 'luminary', entity_type: 'individual', verified: true });
  assert.deepEqual(badges.map((b) => b.label), ['Luminary', '✓ Verified']);
  assert.match(badges[1].tip, /run by Jane Doe themselves/);
});

test('a channel: its tier alongside its type, never instead of it', () => {
  const badges = listingBadges({ name: 'Meditative Mind', tier: 'superhero', entity_type: 'channel' });
  assert.deepEqual(badges.map((b) => b.label), ['Superstar', 'Channel']);
  assert.equal(typeLabel('app'), 'App');
  assert.equal(typeLabel('school'), 'School');
  assert.equal(typeLabel('individual'), null);
});

test('a publisher: its tier and Verified, no type (the card says what it is)', () => {
  const badges = listingBadges({ name: 'Hay House', tier: 'superhero', verified: true }, 'publisher');
  assert.deepEqual(badges.map((b) => b.label), ['Superstar', '✓ Verified']);
});

test('Spiritpedia: Official only, no tier, whatever is stored', () => {
  const badges = listingBadges({ name: 'Spiritpedia', tier: 'local_hero', entity_type: 'channel', verified: true, official: true });
  assert.deepEqual(badges.map((b) => b.label), ['OFFICIAL']);
  assert.equal(badges[0].tip, OFFICIAL_TIP);
});

test('Book with a practitioner; Visit everyone else, Spiritpedia included', () => {
  assert.equal(actionLabel({ name: 'Eckhart Tolle', entity_type: 'individual' }), 'Book with Eckhart →');
  assert.equal(actionLabel({ name: 'The Shift Network', entity_type: 'channel' }), 'Visit The Shift Network →');
  assert.equal(actionLabel({ name: 'Spiritpedia', entity_type: 'channel', official: true }), 'Visit Spiritpedia →');
  assert.equal(actionLabel({ name: 'Hay House' }, 'publisher'), 'Visit Hay House →');
  // A channel with only a website still gets its button; a practitioner needs a booking link.
  assert.equal(actionUrl({ entity_type: 'channel', website_url: 'www.x.com' }), 'https://www.x.com');
  assert.equal(actionUrl({ entity_type: 'individual', website_url: 'https://x.com' }), null);
});

test('links typed without https:// still leave the site', () => {
  assert.equal(withScheme('www.spiritpedia.co'), 'https://www.spiritpedia.co');
  assert.equal(withScheme('https://a.com/b'), 'https://a.com/b');
  assert.equal(withScheme('  '), null);
  assert.equal(withScheme(null), null);
});

test('the admin’s dropdown names the tiers for the type', () => {
  assert.deepEqual(tierOptions('channel').map((o) => o.label), ['Superstar', 'Shining Star', 'Rising Star']);
  assert.deepEqual(tierOptions('individual').map((o) => o.label), ['Superhero', 'Ascended Master', 'Luminary', 'Local Hero']);
});

test('"Spiritpedia" is reserved, in any spelling of capitals and spaces', () => {
  for (const name of ['Spiritpedia', ' spirit-pedia ', 'SPIRITPEDIA Team', 'The Spiritpedia']) {
    assert.equal(reviewNameReserved(name), true, name);
  }
  for (const name of ['Bea', '', null, 'Spirit Guide']) {
    assert.equal(reviewNameReserved(name), false, String(name));
  }
});

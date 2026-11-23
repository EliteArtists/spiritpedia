import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearSlug } from './nearSlug.js';

const SLUGS = [
  'flying-cloud-zen-community',
  'ajahn-brahm',
  'ajahn-brahmali',
  'ajahn-canda',
  'sri-sri-ravi-shankar',
  'sri-sri-anandamayi-ma',
  'eckhart-tolle',
  'mooji',
];

test('the Flying Cloud Zen address goes to the real listing', () => {
  assert.equal(nearSlug('flying-cloud-zen', SLUGS), 'flying-cloud-zen-community');
});

test('capitals, spaces and hyphens', () => {
  assert.equal(nearSlug('Flying-Cloud-Zen-Community', SLUGS), 'flying-cloud-zen-community');
  assert.equal(nearSlug('flyingcloudzen-community', SLUGS), 'flying-cloud-zen-community');
  assert.equal(nearSlug('eckhart%20tolle', SLUGS), 'eckhart-tolle');
});

test('a one-letter slip', () => {
  assert.equal(nearSlug('ekhart-tolle', SLUGS), 'eckhart-tolle');
  assert.equal(nearSlug('flying-clud-zen-community', SLUGS), 'flying-cloud-zen-community');
});

test('words added at the end', () => {
  assert.equal(nearSlug('eckhart-tolle-talks', SLUGS), 'eckhart-tolle');
});

test('the nearer of two wins: ajahn-brahm is one letter from ajahn-brahmi, ajahn-brahmali three', () => {
  assert.equal(nearSlug('ajahn-brahmi', SLUGS), 'ajahn-brahm');
});

test('no guess when two are equally close', () => {
  assert.equal(nearSlug('sri-sri', SLUGS), null);
  assert.equal(nearSlug('ajahn', SLUGS), null);
});

test('no guess for one short word or nothing like it', () => {
  assert.equal(nearSlug('mooj', SLUGS), null);
  assert.equal(nearSlug('eckhart', SLUGS), null);
  assert.equal(nearSlug('someone-else-entirely', SLUGS), null);
  assert.equal(nearSlug('', SLUGS), null);
  assert.equal(nearSlug('flying-cloud-zen', []), null);
});

test('two letters is someone else', () => {
  assert.equal(nearSlug('sam-harris', ['dan-harris']), null);
});

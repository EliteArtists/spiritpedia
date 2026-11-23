import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countryName, fillFromApplication, likelyListings } from './applicationClaim.js';

const APPLICATION = {
  full_name: 'Flying Cloud Zen',
  bio: 'FCZ is a contemplative spiritual practice community.',
  website_url: 'https://flyingcloudzen.org/',
  location_city: 'Minneapolis',
  location_country: 'US',
  availability_type: 'local_online',
  image_urls: ['https://example.test/their-logo.png'],
};

const LISTING = {
  healer_slug: 'flying-cloud-zen-community',
  name: 'Flying Cloud Zen',
  bio: 'Written by Spiritpedia.',
  website_url: 'https://flyingcloudzen.org/',
  contact_email: 'bussho@flyingcloudzen.org',
  image_urls: ['https://example.test/old.png'],
  city: null,
  country: null,
  availability_type: 'Worldwide (Famous Names)',
};

test('country codes become names', () => {
  assert.equal(countryName('US'), 'United States');
  assert.equal(countryName('gb'), 'United Kingdom');
  assert.equal(countryName('Ireland'), 'Ireland');
  assert.equal(countryName(''), null);
});

test('the listing takes their bio, picture first, place and online', () => {
  assert.deepEqual(fillFromApplication(APPLICATION, LISTING), {
    bio: APPLICATION.bio,
    image_urls: ['https://example.test/their-logo.png', 'https://example.test/old.png'],
    city: 'Minneapolis',
    country: 'United States',
    availability_type: 'Local & Online Sessions',
  });
});

test('nothing they left empty, and nothing already the same', () => {
  assert.deepEqual(fillFromApplication({ bio: '  ' }, LISTING), {});
  const same = { ...LISTING, bio: APPLICATION.bio, image_urls: APPLICATION.image_urls, city: 'Minneapolis', country: 'United States', availability_type: 'Local & Online Sessions' };
  assert.deepEqual(fillFromApplication(APPLICATION, same), {});
});

test('Flying Cloud Zen is found by its website and name, and by a gmail address only when it is the same', () => {
  const others = [{ healer_slug: 'someone', name: 'Someone', website_url: 'https://gmail.com', contact_email: 'x@gmail.com' }];
  const found = likelyListings(APPLICATION, 'bussholahn@gmail.com', [LISTING, ...others]);
  assert.equal(found.length, 1);
  assert.equal(found[0].healer_slug, 'flying-cloud-zen-community');
  assert.deepEqual(found[0].why, ['same website', 'same name']);
  assert.deepEqual(likelyListings({}, 'bussho@flyingcloudzen.org', [LISTING])[0].why, ['same email']);
  assert.deepEqual(likelyListings({}, 'office@flyingcloudzen.org', [LISTING])[0].why, ['email on the same domain']);
  assert.deepEqual(likelyListings({ full_name: 'The Flying Cloud Zen Community' }, null, [LISTING])[0].why, ['same name']);
  assert.deepEqual(likelyListings({}, 'someone@gmail.com', others), []);
});

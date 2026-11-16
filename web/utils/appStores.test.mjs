import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
  cleanAppClick,
  deviceFromUserAgent,
  getAppHref,
  storeFromSlug,
  storeUrl,
  storesFor,
} from './appStores.js';

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
};

test('the device from the user-agent', () => {
  assert.equal(deviceFromUserAgent(UA.iphone), 'iphone');
  assert.equal(deviceFromUserAgent(UA.iphoneChrome), 'iphone');
  assert.equal(deviceFromUserAgent(UA.ipad), 'ipad');
  assert.equal(deviceFromUserAgent(UA.android), 'android'); // says Linux too
  assert.equal(deviceFromUserAgent(UA.windows), 'desktop');
  assert.equal(deviceFromUserAgent(UA.mac), 'desktop');
  assert.equal(deviceFromUserAgent(''), 'other');
  assert.equal(deviceFromUserAgent(undefined), 'other');
});

test('an iPad that says it is a Mac is caught by its touch screen', () => {
  assert.equal(deviceFromUserAgent(UA.mac, 5), 'ipad');
  assert.equal(deviceFromUserAgent(UA.mac, 0), 'desktop');
});

test('one store for a phone or tablet, both for anything else', () => {
  assert.deepEqual(storesFor('iphone'), ['app_store']);
  assert.deepEqual(storesFor('ipad'), ['app_store']);
  assert.deepEqual(storesFor('android'), ['google_play']);
  assert.deepEqual(storesFor('desktop'), ['app_store', 'google_play']);
  assert.deepEqual(storesFor('other'), ['app_store', 'google_play']);
  assert.deepEqual(storesFor(null), ['app_store', 'google_play']);
});

test('the store links', () => {
  assert.equal(APP_STORE_URL, 'https://apps.apple.com/app/spiritpedia/id6821430226');
  assert.equal(GOOGLE_PLAY_URL, 'https://play.google.com/store/apps/details?id=co.spiritpedia.app');
  assert.equal(storeUrl('app_store', 'footer'), APP_STORE_URL);
  assert.equal(
    storeUrl('google_play', 'footer'),
    `${GOOGLE_PLAY_URL}&referrer=utm_source%3Dspiritpedia%26utm_medium%3Dfooter`
  );
  // An unknown placement never reaches the referrer.
  assert.match(storeUrl('google_play', '<x>'), /utm_medium%3Dwebsite$/);
});

test('every link goes through the counting address', () => {
  assert.equal(getAppHref('app_store', 'footer'), '/get-app/app-store?from=footer');
  assert.equal(getAppHref('google_play', 'welcome_email', 'https://www.spiritpedia.co'), 'https://www.spiritpedia.co/get-app/google-play?from=welcome_email');
  assert.equal(storeFromSlug('app-store'), 'app_store');
  assert.equal(storeFromSlug('google-play'), 'google_play');
  assert.equal(storeFromSlug('app_store'), null);
  assert.equal(storeFromSlug('itunes'), null);
});

test('a good count becomes the four values', () => {
  assert.deepEqual(cleanAppClick({ placement: 'footer', store: 'app_store', device: 'iphone', action: 'tap' }), {
    p_placement: 'footer',
    p_store: 'app_store',
    p_device: 'iphone',
    p_action: 'tap',
  });
  // An unknown device is counted as 'other', not refused.
  assert.equal(cleanAppClick({ placement: 'library', store: 'google_play', device: 'tv', action: 'tap' }).p_device, 'other');
  // 'both' only for a dismiss.
  assert.ok(cleanAppClick({ placement: 'after_signup', store: 'both', device: 'desktop', action: 'dismiss' }));
  assert.equal(cleanAppClick({ placement: 'after_signup', store: 'both', device: 'desktop', action: 'tap' }), null);
});

test('anything off is refused whole', () => {
  const ok = { placement: 'teacher_page', store: 'app_store', device: 'ipad', action: 'tap' };
  assert.ok(cleanAppClick(ok));
  assert.equal(cleanAppClick({ ...ok, placement: 'homepage' }), null);
  assert.equal(cleanAppClick({ ...ok, store: 'amazon' }), null);
  assert.equal(cleanAppClick({ ...ok, action: 'follow' }), null);
  assert.equal(cleanAppClick(undefined), null);
});

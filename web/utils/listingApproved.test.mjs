import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listingLiveMessage } from './listingApproved.js';

const base = {
  firstName: 'Jane',
  listingName: 'Jane Doe Healing',
  listingUrl: 'https://www.spiritpedia.co/healers/jane-doe-healing',
  accountUrl: 'https://www.spiritpedia.co/account',
  supportEmail: 'love@spiritpedia.co',
};

test('says it is live, links the listing and the account page', () => {
  const m = listingLiveMessage(base);
  assert.equal(m.subject, 'Your listing on Spiritpedia is live');
  assert.match(m.text, /^Hi Jane,/);
  assert.match(m.text, /Jane Doe Healing is now live on Spiritpedia/);
  assert.match(m.text, /healers\/jane-doe-healing/);
  assert.match(m.text, /spiritpedia\.co\/account/);
  assert.match(m.text, /love@spiritpedia\.co/);
  assert.match(m.text, /With love,\nThe Spiritpedia team$/);
});

test('names are escaped in the HTML; a missing name still reads', () => {
  const m = listingLiveMessage({ ...base, listingName: 'Tom & <Jerry>' });
  assert.match(m.html, /Tom &amp; &lt;Jerry&gt;/);
  const plain = listingLiveMessage({ ...base, firstName: '', listingName: null });
  assert.match(plain.text, /^Hi there,/);
  assert.match(plain.text, /Your listing is now live/);
});

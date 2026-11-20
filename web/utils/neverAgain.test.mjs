import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDoNotContactEmail, normaliseEmail, reviveMatch, siteKey } from './neverAgain.js';
import { DO_NOT_CONTACT, doNotContactByAddress, journeyState } from './journey.js';

const LIST = [
  { name: 'Buddhist Society of Western Australia', healer_slug: 'buddhist-society-of-western-australia', website_url: 'https://bswa.org/' },
  { name: 'Nandhiji', healer_slug: 'nandhiji', website_url: 'https://nandhiji.com/' },
];

test('addresses compare lower case without spaces', () => {
  assert.equal(normaliseEmail(' Admin@BSWA.org '), 'admin@bswa.org');
  assert.equal(normaliseEmail('not an address'), null);
  assert.equal(normaliseEmail(null), null);
});

test('a website is the same site with or without scheme, www. or a trailing slash', () => {
  assert.equal(siteKey('https://www.bswa.org/'), 'bswa.org');
  assert.equal(siteKey('http://bswa.org'), 'bswa.org');
  assert.equal(siteKey('https://bswa.org/teachers/ajahn-brahm/'), 'bswa.org/teachers/ajahn-brahm');
  assert.equal(siteKey(''), null);
});

test('do not revive: matched by slug, by name in any case, or by website', () => {
  assert.equal(reviveMatch(LIST, { slug: 'nandhiji' })?.name, 'Nandhiji');
  assert.equal(reviveMatch(LIST, { slug: 'bswa', name: 'buddhist society of western australia ' })?.healer_slug, 'buddhist-society-of-western-australia');
  assert.equal(reviveMatch(LIST, { slug: 'bswa-perth', name: 'BSWA', website: 'http://www.bswa.org' })?.name, 'Buddhist Society of Western Australia');
});

test('do not revive: a teacher on the same site is not caught', () => {
  assert.equal(reviveMatch(LIST, { slug: 'ajahn-brahm', name: 'Ajahn Brahm', website: 'https://bswa.org/teachers/ajahn-brahm/' }), null);
  assert.equal(reviveMatch([], { slug: 'nandhiji' }), null);
});

// The do-not-contact lookup, against a fake table.
function fakeList(emails, { error = null } = {}) {
  return {
    from(table) {
      assert.equal(table, 'do_not_contact_emails');
      let wanted = [];
      const chain = {
        select: () => chain,
        in: (_column, values) => {
          wanted = values;
          return chain;
        },
        limit: () => Promise.resolve(error ? { data: null, error } : { data: emails.filter((e) => wanted.includes(e)).map((email) => ({ email })), error: null }),
      };
      return chain;
    },
  };
}

test('do not contact: listed, not listed, and a failed lookup', async () => {
  assert.equal(await isDoNotContactEmail('ADMIN@bswa.org', fakeList(['admin@bswa.org'])), true);
  assert.equal(await isDoNotContactEmail(['a@b.org', 'admin@bswa.org'], fakeList(['admin@bswa.org'])), true);
  assert.equal(await isDoNotContactEmail('a@b.org', fakeList(['admin@bswa.org'])), false);
  assert.equal(await isDoNotContactEmail('a@b.org', fakeList([], { error: { code: 'XX000', message: 'down' } })), null);
});

test('do not contact: before migration 0055 there is no list, and nothing is blocked by it', async () => {
  assert.equal(await isDoNotContactEmail('a@b.org', fakeList([], { error: { code: 'PGRST205', message: 'no table' } })), false);
  assert.equal(await isDoNotContactEmail('', fakeList([])), false);
});

test('do not contact: Start and the daily job refuse a listed address, and a failed check refuses too', async () => {
  assert.equal(await doNotContactByAddress(fakeList(['admin@bswa.org']), 'admin@bswa.org'), 'The owner marked this address do not contact.');
  assert.match(await doNotContactByAddress(fakeList([], { error: { code: 'XX000', message: 'down' } }), 'a@b.org'), /Could not check/);
});

test('a journey stopped as do not contact shows as Do not contact, and blocks the listing', () => {
  assert.ok(DO_NOT_CONTACT.do_not_contact_email);
  assert.equal(journeyState({ status: 'stopped', stop_reason: 'do_not_contact_email' }), 'do_not_contact');
});

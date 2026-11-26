import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fieldsHolding, placesHolding } from './oldAddress.js';

const OLD = 'nigelgee@testcoaching.com';

test('a mailto booking button and a bio still holding the old address', () => {
  const listing = {
    id: 9,
    name: 'Nigel Gee',
    contact_email: 'journeyhome1111@gmail.com',
    booking_url: 'mailto:NigelGee@testcoaching.com',
    bio: `Write to ${OLD} to book.`,
    website_url: 'https://returninghome.co.uk/',
  };
  assert.deepEqual(fieldsHolding(OLD, listing), ['booking_url', 'bio']);
});

test('nothing when the address is not there, or is not an address', () => {
  assert.deepEqual(fieldsHolding(OLD, { booking_url: 'https://returninghome.co.uk/' }), []);
  assert.deepEqual(fieldsHolding('', { bio: 'x' }), []);
  assert.deepEqual(fieldsHolding('gee', { bio: 'Nigel Gee' }), []);
});

test('places across the listing, its items and another listing, with the fields to skip', () => {
  const places = placesHolding(OLD, [
    { table: 'healers', rows: [{ id: 9, name: 'Nigel Gee', booking_url: `mailto:${OLD}`, contact_email_source: OLD }], nameOf: (r) => r.name, hrefOf: () => '/admin/content/nigel-gee', skip: ['contact_email_source'] },
    { table: 'courses', rows: [{ id: 3, title: 'A course', url: `mailto:${OLD}?subject=Course` }], nameOf: (r) => r.title },
    { table: 'healers', rows: [{ id: 12, name: 'Returning Home', contact_email: OLD }], nameOf: (r) => r.name },
  ]);
  assert.deepEqual(
    places.map((p) => [p.table, p.id, p.label]),
    [
      ['healers', 9, 'Booking button'],
      ['courses', 3, 'Link'],
      ['healers', 12, 'Contact email'],
    ]
  );
  assert.equal(places[0].href, '/admin/content/nigel-gee');
});

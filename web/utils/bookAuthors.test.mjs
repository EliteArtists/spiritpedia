// Run with `npm test` (node --test).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bookAuthorSlugs, booksByAuthorsFilter, joinNames } from './bookAuthors.js';

test('a one-author book has just the main author', () => {
  assert.deepEqual(bookAuthorSlugs({ healer_slug: 'eva-dalak', co_healer_slugs: [] }), ['eva-dalak']);
});

test('co-authors follow the main author, without repeats or blanks', () => {
  assert.deepEqual(
    bookAuthorSlugs({ healer_slug: 'amron-bevels', co_healer_slugs: ['amy-belair', 'amron-bevels', null] }),
    ['amron-bevels', 'amy-belair']
  );
});

test('a book from before 0027 (no co_healer_slugs field) still works', () => {
  assert.deepEqual(bookAuthorSlugs({ healer_slug: 'napoleon-hill' }), ['napoleon-hill']);
  assert.deepEqual(bookAuthorSlugs({ healer_slug: null }), []);
});

test('the filter matches main authors and co-authors', () => {
  assert.equal(
    booksByAuthorsFilter(['amy-belair']),
    'healer_slug.in.(amy-belair),co_healer_slugs.ov.{amy-belair}'
  );
  assert.equal(
    booksByAuthorsFilter(['amy-belair', 'amron-bevels']),
    'healer_slug.in.(amy-belair,amron-bevels),co_healer_slugs.ov.{amy-belair,amron-bevels}'
  );
});

test('unsafe or empty slugs give no filter rather than a broken one', () => {
  assert.equal(booksByAuthorsFilter([]), null);
  assert.equal(booksByAuthorsFilter(undefined), null);
  assert.equal(booksByAuthorsFilter(['a,b)', 'X']), null);
  assert.equal(booksByAuthorsFilter(['ok-slug', 'bad slug']), 'healer_slug.in.(ok-slug),co_healer_slugs.ov.{ok-slug}');
});

test('names join the way the page reads', () => {
  assert.equal(joinNames([]), '');
  assert.equal(joinNames(['Eva Dalak']), 'Eva Dalak');
  assert.equal(joinNames(['Amron Bevels', 'Amy Belair']), 'Amron Bevels and Amy Belair');
  assert.equal(joinNames(['A', 'B', 'C']), 'A, B and C');
});

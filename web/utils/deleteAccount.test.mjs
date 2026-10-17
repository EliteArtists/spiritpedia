import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewFlag, splitImages } from './deleteAccount.js';

test('a deleted publisher account flags its listing (migration 0022)', () => {
  const row = reviewFlag(
    { user_type: 'practitioner', linked_healer_slug: null, linked_publisher_id: 'pub-1' },
    { source: 'website', keptImages: 0 }
  );
  assert.deepEqual(row, {
    source: 'website',
    user_type: 'practitioner',
    linked_healer_slug: null,
    linked_publisher_id: 'pub-1',
    kept_image_count: 0,
  });
});

test('a healer listing is flagged as before, without the publisher column', () => {
  const row = reviewFlag(
    { user_type: 'practitioner', linked_healer_slug: 'jane-doe', linked_publisher_id: null },
    { source: 'app', keptImages: 2 }
  );
  assert.deepEqual(row, {
    source: 'app',
    user_type: 'practitioner',
    linked_healer_slug: 'jane-doe',
    kept_image_count: 2,
  });
  assert.equal('linked_publisher_id' in row, false);
});

test('nothing to review: no listing, or the admin deleting it', () => {
  assert.equal(reviewFlag({ user_type: 'explorer' }, { source: 'website' }), null);
  assert.equal(reviewFlag(null, { source: 'app' }), null);
  assert.equal(
    reviewFlag({ linked_publisher_id: 'pub-1' }, { source: 'admin' }),
    null
  );
});

test('photos the listing still shows are kept', () => {
  const { keep, remove } = splitImages(
    ['u1/a.jpg', 'u1/b.jpg'],
    ['https://x.supabase.co/storage/v1/object/public/practitioner-images/u1/a.jpg']
  );
  assert.deepEqual(keep, ['u1/a.jpg']);
  assert.deepEqual(remove, ['u1/b.jpg']);
});

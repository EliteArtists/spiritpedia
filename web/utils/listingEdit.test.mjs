import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_TABLES, changedFields, cleanEdit, defaultLockNote, lockOf, lockRefusal, logSummary } from './listingEdit.js';
import { stopJourneyOnClaim } from './journey.js';

test('each kind of item offers the fields it has: title, description, price, link, image', () => {
  const names = (t) => ITEM_TABLES[t].fields.map((f) => f.name);
  assert.deepEqual(names('courses'), ['title', 'description', 'price', 'course_url', 'image_url']);
  assert.deepEqual(names('free_resources'), ['title', 'description', 'resource_url', 'image_url']);
  assert.deepEqual(names('books'), ['title', 'description', 'amazon_url', 'mock_cover_url']);
  // Videos have no description, price or image column: the thumbnail is YouTube's.
  assert.deepEqual(names('videos'), ['title', 'platform_url']);
});

test('an edit is trimmed, empties optional fields, and refuses what the table lacks', () => {
  assert.deepEqual(cleanEdit('courses', { title: '  Reiki I  ', price: '' }), { values: { title: 'Reiki I', price: null } });
  assert.match(cleanEdit('courses', { title: '' }).error, /Title can't be empty/);
  assert.match(cleanEdit('videos', { price: '$5' }).error, /no "price"/);
  assert.match(cleanEdit('courses', { course_url: 'mainstreamreiki.com' }).error, /https/);
  assert.match(cleanEdit('healers', { title: 'x' }).error, /can't be edited/);
  assert.match(cleanEdit('books', {}).error, /Nothing/);
});

test('only the fields that differ are written and logged', () => {
  const row = { title: 'Reiki Master', price: '$1,075', description: null };
  const { before, after, changed } = changedFields(row, { title: 'Reiki Master', price: null, description: null });
  assert.deepEqual(changed, ['price']);
  assert.deepEqual(before, { price: '$1,075' });
  assert.deepEqual(after, { price: null });
});

test('the lock: a listing_locks row or nothing', () => {
  assert.deepEqual(lockOf(null), { locked: false, note: null, at: null, by: null });
  const lock = lockOf({ note: 'owner request — keep minimal (18 Nov 2026)', locked_at: '2026-11-18T14:45:00Z', locked_by: 'Admin' });
  assert.equal(lock.locked, true);
  assert.equal(lock.note, 'owner request — keep minimal (18 Nov 2026)');
  assert.equal(defaultLockNote(new Date('2026-11-18T12:00:00Z')), 'owner request — keep minimal (18 Nov 2026)');
});

test("the database's refusal reads as words for the admin", () => {
  const error = { message: 'listing_locked: Andrea Kennedy is locked (owner request). Switch the lock off in Admin → Content first.' };
  assert.match(lockRefusal(error), /^Andrea Kennedy is locked/);
  assert.equal(lockRefusal({ message: 'duplicate key' }), null);
});

test('log lines', () => {
  assert.equal(logSummary({ action: 'edit', table: 'courses', title: 'Reiki I', changed: ['price'] }), 'Edited offering "Reiki I": price');
  assert.equal(logSummary({ action: 'remove', table: 'free_resources', title: 'Independence' }), 'Removed free resource "Independence"');
  assert.equal(logSummary({ action: 'remove_all', table: 'courses', count: 6 }), 'Removed all offerings (6)');
  assert.equal(logSummary({ action: 'lock', note: 'owner request' }), 'Locked: owner request');
  assert.equal(logSummary({ action: 'unlock' }), 'Lock switched off');
});

// A stand-in for the supabase-js chain the helper uses.
function fakeJourneys(rows) {
  const calls = [];
  const chain = {
    update(values) { calls.push(['update', values]); return chain; },
    eq(column, value) { calls.push(['eq', column, value]); this.match = [column, value]; return chain; },
    in(column, values) { calls.push(['in', column, values]); this.statuses = values; return chain; },
    async select() {
      const [column, value] = chain.match;
      const hit = rows.filter((r) => r[column] === value && chain.statuses.includes(r.status));
      return { data: hit.map((r) => ({ id: r.id })), error: null };
    },
  };
  return { calls, client: { from: (table) => (calls.push(['from', table]), chain) } };
}

test('a claim stops a running or paused journey at once, marked claimed', async () => {
  const { calls, client } = fakeJourneys([
    { id: 1, healer_slug: 'mike-maher', status: 'running' },
    { id: 2, healer_slug: 'someone-else', status: 'running' },
  ]);
  assert.equal(await stopJourneyOnClaim(client, 'mike-maher'), 1);
  assert.deepEqual(calls[0], ['from', 'healer_journeys']);
  assert.deepEqual(calls[1], ['update', { status: 'stopped', stop_reason: 'claimed' }]);
  assert.deepEqual(calls[2], ['eq', 'healer_slug', 'mike-maher']);
  assert.deepEqual(calls[3], ['in', 'status', ['running', 'paused']]);
});

test('a publisher claim stops the publisher journey', async () => {
  const { calls, client } = fakeJourneys([{ id: 3, publisher_id: 7, status: 'paused' }]);
  assert.equal(await stopJourneyOnClaim(client, { publisherId: 7 }), 1);
  assert.deepEqual(calls[2], ['eq', 'publisher_id', 7]);
  assert.equal(await stopJourneyOnClaim(client, null), 0);
});

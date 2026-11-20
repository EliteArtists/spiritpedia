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

// A stand-in for the supabase-js chains the helper uses: a read by listing,
// then an update by id.
function fakeJourneys(rows) {
  const calls = [];
  const client = {
    from(table) {
      calls.push(['from', table]);
      let values = null;
      const chain = {
        select(cols) {
          calls.push(['select', cols]);
          if (values) return Promise.resolve({ data: chain.hit.map((r) => ({ id: r.id })), error: null });
          return chain;
        },
        eq(column, value) {
          calls.push(['eq', column, value]);
          return Promise.resolve({ data: rows.filter((r) => r[column] === value), error: null });
        },
        update(v) { calls.push(['update', v]); values = v; return chain; },
        in(column, ids) {
          calls.push(['in', column, ids]);
          chain.hit = rows.filter((r) => ids.includes(r.id));
          for (const r of chain.hit) Object.assign(r, values);
          return chain;
        },
      };
      return chain;
    },
  };
  return { calls, client };
}

test('a claim stops a running or paused journey at once, marked claimed', async () => {
  const rows = [
    { id: 1, healer_slug: 'mike-maher', status: 'running' },
    { id: 2, healer_slug: 'someone-else', status: 'running' },
  ];
  const { calls, client } = fakeJourneys(rows);
  assert.equal(await stopJourneyOnClaim(client, 'mike-maher'), 1);
  assert.deepEqual(calls[2], ['eq', 'healer_slug', 'mike-maher']);
  assert.deepEqual(calls.find((c) => c[0] === 'update'), ['update', { status: 'stopped', stop_reason: 'claimed' }]);
  assert.deepEqual(calls.find((c) => c[0] === 'in'), ['in', 'id', [1]]);
  assert.equal(rows[1].status, 'running');
});

test('claimed wins over replied, form, complete and stopped, and keeps the replied date', async () => {
  const rows = [
    { id: 1, healer_slug: 'cambridge-zen-center', status: 'stopped', stop_reason: 'replied', replied_at: '2026-11-19T10:00:00Z' },
    { id: 2, healer_slug: 'cambridge-zen-center', status: 'stopped', stop_reason: 'contacted_via_form', channel: 'form' },
    { id: 3, healer_slug: 'cambridge-zen-center', status: 'stopped', stop_reason: 'sequence_complete' },
    { id: 4, healer_slug: 'cambridge-zen-center', status: 'stopped', stop_reason: 'no_contact_email' },
  ];
  const { client } = fakeJourneys(rows);
  assert.equal(await stopJourneyOnClaim(client, 'cambridge-zen-center'), 4);
  for (const r of rows) assert.equal(r.stop_reason, 'claimed');
  assert.equal(rows[0].replied_at, '2026-11-19T10:00:00Z');
});

test('never-again reasons keep their stop reason; already claimed is left alone', async () => {
  const rows = [
    { id: 1, healer_slug: 'x', status: 'stopped', stop_reason: 'asked_to_stop' },
    { id: 2, healer_slug: 'x', status: 'stopped', stop_reason: 'suppressed' },
    { id: 3, healer_slug: 'x', status: 'stopped', stop_reason: 'claimed' },
  ];
  const { calls, client } = fakeJourneys(rows);
  assert.equal(await stopJourneyOnClaim(client, 'x'), 0);
  assert.equal(calls.some((c) => c[0] === 'update'), false);
  assert.equal(rows[0].stop_reason, 'asked_to_stop');
});

test('a publisher claim stops the publisher journey', async () => {
  const { calls, client } = fakeJourneys([{ id: 3, publisher_id: 7, status: 'paused' }]);
  assert.equal(await stopJourneyOnClaim(client, { publisherId: 7 }), 1);
  assert.deepEqual(calls[2], ['eq', 'publisher_id', 7]);
  assert.equal(await stopJourneyOnClaim(client, null), 0);
});

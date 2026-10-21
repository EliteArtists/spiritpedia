import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAIM_REQUEST_RETENTION_MONTHS,
  claimDecisionMessage,
  claimRequestCutoff,
  purgeDecidedClaimRequests,
} from './claimRequests.js';

// A stand-in for the supabase-js query builder over claim_requests rows:
// applies the filters purgeDecidedClaimRequests uses, and deletes the matches.
function fakeClient(rows) {
  const table = { rows: [...rows] };
  return {
    table,
    from(name) {
      assert.equal(name, 'claim_requests');
      const filters = [];
      const q = {
        delete: () => q,
        neq: (col, v) => (filters.push((r) => r[col] !== v), q),
        not: (col, op, v) => (filters.push((r) => (op === 'is' && v === null ? r[col] != null : true)), q),
        lt: (col, v) => (filters.push((r) => r[col] != null && r[col] < v), q),
        select: async () => {
          const gone = table.rows.filter((r) => filters.every((f) => f(r)));
          table.rows = table.rows.filter((r) => !gone.includes(r));
          return { data: gone.map(({ id }) => ({ id })), error: null };
        },
      };
      return q;
    },
  };
}

const NOW = new Date('2027-10-17T05:00:00Z');

test('the promise: 12 months after the decision', () => {
  assert.equal(CLAIM_REQUEST_RETENTION_MONTHS, 12);
  assert.equal(claimRequestCutoff(NOW), '2026-10-17T05:00:00.000Z');
});

test('decided over 12 months ago goes; pending never does, however old', async () => {
  const supabase = fakeClient([
    { id: 'approved-old', status: 'approved', decided_at: '2026-10-01T00:00:00Z' },
    { id: 'rejected-old', status: 'rejected', decided_at: '2025-03-01T00:00:00Z' },
    { id: 'withdrawn-old', status: 'withdrawn', decided_at: '2026-01-01T00:00:00Z' },
    { id: 'rejected-recent', status: 'rejected', decided_at: '2027-02-01T00:00:00Z' },
    { id: 'pending-ancient', status: 'pending', decided_at: null },
    { id: 'decided-without-date', status: 'approved', decided_at: null },
  ]);
  assert.deepEqual(await purgeDecidedClaimRequests(supabase, NOW), { deleted: 3 });
  assert.deepEqual(
    supabase.table.rows.map((r) => r.id),
    ['rejected-recent', 'pending-ancient', 'decided-without-date']
  );
});

test('an error is reported, not thrown', async () => {
  const broken = {
    from: () => {
      const q = { delete: () => q, neq: () => q, not: () => q, lt: () => q, select: async () => ({ data: null, error: { message: 'boom' } }) };
      return q;
    },
  };
  assert.deepEqual(await purgeDecidedClaimRequests(broken, NOW), { error: 'boom' });
});

const base = {
  firstName: 'Ross',
  listingName: 'Hay House',
  listingUrl: 'https://spiritpedia.co/publishers/hay-house',
  accountUrl: 'https://spiritpedia.co/account',
  supportEmail: 'love@spiritpedia.co',
};

test('approved: says so, links the account page and the listing', () => {
  const m = claimDecisionMessage({ ...base, decision: 'approved' });
  assert.equal(m.subject, 'You can now manage Hay House on Spiritpedia');
  assert.match(m.text, /^Hi Ross,/);
  assert.match(m.text, /Your request to manage Hay House has been approved\./);
  assert.match(m.text, /Manage your listing: https:\/\/www\.spiritpedia\.co\/account/);
  assert.match(m.text, /With love,\nThe Spiritpedia team$/);
});

test('rejected: gently, with a way to ask again', () => {
  const m = claimDecisionMessage({ ...base, decision: 'rejected' });
  assert.equal(m.subject, 'An update on your claim to Hay House');
  assert.match(m.text, /weren't able to confirm/);
  assert.match(m.text, /love@spiritpedia\.co/);
  assert.doesNotMatch(m.text, /approved/);
});

test('names are escaped in the HTML; a missing name still reads', () => {
  const m = claimDecisionMessage({ ...base, decision: 'approved', listingName: 'Tom & <Jerry>' });
  assert.match(m.html, /Tom &amp; &lt;Jerry&gt;/);
  const unnamed = claimDecisionMessage({ ...base, decision: 'rejected', listingName: null, firstName: '' });
  assert.match(unnamed.text, /^Hello,/);
  assert.match(unnamed.subject, /the listing/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRetryList, heldPlanRow, isSprintReport, devOnly, isLivePlanPath } from './ops.mjs';

const README = `
4. **Parked** something.
5. **Retry on another day** (never the same day): San Francisco Zen Center, the Sati
   Center, Kathie and Paul Scott (the robots.txt request failed; look for a photo of
   both of them), Ashram Sivananda Orléans and Shakti Shala Antigua (502 and a dropped
   connection; plans held), La Sarmiento (connection errors), Bakara
   Wintner (429). Sivananda Ashram Bahamas goes in once a usable photo loads.
6. **Waiting:** Ally Bogard.
`;

test('the retry list: names split at top-level commas, reasons from brackets', () => {
  const list = parseRetryList(README);
  assert.deepEqual(list.map((r) => r.name), [
    'San Francisco Zen Center',
    'the Sati Center',
    'Kathie and Paul Scott',
    'Ashram Sivananda Orléans and Shakti Shala Antigua',
    'La Sarmiento',
    'Bakara Wintner',
    'Sivananda Ashram Bahamas',
  ]);
  assert.equal(list[2].reason, 'the robots.txt request failed; look for a photo of both of them');
  assert.equal(list[5].reason, '429');
  assert.equal(list[6].reason, 'Sivananda Ashram Bahamas goes in once a usable photo loads.');
  assert.equal(list[0].reason, null);
});

test('no retry item, no rows', () => {
  assert.deepEqual(parseRetryList('# README\n'), []);
});

test('a held plan becomes a row; an unheld one does not', () => {
  const plan = { healer: { healer_slug: 'x', create: { name: 'X Centre' } }, sprint: { held: 'no email', sprint: 'night-1', rank: 4 } };
  assert.deepEqual(heldPlanRow(plan, 'docs/content-audits/x.json'), {
    kind: 'held_plan', item_key: 'docs/content-audits/x.json', title: 'X Centre', slug: 'x',
    reason: 'no email', path: 'docs/content-audits/x.json', detail: { sprint: 'night-1', hub: null, rank: 4 },
  });
  assert.equal(heldPlanRow({ healer: {}, sprint: { held: false } }, 'a.json'), null);
  assert.equal(heldPlanRow({ healer: {}, sprint: 'pipelines-3' }, 'a.json'), null);
});

test('dropped, skipped and leads folders are not live plans', () => {
  assert.equal(isLivePlanPath('docs/content-audits/night-sprint-2026-11-09/dropped/a.json'), false);
  assert.equal(isLivePlanPath('docs/content-audits/a.json'), true);
});

test('sprint reports only', () => {
  assert.equal(isSprintReport('2026-11-10-night-sprint.md'), true);
  assert.equal(isSprintReport('2026-11-01-content-run-live.md'), true);
  assert.equal(isSprintReport('2026-11-03-location-audit.md'), false);
  assert.equal(isSprintReport('latest.md'), false);
});

test('dev-only listings', () => {
  assert.deepEqual(devOnly([{ healer_slug: 'a' }, { healer_slug: 'b' }], ['a']), [{ healer_slug: 'b' }]);
});

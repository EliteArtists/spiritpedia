import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReportTable, planStrips, stripFragment, wantsStrip } from './fragments.mjs';

const MD = `
| Item | Kind | Listing | Fragment | Page checked | Proposed |
| :-- | :-- | :-- | :-- | :-- | :-- |
| One-on-One | offering | bhavani | \`#Private\` | yes, anchor found | keep (real anchor) |
| Wisdom | offering | fss | \`#wisdom\` | yes, no anchor | strip after 0047 |
| Spoken Word | offering | fss | \`#spoken-word\` | yes, no anchor | strip after 0047 |
| JKZ App | free resource | jon-kabat-zinn | \`#app\` | blocked | unchecked (robots.txt blocks Claude's agents); strip after 0047 |
| True Meditation | free resource | adyashanti | \`#ot_1\` | unreachable | unchecked (HTTP 403); strip after 0047 |
`;

test('the report table parses', () => {
  const rows = parseReportTable(MD);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[1], { table: 'courses', title: 'Wisdom', listing: 'fss', fragment: 'wisdom', proposed: 'strip after 0047' });
  assert.equal(rows[3].table, 'free_resources');
  assert.deepEqual(rows.map(wantsStrip), [false, true, true, true, true]);
});

test('stripFragment', () => {
  assert.equal(stripFragment('https://a.org/x/#y'), 'https://a.org/x/');
  assert.equal(stripFragment('https://a.org/x'), 'https://a.org/x');
});

const DB = [
  { table: 'courses', id: 'c1', title: 'Wisdom', url: 'https://aud.com/a#wisdom', listing: 'fss', healer_id: 1 },
  { table: 'courses', id: 'c2', title: 'Spoken Word', url: 'https://aud.com/a#spoken-word', listing: 'fss', healer_id: 1 },
  { table: 'free_resources', id: 'f1', title: 'JKZ App', url: 'https://jkz.com/#app', listing: 'jon-kabat-zinn', healer_id: 2 },
  { table: 'free_resources', id: 'f2', title: 'True Meditation', url: 'https://ady.org/t#ot_1', listing: 'adyashanti', healer_id: 3 },
];

test('strips the made-up and unchecked ones, keeps anchors and JKZ', () => {
  const { changes, skipped } = planStrips(parseReportTable(MD), DB, new Map());
  assert.deepEqual(changes.map((c) => [c.id, c.after]), [['c1', 'https://aud.com/a'], ['c2', 'https://aud.com/a'], ['f2', 'https://ady.org/t']]);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].listing, 'jon-kabat-zinn');
});

test('a row whose stripped link and title already exist is skipped', () => {
  const on = new Map([['courses:https://aud.com/a', [{ id: 'c9', title: 'Wisdom', healer_id: 1 }]]]);
  const { changes, skipped } = planStrips(parseReportTable(MD), DB, on);
  assert.deepEqual(changes.map((c) => c.id), ['c2', 'f2']);
  assert.match(skipped.find((s) => s.id === 'c1').why, /row c9/);
});

test('same link and title on another listing is no clash for an offering', () => {
  const on = new Map([['courses:https://aud.com/a', [{ id: 'c9', title: 'Wisdom', healer_id: 99 }]]]);
  assert.equal(planStrips(parseReportTable(MD), DB, on).changes.length, 3);
});

test('a free resource clashes across the whole table', () => {
  const on = new Map([['free_resources:https://ady.org/t', [{ id: 'f9', title: 'True Meditation', healer_id: 99 }]]]);
  const { changes } = planStrips(parseReportTable(MD), DB, on);
  assert.equal(changes.some((c) => c.id === 'f2'), false);
});

test('a row no longer in the database is reported, not guessed', () => {
  const { skipped } = planStrips(parseReportTable(MD), DB.filter((d) => d.id !== 'c2'), new Map());
  assert.ok(skipped.some((s) => s.title === 'Spoken Word' && /no longer/.test(s.why)));
});

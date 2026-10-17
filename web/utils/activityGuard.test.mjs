import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cleanBatch, needingSubjects, safeTerm, withSubjects, MAX_EVENTS } from './activityGuard.js';

const cases = JSON.parse(fs.readFileSync(new URL('../shared/emotion-safety.cases.json', import.meta.url)));
const crisisInputs = cases.searchCases
  .filter((c) => !c.dualPathAnswer && c.expected?.type === 'crisis')
  .map((c) => c.input);

test('every crisis search in the shared safety cases is dropped whole', () => {
  assert.ok(crisisInputs.length > 10, 'the cases include crisis searches');
  for (const input of crisisInputs) {
    const out = cleanBatch([
      { kind: 'search', term: input, no_results: true },
      { kind: 'search', term: input, subjects: ['meditation'] },
    ]);
    assert.deepEqual(out, [], input);
  }
});

test('a dual-path search keeps its subjects but never its words', () => {
  const ambiguous = cases.searchCases.find((c) => !c.dualPathAnswer && c.expected?.type === 'dual_path');
  assert.ok(ambiguous, 'the cases include a dual-path search');
  assert.equal(safeTerm(ambiguous.input), null);
  const out = cleanBatch([{ kind: 'search', term: ambiguous.input, no_results: true, subjects: ['meditation'] }]);
  assert.deepEqual(out, [{ kind: 'search', subjects: ['meditation'] }]);
});

test('an ordinary search with no results keeps its words, shortened to 60', () => {
  const out = cleanBatch([{ kind: 'search', term: '  reiki for dogs ', no_results: true }]);
  assert.deepEqual(out, [{ kind: 'search', term: 'reiki for dogs', no_results: true }]);
  assert.equal(cleanBatch([{ kind: 'search', term: 'a'.repeat(100), no_results: true }])[0].term.length, 60);
});

test('a search with results sends its subjects, never its words', () => {
  const out = cleanBatch([{ kind: 'search', term: 'I feel lost', subjects: ['life-coaching', 'soul-purpose'] }]);
  assert.deepEqual(out, [{ kind: 'search', subjects: ['life-coaching', 'soul-purpose'] }]);
});

test('bad events are dropped and batches are capped', () => {
  assert.deepEqual(
    cleanBatch([
      { kind: 'hack' },
      { kind: 'open', content_type: 'users', content_slug: 'x' },
      { kind: 'save' },
      { kind: 'open', content_type: 'video', content_slug: 'bad slug!' },
      { kind: 'pill' },
      'nonsense',
      null,
    ]),
    []
  );
  assert.equal(cleanBatch(Array(80).fill({ kind: 'pill', subjects: ['yoga'] })).length, MAX_EVENTS);
  assert.deepEqual(cleanBatch('nope'), []);
  assert.deepEqual(cleanBatch([{ kind: 'pill', subjects: ['yoga', 'Not A Slug!', 'reiki'] }]), [
    { kind: 'pill', subjects: ['yoga', 'reiki'] },
  ]);
});

test('subjects are looked up once per table for events that came without them', () => {
  const events = cleanBatch([
    { kind: 'save', content_type: 'video', content_slug: 'v1' },
    { kind: 'open', content_type: 'video', content_slug: 'v1' },
    { kind: 'open', content_type: 'book', content_slug: 'b1', subjects: ['yoga'] },
    { kind: 'share', content_type: 'healer', content_slug: 'h1' },
  ]);
  assert.deepEqual(needingSubjects(events), { video: ['v1'], healer: ['h1'] });
  const done = withSubjects(events, { 'video:v1': ['reiki'] });
  assert.deepEqual(done[0].subjects, ['reiki']);
  assert.deepEqual(done[2].subjects, ['yoga']);
  assert.equal(done[3].subjects, undefined);
});

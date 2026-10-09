// Run with `npm test`. Checks the website's emotional search against
// web/shared/emotion-safety.cases.json — the same cases the app's
// `flutter test` checks — so the two can never behave differently.
//
// A failure here after editing web/shared/emotion-safety.json is expected:
// review the change, then regenerate the cases with
// `node scripts/generate-emotion-safety-cases.mjs` and review that diff too.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as S from './emotionSearchPatterns.js';
import SAFETY from '../shared/emotion-safety.json' with { type: 'json' };

const CASES = JSON.parse(fs.readFileSync(new URL('../shared/emotion-safety.cases.json', import.meta.url), 'utf8'));

const byEmotion = new Map();
for (const [emotion, subject_slug, weight] of CASES.vocabulary) {
  if (!byEmotion.has(emotion)) byEmotion.set(emotion, []);
  byEmotion.get(emotion).push({ subject_slug, weight });
}
const fixtureEmotions = [...byEmotion.keys()].sort();
const lookup = async (e) => (byEmotion.get(e) || []).map((r) => ({ ...r }));
const vocabularyLookup = async (words) => fixtureEmotions.filter((e) => e.split(' ').some((w) => words.includes(w)));

test('the module reads its data from the shared JSON', () => {
  assert.equal(S.STRIP_PREFIXES, SAFETY.stripPrefixes);
  assert.equal(S.CRISIS_INTERSTITIAL, SAFETY.crisisInterstitial);
  assert.equal(S.DUAL_PATH, SAFETY.dualPath);
  assert.deepEqual(Object.keys(S.CRISIS_PATTERNS), SAFETY.crisisPatterns.map((c) => c.category));
});

test(`function cases (${CASES.functionCases.length})`, () => {
  for (const c of CASES.functionCases) {
    const n = S.normaliseQuery(c.input);
    const where = JSON.stringify(c.input);
    assert.equal(n, c.normalised, `normaliseQuery ${where}`);
    assert.deepEqual(S.buildLookupCandidates(n), c.candidates, `candidates ${where}`);
    assert.equal(S.stripOnce(n), c.stripOnce, `stripOnce ${where}`);
    assert.equal(S.stripAll(n), c.stripAll, `stripAll ${where}`);
    assert.deepEqual(S.contentTokens(n), c.tokens, `tokens ${where}`);
    assert.deepEqual(S.contentTokens(n, true), c.tokensRelaxed, `tokensRelaxed ${where}`);
    assert.equal(S.bestContainedEmotion(n, fixtureEmotions), c.contained, `contained ${where}`);
    assert.equal(S.bestContainedEmotion(n, fixtureEmotions, true), c.containedRelaxed, `containedRelaxed ${where}`);
    const crisis = S.checkCrisis(n);
    assert.equal(crisis.intercept ? crisis.category : null, c.crisis, `crisis ${where}`);
    assert.equal(S.checkAmbiguous(n), c.ambiguous, `ambiguous ${where}`);
    assert.equal(S.checkSoftTier(n), c.softTier, `softTier ${where}`);
  }
});

test(`full-search cases (${CASES.searchCases.length})`, async () => {
  const contentKey = (v) => (v === S.CRISIS_INTERSTITIAL ? 'crisisInterstitial' : v === S.DUAL_PATH ? 'dualPath' : undefined);
  for (const c of CASES.searchCases) {
    const r = await S.resolveEmotionSearch(c.input, lookup, {
      dualPathAnswer: c.dualPathAnswer ?? undefined,
      vocabularyLookup,
    });
    const actual = { ...r };
    if ('content' in actual) actual.content = contentKey(r.content);
    assert.deepEqual(actual, c.expected, `resolveEmotionSearch ${JSON.stringify(c.input)} / ${c.dualPathAnswer}`);
  }
});

test(`medical disclaimer cases (${CASES.medicalCases.length})`, () => {
  for (const c of CASES.medicalCases) {
    assert.equal(S.needsMedicalDisclaimer(c.rows), c.needsDisclaimer, c.emotion);
    assert.deepEqual(S.medicalDisclaimerSubjects(c.rows), c.subjects, c.emotion);
  }
});

test('a crisis phrase never reaches the lookup', async () => {
  const crisisCases = CASES.searchCases.filter((c) => c.expected.type === 'crisis');
  assert.ok(crisisCases.length > 50);
  for (const c of crisisCases) {
    let called = false;
    const spy = async () => { called = true; return []; };
    await S.resolveEmotionSearch(c.input, spy, { dualPathAnswer: c.dualPathAnswer ?? undefined, vocabularyLookup: spy });
    assert.equal(called, false, `lookup ran for crisis input ${JSON.stringify(c.input)}`);
  }
});

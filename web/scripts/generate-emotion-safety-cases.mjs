// Regenerates web/shared/emotion-safety.cases.json — the behaviour that BOTH
// the website (`npm test`) and the app (`flutter test`) must reproduce exactly.
//
//   node scripts/generate-emotion-safety-cases.mjs
//
// The expected answers come from web/utils/emotionSearchPatterns.js, so run
// this only after a DELIBERATE change to web/shared/emotion-safety.json or to
// the module's logic, then review the diff of the cases file like any other
// behaviour change. Never run it to make a failing app test pass: that hides
// exactly the drift the cases exist to catch.
//
// The vocabulary is a fixed sample of the real emotion_mappings rows (from
// supabase/seed/emotion_mappings.sql), stored in the cases file, so the full
// search can be checked without a database.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from '../utils/emotionSearchPatterns.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const seed = fs.readFileSync(path.join(here, '../../supabase/seed/emotion_mappings.sql'), 'utf8');
const out = path.join(here, '../shared/emotion-safety.cases.json');

const allRows = [...seed.matchAll(/^\s+\('[^']+', '((?:[^']|'')*)', '([^']+)', (\d+), '[^']+'\)/gm)]
  .map((m) => ({ emotion: m[1].replace(/''/g, "'"), subject_slug: m[2], weight: +m[3] }));
const allEmotions = [...new Set(allRows.map((r) => r.emotion))].sort();

// ── inputs ──
const realistic = [
  'I feel lost', 'anxious', 'I want to let go', 'my mum just died', 'my heart is broken', 'my marriage ended',
  'i cant sleep because my mind wont stop', 'everyone else has it figured out', 'my chest feels tight all the time',
  'i feel nothing', 'i dont know who i am anymore', 'i hate the way i look', 'i hate myself', 'hopeless',
  'i keep making the same mistakes', 'why do i always mess things up', 'nothing makes sense anymore',
  'i feel invisible at work', 'i want my anxiety to disappear', 'hearing voices', 'Hearing Voices!!',
  'i think im losing my mind', 'grape juice', 'therapist', 'scrape', 'drapes', 'in crisis mode at work',
  'crisis', 'i love yoga', 'yoga', 'breathwork', 'manifestation', 'law of attraction', 'shadow work',
  'meditation', 'hope', 'anger', 'sadness', 'confusion', 'despair', 'i feel empty', 'going in circles',
  'i dont know what i want from life', 'dont know what to do', 'i dont know what to do', 'why me', 'help me',
  'help', "can't sleep", 'can’t sleep', "CAN'T SLEEP", 'whats my purpose', "what's my purpose",
  "i'm being abused", 'im fine', 'self-harm', 'self harm', 'selfharm', 'anxiety and depression',
  'burnt out', 'i feel stuck in life', 'how do i find love', 'how do i stop being a victim',
  'i want to be present', 'how do i let go of anger at someone', 'i want to change my life',
  'what to do about my inner critic', 'im going through a divorce', 'my chart', 'the void',
];
const edge = [
  '', ' ', '   \t\n ', 'a', 'I', '!!!', '—', '-', 'i-feel-lost', 'café blues', 'naïve', 'İstanbul', 'straße',
  'ÉMOTIONAL', 'sad 😢', '😢', 'i feel lost', 'i feel lost', 'i feel lost now',
  'i feel ' + 'very '.repeat(40) + 'sad', '123', 'feel 2 sad', 'i feel sad_today', 'tab\tseparated',
  'don`t', 'don´t', 'donʼt', '<script>', '﻿i feel sad', 'ı feel sad',
];
const crisis = Object.values(S.CRISIS_PATTERNS).flat();
const special = [...crisis, ...S.AMBIGUOUS_PATTERNS, ...S.SOFT_TIER_PATTERNS];

// Every 4th stored emotion, through a few common lead-ins.
const sampleEmotions = allEmotions.filter((_, i) => i % 4 === 0);
const templates = (e) => [e, `i feel ${e}`, `i’ve been feeling ${e} lately`, `How do I deal with ${e}?`];

const inputs = new Set([...realistic, ...edge, ...special]);
for (const ph of special) { inputs.add(`i feel like ${ph} right now`); inputs.add(ph.toUpperCase()); inputs.add(ph.replace(/nt\b/g, "n't")); }
for (const e of sampleEmotions) for (const t of templates(e)) inputs.add(t);

// ── a fixed vocabulary for the full-search cases ──
const vocabEmotions = new Set();
const resolveInputs = [...realistic, ...edge.slice(0, 12), ...special.filter((_, i) => i % 3 === 0),
  ...sampleEmotions.filter((_, i) => i % 3 === 0).map((e) => `i feel ${e}`)];
for (const raw of resolveInputs) {
  for (const c of S.buildLookupCandidates(S.normaliseQuery(raw))) if (allEmotions.includes(c)) vocabEmotions.add(c);
  const n = S.normaliseQuery(raw);
  for (const relaxed of [false, true]) {
    const words = S.contentTokens(n, relaxed);
    for (const e of allEmotions) if (e.split(' ').some((w) => words.includes(w))) vocabEmotions.add(e);
  }
}
for (const e of sampleEmotions) vocabEmotions.add(e);
const vocabulary = allRows.filter((r) => vocabEmotions.has(r.emotion));
const fixtureEmotions = [...vocabEmotions].sort();

const byEmotion = new Map();
for (const r of vocabulary) { if (!byEmotion.has(r.emotion)) byEmotion.set(r.emotion, []); byEmotion.get(r.emotion).push(r); }
// Same order the website's query returns: weight descending; ties by subject for determinism.
for (const list of byEmotion.values()) list.sort((a, b) => b.weight - a.weight || a.subject_slug.localeCompare(b.subject_slug));
const lookup = async (e) => (byEmotion.get(e) || []).map(({ subject_slug, weight }) => ({ subject_slug, weight }));
// What the website's lookupEmotionVocabulary returns: stored emotions sharing a word with the query.
const vocabularyLookup = async (words) => fixtureEmotions.filter((e) => e.split(' ').some((w) => words.includes(w)));

// ── expected answers ──
const functionCases = [...inputs].map((input) => {
  const n = S.normaliseQuery(input);
  const crisisHit = S.checkCrisis(n);
  return {
    input,
    normalised: n,
    candidates: S.buildLookupCandidates(n),
    stripOnce: S.stripOnce(n),
    stripAll: S.stripAll(n),
    tokens: S.contentTokens(n),
    tokensRelaxed: S.contentTokens(n, true),
    contained: S.bestContainedEmotion(n, fixtureEmotions),
    containedRelaxed: S.bestContainedEmotion(n, fixtureEmotions, true),
    crisis: crisisHit.intercept ? crisisHit.category : null,
    ambiguous: S.checkAmbiguous(n),
    softTier: S.checkSoftTier(n),
  };
});

const contentKey = (c) => (c === S.CRISIS_INTERSTITIAL ? 'crisisInterstitial' : c === S.DUAL_PATH ? 'dualPath' : undefined);
const searchCases = [];
for (const [i, input] of resolveInputs.entries()) {
  for (const dualPathAnswer of [null, 'exploring', 'distressing']) {
    if (dualPathAnswer && i % 5) continue;
    const r = await S.resolveEmotionSearch(input, lookup, { dualPathAnswer: dualPathAnswer ?? undefined, vocabularyLookup });
    const expected = { ...r };
    if ('content' in expected) expected.content = contentKey(r.content);
    searchCases.push({ input, dualPathAnswer, expected });
  }
}

const medicalCases = [...byEmotion.entries()].filter((_, i) => i % 6 === 0).map(([emotion, rows]) => ({
  emotion,
  rows: rows.map(({ subject_slug, weight }) => ({ subject_slug, weight })),
  needsDisclaimer: S.needsMedicalDisclaimer(rows),
  subjects: S.medicalDisclaimerSubjects(rows),
}));

const doc = {
  _about: 'Generated by web/scripts/generate-emotion-safety-cases.mjs — do not edit by hand. Pins the behaviour of the emotional search and its safety checks; the website (npm test) and the app (flutter test) must both reproduce every case exactly.',
  // In lookup order — each emotion's rows weight-descending, as the website's
  // query returns them — so a consumer can use the rows exactly as listed.
  vocabulary: [...byEmotion.values()].flat().map(({ emotion, subject_slug, weight }) => [emotion, subject_slug, weight]),
  functionCases,
  searchCases,
  medicalCases,
};
// One case per line keeps diffs readable when behaviour changes.
const lines = ['{'];
const keys = Object.keys(doc);
keys.forEach((k, ki) => {
  const v = doc[k];
  const comma = ki < keys.length - 1 ? ',' : '';
  if (Array.isArray(v)) {
    lines.push(`  ${JSON.stringify(k)}: [`);
    v.forEach((item, i) => lines.push(`    ${JSON.stringify(item)}${i < v.length - 1 ? ',' : ''}`));
    lines.push(`  ]${comma}`);
  } else lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)}${comma}`);
});
lines.push('}');
fs.writeFileSync(out, lines.join('\n') + '\n');
console.log(JSON.stringify({ functionCases: functionCases.length, searchCases: searchCases.length, medicalCases: medicalCases.length, vocabularyRows: vocabulary.length, vocabularyEmotions: fixtureEmotions.length, bytes: fs.statSync(out).size, outcomeTypes: searchCases.reduce((a, c) => ((a[c.expected.type] = (a[c.expected.type] || 0) + 1), a), {}) }));

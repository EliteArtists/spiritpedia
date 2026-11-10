import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchSubjectsByName, squashName } from './subjectSearch.js';

const subjects = [
  { id: 1, name: 'Breathwork', slug: 'breathwork' },
  { id: 2, name: 'EFT / Tapping', slug: 'eft-tapping' },
  { id: 3, name: 'Energy Medicine', slug: 'energy-medicine' },
  { id: 4, name: 'Qi Gong', slug: 'qi-gong' },
  { id: 5, name: 'Quantum Healing', slug: 'quantum-healing' },
  { id: 6, name: 'Quantum Touch', slug: 'quantum-touch' },
  { id: 7, name: 'Reiki', slug: 'reiki' },
  { id: 8, name: 'Tai Chi', slug: 'tai-chi' },
];
const names = (term) => matchSubjectsByName(subjects, term).map((s) => s.name);

test('squashing drops spaces, hyphens, punctuation, capitals and accents', () => {
  assert.equal(squashName('Quantum-Touch'), 'quantumtouch');
  assert.equal(squashName('  EFT / Tapping '), 'efttapping');
  assert.equal(squashName('Réiki'), 'reiki');
  assert.equal(squashName(null), '');
});

test('spaces, hyphens and capitals do not matter', () => {
  for (const t of ['Quantum-Touch', 'quantumtouch', 'quantum touch', 'QUANTUM TOUCH']) {
    assert.deepEqual(names(t), ['Quantum Touch'], t);
  }
  assert.deepEqual(names('breath work'), ['Breathwork']);
  assert.deepEqual(names('breathwork'), ['Breathwork']);
  for (const t of ['tai-chi', 'taichi', 'tai chi', 'Tai Chi']) assert.deepEqual(names(t), ['Tai Chi'], t);
  for (const t of ['qigong', 'qi gong', 'qi-gong']) assert.deepEqual(names(t), ['Qi Gong'], t);
  assert.deepEqual(names('reiki'), ['Reiki']);
});

test('a part of a name still finds it; an exact name comes first; three at most', () => {
  assert.deepEqual(names('quantum'), ['Quantum Healing', 'Quantum Touch']);
  assert.deepEqual(names('tapping'), ['EFT / Tapping']);
  assert.equal(matchSubjectsByName(subjects, 'e', 3).length, 3);
  assert.deepEqual(names('quantum healing'), ['Quantum Healing']);
});

test('nothing to match: nothing back', () => {
  assert.deepEqual(names(''), []);
  assert.deepEqual(names(' - '), []);
  assert.deepEqual(names('soundbath'), []);
  assert.deepEqual(matchSubjectsByName(null, 'reiki'), []);
});

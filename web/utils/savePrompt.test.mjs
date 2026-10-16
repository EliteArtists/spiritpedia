import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearPendingSave, setPendingSave, takePendingSave } from './savePrompt.js';

function memory() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

test('a waiting save is made once', () => {
  const storage = memory();
  setPendingSave('favorited_books', 'the-power-of-now', storage);
  assert.deepEqual(takePendingSave(storage), { key: 'favorited_books', slug: 'the-power-of-now' });
  assert.equal(takePendingSave(storage), null);
});

test('"Not now" drops it', () => {
  const storage = memory();
  setPendingSave('favorited_healers', 'eckhart-tolle', storage);
  clearPendingSave(storage);
  assert.equal(takePendingSave(storage), null);
});

test('anything we did not write is ignored', () => {
  const storage = memory();
  storage.setItem('spiritpedia:pending-save', 'not json');
  assert.equal(takePendingSave(storage), null);
  storage.setItem('spiritpedia:pending-save', JSON.stringify({ key: 3 }));
  assert.equal(takePendingSave(storage), null);
});

test('no storage at all: nothing breaks', () => {
  assert.doesNotThrow(() => setPendingSave('k', 's', undefined));
  assert.equal(takePendingSave(undefined), null);
});

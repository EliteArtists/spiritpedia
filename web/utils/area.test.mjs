import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, nearYou, readArea, writeArea, roundForPrivacy } from './area.js';

const london = { id: 2643743, name: 'London', region: 'England', country: 'United Kingdom', lat: 51.5085, lng: -0.1257 };
const croydon = { id: 2652053, name: 'Croydon', region: 'England', country: 'United Kingdom', lat: 51.3816, lng: -0.0981 };
const manchester = { id: 2643123, name: 'Manchester', region: 'England', country: 'United Kingdom', lat: 53.4809, lng: -2.2374 };
const places = { [london.id]: london, [croydon.id]: croydon, [manchester.id]: manchester };

const h = (id, place, availability) => ({ id, name: `H${id}`, place_id: place?.id ?? null, availability_type: availability });
const manchesterLocal = h(1, manchester, 'Local Only (In-Person)');
const inCroydon = h(2, croydon, 'Local Only (In-Person)');
const manchesterOnline = h(3, manchester, 'Worldwide (Online Sessions)');
const inLondon = h(4, london, 'Local & Online Sessions');
const nowhere = h(5, null, 'Worldwide (Online Sessions)');
const all = [manchesterLocal, inCroydon, manchesterOnline, inLondon, nowhere];

test('distances between town centres', () => {
  assert.equal(distanceKm(london, london), 0);
  assert.ok(Math.abs(distanceKm(london, croydon) - 15) < 2);
  assert.ok(Math.abs(distanceKm(london, manchester) - 262) < 5);
});

test('no area: everyone, as they were', () => {
  assert.deepEqual(nearYou(all, null, places), { near: all, online: [] });
});

test('in London: near in person first, then online from anywhere; local-only elsewhere left out', () => {
  const r = nearYou(all, london, places);
  assert.deepEqual(r.near, [inLondon, inCroydon]);
  assert.deepEqual(r.online, [manchesterOnline, nowhere]);
});

test('the same as the app in Manchester', () => {
  const r = nearYou(all, manchester, places);
  assert.deepEqual(r.near, [manchesterLocal, manchesterOnline]);
  assert.deepEqual(r.online, [inLondon, nowhere]);
});

test('kept as a town only; a position leaves rounded to about 1 km', () => {
  const map = new Map();
  const storage = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) };
  writeArea({ ...london, secret: 'x' }, storage);
  assert.deepEqual(readArea(storage), london);
  writeArea(null, storage);
  assert.equal(readArea(storage), null);
  assert.equal(roundForPrivacy(51.507412), 51.51);
});

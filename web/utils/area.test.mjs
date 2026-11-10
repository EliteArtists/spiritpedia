import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anyNear, distanceKm, distanceLabel, distanceUnitFor, nearestFirst, nearYou, readArea, writeArea, roundForPrivacy } from './area.js';

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

const people = (r) => r.map((s) => s.healer);

test('no area: everyone, as they were, with no distances', () => {
  const r = nearYou(all, null, places);
  assert.deepEqual(people(r), all);
  assert.ok(r.every((s) => s.km === null));
});

test('in London: everyone stays; towns nearest first, then no town', () => {
  const r = nearYou(all, london, places);
  assert.deepEqual(people(r), [inLondon, inCroydon, manchesterLocal, manchesterOnline, nowhere]);
  assert.equal(r[0].km, 0);
  assert.equal(r[4].km, null);
  assert.ok(anyNear(r));
});

test('the same in Manchester: local-only people elsewhere are kept, further down', () => {
  const r = nearYou(all, manchester, places);
  assert.deepEqual(people(r), [manchesterLocal, manchesterOnline, inLondon, inCroydon, nowhere]);
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

const paris = { id: 2988507, name: 'Paris', region: 'Île-de-France', country: 'France', lat: 48.8534, lng: 2.3488 };
const edinburgh = { id: 2650225, name: 'Edinburgh', region: 'Scotland', country: 'United Kingdom', lat: 55.9521, lng: -3.1965 };

const newYork = { id: 5128581, name: 'New York', region: 'New York', country: 'United States', lat: 40.7143, lng: -74.006 };

test('closest to you: nobody within 50 km, so the same full list, nearest first, with distances', () => {
  const r = nearYou(all, edinburgh, places);
  assert.ok(!anyNear(r));
  assert.deepEqual(people(r), [manchesterLocal, manchesterOnline, inLondon, inCroydon, nowhere]);
  assert.ok(Math.abs(r[0].km - 282) < 5);
  // No longer capped at ten.
  const many = Array.from({ length: 14 }, (_, i) => h(100 + i, london, 'Local Only (In-Person)'));
  assert.equal(nearYou(many, paris, places).length, 14);
  // Nobody with a town: still everyone, none with a distance.
  assert.deepEqual(people(nearYou([nowhere], paris, places)), [nowhere]);
});

test('someone 5,000 km away and someone with no base both stay, after nearer people', () => {
  const far = h(6, newYork, 'Local Only (In-Person)');
  const noBase = h(7, null, 'Local Only (In-Person)');
  const r = nearYou([noBase, far, inCroydon, inLondon], london, { ...places, [newYork.id]: newYork });
  assert.deepEqual(people(r), [inLondon, inCroydon, far, noBase]);
  assert.ok(r[2].km > 5000);
  assert.equal(r[3].km, null);
});

test('nearestFirst groups by rank first, then nearest, then no town, ties in the order given', () => {
  const rank = (x) => (x.id === 1 || x.id === 5 ? 0 : 1);
  const r = nearestFirst(all, london, places, rank);
  assert.deepEqual(people(r), [manchesterLocal, nowhere, inLondon, inCroydon, manchesterOnline]);
});

test('miles in the United Kingdom and the United States, kilometres elsewhere', () => {
  assert.equal(distanceUnitFor('United Kingdom'), 'miles');
  assert.equal(distanceUnitFor('United States'), 'miles');
  assert.equal(distanceUnitFor('France'), 'km');
  assert.equal(distanceLabel(320, 'France'), '320 km away');
  assert.equal(distanceLabel(1240.4, 'Germany'), '1,240 km away');
  assert.equal(distanceLabel(321.9, 'United Kingdom'), '200 miles away');
  assert.equal(distanceLabel(1, 'United States'), '1 mile away');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closestTo, distanceKm, distanceLabel, distanceUnitFor, nearYou, readArea, writeArea, roundForPrivacy } from './area.js';

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

const paris = { id: 2988507, name: 'Paris', region: 'Île-de-France', country: 'France', lat: 48.8534, lng: 2.3488 };
const edinburgh = { id: 2650225, name: 'Edinburgh', region: 'Scotland', country: 'United Kingdom', lat: 55.9521, lng: -3.1965 };

test('closest to you: nearest first, with distances, towns only, ten at most', () => {
  const r = closestTo(all, edinburgh, places);
  assert.deepEqual(r.map((c) => c.healer), [manchesterLocal, manchesterOnline, inLondon, inCroydon]);
  assert.ok(Math.abs(r[0].km - 282) < 5);
  assert.equal(closestTo(all, null, places).length, 0);
  const many = Array.from({ length: 14 }, (_, i) => h(100 + i, london, 'Local Only (In-Person)'));
  assert.equal(closestTo(many, paris, places).length, 10);
  assert.deepEqual(closestTo([nowhere], paris, places), []);
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

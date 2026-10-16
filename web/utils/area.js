// "Your area" for Practitioners Near You — the website's half of what the app
// does (app/lib/features/area, app/lib/data/shelf_rules.dart → nearYou).
// Change both together.
//
// An area is a TOWN (public.places, migration 0019), never a position. It is
// kept in this browser at once, and in the account when signed in
// (user_preferences); see utils/areaSync.js.
//
// Plain ES module with no React dependency, so `node --test` can import it.

export const AREA_KEY = 'spiritpedia_area';

// Fired on window whenever the area changes, so the shelf can follow.
export const AREA_EVENT = 'spiritpedia:area';

// How far "near" reaches for in-person sessions.
export const NEAR_RADIUS_KM = 50;

// The parts of a place kept and shown. Anything else is dropped.
export function tidyPlace(p) {
  if (!p || typeof p !== 'object' || !Number.isInteger(Number(p.id))) return null;
  return {
    id: Number(p.id),
    name: String(p.name || ''),
    region: p.region ? String(p.region) : null,
    country: String(p.country || ''),
    lat: Number(p.lat) || 0,
    lng: Number(p.lng) || 0,
  };
}

export function readArea(storage = globalThis.localStorage) {
  try {
    return tidyPlace(JSON.parse(storage.getItem(AREA_KEY) || 'null'));
  } catch {
    return null;
  }
}

// Set the area (a place) or clear it (null). Returns false if it could not
// be kept.
export function writeArea(place, storage = globalThis.localStorage) {
  try {
    const tidy = tidyPlace(place);
    tidy ? storage.setItem(AREA_KEY, JSON.stringify(tidy)) : storage.removeItem(AREA_KEY);
    try {
      window.dispatchEvent(new CustomEvent(AREA_EVENT, { detail: tidy }));
    } catch {
      // No window (tests): nothing is listening.
    }
    return true;
  } catch {
    return false;
  }
}

// "London, United Kingdom".
export const placeLabel = (p) => (p ? `${p.name}, ${p.country}` : '');

// "London, England, United Kingdom" — to tell towns of one name apart.
export const placeFullLabel = (p) =>
  p ? [p.name, p.region && p.region !== p.name ? p.region : null, p.country].filter(Boolean).join(', ') : '';

// A position as it leaves the browser: two decimal places, about 1 km.
export const roundForPrivacy = (v) => Math.round(Number(v) * 100) / 100;

// Kilometres between two towns' centres (the haversine formula).
export function distanceKm(a, b) {
  const r = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

// The website's own test for online sessions (the healer profile badge).
export const offersOnline = (h) => (h.availability_type || '').toLowerCase().includes('online');

// Practitioners Near You for someone in `area`: those within NEAR_RADIUS_KM,
// nearest first; then everyone who offers sessions online, from anywhere, in
// the order given. Local-only practitioners elsewhere are left out. `places`
// maps place id → place. No area: the list as it is.
export function nearYou(practitioners, area, places) {
  if (!area) return { near: practitioners, online: [] };
  const near = [];
  practitioners.forEach((h, i) => {
    const town = places[h.place_id];
    if (!town) return;
    const km = distanceKm(area, town);
    if (km <= NEAR_RADIUS_KM) near.push({ h, km, i });
  });
  near.sort((a, b) => a.km - b.km || a.i - b.i);
  const nearOnes = near.map((n) => n.h);
  const shown = new Set(nearOnes.map((h) => h.id));
  return {
    near: nearOnes,
    online: practitioners.filter((h) => offersOnline(h) && !shown.has(h.id)),
  };
}

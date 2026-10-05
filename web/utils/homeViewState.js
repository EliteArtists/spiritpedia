'use client';

import { useSyncExternalStore } from 'react';

// THE HOMEPAGE'S VIEW STATE, kept in the URL.
//
// Which tab is open and which Explore More shelves have been opened used to be
// component state, so leaving the page and coming back reset both. Putting them
// in the query string makes the homepage restorable — and makes the `from` a
// card hands its detail page describe the view the visitor actually left.
//
// WHY history.replaceState RATHER THAN router.replace. These are view changes,
// not navigation. router.replace would re-run the homepage's server component —
// three Supabase queries and a full re-render — on every tab press and every
// shelf opened, and it would also throw away the Videos tab's "mount once, then
// stay mounted" behaviour. replaceState changes the address bar and nothing
// else, which is exactly the scope of what happened.
//
// It also leaves the browser's own history alone, so Back still means "the page
// before this one" rather than stepping back through every toggle.
//
// Two components write here and both read the whole thing, which is why this is
// one shared store rather than a piece of state in each: HomeTabs needs the
// shelves for its cards' `from`, and ExploreMore needs the tab for its own.

// Only these are view state. Anything else in the query string — the subject
// filter, a tracking parameter — is preserved untouched.
export const TAB_PARAM = 'tab';
export const SHELVES_PARAM = 'shelves';

const CHANGED = 'sp:home-view';

// The snapshot is the raw search string: a primitive, so React can compare it
// cheaply and getSnapshot never returns a fresh object.
let snapshot = typeof window === 'undefined' ? '' : window.location.search;

function refresh() {
  snapshot = window.location.search;
}

function subscribe(onChange) {
  const handler = () => {
    refresh();
    onChange();
  };
  // popstate covers the browser's own back and forward; the custom event covers
  // our replaceState, which fires nothing on its own.
  window.addEventListener('popstate', handler);
  window.addEventListener(CHANGED, handler);
  return () => {
    window.removeEventListener('popstate', handler);
    window.removeEventListener(CHANGED, handler);
  };
}

function getSnapshot() {
  return snapshot;
}

// `initialSearch` comes from the server, which has already read searchParams.
// Without it the first render would say "no tab, no shelves" and then correct
// itself a frame later, which is a visible flicker on a refresh or a shared
// link.
export function useHomeSearch(initialSearch = '') {
  return useSyncExternalStore(subscribe, getSnapshot, () => initialSearch);
}

// Write one parameter, leaving every other one alone. An empty value removes it
// rather than leaving `?tab=` behind.
export function setHomeParam(key, value) {
  const params = new URLSearchParams(window.location.search);

  if (value === null || value === undefined || value === '') params.delete(key);
  else params.set(key, value);

  const query = params.toString();
  const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;

  window.history.replaceState(window.history.state, '', url);
  refresh();
  window.dispatchEvent(new Event(CHANGED));
}

export function readParam(search, key) {
  return new URLSearchParams(search).get(key);
}

export function readShelves(search) {
  const raw = readParam(search, SHELVES_PARAM);
  return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

// The homepage URL as it currently stands — what a card should hand its detail
// page as the place to come back to.
export function homeHref(search) {
  return search ? `/${search}` : '/';
}

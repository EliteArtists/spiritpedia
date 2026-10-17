'use client';

import { getSession } from './supabaseAuth.js';

// What people do on the website, sent in batches to /api/activity (migration
// 0021). Every batch adds to the anonymous totals behind Admin → Activity; only
// a signed-in member with "Let Spiritpedia learn from what I explore" on also
// has their own events kept, and that is decided on the server.
//
// Batching: a queue in memory, sent every 30 seconds, at 20 events, and when
// the page is hidden or left (fetch keepalive). An item opened twice in one
// visit counts once. Nothing is sent from the admin dashboard.
//
// Never pass a search the crisis intercept caught. EmotionSearch only calls
// trackSearch() after both safety gates, and the server checks again.

const ENDPOINT = '/api/activity';
const FLUSH_EVERY_MS = 30_000;
const FLUSH_AT = 20;
const OPENED_KEY = 'spiritpedia_opened';
const SESSION_KEY = 'spiritpedia-auth';

let queue = [];
let timer = null;
let listening = false;

function inAdmin() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
}

// The stored access token, read synchronously for the page-hide flush, when
// there is no time to wait. A stale one only means that batch is counted
// anonymously.
function storedToken() {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null')?.access_token || null;
  } catch {
    return null;
  }
}

function send(events, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ platform: 'web', events }),
    keepalive: true,
  }).catch(() => {});
}

export async function flushActivity({ leaving = false } = {}) {
  if (queue.length === 0) return;
  const events = queue.slice(0, 50);
  queue = queue.slice(50);
  if (leaving) {
    send(events, storedToken());
  } else {
    const { data } = await getSession().catch(() => ({ data: null }));
    await send(events, data?.access_token || null);
  }
  if (queue.length) flushActivity({ leaving });
}

function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  const leave = () => flushActivity({ leaving: true });
  window.addEventListener('pagehide', leave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') leave();
  });
}

export function track(event) {
  if (typeof window === 'undefined' || inAdmin() || !event?.kind) return;
  listen();
  queue.push(event);
  if (queue.length >= FLUSH_AT) {
    flushActivity();
    return;
  }
  if (!timer) {
    timer = setTimeout(() => {
      timer = null;
      flushActivity();
    }, FLUSH_EVERY_MS);
  }
}

// An item's page was opened. Once per item per visit (this tab).
export function trackOpen(contentType, contentSlug, subjects) {
  if (!contentType || !contentSlug) return;
  const key = `${contentType}:${contentSlug}`;
  try {
    const seen = new Set(JSON.parse(window.sessionStorage.getItem(OPENED_KEY) || '[]'));
    if (seen.has(key)) return;
    seen.add(key);
    window.sessionStorage.setItem(OPENED_KEY, JSON.stringify([...seen].slice(-500)));
  } catch {
    // No storage: count it; a repeat is the worst that happens.
  }
  track({ kind: 'open', content_type: contentType, content_slug: contentSlug, subjects: subjects || undefined });
}

export function trackContent(kind, contentType, contentSlug) {
  if (!contentType || !contentSlug) return;
  track({ kind, content_type: contentType, content_slug: contentSlug });
}

export function trackSubjects(kind, subjects) {
  const list = (Array.isArray(subjects) ? subjects : [subjects]).filter(Boolean);
  if (list.length) track({ kind, subjects: list });
}

// A search that has settled. With results: the subjects it led to, never the
// words. With none: the words, for "Searches with no results".
export function trackSearch({ subjects = [], term = null, noResults = false }) {
  if (noResults && term) track({ kind: 'search', term, no_results: true });
  else if (subjects.length) track({ kind: 'search', subjects: subjects.slice(0, 5) });
}

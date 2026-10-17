// What /api/activity accepts (migration 0021). Run on the server before
// anything reaches log_activity(): the database checks again, but the crisis
// guard can only live here, where the crisis phrases are.
//
// THE CRISIS INTERCEPT IS NOT CHANGED BY THIS. The app and the website never
// send a search the intercept caught; this is a second guard behind them. A
// search whose words are a crisis phrase is dropped whole, and one that would
// raise the dual path ("are you exploring, or is this distressing?") keeps its
// subjects but loses its words.
//
// Plain ES module with no React dependency, so `node --test` can import it.

import { checkAmbiguous, checkCrisis, normaliseQuery } from './emotionSearchPatterns.js';

export const ACTIVITY_KINDS = ['open', 'watch', 'save', 'unsave', 'share', 'review', 'pill', 'filter', 'search'];
export const CONTENT_KINDS = ['open', 'watch', 'save', 'unsave', 'share', 'review'];
export const CONTENT_TYPES = ['healer', 'publisher', 'book', 'video', 'course', 'free_resource'];
export const MAX_EVENTS = 50;
const SLUG = /^[a-z0-9][a-z0-9-]{0,199}$/i;
const SUBJECT = /^[a-z0-9-]{1,60}$/;

// The words of a search, or null when they must not travel.
export function safeTerm(raw) {
  const text = String(raw ?? '').slice(0, 200);
  const normalised = normaliseQuery(text);
  if (!normalised) return null;
  if (checkCrisis(normalised).intercept) return { crisis: true };
  if (checkAmbiguous(normalised)) return null;
  return text.trim().slice(0, 60) || null;
}

export function cleanBatch(events) {
  if (!Array.isArray(events)) return [];
  const out = [];
  for (const e of events.slice(0, MAX_EVENTS)) {
    if (!e || typeof e !== 'object' || !ACTIVITY_KINDS.includes(e.kind)) continue;
    const event = { kind: e.kind };

    if (CONTENT_TYPES.includes(e.content_type) && SLUG.test(String(e.content_slug ?? ''))) {
      event.content_type = e.content_type;
      event.content_slug = String(e.content_slug);
    } else if (CONTENT_KINDS.includes(e.kind)) {
      continue; // an open or a save of nothing in particular says nothing
    }

    const subjects = Array.isArray(e.subjects) ? e.subjects.filter((s) => SUBJECT.test(String(s))).slice(0, 20) : [];
    if (subjects.length) event.subjects = subjects;

    if (e.kind === 'search') {
      const term = e.term === undefined ? null : safeTerm(e.term);
      if (term?.crisis) continue; // never a crisis search, words or subjects
      if (e.no_results === true && typeof term === 'string') {
        event.term = term;
        event.no_results = true;
      }
      if (!event.subjects && !event.no_results) continue;
    }

    if ((e.kind === 'pill' || e.kind === 'filter') && !event.subjects) continue;

    out.push(event);
  }
  return out;
}

// The content each event is about, grouped for one lookup per table, for the
// events that came without subjects (a save knows its slug, not its subjects).
export const SUBJECT_SOURCES = {
  healer: { table: 'healers', column: 'healer_slug' },
  publisher: { table: 'publishers', column: 'slug' },
  book: { table: 'books', column: 'slug' },
  video: { table: 'videos', column: 'slug' },
  course: { table: 'courses', column: 'slug' },
  free_resource: { table: 'free_resources', column: 'slug' },
};

export function needingSubjects(events) {
  const byType = {};
  for (const e of events) {
    if (e.subjects || !e.content_type) continue;
    (byType[e.content_type] ||= new Set()).add(e.content_slug);
  }
  return Object.fromEntries(Object.entries(byType).map(([t, s]) => [t, [...s]]));
}

export function withSubjects(events, found) {
  return events.map((e) => {
    if (e.subjects || !e.content_type) return e;
    const subjects = found[`${e.content_type}:${e.content_slug}`];
    return subjects?.length ? { ...e, subjects: subjects.slice(0, 20) } : e;
  });
}

import { supabase } from './supabase.js';

// The rows behind a subject page's offering and free-resource shelves, in one
// place for both sides: data/subjects.js counts them on the server, and
// components/SubjectPagedShelf.jsx loads them a page at a time in the browser.
// A plain module, not the client component, because a server module cannot
// call a function exported from a 'use client' file.

// Which rows each shelf shows. Every one is live only: active, and either
// evergreen or not yet past its end date. A course with no product_type
// predates the column and is a course (the admin default).
export const SHELVES = {
  course: { table: 'courses', refine: (q) => q.or('product_type.is.null,product_type.eq.course') },
  retreat: { table: 'courses', refine: (q) => q.eq('product_type', 'retreat') },
  download: { table: 'courses', refine: (q) => q.eq('product_type', 'download') },
  free: { table: 'free_resources', refine: (q) => q },
};

// Only what the cards read, plus the author's name through the healer_id
// relation (the page no longer has every healer's name to hand them).
const COLUMNS = {
  courses: 'id, slug, title, description, image_url, price, product_type, healers (name)',
  free_resources: 'id, slug, title, description, image_url, resource_type, healers (name)',
};

// The shelf's live rows for a subject, ordered by id. `columns` is the cards'
// columns unless a caller (a count) asks for less.
export function shelfQuery(kind, subjectSlug, { client = supabase, columns, count } = {}) {
  const { table, refine } = SHELVES[kind];
  const today = new Date().toISOString().slice(0, 10);
  return refine(
    client
      .from(table)
      .select(columns || COLUMNS[table], count ? { count: 'exact', head: true } : undefined)
      .contains('subject_slugs', [subjectSlug])
      .eq('is_active', true)
      .or(`end_date.is.null,end_date.gte.${today}`)
  ).order('id', { ascending: true });
}

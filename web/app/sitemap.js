import { supabase } from '@/utils/supabase';
import { SITE_URL } from '@/utils/seo';

// Dynamic sitemap for every public page on Spiritpedia.
//
// Next builds the XML from the array returned below and serves it at
// /sitemap.xml. The origin comes from SITE_URL rather than a literal, so the
// canonical host stays defined in exactly one place — a sitemap listing a
// different host to the canonical tags is ignored by Google as cross-domain.
//
// /library is deliberately absent: it is per-visitor localStorage and carries
// robots.index = false, so listing it would ask Google to index an empty page.
// /admin is absent for the obvious reason.

// Rebuilt hourly, matching every other route's ISR floor. Without this the
// route is evaluated once at build time and a healer added on Tuesday would
// not appear until the next deploy.
export const revalidate = 3600;

// PostgREST caps a single response at 1,000 rows and returns the truncated set
// WITHOUT an error, so a plain .select() silently loses everything past the
// first thousand. courses already holds 1,103 rows — around a hundred offering
// pages would have gone missing from the sitemap with no sign anything was
// wrong. Paging until a short batch comes back is what makes this correct now
// and as each table grows.
//
// Ordered by `id`, not `created_at`: the bulk imports gave thousands of rows an
// identical created_at, and ties leave Postgres free to order differently per
// query, so pages overlap and some rows are never returned. `id` is unique, so
// every row is visited exactly once. (Same defect that cost the video shelf 8
// of every 36 rows before it was paginated on id.)
const PAGE = 1000;

// `refine` narrows the query before it is paged — used for the live-offering
// window below. It has to be applied per page rather than to the results,
// or the 1,000-row cap would count rows that are then thrown away.
async function fetchAll(table, columns, refine = (q) => q) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await refine(
      supabase.from(table).select(columns).order('id', { ascending: true })
    ).range(from, from + PAGE - 1);

    // A failed page must not silently shorten the sitemap. Submitting a partial
    // file tells Google the missing URLs are gone; better to surface it in the
    // build log and serve what we have than to drop them quietly.
    if (error) {
      console.error(`[sitemap] ${table} failed at offset ${from}: ${error.message}`);
      break;
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

// created_at is the only timestamp any of these tables carries — there is no
// updated_at to read. It is honest about when a page first existed, which is
// what Google uses to prioritise a crawl. Stamping every entry with `new Date()`
// instead would claim the whole site changed today, every day, and a lastmod
// that is always now is a signal crawlers learn to ignore.
// Local date in the YYYY-MM-DD form PostgREST compares a date column against.
function today() {
  return new Date().toISOString().slice(0, 10);
}

function entry(path, priority, changeFrequency, lastModified) {
  return {
    url: `${SITE_URL}${path}`,
    lastModified: lastModified ? new Date(lastModified) : new Date(),
    changeFrequency,
    priority,
  };
}

export default async function sitemap() {
  const [healers, subjects, books, videos, publishers, offerings, freeResources] = await Promise.all([
    fetchAll('healers', 'healer_slug, created_at'),
    fetchAll('subjects', 'slug, created_at'),
    fetchAll('books', 'slug, created_at'),
    // 2,269 rows, so this is the one that most needs fetchAll's paging: a plain
    // select would return the first 1,000 and drop the rest without an error.
    fetchAll('videos', 'slug, created_at'),
    fetchAll('publishers', 'slug, created_at'),
    // Offerings are filtered to the live window the shelves themselves use:
    // is_active, and either evergreen (no end_date) or not yet past it. An
    // expired retreat's page still renders, so this is not about broken links
    // — it is that the site deliberately links to none of them, and a sitemap
    // should not ask Google to crawl what the site has switched off. Today
    // that removes 66 of 1,103 — 65 past their end_date plus one switched off
    // that had also expired. Recomputed per rebuild, so the window rolls
    // forward on its own.
    fetchAll('courses', 'slug, created_at', (q) =>
      q.eq('is_active', true).or(`end_date.is.null,end_date.gte.${today()}`)
    ),
    fetchAll('free_resources', 'slug, created_at'),
  ]);

  // A row with no slug has no page to point at — `/books/undefined` would be a
  // 404 in the sitemap, which costs crawl budget and counts against the site.
  // Nothing is missing a slug today; this keeps it true if an import ever lands
  // one without.
  const withSlug = (rows, key) => rows.filter((row) => row[key]);

  return [
    // The homepage is the one URL that genuinely changes daily: the billboard
    // reshuffles per request and new healers land on the shelves continuously.
    entry('', 1, 'daily'),

    // The one legal page with finished copy. /privacy and /terms stay out
    // until theirs is written — they carry noindex while they are placeholders.
    // Fixed lastmod: the copy changes when it is edited, not per request.
    entry('/affiliate-disclosure', 0.3, 'yearly', '2026-10-08'),

    // Profiles are the substance of the site and the pages worth ranking.
    ...withSlug(healers, 'healer_slug').map((h) =>
      entry(`/healers/${h.healer_slug}`, 0.9, 'weekly', h.created_at)
    ),

    // Subject pages are the taxonomy's 42 entry points. Their content shifts
    // whenever anything is tagged into them, which is often.
    ...withSlug(subjects, 'slug').map((s) =>
      entry(`/subject/${s.slug}`, 0.8, 'weekly', s.created_at)
    ),

    // Catalogue pages. The rows behind them rarely change once written, so a
    // monthly hint spends crawl budget on the profiles and subjects instead.
    ...withSlug(books, 'slug').map((b) => entry(`/books/${b.slug}`, 0.7, 'monthly', b.created_at)),
    ...withSlug(videos, 'slug').map((v) => entry(`/videos/${v.slug}`, 0.7, 'monthly', v.created_at)),
    ...withSlug(publishers, 'slug').map((p) =>
      entry(`/publishers/${p.slug}`, 0.7, 'monthly', p.created_at)
    ),
    ...withSlug(offerings, 'slug').map((o) =>
      entry(`/offerings/${o.slug}`, 0.7, 'monthly', o.created_at)
    ),
    ...withSlug(freeResources, 'slug').map((r) =>
      entry(`/free-resources/${r.slug}`, 0.7, 'monthly', r.created_at)
    ),
  ];
}

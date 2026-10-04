'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ContentShelf from './ContentShelf.js';
import VideoPlayer from './VideoPlayer.js';
import { supabase } from '../utils/supabase.js';
import { getSession, supabaseAuth } from '../utils/supabaseAuth.js';
import {
  DEFAULT_TAG_FREQUENCY,
  FILTERED_MIN_VIDEOS,
  FILTERED_SHELF_LIMIT,
  FOR_YOU_MIN_FAVOURITES,
  FOR_YOU_MIN_VIDEOS,
  FOR_YOU_TOP_SLUGS,
  GLOBAL_TAG_FREQUENCY,
  MIXED_OFFSET_CEILING,
  NEW_LIMIT,
  PAGE_SIZE,
  PILLAR_POOL,
  PUBLISHER_SLUG_CAP,
  SHELF_LIMIT,
  VIDEO_PILLARS,
} from '../utils/videoShelves.js';

// The Videos tab.
//
// Everything here is fetched from the client, once, when the tab is first
// opened — nothing reaches the initial page payload. That is not a nicety: the
// homepage was taken from 8MB and 2,142 images down to ~830KB by not rendering
// what nobody asked for, and seven shelves of video cards rendered eagerly
// would walk straight back into it.
//
// TWO MODES, chosen by the active subject filter:
//
//   no filter  — seven fixed shelves: what is new, one per pillar, and a mixed
//                catch-all. Seven queries in parallel, 24 rows at most each.
//   ?subject=  — one shelf per entity that teaches that subject, biggest first.
//                A single paginated query, grouped in the browser.
//
// The filtered mode deliberately does NOT ask the database for the grouping.
// One query per healer would be fifty-odd round trips for `meditation` alone;
// one query for the subject and a Map is a single trip, and the rows are thin
// (five columns, no images) so the saving is real either way.

// WHICH CLIENT READS WHAT, because this file now uses both and they are not
// interchangeable. The video pool goes through `supabase`, the anonymous
// client: public tables, public data, shared with server components and holding
// no session. Favourites go through `supabaseAuth`, the browser client that
// does hold one — user_favourites is guarded by `auth.uid() = user_id`, so the
// anonymous client reads zero rows from it and reports no error at all. Reading
// favourites on the wrong client does not fail; it silently says "this person
// has saved nothing", forever.

// Where a saved item's subject slugs actually live. user_favourites records
// only a content_type and a content_slug, and that slug is three different
// shapes depending on the type — a text slug for healers and publishers, a
// bigint for books and videos, a UUID for courses and free resources. (The
// comment on the 0002 migration says courses and free resources are numeric.
// They are not.)
const FAVOURITE_SOURCES = {
  healer: { table: 'healers', column: 'healer_slug', numeric: false },
  publisher: { table: 'publishers', column: 'slug', numeric: false },
  book: { table: 'books', column: 'id', numeric: true },
  video: { table: 'videos', column: 'id', numeric: true },
  course: { table: 'courses', column: 'id', numeric: false },
  free_resource: { table: 'free_resources', column: 'id', numeric: false },
};

// TODO — "Most Watched on YouTube". Needs a view_count column on videos and a
// scheduled job to refresh it from the YouTube Data API (videos.list takes 50
// ids per call, so ~46 calls for the current library, well inside the free
// quota). It cannot be done at render time, which is why there is no shelf here.
//
// TODO — "Most Loved". Hearts live in localStorage for signed-out visitors and
// only reach user_favourites on sign-in, so a server-side count currently sees
// almost nothing: one video favourite across the whole platform at the time of
// writing. Revisit when there are enough rows for a ranking to mean something.

// Only what the card actually renders. The default shelves still take `*`;
// here the row count is three orders of magnitude larger, and `subject_slugs`
// — the widest column — is exactly the thing we have already filtered on.
const CARD_COLUMNS = 'id, title, slug, platform_url, healer_slug';

// Thin a pillar's pool down to one shelf by taking every nth row rather than
// the first twenty, so a shelf is not one creator's batch end to end. The step
// is derived from what actually came back, so a short pool (a small pillar, or
// a window that ran off the end) still yields as many cards as it can rather
// than a third of a shelf.
function stride(rows, size = SHELF_LIMIT) {
  if (rows.length <= size) return rows;
  const step = Math.floor(rows.length / size);
  const out = [];
  for (let i = 0; i < rows.length && out.length < size; i += step) out.push(rows[i]);
  return out;
}

// How many filtered shelves show before the fold. `meditation` clears the
// three-video threshold fifty-four times over, which is a very long page to
// hand someone who only wanted to see who teaches it. The rest are one tap
// away and already in memory — revealing them costs no query.
const FILTERED_VISIBLE_SHELVES = 15;

// Build the "For You" shelf, or return null. Every failure path returns null:
// an unreadable favourite, a missing session, a thin profile and an empty pool
// all produce the same thing, which is no shelf and no explanation. A shelf
// that apologises for itself is worse than one that is not there.
async function loadForYou() {
  const { data: session } = await getSession();
  if (!session?.user?.id) return null;

  const { data: favourites, error: favouritesError } = await supabaseAuth
    .from('user_favourites')
    .select('content_type, content_slug')
    .eq('user_id', session.user.id);

  if (favouritesError || !favourites || favourites.length < FOR_YOU_MIN_FAVOURITES) return null;

  // Group by type so each source table is hit once, not once per favourite.
  const byType = new Map();
  for (const favourite of favourites) {
    const list = byType.get(favourite.content_type);
    if (list) list.push(favourite.content_slug);
    else byType.set(favourite.content_type, [favourite.content_slug]);
  }

  // The ids of videos they have already saved, kept for the exclusion below.
  const savedVideoIds = (byType.get('video') || [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  const lookups = [];
  for (const [type, values] of byType) {
    const source = FAVOURITE_SOURCES[type];
    // An unknown content_type is skipped rather than guessed at, and an empty
    // list never reaches .in() — PostgREST rejects `in.()` outright.
    if (!source || values.length === 0) continue;

    const keys = source.numeric
      ? values.map((value) => Number(value)).filter((value) => Number.isFinite(value))
      : values;
    if (keys.length === 0) continue;

    lookups.push(
      supabase
        .from(source.table)
        .select(`${source.column}, subject_slugs`)
        .in(source.column, keys)
        .then(({ data, error }) => ({ type, rows: error ? [] : data || [] }))
    );
  }

  const resolved = await Promise.all(lookups);

  // How many of this person's saves carry each slug. One item contributes a
  // slug once, however the item is tagged.
  const saveCount = new Map();
  for (const { type, rows } of resolved) {
    for (const row of rows) {
      const slugs = row.subject_slugs || [];
      const contributed = type === 'publisher' ? slugs.slice(0, PUBLISHER_SLUG_CAP) : slugs;
      for (const slug of contributed) saveCount.set(slug, (saveCount.get(slug) || 0) + 1);
    }
  }

  if (saveCount.size === 0) return null;

  // DEPTH, not breadth. One healer can be tagged with 28 subjects on its own,
  // so a profile where nothing was saved twice says nothing about taste.
  const hasDepth = [...saveCount.values()].some((count) => count > 1);
  if (!hasDepth) return null;

  const topSlugs = [...saveCount.entries()]
    .map(([slug, count]) => ({
      slug,
      // Divided by how common the slug is across the catalogue — see the note
      // in utils/videoShelves.js for why the raw count is the wrong measure.
      score: count / (GLOBAL_TAG_FREQUENCY[slug] ?? DEFAULT_TAG_FREQUENCY),
    }))
    // Slug A-Z settles ties, so the same profile gives the same three rather
    // than whatever order the Map happened to hold.
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    .slice(0, FOR_YOU_TOP_SLUGS)
    .map((entry) => entry.slug);

  if (topSlugs.length === 0) return null;

  // The pool query — the anonymous client again, and the same count-then-window
  // shape the pillar shelves use, so this row behaves like its neighbours.
  const withFilters = (query) => {
    const scoped = query.overlaps('subject_slugs', topSlugs);
    return savedVideoIds.length > 0
      ? scoped.not('id', 'in', `(${savedVideoIds.join(',')})`)
      : scoped;
  };

  const { count, error: countError } = await withFilters(
    supabase.from('videos').select('id', { count: 'exact', head: true })
  );
  if (countError) return null;

  const span = Math.max(0, (count ?? 0) - PILLAR_POOL);
  const offset = span > 0 ? Math.floor(Math.random() * span) : 0;

  const { data, error } = await withFilters(supabase.from('videos').select('*'))
    .order('id', { ascending: false })
    .range(offset, offset + PILLAR_POOL - 1);

  if (error) return null;

  const items = stride(data || []);
  if (items.length < FOR_YOU_MIN_VIDEOS) return null;

  return { key: 'for-you', title: 'For You', subtitle: 'Based on what you have saved', items };
}

export default function VideoShelves({
  healerNames = [],
  subjectSlug = null,
  from,
  fromTitle,
}) {
  const [shelves, setShelves] = useState(null);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // Resolved separately from the seven below and prepended when it arrives, so
  // the session check and up to six favourite lookups never hold up a shelf
  // that does not depend on them. null means "no shelf" — not yet resolved and
  // resolved to nothing look the same, deliberately: both render nothing.
  const [forYou, setForYou] = useState(null);

  // slug -> name. Built once from the map the server component passes down, so
  // a card can show its healer without a query of its own.
  const nameBySlug = useRef(new Map(healerNames));
  useEffect(() => {
    nameBySlug.current = new Map(healerNames);
  }, [healerNames]);

  // Per-subject memo, so moving between filters costs one fetch per filter
  // rather than one per visit to it. Keyed by slug, with '' for the unfiltered
  // shelves. A ref rather than state: reading it must never itself render.
  //
  // Today the subject pills are plain anchors, so changing the filter reloads
  // the document and this map starts empty again. It earns its keep the moment
  // those pills become client-side — and costs nothing until then.
  //
  // KNOWN LIMITATION: the key is the subject slug and nothing else, so a
  // sign-in or sign-out while this component is mounted does not invalidate
  // anything. The "For You" row is held in its own state rather than in here,
  // so it is not stale — but it is also not recomputed, because its effect
  // depends only on subjectSlug. Signing in mid-session therefore leaves the
  // row absent until the next page load. Full page loads hide this today;
  // subscribing to onAuthStateChange is the fix when they stop.
  const cache = useRef(new Map());

  const loadDefault = useCallback(async () => {
    const mixedOffset = Math.floor(Math.random() * MIXED_OFFSET_CEILING);

    // `.overlaps` is the array-overlap operator (&&) — a video matches a pillar
    // when it carries ANY slug in the group. The two passes below build their
    // own query rather than sharing a half-built one: select() takes the count
    // options, so a shared builder that had already called select() would need
    // a second call, and the second does not replace the first — the count
    // comes back undefined and every shelf silently falls back to offset 0,
    // which is exactly the bug this function is fixing.
    const pillarCount = (pillar) =>
      supabase
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .overlaps('subject_slugs', pillar.slugs);

    const pillarRows = (pillar) =>
      supabase.from('videos').select('*').overlaps('subject_slugs', pillar.slugs);

    // FIRST PASS — how big each pillar is. head:true returns the count and no
    // rows, so five of these cost a header apiece. Issued alongside the two
    // shelves that need no count, not before them.
    const firstPass = await Promise.all([
      // Lead shelf — most recently ingested. This one SHOULD be the newest;
      // that is what it says it is.
      supabase.from('videos').select('*').order('id', { ascending: false }).limit(NEW_LIMIT),
      // Catch-all. A random window rather than a fixed one, so the row differs
      // between visits instead of being the same twenty forever.
      supabase
        .from('videos')
        .select('*')
        .order('id', { ascending: true })
        .range(mixedOffset, mixedOffset + SHELF_LIMIT - 1),
      ...VIDEO_PILLARS.map(pillarCount),
    ]);

    const [newest, mixed, ...counts] = firstPass;

    // SECOND PASS — twenty from somewhere inside each pillar. The offset is
    // bounded by that pillar's own count so the window is always full, and a
    // count that could not be read falls back to the top of the pillar rather
    // than to an empty shelf.
    const windows = await Promise.all(
      VIDEO_PILLARS.map((pillar, i) => {
        // A count that could not be read leaves offset 0 — the top of the
        // pillar, a full shelf, and the old behaviour. Better a correct shelf
        // than a clever empty one, but it is why the count query above is
        // written out in full rather than chained onto a shared builder.
        const total = counts[i]?.count ?? 0;
        const span = Math.max(0, total - PILLAR_POOL);
        const offset = span > 0 ? Math.floor(Math.random() * span) : 0;
        return pillarRows(pillar)
          // range() needs a deterministic order or the same offset returns
          // different rows each call. id is unique; created_at is not — the
          // bulk imports gave thousands of rows the same timestamp.
          .order('id', { ascending: false })
          .range(offset, offset + PILLAR_POOL - 1);
      })
    );

    return [
      { key: 'new', title: 'New to Spiritpedia', subtitle: 'Just added', items: newest.data || [] },
      ...VIDEO_PILLARS.map((pillar, i) => ({
        key: pillar.title,
        title: pillar.title,
        subtitle: 'Watch & Learn',
        items: stride(windows[i].data || []),
      })),
      {
        key: 'mixed',
        title: 'Watch & Learn',
        subtitle: 'A little of everything',
        items: mixed.data || [],
      },
    ];
  }, []);

  const loadFiltered = useCallback(async (slug) => {
    // `.contains` is the array-containment operator (@>) — this subject must be
    // among the video's tags. Ordered by id DESCENDING, which does double duty:
    // it makes the paging deterministic (id is unique, where created_at is not
    // — bulk imports share a timestamp) and it means each group arrives
    // newest-first, so taking the first twelve takes the twelve most recent.
    const rows = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error: queryError } = await supabase
        .from('videos')
        .select(CARD_COLUMNS)
        .contains('subject_slugs', [slug])
        .order('id', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      // A failure here must not read as "this subject has no videos" —
      // supabase-js returns { data: null, error } rather than throwing, so
      // without this the empty state would quietly swallow an outage.
      if (queryError) throw new Error(queryError.message);

      const page = data || [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    const byEntity = new Map();
    for (const video of rows) {
      const entity = video.healer_slug;
      if (!entity) continue;
      const bucket = byEntity.get(entity);
      if (bucket) bucket.push(video);
      else byEntity.set(entity, [video]);
    }

    return [...byEntity.entries()]
      .map(([entity, items]) => ({ entity, items, name: nameBySlug.current.get(entity) }))
      // An entity with no name is one the healers table does not have, so there
      // is nothing to title the shelf with and /healers/<slug> would 404.
      .filter((group) => group.items.length >= FILTERED_MIN_VIDEOS && group.name)
      // Count descending. The ingest caps most entities at twenty videos, so
      // ties are the norm rather than the exception — name A-Z settles them,
      // which keeps the order stable instead of whatever the Map happens to
      // hold.
      .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name))
      .map((group) => ({
        key: group.entity,
        title: (
          <Link
            href={`/healers/${group.entity}`}
            className="transition-colors hover:text-[#a78bfa]"
          >
            {group.name}
          </Link>
        ),
        // The real total in this subject, not the twelve on screen — it is what
        // the shelves are ordered by, so showing the capped number instead
        // would make the order look arbitrary.
        subtitle: `${group.items.length} videos`,
        items: group.items.slice(0, FILTERED_SHELF_LIMIT),
      }));
  }, []);

  // Default mode only. A subject filter is already an explicit statement of
  // what someone wants, and answering it with a row based on something else
  // would be arguing with them.
  useEffect(() => {
    if (subjectSlug) {
      setForYou(null);
      return undefined;
    }

    let cancelled = false;
    loadForYou()
      .then((shelf) => {
        if (!cancelled) setForYou(shelf);
      })
      // Nothing here is worth an error state. If it could not be worked out,
      // the shelf does not appear and the tab is exactly as it was.
      .catch(() => {
        if (!cancelled) setForYou(null);
      });

    return () => {
      cancelled = true;
    };
  }, [subjectSlug]);

  useEffect(() => {
    const key = subjectSlug || '';
    const cached = cache.current.get(key);
    if (cached) {
      setShelves(cached);
      setError(null);
      setShowAll(false);
      return undefined;
    }

    let cancelled = false;
    // Back to the skeleton while the new filter loads, so the previous
    // subject's shelves are never left on screen captioned as this one's.
    // Both are no-ops on the first run, where the state already holds them.
    setShelves(null);
    setError(null);
    setShowAll(false);

    (async () => {
      try {
        const next = subjectSlug ? await loadFiltered(subjectSlug) : await loadDefault();
        if (cancelled) return;
        cache.current.set(key, next);
        setShelves(next);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [subjectSlug, loadDefault, loadFiltered]);

  if (error) {
    return (
      <p className="py-16 text-center text-sm text-gray-500">
        We could not load the videos just now. Please try again shortly.
      </p>
    );
  }

  if (!shelves) {
    return (
      <div className="grid grid-cols-1 gap-14 py-14" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <section key={i} className="min-w-0">
            <div className="mb-4 h-6 w-48 animate-pulse rounded bg-white/5" />
            <div className="flex flex-row gap-5 overflow-hidden pb-2">
              {[0, 1, 2, 3, 4].map((j) => (
                <div
                  key={j}
                  className="h-56 w-[320px] shrink-0 animate-pulse rounded-2xl border border-white/5 bg-white/5"
                />
              ))}
            </div>
          </section>
        ))}
        <span className="sr-only">Loading videos</span>
      </div>
    );
  }

  // Only reachable with a filter on: the default mode always returns its seven
  // shelves. A subject this niche has no entity teaching it three times over.
  if (shelves.length === 0) {
    return <p className="py-16 text-center text-sm text-gray-500">No videos yet for this subject.</p>;
  }

  // Filtered mode only. The default seven are nowhere near the cutoff, and
  // guarding on the slug keeps this out of their path entirely.
  const capped = Boolean(subjectSlug) && !showAll && shelves.length > FILTERED_VISIBLE_SHELVES;
  const visible = capped ? shelves.slice(0, FILTERED_VISIBLE_SHELVES) : shelves;
  const hidden = shelves.length - visible.length;

  // Prepended at render rather than mixed into the shelves array, so the cached
  // seven stay exactly what loadDefault returned. forYou is null in filtered
  // mode, so the cap arithmetic above never sees it.
  const rendered = forYou ? [forYou, ...visible] : visible;

  return (
    <div className="grid grid-cols-1 gap-14 py-14">
      {rendered.map((shelf) => (
        <ContentShelf
          key={shelf.key}
          title={shelf.title}
          subtitle={shelf.subtitle}
          items={shelf.items}
          itemWidthClass="w-[320px]"
          renderItem={(video) => (
            <VideoPlayer
              video={video}
              variant="dark"
              healerName={nameBySlug.current.get(video.healer_slug)}
              // Back-context, where the caller has one. The homepage passes
              // neither, so its cards keep falling back to "Back to Videos".
              from={from}
              fromTitle={fromTitle}
            />
          )}
        />
      ))}

      {/* One tap, everything. The rows are already grouped in memory, so this
          fetches nothing — there is no second page to wait for and no reason
          to make anyone ask twice. */}
      {capped && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Show {hidden} more
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import BookCard from './BookCard.js';
import ContentShelf from './ContentShelf.js';
import FreeResourceCard from './FreeResourceCard.js';
import OfferingCard from './OfferingCard.js';
import ShelfRow from './ShelfRow.js';
import VideoPlayer from './VideoPlayer.js';
import { supabase } from '../utils/supabase.js';

// Homepage discovery section.
//
// The page used to fetch and render every shelf on arrival — books, videos,
// courses, retreats, downloads and free resources — which is most of an 8MB
// document and over two thousand images for content the visitor may never
// scroll to. None of that data is on the page now. The server sends healers
// only; each shelf below fetches its own rows the moment someone asks for it.
//
// Shelves stack in the order they were chosen and stay open. The chooser
// follows the last opened shelf, carrying whatever is left, and disappears
// once all six are open.

// Videos arrive a page at a time, fetched per press rather than sliced from a
// pre-loaded pool — pooling is what made the homepage heavy in the first place.
const VIDEO_PAGE = 12;

// Paging needs a TOTAL order, not just a sort key. Videos were bulk-imported in
// batches that share a created_at to the microsecond, so ordering on that alone
// leaves Postgres free to break ties differently per query — pages then overlap
// and some rows become unreachable. Measured: three pages returned 36 rows but
// only 28 distinct videos. `id` is unique, so it settles every tie.
const VIDEO_ORDER = [
  ['created_at', { ascending: false }],
  ['id', { ascending: false }],
];

const SECTIONS = [
  { key: 'free-resources', label: 'Free Resources', subtitle: 'No Cost, No Catch' },
  {
    key: 'books',
    label: 'Books & Literature',
    subtitle: 'The Curated Archive',
    itemWidthClass: 'w-[200px]',
  },
  { key: 'courses', label: 'Courses & Programmes', subtitle: 'Go Deeper' },
  { key: 'retreats', label: 'Retreats & Live Events', subtitle: 'In Person' },
  { key: 'downloads', label: 'Downloads & Audio', subtitle: 'Take It With You' },
  { key: 'videos', label: 'Videos', subtitle: 'Watch & Learn' },
];

// An offering only surfaces while it is live: is_active, and either evergreen
// (end_date IS NULL) or not yet past its end date. Recomputed per fetch so the
// window rolls forward on its own — same rule the server applies to healers.
function liveWindow() {
  return `end_date.is.null,end_date.gte.${new Date().toISOString().slice(0, 10)}`;
}

// Subject filtering happens in the query, not in memory: a filtered shelf
// should not pull the whole table across the wire to discard most of it.
function withSubject(query, subjectSlug) {
  return subjectSlug ? query.contains('subject_slugs', [subjectSlug]) : query;
}

export default function ExploreMore({ subjectSlug = null, healerNames = [] }) {
  // Click order is the render order.
  const [order, setOrder] = useState([]);
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState({});
  // Videos page separately from the other shelves: `videosDone` goes true once a
  // batch comes back short, which is what retires the button.
  const [videosDone, setVideosDone] = useState(false);
  const [loadingMoreVideos, setLoadingMoreVideos] = useState(false);

  // Offerings live in one table split by product_type, so Courses, Retreats and
  // Downloads share a single fetch rather than pulling it three times. Keyed by
  // subject so a filter change invalidates it.
  const coursesCache = useRef({ key: null, promise: null });

  const healerNameById = useRef(new Map(healerNames));
  useEffect(() => {
    healerNameById.current = new Map(healerNames);
  }, [healerNames]);

  const loadCourses = useCallback((slug) => {
    const key = slug || '';
    if (coursesCache.current.key !== key) {
      coursesCache.current = {
        key,
        promise: withSubject(
          supabase
            .from('courses')
            .select('*')
            .eq('is_active', true)
            .or(liveWindow())
            .order('created_at', { ascending: false }),
          slug
        ).then(({ data }) => data || []),
      };
    }
    return coursesCache.current.promise;
  }, []);

  const fetchSection = useCallback(
    async (key, slug) => {
      if (key === 'books') {
        const { data } = await withSubject(
          supabase.from('books').select('*').order('created_at', { ascending: false }),
          slug
        );
        return data || [];
      }
      if (key === 'free-resources') {
        const { data } = await withSubject(
          supabase
            .from('free_resources')
            .select('*')
            .eq('is_featured', true)
            .eq('is_active', true)
            .or(liveWindow())
            .order('created_at', { ascending: false }),
          slug
        );
        return data || [];
      }
      if (key === 'videos') {
        const { data } = await withSubject(
          supabase.from('videos').select('*').order(...VIDEO_ORDER[0]).order(...VIDEO_ORDER[1]).range(0, VIDEO_PAGE - 1),
          slug
        );
        return data || [];
      }
      // The three offering shelves, split off one cached fetch. A legacy row
      // with no product_type is treated as a course, as it always has been.
      const offerings = await loadCourses(slug);
      if (key === 'courses') {
        return offerings.filter((c) => !c.product_type || c.product_type === 'course');
      }
      if (key === 'retreats') return offerings.filter((c) => c.product_type === 'retreat');
      return offerings.filter((c) => c.product_type === 'download');
    },
    [loadCourses]
  );

  const load = useCallback(
    async (key, slug) => {
      setLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const data = await fetchSection(key, slug);
        setRows((prev) => ({ ...prev, [key]: data }));
        // A first page shorter than a full one means there is nothing beyond it.
        if (key === 'videos') setVideosDone(data.length < VIDEO_PAGE);
      } catch {
        // A failed fetch leaves an empty shelf rather than a broken page.
        setRows((prev) => ({ ...prev, [key]: [] }));
      } finally {
        setLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [fetchSection]
  );

  // Appends the next page to what is already on screen. Offset comes from the
  // rows in hand, so it stays correct no matter how many presses have happened,
  // and the subject filter is whatever the shelf is currently showing.
  const loadMoreVideos = useCallback(async () => {
    setLoadingMoreVideos(true);
    try {
      const current = rows.videos || [];
      const { data } = await withSubject(
        supabase
          .from('videos')
          .select('*')
          .order(...VIDEO_ORDER[0])
          .order(...VIDEO_ORDER[1])
          .range(current.length, current.length + VIDEO_PAGE - 1),
        subjectSlug
      );
      const batch = data || [];
      setRows((prev) => ({ ...prev, videos: [...(prev.videos || []), ...batch] }));
      if (batch.length < VIDEO_PAGE) setVideosDone(true);
    } catch {
      // Leave what is already on screen and retire the button rather than
      // offering a press that will not work.
      setVideosDone(true);
    } finally {
      setLoadingMoreVideos(false);
    }
  }, [rows.videos, subjectSlug]);

  function open(key) {
    setOrder((prev) => (prev.includes(key) ? prev : [...prev, key]));
    load(key, subjectSlug);
  }

  // A subject pill changes the filter under shelves that are already open, so
  // every one of them is re-fetched against the new subject. Skipped on mount,
  // where there is nothing open yet.
  const openedRef = useRef(order);
  openedRef.current = order;
  const previousSubject = useRef(subjectSlug);
  useEffect(() => {
    if (previousSubject.current === subjectSlug) return;
    previousSubject.current = subjectSlug;
    coursesCache.current = { key: null, promise: null };
    openedRef.current.forEach((key) => load(key, subjectSlug));
  }, [subjectSlug, load]);

  const remaining = SECTIONS.filter((s) => !order.includes(s.key));

  function renderShelf(key) {
    const section = SECTIONS.find((s) => s.key === key);
    const data = rows[key];

    if (loading[key] && !data) return <ShelfSkeleton key={key} section={section} />;
    if (!data) return null;

    if (key === 'videos') {
      return (
        <VideoPreview
          key={key}
          videos={data}
          hasMore={!videosDone}
          loadingMore={loadingMoreVideos}
          onLoadMore={loadMoreVideos}
        />
      );
    }

    const renderItem =
      key === 'books'
        ? (book) => <BookCard book={book} from="/" fromTitle="Spiritpedia" />
        : key === 'free-resources'
          ? (item) => (
              <FreeResourceCard
                item={item}
                healerName={healerNameById.current.get(item.healer_id)}
                from="/"
                fromTitle="Spiritpedia"
              />
            )
          : (item) => (
              <OfferingCard
                item={item}
                healerName={healerNameById.current.get(item.healer_id)}
                from="/"
                fromTitle="Spiritpedia"
              />
            );

    return (
      <ContentShelf
        key={key}
        title={section.label}
        subtitle={section.subtitle}
        items={data}
        seeAllHref={subjectSlug ? `/subject/${subjectSlug}` : null}
        renderItem={renderItem}
        itemWidthClass={section.itemWidthClass}
        // A chosen shelf that turns out to be empty must still say so — silently
        // rendering nothing would look like the click failed.
        emptyHide={false}
      />
    );
  }

  return (
    <>
      {order.map(renderShelf)}

      {remaining.length > 0 && (
        <section className="min-w-0 border-t border-white/10 pt-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#a78bfa]">
            Explore More
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">What would you like to discover?</h2>
          <p className="mt-1 text-sm text-gray-400">Choose a section to open it.</p>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
            {remaining.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => open(section.key)}
                className="group flex min-h-[116px] flex-col justify-between rounded-xl border border-white/10 bg-[#111827] p-5 text-left transition-colors hover:border-[#7c3aed] hover:bg-[#161f33] focus:border-[#7c3aed] focus:outline-none"
              >
                <span className="text-base font-bold text-white">{section.label}</span>
                <span className="self-end text-lg text-[#7c3aed] transition-transform group-hover:translate-x-0.5">
                  &#8599;
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// Shown the instant a section is chosen, so the page never sits blank while the
// rows are in flight. Mirrors the shelf it is standing in for.
function ShelfSkeleton({ section }) {
  return (
    <section className="min-w-0" aria-busy="true">
      <ShelfRow title={section.label} subtitle={section.subtitle} />
      <div className="flex flex-row gap-5 overflow-hidden pb-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-72 w-[260px] shrink-0 animate-pulse rounded-2xl border border-white/5 bg-white/5"
          />
        ))}
      </div>
      <span className="sr-only">Loading {section.label}</span>
    </section>
  );
}

// Videos stay on the homepage: each press fetches the next page and appends it
// below, so nobody is navigated away mid-browse.
function VideoPreview({ videos, hasMore, loadingMore, onLoadMore }) {
  return (
    <section className="min-w-0">
      <ShelfRow title="Videos" subtitle="Watch & Learn" />

      {videos.length === 0 ? (
        <p className="text-sm text-gray-500">No videos here yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {videos.map((video) => (
            <VideoPlayer key={video.id} video={video} variant="dark" />
          ))}
        </div>
      )}

      {hasMore && videos.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded-full bg-[#7c3aed] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#7c3aed]/30 transition-all hover:bg-[#6d28d9] hover:scale-105 active:scale-95 disabled:cursor-default disabled:opacity-60 disabled:hover:scale-100"
          >
            {loadingMore ? 'Loading…' : 'Load more videos'}
          </button>
        </div>
      )}
    </section>
  );
}

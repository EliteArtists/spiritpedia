'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BookCard from './BookCard.js';
import ContentShelf from './ContentShelf.js';
import FreeResourceCard from './FreeResourceCard.js';
import OfferingCard from './OfferingCard.js';
import ShelfRow from './ShelfRow.js';
import { supabase } from '../utils/supabase.js';
import {
  homeHref,
  readShelves,
  setHomeParam,
  SHELVES_PARAM,
  useHomeSearch,
} from '../utils/homeViewState.js';

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
// once all five are open.

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

export default function ExploreMore({
  subjectSlug = null,
  healerNames = [],
  initialSearch = '',
  fromTitle = 'Spiritpedia',
}) {
  // WHICH SHELVES ARE OPEN LIVES IN THE URL, so coming back from a detail page
  // restores them rather than collapsing everything the visitor had opened.
  // Click order is still the render order — the parameter preserves it.
  const search = useHomeSearch(initialSearch);
  const order = useMemo(
    // Filtered against SECTIONS so a hand-edited or stale parameter cannot ask
    // for a shelf that does not exist.
    () => readShelves(search).filter((key) => SECTIONS.some((s) => s.key === key)),
    [search]
  );

  // Where a card's detail page should send somebody back to: the homepage URL
  // as it currently stands, open shelves included.
  const from = homeHref(search);
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState({});

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
  function open(key) {
    if (order.includes(key)) return;
    // replaceState, not a navigation: opening a shelf is a change of view, and
    // it must not become a step the browser's Back button walks through. The
    // fetch is left to the effect above, which is what also covers a shelf that
    // arrived open in the URL — doing both here would fetch twice.
    setHomeParam(SHELVES_PARAM, [...order, key].join(','));
  }

  // A SHELF RESTORED FROM THE URL HAS TO FETCH ITSELF.
  //
  // `order` now comes from the query string, so arriving at ?shelves=books,
  // or stepping back to a page that had them open, puts a shelf in the render
  // list that nothing ever asked the database for — it would render as nothing
  // at all. open() loads on click; this loads everything that arrived already
  // open. The ref makes it once per shelf per subject rather than once per
  // render.
  const requested = useRef(new Set());
  useEffect(() => {
    for (const key of order) {
      if (requested.current.has(key)) continue;
      requested.current.add(key);
      load(key, subjectSlug);
    }
  }, [order, subjectSlug, load]);

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
    requested.current = new Set(openedRef.current);
    openedRef.current.forEach((key) => load(key, subjectSlug));
  }, [subjectSlug, load]);

  const remaining = SECTIONS.filter((s) => !order.includes(s.key));

  function renderShelf(key) {
    const section = SECTIONS.find((s) => s.key === key);
    const data = rows[key];

    if (loading[key] && !data) return <ShelfSkeleton key={key} section={section} />;
    if (!data) return null;

    const renderItem =
      key === 'books'
        ? (book) => <BookCard book={book} from={from} fromTitle={fromTitle} />
        : key === 'free-resources'
          ? (item) => (
              <FreeResourceCard
                item={item}
                healerName={healerNameById.current.get(item.healer_id)}
                from={from}
                fromTitle={fromTitle}
              />
            )
          : (item) => (
              <OfferingCard
                item={item}
                healerName={healerNameById.current.get(item.healer_id)}
                from={from}
                fromTitle={fromTitle}
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


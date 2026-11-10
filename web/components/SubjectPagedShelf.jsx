'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ShelfRow from './ShelfRow.js';
import OfferingCard from './OfferingCard.js';
import FreeResourceCard from './FreeResourceCard.js';
import { shelfQuery } from '../utils/subjectShelves.js';

// A subject page's offerings and free resources, loaded in the browser a page
// at a time (owner, 10 Nov 2026), as the video shelves are. Shipped in the
// page's HTML they made /subject/meditation over 13 MB: 2,000 courses and
// 1,000 free resources, of which a visitor sees a handful.
//
// The server counts each shelf (data/subjects.js) so an empty one is never
// drawn and the page knows whether the subject has anything at all. Here the
// first PAGE cards load on mount, and the next page whenever the end of the
// row scrolls into view. Ordered by id, as the server paged them, so pages
// neither overlap nor skip.
const PAGE = 24;

export default function SubjectPagedShelf({
  kind,
  subjectSlug,
  total,
  title,
  subtitle,
  from,
  fromTitle,
  itemWidthClass = 'w-[300px]',
}) {
  const [items, setItems] = useState([]);
  const [done, setDone] = useState(false);
  const loading = useRef(false);
  const trackRef = useRef(null);
  const endRef = useRef(null);

  const loadMore = useCallback(async () => {
    if (loading.current || done) return;
    loading.current = true;
    const offset = items.length;
    const { data, error } = await shelfQuery(kind, subjectSlug).range(offset, offset + PAGE - 1);
    loading.current = false;
    // A failed page ends the row where it is rather than retrying in a loop.
    if (error || !data) {
      setDone(true);
      return;
    }
    setItems((prev) => [...prev, ...data]);
    if (data.length < PAGE) setDone(true);
  }, [kind, subjectSlug, items.length, done]);

  // The next page once the row's end is near (one card's width ahead). The
  // end marker sits straight after the loaded cards, so on an empty row it is
  // in view at once and this also loads the first page. A new observer per
  // page reports at once whether the marker is still in view.
  useEffect(() => {
    const end = endRef.current;
    if (!end || done) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { root: trackRef.current, rootMargin: '0px 300px 0px 0px' }
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, [done, loadMore]);

  if (!total) return null;

  const renderItem = (item) =>
    kind === 'free' ? (
      <FreeResourceCard item={item} healerName={item.healers?.name} from={from} fromTitle={fromTitle} />
    ) : (
      <OfferingCard item={item} healerName={item.healers?.name} from={from} fromTitle={fromTitle} />
    );

  // Placeholders hold the row's height until the first page arrives, so the
  // shelves below do not jump.
  const placeholders = items.length === 0 && !done ? Math.min(total, 4) : 0;

  return (
    <section className="min-w-0">
      <ShelfRow title={title} subtitle={subtitle} />
      <div
        ref={trackRef}
        className="flex flex-row gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth pb-2"
      >
        {items.map((item) => (
          <div key={item.id} className={`shrink-0 snap-start ${itemWidthClass}`}>
            {renderItem(item)}
          </div>
        ))}
        {!done && <div ref={endRef} className="w-px shrink-0" aria-hidden="true" />}
        {Array.from({ length: placeholders }, (_, i) => (
          <div
            key={`placeholder-${i}`}
            aria-hidden="true"
            className={`shrink-0 ${itemWidthClass} h-[320px] animate-pulse rounded-2xl bg-[#111827]`}
          />
        ))}
      </div>
    </section>
  );
}

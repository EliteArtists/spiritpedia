'use client';

import { Children, useEffect, useRef, useState } from 'react';

// A shelf's scroll track that draws its cards a page at a time (owner, 16 Nov
// 2026: smoother scrolling). One homepage row holds about 900 cards, and every
// one was in the page with its pictures. Now the first PAGE are drawn, and the
// next PAGE whenever the end of the row comes near, as subject pages load
// theirs (SubjectPagedShelf.jsx). Nothing is left out: scrolling along the row
// reaches every card.
//
// The cards arrive already built, so this works under a server component
// (the homepage) as well as a client one.
const PAGE = 12;

export default function ShelfTrack({ children }) {
  const cards = Children.toArray(children);
  const [shown, setShown] = useState(PAGE);
  const trackRef = useRef(null);
  const endRef = useRef(null);
  const more = shown < cards.length;

  // The next page once the row's end is within two cards of the screen. A new
  // observer per page reports at once if the end is still in view, so a wide
  // screen fills itself.
  useEffect(() => {
    const end = endRef.current;
    if (!end || !more) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setShown((n) => n + PAGE);
      },
      { root: trackRef.current, rootMargin: '0px 600px 0px 0px' }
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, [more, shown]);

  return (
    <div
      ref={trackRef}
      className="flex flex-row gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth pb-2"
    >
      {cards.slice(0, shown)}
      {more && <div ref={endRef} className="w-px shrink-0" aria-hidden="true" />}
    </div>
  );
}

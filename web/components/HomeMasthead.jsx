'use client';

import { useEffect, useRef, useState } from 'react';
import EmotionSearch from './EmotionSearch.js';
import ShareButton from './ShareButton.jsx';
import SiteLogo from './SiteLogo.jsx';
import SubjectPills from './SubjectPills.js';

// The homepage's top block — masthead, search, subject pills — kept together in
// one client component because the first and last of those have to coordinate.
//
// THE HANDOFF. The navbar stays pinned while the visitor scrolls the search
// bar away, then slides up and out at the exact moment the pills reach the top,
// leaving the pills docked there in its place. One bar is always at the top;
// the two never overlap and never both occupy it.
//
// The trigger is a zero-height sentinel sitting in normal flow directly above
// the pills. A sticky element cannot be observed for this itself — once docked
// it stays in view, so it never reports leaving. The sentinel does not dock, so
// the moment it passes above the viewport is precisely the moment the pills
// arrive at the top.
//
// The navbar stays `sticky` throughout and is translated out rather than
// switched to static: flipping position would teleport it away in a single
// frame, where a transform slides it.
export default function HomeMasthead({ subjects, currentSubjectSlug, shareUrl, shareTitle }) {
  const [handedOff, setHandedOff] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only a sentinel that has gone ABOVE the viewport counts. Without the
        // top check, the one that has not yet scrolled into view from below
        // would read as "gone" too, and the navbar would start out hidden.
        setHandedOff(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <nav
        data-handed-off={handedOff}
        className={`sticky top-0 z-50 border-b border-white/10 bg-[#0a0f1d]/90 backdrop-blur-md transition-transform duration-300 ease-out ${
          handedOff ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <SiteLogo />
          <div className="flex items-center gap-3">
            {/* Share is desktop/tablet only — on a phone the OS share sheet is a
                tap away on every detail page, and the header needs the room. */}
            <div className="hidden md:flex">
              <ShareButton url={shareUrl} title={shareTitle} />
            </div>

            {/* Account — a placeholder holding its position in the bar until
                the real account area lands. h-10 w-10 rounded-full matches the
                share button beside it exactly, so the pair reads as one set. */}
            <a
              href="#"
              aria-label="Account"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/60 transition-colors hover:border-white/40 hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </a>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6">
        {/* The page's one H1. Visually hidden — the design leads with the
            search bar, but search engines and screen readers still need a
            heading that names the page. */}
        <h1 className="sr-only">Spiritpedia — Discover Wisdom. Explore Consciousness.</h1>

        {/* EMOTIONAL SEARCH BAR — the sacred entry point. It carries its own
            one-line introduction, so the two stay together. */}
        <EmotionSearch />
      </div>

      {/* Fires the handoff — see the note above. */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      {/* SUBJECT PILLS — full-bleed so the docked bar spans the viewport the
          way the navbar does; its own max-w-7xl keeps the pills on the grid.
          position:sticky rather than a scroll listener swapping to fixed: a
          sticky element never leaves the flow, so nothing below it can jump
          when it docks and no spacer is needed. z-40 sits under the navbar's
          z-50 while the two cross over. */}
      <section className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0f1d]">
        <div className="mx-auto max-w-7xl px-6 py-3">
          <SubjectPills subjects={subjects} currentSubjectSlug={currentSubjectSlug} />
        </div>
      </section>
    </>
  );
}

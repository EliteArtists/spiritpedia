'use client';

import { useState } from 'react';
import VideoShelves from './VideoShelves.jsx';
import {
  homeHref,
  readParam,
  setHomeParam,
  TAB_PARAM,
  useHomeSearch,
} from '../utils/homeViewState.js';

// The homepage's two views, below the masthead.
//
// Discover is everything the homepage already was and is passed in as children,
// so it stays server-rendered and arrives in the initial payload exactly as
// before — this component never touches it.
//
// Videos is mounted only once its tab has been clicked, and then kept mounted
// and merely hidden. That gives both halves of what is wanted: nothing is
// fetched for a visitor who never opens the tab, and someone switching back and
// forth does not refetch seven queries each time.
//
// Hiding rather than unmounting also preserves the Discover tab's state — an
// opened Explore More shelf, a scrolled row — which conditional rendering would
// throw away on every switch.
const TABS = [
  { key: 'videos', label: 'Videos' },
  { key: 'discover', label: 'Discover' },
];

export default function HomeTabs({
  children,
  healerNames = [],
  subjectSlug = null,
  initialSearch = '',
  fromTitle,
}) {
  // The URL is the state. Discover is the default — it is what returning
  // visitors already know, and the half that costs nothing extra to show — but
  // ?tab=videos brings someone straight back to where they were.
  const search = useHomeSearch(initialSearch);
  const tab = readParam(search, TAB_PARAM) === 'videos' ? 'videos' : 'discover';

  // Not in the URL, and should not be: this is "has the tab ever been opened in
  // this page view", which is what keeps the seven queries from running twice.
  // It starts true when the URL already says videos, so arriving there mounts
  // the shelves without waiting for a click that will never come.
  const [videosOpened, setVideosOpened] = useState(tab === 'videos');

  const select = (key) => {
    if (key === 'videos') setVideosOpened(true);
    // Written with replaceState, so switching tabs does not add a history entry
    // and Back still means the page before this one.
    setHomeParam(TAB_PARAM, key === 'videos' ? 'videos' : null);
  };

  // What a video card hands its detail page. Built from the live URL, so it
  // carries the subject, the tab and any open shelves exactly as they stand.
  const from = homeHref(search);

  return (
    <>
      <div className="flex justify-center gap-2 border-b border-white/10 pb-0 pt-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => select(t.key)}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px rounded-t-lg border-b-2 px-6 py-3 text-sm font-semibold transition-colors ${
                active
                  ? 'border-[#7c3aed] text-white'
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* No display utility on either wrapper, so the `hidden` attribute is
          what actually governs visibility. */}
      <div hidden={tab !== 'discover'}>{children}</div>

      {videosOpened && (
        <div hidden={tab !== 'videos'}>
          <VideoShelves
            healerNames={healerNames}
            subjectSlug={subjectSlug}
            from={from}
            fromTitle={fromTitle}
          />
        </div>
      )}
    </>
  );
}

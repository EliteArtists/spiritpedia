'use client';

import { useState } from 'react';
import VideoShelves from './VideoShelves.jsx';

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

export default function HomeTabs({ children, healerNames = [], subjectSlug = null }) {
  // Discover is the default: it is what returning visitors already know, and it
  // is the half that costs nothing extra to show.
  const [tab, setTab] = useState('discover');
  const [videosOpened, setVideosOpened] = useState(false);

  const select = (key) => {
    setTab(key);
    if (key === 'videos') setVideosOpened(true);
  };

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
          <VideoShelves healerNames={healerNames} subjectSlug={subjectSlug} />
        </div>
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import VideoPlayer from './VideoPlayer.js';
import ShelfRow from './ShelfRow.js';

const PAGE_SIZE = 24;

// Vertical video grid with progressive reveal. The server hands down a pool of
// videos and this shows them a page at a time, so "Load more" is instant rather
// than a round trip. The button disappears once the pool is exhausted.
export default function VideoGrid({ videos = [] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  if (videos.length === 0) return null;

  const shown = videos.slice(0, visible);
  const hasMore = visible < videos.length;

  return (
    <section className="min-w-0">
      <ShelfRow title="Videos" subtitle="Watch & Learn" />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {shown.map((video) => (
          <VideoPlayer key={video.id} video={video} variant="dark" />
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((prev) => prev + PAGE_SIZE)}
            className="rounded-full bg-[#7c3aed] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#7c3aed]/30 transition-all hover:bg-[#6d28d9] hover:scale-105 active:scale-95"
          >
            Load more
          </button>
        </div>
      )}
    </section>
  );
}

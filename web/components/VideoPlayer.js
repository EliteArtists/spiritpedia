'use client';

import { useState, useEffect } from 'react';

const FAV_KEY = 'favorite_videos';

// Pull the YouTube video ID out of any stored platform_url shape.
function extractId(url) {
  if (!url) return null;
  if (url.includes('v=')) return url.split('v=')[1]?.split('&')[0];
  return url.split('/').pop();
}

// Thumbnail that swaps to an inline YouTube iframe on click — streams natively
// inside the site instead of opening a new tab. Includes a floating favorite
// heart synced to localStorage.
export default function VideoPlayer({ video, variant }) {
  const [playing, setPlaying] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const videoId = extractId(video.platform_url);
  const favId = String(video.id); // stable per-row identifier

  // The default translucent-white card is tuned for the light surfaces (library,
  // healer profile). `variant="dark"` swaps in the navy surface used by the
  // homepage, where slate-900 title text would be unreadable.
  const isDark = variant === 'dark';
  const shellClass = isDark
    ? 'bg-[#111827] border border-white/10 hover:border-[#7c3aed]/60'
    : 'bg-white/20 backdrop-blur-md border border-white/30';
  const titleClass = isDark ? 'text-sm font-semibold text-white' : 'text-slate-900 font-semibold';

  // Restore favorite state from localStorage on mount.
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      setFavorited(Array.isArray(list) && list.includes(favId));
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, [favId]);

  // Toggle this video's id in/out of the favorites array. preventDefault +
  // stopPropagation keep the click from triggering the iframe play button.
  function toggleFavorite(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      const arr = Array.isArray(raw) ? raw : [];
      const next = arr.includes(favId) ? arr.filter((id) => id !== favId) : [...arr, favId];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      setFavorited(next.includes(favId));
    } catch {
      /* ignore persistence failure */
    }
  }

  return (
    <div className={`overflow-hidden rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl group ${shellClass}`}>
      <div className="relative aspect-video bg-black">
        {playing && videoId ? (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={`Play ${video.title}`}
              className="block w-full h-full"
            >
              {videoId ? (
                <img
                  src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">Video Link</div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-xl font-bold text-white">▶</div>
              </div>
            </button>

            {/* Floating favorite heart — sits above the play button (z-30) */}
            <button
              type="button"
              onClick={toggleFavorite}
              aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={favorited}
              className="absolute top-3 right-3 z-30 p-2 group/heart"
            >
              <svg
                viewBox="0 0 24 24"
                fill={favorited ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`w-6 h-6 transition-transform hover:scale-110 ${
                  favorited
                    ? 'text-red-500 drop-shadow-md'
                    : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] hover:text-red-400'
                }`}
              >
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0z" />
              </svg>
            </button>
          </>
        )}
      </div>
      <div className="p-4">
        <h4 className={`leading-snug line-clamp-2 ${titleClass}`}>{video.title}</h4>
      </div>
    </div>
  );
}

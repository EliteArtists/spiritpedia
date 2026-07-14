'use client';

import { useState, useEffect } from 'react';
import { readFavorites, toggleFavorite } from '../utils/favorites.js';

// Floating favourite heart, shared by the offering and free-resource cards.
//
// It renders as a sibling of the card's <a>, never inside it — a <button> nested
// in an anchor is invalid HTML and the browser will hoist it out, which breaks
// hydration. preventDefault/stopPropagation keep a heart click from also
// following the card's link.
export default function FavoriteHeart({ storageKey, itemId, label = 'item' }) {
  const [favorited, setFavorited] = useState(false);
  const favId = String(itemId);

  // localStorage is unreadable during SSR, so the server always renders the
  // un-favourited heart and the real state is restored on mount. Doing this in an
  // effect (rather than during render) is what keeps the two markups identical.
  useEffect(() => {
    setFavorited(readFavorites(storageKey).map(String).includes(favId));
  }, [storageKey, favId]);

  function handleToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    const next = toggleFavorite(storageKey, favId);
    if (next) setFavorited(next.includes(favId));
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={favorited ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
      aria-pressed={favorited}
      className="absolute top-3 right-3 z-30 p-2 filter drop-shadow-md"
    >
      <svg
        viewBox="0 0 24 24"
        fill={favorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-6 h-6 transition-all ${
          favorited ? 'text-red-500' : 'text-white hover:text-red-400 hover:scale-110'
        }`}
      >
        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0z" />
      </svg>
    </button>
  );
}

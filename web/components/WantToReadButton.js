'use client';

import { useEffect, useState } from 'react';
import { FAVORITE_KEYS, readFavorites, toggleFavorite } from '../utils/favorites.js';

// "Want to Read" toggle for the book detail page. Persists into the same global
// `favorited_books` array the rest of the bookshelf uses (FAVORITE_KEYS.books),
// so a book saved here shows up in My Library and on its card.
export default function WantToReadButton({ bookId }) {
  const [active, setActive] = useState(false);
  const favId = String(bookId);

  useEffect(() => {
    setActive(readFavorites(FAVORITE_KEYS.books).map(String).includes(favId));
  }, [favId]);

  function toggle() {
    const next = toggleFavorite(FAVORITE_KEYS.books, favId);
    if (next) setActive(next.map(String).includes(favId));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      className={
        active
          ? 'bg-violet-600 border-violet-600 text-white rounded-xl py-3 px-4 w-full text-center block'
          : 'bg-[#111827] hover:bg-[#1a2234] border border-white/10 text-white rounded-xl py-3 px-4 w-full text-center block'
      }
    >
      {active ? '✓ On Your List' : '+ Want to Read'}
    </button>
  );
}

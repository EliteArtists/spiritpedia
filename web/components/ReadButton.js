'use client';

import { useEffect, useState } from 'react';
import { readFavorites, toggleFavorite } from '../utils/favorites.js';

// "Mark as Read" toggle for the book detail page. Persists into a dedicated
// `read_books` array (separate from the `favorited_books` want-to-read shelf) so
// a reader can track read status independently of their saved list.
const READ_BOOKS_KEY = 'read_books';

export default function ReadButton({ bookId }) {
  const [active, setActive] = useState(false);
  const favId = String(bookId);

  useEffect(() => {
    setActive(readFavorites(READ_BOOKS_KEY).map(String).includes(favId));
  }, [favId]);

  function toggle() {
    const next = toggleFavorite(READ_BOOKS_KEY, favId);
    if (next) setActive(next.map(String).includes(favId));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      className={
        active
          ? 'bg-emerald-600 border-emerald-600 text-white rounded-xl py-3 px-4 w-full text-center block mt-2'
          : 'bg-[#111827] hover:bg-[#1a2234] border border-white/10 text-white rounded-xl py-3 px-4 w-full text-center block mt-2'
      }
    >
      {active ? '✓ Read' : 'Mark as Read'}
    </button>
  );
}

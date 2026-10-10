'use client';

import { FAVORITE_KEYS } from '../utils/favorites.js';
import { useFavorite } from '../utils/useFavorite.js';

// "Want to Read" toggle for the book detail page. Persists into the same global
// `favorited_books` array the rest of the bookshelf uses (FAVORITE_KEYS.books),
// by slug like the book card, so a book saved here shows up in My Library and
// on its card.
export default function WantToReadButton({ bookSlug }) {
  const [active, toggle] = useFavorite(FAVORITE_KEYS.books, bookSlug);

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

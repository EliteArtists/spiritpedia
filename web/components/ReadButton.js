'use client';

import { FAVORITE_KEYS } from '../utils/favorites.js';
import { useFavorite } from '../utils/useFavorite.js';

// "Mark as Read" toggle for the book detail page. Persists into a dedicated
// `read_books` array (separate from the `favorited_books` want-to-read shelf) so
// a reader can track read status independently of their saved list. Signed in,
// it syncs as content_type 'book_read'.
export default function ReadButton({ bookSlug }) {
  const [active, toggle] = useFavorite(FAVORITE_KEYS.readBooks, bookSlug);

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

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CardImage from './CardImage.js';

// Shared localStorage key holding the global array of favorited book ids.
const FAV_BOOKS_KEY = 'favorited_books';

// Oversized book cover with a hover/click synopsis popover and a persistent
// "Want to Read" favorite toggle. Rendered card-less on the homepage canvas.
export default function BookCard({ book, variant }) {
  const [open, setOpen] = useState(false);
  const [wantToRead, setWantToRead] = useState(false);

  const favId = String(book.id);

  // Restore the favorite state from the global favorited_books array on mount.
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem(FAV_BOOKS_KEY) || '[]');
      setWantToRead(Array.isArray(list) && list.includes(favId));
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, [favId]);

  // Toggle this book's id in/out of the single favorited_books array.
  function toggleWantToRead(e) {
    e.stopPropagation();
    try {
      const raw = JSON.parse(localStorage.getItem(FAV_BOOKS_KEY) || '[]');
      const arr = Array.isArray(raw) ? raw : [];
      const next = arr.includes(favId) ? arr.filter((id) => id !== favId) : [...arr, favId];
      localStorage.setItem(FAV_BOOKS_KEY, JSON.stringify(next));
      setWantToRead(next.includes(favId));
    } catch {
      /* ignore persistence failure */
    }
  }

  const hasCover = book.mock_cover_url && book.mock_cover_url !== 'NULL';

  return (
    <div className="flex flex-col items-center">
      {/* Cover + popover, wrapped whole so hovering OR clicking anywhere on the
          card routes into the internal book detail page. Hover still previews the
          synopsis on desktop. The Want to Read button stays a sibling below,
          outside this link, so it toggles save state without navigating. */}
      <Link
        href={`/books/${book.id}`}
        className="relative w-full max-w-[220px] block"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {/* A dead cover URL falls back to the same glyph a cover-less book already
            shows, rather than a broken-image icon. */}
        <CardImage
          src={hasCover ? book.mock_cover_url : null}
          alt={book.title}
          className="w-full aspect-[2/3] object-cover rounded-xl shadow-2xl transition-transform duration-300 hover:scale-105 cursor-pointer"
          fallbackEmoji="📖"
          fallbackClassName="w-full aspect-[2/3] rounded-xl bg-slate-800 flex items-center justify-center text-6xl shadow-2xl cursor-pointer"
        />

        {/* MODAL POPOVER — synopsis only. Purchase deep links live on the book
            detail page now, so the overlay carries no nested anchors. */}
        {open && (
          <div className="absolute inset-0 z-20 rounded-xl bg-slate-950/95 backdrop-blur-sm text-white p-4 flex flex-col overflow-hidden shadow-2xl border border-white/10">
            <p className="text-[11px] text-slate-200 leading-relaxed flex-1 line-clamp-6 overflow-hidden">
              {book.description || 'No synopsis available yet.'}
            </p>
          </div>
        )}
      </Link>

      {/* FUTURE FAVORITES — persistent Want to Read toggle, directly under the cover */}
      <button
        type="button"
        onClick={toggleWantToRead}
        aria-pressed={wantToRead}
        className={`mt-2 w-full px-4 py-1.5 rounded-full text-xs uppercase tracking-wider transition-all ${
          variant === 'light'
            ? wantToRead
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-medium'
              : 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 font-medium shadow-sm'
            : wantToRead
              ? 'bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-500 font-bold shadow-lg'
              : 'bg-white/10 text-white border border-white/30 hover:bg-white/20 font-bold'
        }`}
      >
        {wantToRead ? '✓ On Your List' : '+ Want to Read'}
      </button>
    </div>
  );
}

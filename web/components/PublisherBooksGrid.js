'use client';

import { useState } from 'react';
import BookCard from './BookCard.js';

// Client wrapper around the publisher's book list: renders 8 at a time and
// reveals 8 more per "Load More" press. The full list is fetched server-side and
// paginated here client-side, so there's no extra round trip per page.
const PAGE_SIZE = 8;

export default function PublisherBooksGrid({ books }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = books.slice(0, visible);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {shown.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>

      {visible < books.length && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="bg-[#111827] hover:bg-[#1a2234] border border-white/10 px-6 py-3 rounded-xl text-white text-sm font-medium transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

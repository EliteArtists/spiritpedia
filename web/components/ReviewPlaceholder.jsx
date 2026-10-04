// The review system, as it exists today: nothing but the shape of it.
//
// Lifted verbatim out of the book and video pages, which each carried their own
// copy of the same glyph and the same two blocks. Four content types now show
// it — books, videos, offerings (courses, retreats and downloads alike) and
// free resources — and four copies of identical markup is four places to miss
// when the real thing lands. The markup is unchanged; only its address is.
//
// A plain server component. Nothing here is interactive, and the one control is
// deliberately a <span> rather than a disabled <button>: it cannot be focused,
// cannot be submitted, and announces itself as text rather than as a control
// that does nothing.

// Filled-outline star glyph. Sized/coloured by the caller via className so the
// same shape serves the inline rating row and the large empty-state icon.
export function Star({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </svg>
  );
}

// The inline row that sits under a title. `className` carries the surrounding
// margin, which differs by page — the book page has no space above it, the
// video page does.
export function RatingRow({ className = 'mb-6' }) {
  return (
    <div className={className}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} className="text-gray-600 w-5 h-5 inline" />
      ))}
      <span className="text-sm text-gray-500 ml-2">Be the first to review</span>
    </div>
  );
}

// The block at the foot of the page.
export default function ReviewPlaceholder() {
  return (
    <div className="max-w-4xl mx-auto px-6 pb-16">
      <div className="border-t border-white/10 mb-10 mt-4" />
      <h2 className="text-xl font-bold text-white mb-2">Community Reviews</h2>
      <div className="flex items-center">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className="text-gray-600 w-6 h-6 inline" />
        ))}
        <span className="text-gray-500 text-sm ml-2">0 ratings</span>
      </div>

      <div className="mt-8 bg-[#111827] rounded-2xl p-8 text-center max-w-xl mx-auto">
        <Star className="w-12 h-12 text-gray-700 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Be the first to review</h3>
        <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto mb-6">
          Reviews from the Spiritpedia community will appear here. Sign in to share your thoughts.
        </p>
        <span className="inline-block px-6 py-3 bg-[#111827] text-gray-500 text-sm border border-white/10 rounded-xl cursor-not-allowed">
          Write a Review — Coming Soon
        </span>
      </div>
    </div>
  );
}

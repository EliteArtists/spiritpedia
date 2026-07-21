import CardImage from './CardImage.js';
import FavoriteHeart from './FavoriteHeart.js';
import { FAVORITE_KEYS } from '../utils/favorites.js';
import { backContextQuery } from '../utils/backContext.js';

// Compact download glyph, sized to sit inline with a button label.
export function DownloadIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// The CTA is the only thing that shifts between product types — courses enrol,
// retreats book a place, downloads grab a file, memberships join. Card layout is
// identical across all four so one component serves every shelf.
function OfferingCta({ productType }) {
  if (productType === 'download') {
    return (
      <>
        <DownloadIcon /> Get Download
      </>
    );
  }
  if (productType === 'membership') return <>Join Now &rarr;</>;
  if (productType === 'retreat') return <>Book Place &rarr;</>;
  return <>Enrol Now &rarr;</>;
}

// Dark-surface offering card for the homepage shelves (courses / retreats /
// downloads). Mirrors the healer profile's offering card layout, restyled onto
// the deep-navy canvas.
//
// The favourite heart is a sibling of the <a>, not a child — a button inside an
// anchor is invalid nesting. `group` therefore lives on the wrapper so the card's
// hover effects still reach into the link.
export default function OfferingCard({ item, healerName, from, fromTitle }) {
  return (
    <div className="group relative h-full">
      <a
        href={`/offerings/${item.slug}${backContextQuery(from, fromTitle)}`}
        className="flex h-full flex-col rounded-2xl overflow-hidden bg-[#111827] border border-white/10 shadow-lg hover:border-[#7c3aed]/60 hover:shadow-2xl group-hover:-translate-y-1 transition-all"
      >
        {/* Cover image + price badge. The badge sits left because the heart owns
            the top-right corner across every card type on the site. */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/40">
          {/* A dead cover URL falls back to the same glyph a cover-less offering
              already shows, rather than a broken-image icon on a paid product. */}
          <CardImage
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            fallbackEmoji="🎓"
            fallbackClassName="w-full h-full flex items-center justify-center text-5xl"
          />
          {item.price && (
            <span className="absolute top-3 left-3 bg-[#f59e0b] text-[#78350f] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg max-w-[60%] truncate">
              {item.price}
            </span>
          )}
        </div>

        {/* Title + healer + synopsis + CTA */}
        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">{item.title}</h3>
          {healerName && <p className="mt-1 text-xs text-gray-400">{healerName}</p>}
          {item.description && (
            <p className="mt-2 text-sm text-gray-300 leading-relaxed line-clamp-2 flex-1">
              {item.description}
            </p>
          )}
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-[#7c3aed] group-hover:text-[#a78bfa] transition-colors">
            <OfferingCta productType={item.product_type} />
          </span>
        </div>
      </a>

      <FavoriteHeart storageKey={FAVORITE_KEYS.courses} itemId={item.id} label={item.title} />
    </div>
  );
}

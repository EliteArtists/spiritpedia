import CardImage from './CardImage.js';
import FavoriteHeart from './FavoriteHeart.js';
import { FAVORITE_KEYS } from '../utils/favorites.js';
import { backContextQuery } from '../utils/backContext.js';

// Turn a stored resource_type ('mini_course') into a badge label ('MINI COURSE').
function formatType(resourceType) {
  if (!resourceType) return 'Free';
  return resourceType.replace(/_/g, ' ');
}

// Dark-surface card for the "Free Resources" shelf: cover image, resource_type
// badge, title, the healer who published it, and a CTA out to resource_url.
//
// The favourite heart is a sibling of the <a>, not a child — a button inside an
// anchor is invalid nesting. `group` therefore lives on the wrapper so the card's
// hover effects still reach into the link.
export default function FreeResourceCard({ item, healerName, from, fromTitle }) {
  return (
    <div className="group relative h-full">
      <a
        href={`/free-resources/${item.slug}${backContextQuery(from, fromTitle)}`}
        className="flex h-full flex-col rounded-2xl overflow-hidden bg-[#111827] border border-white/10 shadow-lg hover:border-[#7c3aed]/60 hover:shadow-2xl group-hover:-translate-y-1 transition-all"
      >
        {/* Cover image + resource type badge. The badge sits left because the
            heart owns the top-right corner across every card type on the site. */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/40">
          {/* A dead cover URL falls back to the same glyph a cover-less resource
              already shows, rather than a broken-image icon. */}
          <CardImage
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            fallbackEmoji="✨"
            fallbackClassName="w-full h-full flex items-center justify-center text-5xl"
          />
          <span className="absolute top-3 left-3 bg-[#f59e0b] text-[#78350f] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg">
            {formatType(item.resource_type)}
          </span>
        </div>

        {/* Title + healer + CTA */}
        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">{item.title}</h3>
          {healerName && <p className="mt-1 text-xs text-gray-400">{healerName}</p>}
          {item.description && (
            <p className="mt-2 text-sm text-gray-300 leading-relaxed line-clamp-2 flex-1">
              {item.description}
            </p>
          )}
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-[#7c3aed] group-hover:text-[#a78bfa] transition-colors">
            Get It Free &rarr;
          </span>
        </div>
      </a>

      <FavoriteHeart storageKey={FAVORITE_KEYS.freeResources} itemId={item.id} label={item.title} />
    </div>
  );
}

import PublisherLogo from './PublisherLogo.jsx';
import FavoriteHeart from './FavoriteHeart.js';
import { FAVORITE_KEYS } from '../utils/favorites.js';
import ListingBadges from './ListingBadges.jsx';

// Publishing house card for the homepage shelf.
//
// Logos are supplied as external images of every shape and background, so the
// artwork sits contained on its own panel rather than filling the frame the way
// a portrait or book cover does — cropping a wordmark would make it unreadable.
export default function PublisherCard({ publisher, authorCount = 0 }) {
  const meta = [
    authorCount > 0 ? `${authorCount} ${authorCount === 1 ? 'author' : 'authors'}` : null,
    publisher.founded_year ? `Founded ${publisher.founded_year}` : null,
  ]
    .filter(Boolean)
    .join(' · ') || 'Independent press'; // always one line, so cards line up

  return (
    // The heart is a SIBLING of the link, never inside it — a button nested in
    // an anchor is invalid HTML and the browser hoists it out, breaking
    // hydration. Same arrangement as every other card.
    <div className="group relative h-full">
      <a
        href={`/publishers/${publisher.slug}`}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-lg transition-all hover:-translate-y-1 hover:border-[#7c3aed]/60 hover:shadow-2xl"
      >
        {/* The logo on its light panel (PublisherLogo), inset in the card's
            own ground. Padded at the sides so it never sits under the tier
            badge or the heart. */}
        <div className="relative aspect-[16/9] w-full p-3">
          {/* Top left, as on every card: its tier (Superstar, Shining Star,
              Rising Star) and ✓ Verified. The heart owns top right. */}
          <ListingBadges
            listing={publisher}
            entityType="publisher"
            placement="below"
            align="left"
            className="absolute top-5 left-5 z-10"
          />
          {/* Absolutely placed so the logo's own size can never stretch the
              panel: every card keeps the same 16:9 top. */}
          <PublisherLogo publisher={publisher} className="absolute inset-3" padding="px-12 pt-9 pb-4" />
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-sm font-semibold leading-snug text-white">{publisher.name}</h3>
          <p className="mt-1 text-xs text-gray-400">{meta}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-[#7c3aed] transition-colors group-hover:text-[#a78bfa]">
            View Publisher &rarr;
          </span>
        </div>
      </a>

      <FavoriteHeart
        storageKey={FAVORITE_KEYS.publishers}
        itemId={publisher.slug}
        label={publisher.name}
        // Slate rather than white: this heart sits on the white logo panel.
        idleClassName="text-slate-400 hover:text-red-400 hover:scale-110"
      />
    </div>
  );
}

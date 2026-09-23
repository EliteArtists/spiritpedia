import CardImage from './CardImage.js';
import FavoriteHeart from './FavoriteHeart.js';
import { FAVORITE_KEYS } from '../utils/favorites.js';

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
    .join(' · ');

  return (
    // The heart is a SIBLING of the link, never inside it — a button nested in
    // an anchor is invalid HTML and the browser hoists it out, breaking
    // hydration. Same arrangement as every other card.
    <div className="group relative h-full">
      <a
        href={`/publishers/${publisher.slug}`}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-lg transition-all hover:-translate-y-1 hover:border-[#7c3aed]/60 hover:shadow-2xl"
      >
        {/* A light panel so dark wordmarks stay legible — most publisher logos
            are black-on-white, which would disappear against the card's own
            ground. The logo is padded right so it never sits under the heart. */}
        <div className="flex aspect-[16/9] w-full items-center justify-center bg-white p-5 pr-12">
          <CardImage
            src={publisher.logo_url}
            alt={publisher.name}
            className="max-h-full max-w-full object-contain"
            fallbackEmoji="📚"
            fallbackClassName="flex h-full w-full items-center justify-center text-4xl"
          />
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-sm font-semibold leading-snug text-white">{publisher.name}</h3>
          {meta && <p className="mt-1 text-xs text-gray-400">{meta}</p>}
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

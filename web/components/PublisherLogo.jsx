import CardImage from './CardImage.js';

// A publisher's logo, the same way everywhere (the card and the page): on a
// white, rounded, padded panel (white because most logos come on white),
// contained and centred, never stretched or cropped. Logos arrive in every
// shape and colour — black wordmarks, pale lilac ones, wide banners, square
// icons — and the light panel keeps them readable against the dark ground.
// The app mirrors this (PublisherLogo in app/lib/shared/widgets/cards.dart).
export default function PublisherLogo({ publisher, className = '', padding = 'p-4' }) {
  const initial = (publisher?.name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5 ${padding} ${className}`}
    >
      {publisher?.logo_url ? (
        <CardImage
          src={publisher.logo_url}
          alt={publisher.name}
          className="max-h-full max-w-full object-contain"
          fallbackEmoji={initial}
          fallbackClassName="text-4xl font-bold text-violet-500"
        />
      ) : (
        <span className="text-4xl font-bold text-violet-500" aria-hidden="true">
          {initial}
        </span>
      )}
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';

// Card artwork that survives a dead image URL.
//
// onError alone is not enough for a server-rendered <img>: the browser starts
// fetching from the SSR'd HTML immediately, so a dead URL can fail BEFORE React
// hydrates and attaches its handler. The error event then fires on a bare DOM
// node with nothing listening, React never hears about it, and the card is stuck
// showing a broken-image icon forever. (Reproduced in a production build — dev
// hydrates fast enough to mask it.) The ref below runs at commit and re-checks an
// image that already finished loading; onError covers everything that fails after.
//
// Two shapes of fallback, because the cards want different things:
//   fallbackSrc   — swap in a replacement image (healer portraits → placeholder)
//   fallbackEmoji — render a glyph instead (offerings → 🎓, resources → ✨)
export default function CardImage({
  src,
  alt,
  className = '',
  fallbackSrc,
  fallbackEmoji,
  fallbackClassName = '',
}) {
  // Holds the src that FAILED, not a bare boolean. A boolean would stay latched:
  // the homepage re-seeds a healer's portrait per subject filter, so an ordinary
  // pill click hands the card a fresh, perfectly good URL that a stuck flag would
  // keep hidden behind the placeholder. Comparing the failed src against the
  // current one self-heals on its own, with no reset effect.
  const [failedSrc, setFailedSrc] = useState(null);

  // Guarded on `src`: if the FALLBACK image is itself broken we must not record
  // it as the failure, or `failed` would flip back to false, re-show the original
  // dead src, and ping-pong between the two forever.
  const captureBrokenImage = useCallback(
    (node) => {
      if (!node || !src) return;
      if (node.getAttribute('src') !== src) return;
      if (node.complete && node.naturalWidth === 0) setFailedSrc(src);
    },
    [src]
  );

  const failed = Boolean(src) && failedSrc === src;
  const shownSrc = !src || failed ? fallbackSrc : src;

  // No usable image and no replacement image — fall back to the glyph.
  if (!shownSrc) {
    return (
      <div className={fallbackClassName} role="img" aria-label={alt}>
        {fallbackEmoji}
      </div>
    );
  }

  return (
    <img
      ref={captureBrokenImage}
      src={shownSrc}
      alt={alt}
      // Idempotent: if the fallback image also 404s this re-sets the same value,
      // so the component settles on the fallback rather than looping.
      onError={() => setFailedSrc(src)}
      className={className}
    />
  );
}

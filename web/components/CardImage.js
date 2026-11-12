'use client';

import { useState } from 'react';
import { isPlaceholderImage } from '../utils/brokenImages.js';

// The neutral Spiritpedia tile, the last step of an item's fallback.
export const NEUTRAL_SYMBOL = '/Transparent_Symbol.png';

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
// Three shapes of fallback, because the cards want different things:
//   fallbackSrc     — swap in a replacement image (healer portraits →
//                     placeholder); a list is tried in order (an item → its
//                     teacher's photos)
//   fallbackNeutral — then the neutral Spiritpedia tile (books, offerings,
//                     resources; owner, 12 Nov 2026)
//   fallbackEmoji   — or a glyph
// A stand-in such as Goodreads' "no cover" counts as failed from the start.
export default function CardImage({
  src,
  alt,
  className = '',
  fallbackSrc,
  fallbackNeutral = false,
  fallbackEmoji,
  fallbackClassName = '',
}) {
  // The sources in order: the item's own, then each fallback. A dead one is
  // skipped by recording it in `failed`, keyed on the whole list, so a card
  // handed fresh URLs (the homepage re-seeds portraits per subject filter)
  // starts over instead of staying latched on an old failure.
  const sources = [src, ...[].concat(fallbackSrc || [])].filter((u) => u && !isPlaceholderImage(u));
  const key = sources.join('\n');
  const [failed, setFailed] = useState({ key, urls: [] });
  const dead = failed.key === key ? failed.urls : [];
  const shownSrc = sources.find((u) => !dead.includes(u)) || null;

  const markFailed = (url) => setFailed((f) => ({ key, urls: [...(f.key === key ? f.urls : []), url] }));

  // Guarded on the src we rendered, so a stale node can't mark the next one.
  // (Left to the React Compiler to memoise.)
  const captureBrokenImage = (node) => {
    if (!node || !shownSrc) return;
    if (node.getAttribute('src') !== shownSrc) return;
    if (node.complete && node.naturalWidth === 0) markFailed(shownSrc);
  };

  // Nothing usable left: the neutral tile, or the glyph.
  if (!shownSrc) {
    if (fallbackNeutral) {
      return (
        <div className={`${fallbackClassName} bg-gradient-to-br from-[#1e1b4b] to-[#0f172a]`} role="img" aria-label={alt}>
          <img src={NEUTRAL_SYMBOL} alt="" className="w-2/5 max-w-[120px] opacity-80" loading="lazy" decoding="async" />
        </div>
      );
    }
    return (
      <div className={fallbackClassName} role="img" aria-label={alt}>
        {fallbackEmoji}
      </div>
    );
  }

  return (
    <img
      referrerPolicy="no-referrer"
      ref={captureBrokenImage}
      src={shownSrc}
      alt={alt}
      // Every card image is below the fold on arrival — the homepage alone
      // renders hundreds of them. Deferring the fetch until each is near the
      // viewport is the single biggest saving available here, and it changes
      // nothing visually.
      loading="lazy"
      decoding="async"
      // Each failure moves one step down the list, and the list only gets
      // shorter, so it settles rather than looping.
      onError={() => markFailed(shownSrc)}
      className={className}
    />
  );
}

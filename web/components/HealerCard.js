'use client';

import { useState, useEffect, useCallback } from 'react';

// Shared localStorage key holding the global array of favorited healer ids.
const FAV_HEALERS_KEY = 'favorited_healers';

// Served from /public, so the fallback survives exactly the conditions that kill
// the portrait: a dead third-party CDN, an offline network, a blocked host. A
// remote placeholder service would be one more link in the same broken chain.
const DEFAULT_AVATAR = '/avatar-placeholder.svg';

// Practitioner media card with a floating favorite heart. `portrait` is usually
// computed server-side (homepage rotator); when omitted (e.g. the library view)
// it falls back to the healer's first image or a generic avatar.
export default function HealerCard({ healer, portrait }) {
  const [favorited, setFavorited] = useState(false);

  // Holds the src that FAILED, rather than a bare boolean. A dead portrait only
  // reveals itself when the browser gives up loading it, so the swap has to
  // happen from onError at runtime — but a boolean would then stay latched: the
  // homepage re-seeds `portrait` per subject filter, so an ordinary pill click
  // hands this card a fresh, perfectly good URL that a stuck flag would keep
  // hidden behind the placeholder. Comparing the failed src against the current
  // one self-heals on its own, with no reset effect.
  const [imageError, setImageError] = useState(null);

  const favId = healer.healer_slug || String(healer.id);
  const resolvedSrc =
    portrait || (Array.isArray(healer.image_urls) && healer.image_urls[0]) || DEFAULT_AVATAR;
  const imgSrc = imageError === resolvedSrc ? DEFAULT_AVATAR : resolvedSrc;

  // onError alone is not enough for a server-rendered <img>. The browser starts
  // fetching the portrait from the SSR'd HTML immediately, so a dead URL can fail
  // BEFORE React hydrates and attaches its handler — the error event fires on a
  // bare DOM node with nothing listening, React never hears about it, and the card
  // stays on a broken-image icon forever. (Observed in a production build; dev
  // hydrates fast enough to hide it.)
  //
  // This ref runs at commit and re-checks an image that has already finished
  // loading: complete && naturalWidth === 0 is precisely "it failed". onError then
  // covers everything that fails after hydration.
  const captureBrokenImage = useCallback((node) => {
    if (node && node.complete && node.naturalWidth === 0) {
      setImageError(node.getAttribute('src'));
    }
  }, []);

  // Restore favorite state from the global favorited_healers array on mount.
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem(FAV_HEALERS_KEY) || '[]');
      setFavorited(Array.isArray(list) && list.includes(favId));
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, [favId]);

  // Toggle this healer (Superhero or Local Hero) in/out of favorited_healers.
  function toggleFavorite(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = JSON.parse(localStorage.getItem(FAV_HEALERS_KEY) || '[]');
      const arr = Array.isArray(raw) ? raw : [];
      const next = arr.includes(favId) ? arr.filter((id) => id !== favId) : [...arr, favId];
      localStorage.setItem(FAV_HEALERS_KEY, JSON.stringify(next));
      setFavorited(next.includes(favId));
    } catch {
      /* ignore persistence failure */
    }
  }

  return (
    <div className="relative w-full h-72 rounded-2xl overflow-hidden bg-slate-900 shadow-lg group">
      <a href={`/healers/${healer.healer_slug}`} className="block w-full h-full cursor-pointer">
        {/* Edge-to-edge media with a micro-zoom on hover */}
        <img
          ref={captureBrokenImage}
          src={imgSrc}
          alt={healer.name}
          onError={() => setImageError(resolvedSrc)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Floating text overlay anchored to the baseline */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-16 flex items-center justify-between z-10">
          <h3 className="text-white font-bold text-lg drop-shadow-sm">{healer.name}</h3>
          {healer.tier === 'superhero' ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-600 border border-amber-300">
              Superhero
            </span>
          ) : healer.tier === 'luminary' ? (
            <span className="bg-violet-600 text-white font-bold text-[11px] tracking-wider uppercase px-2.5 py-1 rounded-md shadow-sm">
              LUMINARY
            </span>
          ) : (
            <span className="bg-emerald-500 text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md shadow-sm">
              Local Hero
            </span>
          )}
        </div>
      </a>

      {/* Floating favorite heart — sits above the link (z-30) */}
      <button
        type="button"
        onClick={toggleFavorite}
        aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
        aria-pressed={favorited}
        className="absolute top-3 right-3 z-30 p-2 filter drop-shadow-md group/healerheart"
      >
        <svg
          viewBox="0 0 24 24"
          fill={favorited ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-6 h-6 transition-all ${
            favorited ? 'text-red-500 scale-100' : 'text-white hover:text-red-400 hover:scale-110'
          }`}
        >
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0z" />
        </svg>
      </button>
    </div>
  );
}

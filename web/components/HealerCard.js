'use client';

import { useState, useEffect } from 'react';
import CardImage from './CardImage.js';
import { formatLifespan, LIFESPAN_BADGE_CLASS } from '../utils/lifespan.js';

// Shared localStorage key holding the global array of favorited healer ids.
const FAV_HEALERS_KEY = 'favorited_healers';

// Served from /public, so the fallback survives exactly the conditions that kill
// the portrait: a dead third-party CDN, an offline network, a blocked host. A
// remote placeholder service would be one more link in the same broken chain.
const DEFAULT_AVATAR = '/avatar-placeholder.svg';

// Rotating cards advance every 5s with a 1.5s opacity fade (the duration-[1500ms]
// class on each frame) — the same cadence as HeroImageRotator.
const ROTATE_MS = 5000;

// Practitioner media card with a floating favorite heart. `portrait` is usually
// computed server-side (homepage rotator); when omitted (e.g. the library view)
// it falls back to the healer's first image or a generic avatar. `heightClass`
// lets a shelf run a taller card (the Timeless Teachers shelf pairs a wider
// track with h-[420px]) without a second card component.
//
// `rotate` turns the artwork into a slow crossfade through every portrait in
// image_urls — HeroImageRotator's pattern, stacked frames fading in place. With
// one image (or none) it renders the static card exactly as before, so the prop
// is safe to pass for a whole shelf.
export default function HealerCard({ healer, portrait, heightClass = 'h-72', rotate = false }) {
  const [favorited, setFavorited] = useState(false);

  const favId = healer.healer_slug || String(healer.id);
  const imgSrc = portrait || (Array.isArray(healer.image_urls) && healer.image_urls[0]) || null;
  const isAscended = healer.tier === 'ascended_master';

  const frames = rotate && Array.isArray(healer.image_urls) ? healer.image_urls.filter(Boolean) : [];
  const rotating = frames.length > 1;
  const [frame, setFrame] = useState(0);

  // Start each rotating card on a random frame so a shelf of them does not
  // fade in lockstep. Done in an effect, not during render, so the server and
  // client agree on frame 0 at hydration.
  useEffect(() => {
    if (rotating) setFrame(Math.floor(Math.random() * frames.length));
  }, [rotating, frames.length]);

  useEffect(() => {
    if (!rotating) return undefined;
    const timer = setInterval(() => setFrame((prev) => (prev + 1) % frames.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [rotating, frames.length]);

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
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden bg-slate-900 shadow-lg group`}>
      <a href={`/healers/${healer.healer_slug}`} className="block w-full h-full cursor-pointer">
        {/* Edge-to-edge media with a micro-zoom on hover. Rotating cards stack
            every portrait and fade between them; the hover zoom is moved to
            the wrapper so the whole stack scales together. */}
        {rotating ? (
          <div className="w-full h-full transition-transform duration-500 group-hover:scale-105">
            {frames.map((src, i) => (
              <CardImage
                key={src}
                src={src}
                alt={healer.name}
                fallbackSrc={DEFAULT_AVATAR}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity ease-in-out duration-[1500ms] ${
                  i === frame ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </div>
        ) : (
          <CardImage
            src={imgSrc}
            alt={healer.name}
            fallbackSrc={DEFAULT_AVATAR}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {/* Ascended Masters wear their lifespan, not a tier label, and it sits
            top-left of the card (the heart owns top-right) rather than in the
            baseline bar. No pill at all when no years are recorded. */}
        {isAscended && formatLifespan(healer) && (
          <span className={`absolute top-3 left-3 z-10 ${LIFESPAN_BADGE_CLASS}`}>
            {formatLifespan(healer)}
          </span>
        )}

        {/* Floating text overlay anchored to the baseline. Name left + tier pill
            right for every tier except Ascended Masters, whose name sits alone
            on the right. */}
        <div
          className={`absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-16 flex items-center z-10 ${
            isAscended ? 'justify-end text-right' : 'justify-between'
          }`}
        >
          <h3 className="text-white font-bold text-lg drop-shadow-sm">{healer.name}</h3>
          {healer.tier === 'superhero' ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-600 border border-amber-300">
              Superhero
            </span>
          ) : isAscended ? null : healer.tier === 'luminary' ? (
            <span className="bg-violet-600 text-white font-bold text-[11px] tracking-wider uppercase px-2.5 py-1 rounded-md shadow-sm">
              LUMINARY
            </span>
          ) : healer.tier === 'local_hero' ? (
            <span className="bg-emerald-500 text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md shadow-sm">
              Local Hero
            </span>
          ) : (
            // Unknown or NULL tier — a neutral badge rather than borrowing Local
            // Hero's, so a tier added to the database before the UI is visibly
            // unstyled instead of silently mislabelled.
            <span className="bg-gray-500 text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md shadow-sm">
              Teacher
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

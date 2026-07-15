'use client';

import { useEffect, useState } from 'react';

const ROTATE_MS = 5000;
const FADE_MS = 1500;

// Cinematic crossfade hero for the healer profile. The healer's image_urls array
// holds up to three portraits; this component stacks them absolutely and fades
// between them every 5 seconds (1.5s opacity transition), cycling 0 → 1 → 2 → 0.
//
// It is a client component purely so the rotation timer and the active-dot state
// can live somewhere. The overlay copy (back link, tier badge, name) is handed in
// as `children` and painted above the images and gradient, while the dot
// indicators are owned here because only this component knows the active index.
//
// With a single image the timer never arms and no dots render, so a healer with
// one portrait — or none — never shows a broken frame or a lone useless dot.
export default function HeroImageRotator({ images = [], alt = '', children }) {
  const frames = Array.isArray(images) ? images.filter(Boolean).slice(0, 3) : [];
  const [index, setIndex] = useState(0);

  // Auto-advance only when there is more than one frame to cross into. Re-arming
  // on `index` is harmless here (there are no manual controls) but keeps the
  // interval and the rendered index in lockstep.
  useEffect(() => {
    if (frames.length < 2) return undefined;
    const timer = setInterval(
      () => setIndex((prev) => (prev + 1) % frames.length),
      ROTATE_MS
    );
    return () => clearInterval(timer);
  }, [frames.length]);

  return (
    <section className="relative w-full h-[70vh] overflow-hidden bg-[#0a0f1d]">
      {/* IMAGE STACK — every frame is absolutely positioned and full-bleed; only
          the active one sits at opacity-100, the rest fade to opacity-0 over
          1.5s. object-cover fills the frame regardless of the source aspect. */}
      {frames.length > 0 ? (
        frames.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={alt}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDuration: `${FADE_MS}ms` }}
          />
        ))
      ) : (
        // No portrait on file — a deep-navy field rather than a broken image.
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b] to-[#0a0f1d]" />
      )}

      {/* Left-to-right darkening so the bottom-left copy always lands on a legible
          field, feathering out to transparent on the right. */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

      {/* Overlay copy — positioned by the page relative to this fixed frame. */}
      <div className="absolute inset-0 z-10">{children}</div>

      {/* Active-image indicator dots — bottom-centre, matching the homepage
          billboard. Only rendered when there is genuinely more than one frame. */}
      {frames.length > 1 && (
        <div className="absolute bottom-6 left-0 z-20 flex w-full justify-center gap-2 px-8">
          {frames.map((src, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-6 bg-[#7c3aed]' : 'w-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

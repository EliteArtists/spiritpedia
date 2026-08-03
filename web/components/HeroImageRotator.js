'use client';

import { useEffect, useState } from 'react';

const ROTATE_MS = 5000;
const FADE_MS = 1500;

// Contained portrait rotator for the healer profile hero. The healer's
// image_urls array holds up to three portraits; this component stacks them
// absolutely inside a fixed, rounded frame and fades between them every 5
// seconds (1.5s opacity transition), cycling 0 → 1 → 2 → 0.
//
// It replaces the previous full-bleed cinematic banner. That version stretched
// one image across the viewport, which only ever flattered a minority of the
// catalogue — wide press shots survived, ordinary portraits got cropped through
// the face. A fixed 2:3-ish frame gives every healer the same predictable
// crop regardless of what their source photo happens to be.
//
// It is a client component purely so the rotation timer and the active-dot
// state can live somewhere. The dots sit BELOW the frame rather than over the
// image, so they never cover a face.
//
// With a single image the timer never arms and no dots render, so a healer with
// one portrait — or none — never shows a broken frame or a lone useless dot.
export default function HeroImageRotator({ images = [], alt = '' }) {
  const frames = Array.isArray(images) ? images.filter(Boolean).slice(0, 3) : [];
  const [index, setIndex] = useState(0);

  // Auto-advance only when there is more than one frame to cross into.
  useEffect(() => {
    if (frames.length < 2) return undefined;
    const timer = setInterval(
      () => setIndex((prev) => (prev + 1) % frames.length),
      ROTATE_MS
    );
    return () => clearInterval(timer);
  }, [frames.length]);

  return (
    <div className="w-full">
      {/* PORTRAIT FRAME — fixed height so every profile in the directory shares
          one silhouette, and overflow-hidden so the rounding actually clips the
          image stack rather than just the container. */}
      <div className="relative h-[300px] md:h-[500px] w-full overflow-hidden rounded-2xl bg-[#111827]">
        {frames.length > 0 ? (
          frames.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={alt}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out ${
                i === index ? 'opacity-100' : 'opacity-0'
              }`}
              // object-position center-top (20%) keeps heads and faces in frame:
              // portraits are cropped from the top fifth rather than dead centre,
              // so a subject's head is never sliced off across responsive widths.
              style={{ objectPosition: 'center 20%', transitionDuration: `${FADE_MS}ms` }}
            />
          ))
        ) : (
          // No portrait on file — a deep-navy field rather than a broken image.
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b] to-[#0a0f1d]" />
        )}
      </div>

      {/* Active-image indicator dots — beneath the frame, centred on it. Only
          rendered when there is genuinely more than one frame to indicate. */}
      {frames.length > 1 && (
        <div className="mt-4 flex justify-center gap-2">
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
    </div>
  );
}

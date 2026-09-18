'use client';

import { useEffect, useRef, useState } from 'react';
import { formatLifespan } from '../utils/lifespan.js';

const ROTATE_MS = 8000;
const BIO_CHARS = 120;

// Trim the bio to the billboard's 120-character budget without slicing a word in
// half, and only append an ellipsis when text was actually dropped.
function truncateBio(bio) {
  if (!bio) return '';
  if (bio.length <= BIO_CHARS) return bio;
  const cut = bio.slice(0, BIO_CHARS);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// Full-bleed rotating feature for the Superhero and Ascended Master tiers.
// Renders server-side at index 0, then on mount jumps to a random healer — doing
// the randomisation in an effect rather than during render keeps the server and
// client markup identical, so a fresh face on every page load costs no
// hydration mismatch.
export default function HeroBillboard({ healers = [] }) {
  const [index, setIndex] = useState(0);
  const dotsRef = useRef(null);

  useEffect(() => {
    if (healers.length > 1) setIndex(Math.floor(Math.random() * healers.length));
  }, [healers.length]);

  // Auto-advance. Re-arming on `index` means a dot click also resets the timer,
  // so a manually chosen slide gets its full 8 seconds on screen.
  useEffect(() => {
    if (healers.length < 2) return undefined;
    const timer = setTimeout(
      () => setIndex((prev) => (prev + 1) % healers.length),
      ROTATE_MS
    );
    return () => clearTimeout(timer);
  }, [index, healers.length]);

  // Keep the active dot in view. With 50+ Superheroes the dot row is wider
  // than a phone screen and scrolls horizontally; on desktop it fits, the
  // guard is false, and nothing happens. scrollLeft is set directly rather
  // than via scrollIntoView, which would also scroll the page vertically to
  // the billboard on every 8s rotation once the visitor has scrolled past it.
  useEffect(() => {
    const row = dotsRef.current;
    if (!row || row.scrollWidth <= row.clientWidth) return;
    const dot = row.querySelector('[aria-current="true"]');
    if (!dot) return;
    row.scrollLeft = dot.offsetLeft - row.clientWidth / 2 + dot.offsetWidth / 2;
  }, [index]);

  if (healers.length === 0) return null;

  const healer = healers[index % healers.length];
  const portrait = Array.isArray(healer.image_urls) ? healer.image_urls.find(Boolean) : null;

  return (
    // FIXED FRAME — a deterministic height rather than a min-height. The
    // billboard's content (name length, bio length, dot count) varies per healer,
    // and with a min-height each rotation resized the frame and shunted every
    // shelf below it up or down. A fixed height means the 8s rotation never moves
    // a pixel outside this box; the clamps below keep the copy inside it.
    //
    // MOBILE (below md) is a 300px frame — the same height as the profile page's
    // portrait rotator — so the billboard no longer swallows most of a phone
    // screen. Every mobile-only class below restates the desktop value under
    // md:, so desktop renders exactly as it did at 450px.
    <section className="relative w-full h-[300px] md:h-[450px] overflow-hidden rounded-3xl bg-[#111827] border border-white/10">
      {/* Portrait sits on the right; the gradient sweeps in from the left edge so
          the copy always lands on a dark, legible field. On mobile the portrait
          keeps to the right 3/5 too (it used to stretch full-width, which put
          the face directly under the headline) and is cropped at center 20% —
          the profile rotator's setting — so the head stays in frame at 300px. */}
      <div className="absolute inset-y-0 right-0 w-3/5">
        {portrait ? (
          <img
            key={portrait}
            src={portrait}
            alt={healer.name}
            className="w-full h-full object-cover object-[center_20%] md:object-top"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1e1b4b] to-[#0a0f1d]" />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1d] via-[#0a0f1d]/90 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#7c3aed]/40 via-transparent to-transparent" />

      {/* Copy block — h-full/max-h-full pins it to the fixed frame, and
          overflow-hidden means an unusually long name or bio is clipped rather
          than pushing the CTA out through the bottom edge. */}
      <div className="relative z-10 flex h-full max-h-full flex-col justify-center gap-2 md:gap-4 overflow-hidden p-5 pb-10 md:p-14 md:pb-16 max-w-[75%] md:max-w-[55%]">
        {/* Superheroes wear the amber tier pill above the name. Ascended
            Masters get no pill — their lifespan sits beneath the name instead
            (below), or nothing at all when no years are recorded. */}
        {healer.tier === 'superhero' && (
          <span className="shrink-0 self-start rounded-full bg-[#fef08a] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#78350f]">
            Superhero
          </span>
        )}

        {/* A two-line name would eat the bio's space and shift the CTA, so the
            headline is hard-clamped to one line. */}
        <h2 className="line-clamp-1 text-2xl md:text-6xl font-bold leading-tight text-white drop-shadow-lg">
          {healer.name}
        </h2>

        {healer.tier === 'ascended_master' && formatLifespan(healer) && (
          <p className="shrink-0 self-start -mt-1 md:-mt-2 rounded-full bg-black/30 backdrop-blur-sm px-3 py-1 text-sm font-light tracking-widest text-white/60">
            {formatLifespan(healer)}
          </p>
        )}

        {/* truncateBio caps the character count; line-clamp-3 caps the rendered
            height, which is what actually protects the layout at narrow widths
            where 120 characters can still wrap past three lines. */}
        {healer.bio && (
          <p className="line-clamp-2 md:line-clamp-3 max-w-xl text-sm md:text-base leading-relaxed text-gray-300">
            {truncateBio(healer.bio)}
          </p>
        )}

        <a
          href={`/healers/${healer.healer_slug}`}
          className="mt-1 md:mt-2 shrink-0 self-start rounded-full bg-[#7c3aed] px-5 py-2 md:px-7 md:py-3 text-sm font-bold text-white shadow-lg shadow-[#7c3aed]/30 transition-all hover:bg-[#6d28d9] hover:scale-105 active:scale-95"
        >
          View Profile &rarr;
        </a>
      </div>

      {/* Carousel dots. The outer row scrolls horizontally with its scrollbar
          hidden; the inner w-max track centres itself (mx-auto) when it fits —
          desktop — and left-aligns to scroll when it does not — phones, where
          50+ dots would otherwise be flex-shrunk to nothing. shrink-0 on each
          dot is what stops that collapse. */}
      {healers.length > 1 && (
        <div
          ref={dotsRef}
          className="absolute bottom-3 md:bottom-5 left-0 z-20 w-full overflow-x-auto px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="mx-auto flex w-max gap-2">
            {healers.map((h, i) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show ${h.name}`}
                aria-current={i === index}
                className={`h-1.5 shrink-0 rounded-full transition-all ${
                  i === index ? 'w-6 bg-[#7c3aed]' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

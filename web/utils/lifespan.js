// Format a healer's lifespan for display. Ascended Masters carry birth_year and
// death_year (both optional integers); everyone else has neither.
//   both years   → "1931 — 2015"
//   birth only   → "b. 1931"
//   neither      → null (callers render nothing)
// Shared by HealerCard, the profile TierBadge and the hero billboard so the
// three surfaces can never drift in format.
export function formatLifespan(healer) {
  if (!healer?.birth_year) return null;
  return healer.death_year ? `${healer.birth_year} — ${healer.death_year}` : `b. ${healer.birth_year}`;
}

// The reverent pill the lifespan sits in on cards and profiles. A translucent
// black ground with backdrop blur keeps the years legible over light and dark
// portraits alike — white/10 vanished on bright black-and-white photos.
export const LIFESPAN_BADGE_CLASS =
  'inline-block rounded-full border border-white/20 bg-black/30 backdrop-blur-sm px-3 py-1 text-xs font-light tracking-widest text-white';

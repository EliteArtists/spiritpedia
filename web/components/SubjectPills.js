'use client';

import { useState } from 'react';

// 5-Pillar taxonomy: clusters database subject slugs under Master Keys for the
// pill navigation. Order here is the order the pills render in.
export const SUBJECT_TAXONOMY = {
  'Emotional Healing': [
    'shadow-work', 'self-healing', 'eft-tapping', 'breathwork', 'reiki', 'energy-medicine', 'conscious-relationships', 'quantum-touch',
  ],
  Consciousness: [
    'consciousness', 'conscious-science', 'spiritual-awakening', 'non-duality', 'meditation', 'mindfulness', 'astrology', 'spirituality',
  ],
  'Manifestation & Creation': [
    'manifestation', 'law-of-attraction', 'soul-purpose', 'human-design', 'life-coaching',
  ],
  'Mystical & Spiritual Exploration': [
    'akashic-records', 'mediumship-spirits', 'death-the-afterlife', 'dreamwork', 'mysticism', 'shamanism',
  ],
  'Body & Energy': [
    'tai-chi', 'qi-gong', 'yoga', 'ayurveda', 'sound-healing', 'plant-medicine', 'homeopathy',
  ],
};

// Horizontally scrolling pill row with a sub-subject dropdown per pillar.
//
// The dropdown is a true overlay: it is absolutely positioned against the
// `relative` wrapper below — NOT against the scroll track, because an overflow-x
// container also clips vertically and a panel nested inside the track would be
// guillotined at the pills' baseline. Anchoring one level up gets the float
// without the clip, so opening a pillar paints the panel *over* the Hero
// Billboard instead of inserting a block that shoves the whole page down.
//
// Hover opens it on desktop, tap opens it on touch.
//
// Two optional props let My Library reuse this row verbatim:
//   `allowedSlugs` — restrict the pillars and sub-subjects to the slugs actually
//     present in the user's saved items, so the library never offers a filter
//     that would return nothing.
//   `onSelect`     — filter via client state instead of navigating. When given,
//     the pills become buttons that call onSelect(slug | null); when omitted they
//     stay `?subject=` links, exactly as the homepage needs.
export default function SubjectPills({ subjects = [], currentSubjectSlug, allowedSlugs, onSelect }) {
  const [openPillar, setOpenPillar] = useState(null);

  const pillClass = (active) =>
    `px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap border transition-all duration-200 ${
      active
        ? 'bg-[#7c3aed] text-white border-transparent shadow-lg shadow-[#7c3aed]/30'
        : 'bg-transparent text-white border-white/30 hover:border-white/60 hover:bg-white/10'
    }`;

  const isAllowed = (slug) => !allowedSlugs || allowedSlugs.includes(slug);

  // Drop a pillar entirely when none of its subjects are represented.
  const pillars = Object.entries(SUBJECT_TAXONOMY).filter(([, slugs]) =>
    slugs.some(isAllowed)
  );

  const openItems = openPillar
    ? subjects.filter(
        (sub) => SUBJECT_TAXONOMY[openPillar]?.includes(sub.slug) && isAllowed(sub.slug)
      )
    : [];

  return (
    // The positioning context the overlay panel anchors to.
    <div className="relative" onMouseLeave={() => setOpenPillar(null)}>
      {/* CENTERED VIEWPORT — the flex parent centres the track once the pills are
          narrower than the page. The track keeps overflow-x-auto and max-w-full,
          so on a phone it still fills the width and scrolls rather than being
          centred and clipped. (A scroll container's automatic minimum size is 0,
          which is what lets it shrink to its content and be centred at all.) */}
      <div className="w-full flex justify-center items-center">
        <div className="flex max-w-full flex-row gap-3 overflow-x-auto scrollbar-hide pb-1">
          {/* View All resets the active filter */}
          {onSelect ? (
            <button
              type="button"
              onClick={() => onSelect(null)}
              onMouseEnter={() => setOpenPillar(null)}
              className={pillClass(!currentSubjectSlug)}
            >
              View All
            </button>
          ) : (
            <a
              href="?"
              className={pillClass(!currentSubjectSlug)}
              onMouseEnter={() => setOpenPillar(null)}
            >
              View All
            </a>
          )}

          {pillars.map(([pillar, slugs]) => {
            const pillarActive = Boolean(currentSubjectSlug) && slugs.includes(currentSubjectSlug);
            return (
              <button
                key={pillar}
                type="button"
                onMouseEnter={() => setOpenPillar(pillar)}
                onClick={() => setOpenPillar((prev) => (prev === pillar ? null : pillar))}
                aria-expanded={openPillar === pillar}
                className={pillClass(pillarActive || openPillar === pillar)}
              >
                {pillar}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-subject panel — floats over the billboard, out of document flow. */}
      {openPillar && (
        <div className="absolute top-full left-0 right-0 z-20 mt-2 flex flex-wrap justify-center gap-2 rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-2xl">
          {openItems.length === 0 ? (
            <span className="text-xs italic text-gray-400">Coming soon</span>
          ) : (
            openItems.map((sub) => {
              const subClass = `rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                currentSubjectSlug === sub.slug
                  ? 'bg-[#7c3aed] text-white'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`;

              return onSelect ? (
                <button
                  key={sub.slug}
                  type="button"
                  onClick={() => onSelect(sub.slug)}
                  aria-current={currentSubjectSlug === sub.slug ? 'true' : undefined}
                  className={subClass}
                >
                  {sub.name}
                </button>
              ) : (
                <a
                  key={sub.slug}
                  href={`?subject=${sub.slug}`}
                  aria-current={currentSubjectSlug === sub.slug ? 'true' : undefined}
                  className={subClass}
                >
                  {sub.name}
                </a>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

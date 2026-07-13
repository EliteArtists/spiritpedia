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
// The dropdown panel is rendered BELOW the scroll track rather than absolutely
// inside it: an overflow-x container also clips its children vertically, so a
// dropdown nested in the track would be cut off at the first pill's baseline.
// Hover opens it on desktop, tap opens it on touch, and the sub-subject links
// are the same `?subject=` hrefs as before.
export default function SubjectPills({ subjects = [], currentSubjectSlug }) {
  const [openPillar, setOpenPillar] = useState(null);

  const pillClass = (active) =>
    `px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap border transition-all duration-200 ${
      active
        ? 'bg-[#7c3aed] text-white border-transparent shadow-lg shadow-[#7c3aed]/30'
        : 'bg-transparent text-white border-white/30 hover:border-white/60 hover:bg-white/10'
    }`;

  const openItems = openPillar
    ? subjects.filter((sub) => SUBJECT_TAXONOMY[openPillar]?.includes(sub.slug))
    : [];

  return (
    <div onMouseLeave={() => setOpenPillar(null)}>
      <div className="flex flex-row gap-3 overflow-x-auto scrollbar-hide pb-1">
        {/* View All resets the active filter */}
        <a href="?" className={pillClass(!currentSubjectSlug)} onMouseEnter={() => setOpenPillar(null)}>
          View All
        </a>

        {Object.entries(SUBJECT_TAXONOMY).map(([pillar, slugs]) => {
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

      {/* Sub-subject panel for the open pillar */}
      {openPillar && (
        <div className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-2xl">
          {openItems.length === 0 ? (
            <span className="text-xs italic text-gray-400">Coming soon</span>
          ) : (
            openItems.map((sub) => (
              <a
                key={sub.slug}
                href={`?subject=${sub.slug}`}
                aria-current={currentSubjectSlug === sub.slug ? 'true' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  currentSubjectSlug === sub.slug
                    ? 'bg-[#7c3aed] text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {sub.name}
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import ContentShelf from './ContentShelf.js';
import HealerCard from './HealerCard.js';
import AreaModal from './AreaModal.jsx';
import { AREA_EVENT, anyNear, distanceLabel, nearYou, placeLabel, readArea } from '../utils/area.js';

// Practitioners Near You, for this visitor's area (utils/area.js → nearYou).
// Sorted, never filtered (owner, 10 Nov 2026): everyone on the shelf stays.
// Those with a town come first, nearest first, each with how far away they
// are; then everyone with no town. With no area, everyone as before, and "Set
// your area". With nobody within 50 km the shelf is "Closest to you": the same
// full list, under that name. The area lives in this browser (and the
// account), so the shelf is ordered here, after the page.
export default function NearYouShelf({ practitioners, places, portraits, seeAllHref, badge }) {
  const [area, setArea] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setArea(readArea());
    refresh();
    window.addEventListener(AREA_EVENT, refresh);
    return () => window.removeEventListener(AREA_EVENT, refresh);
  }, []);

  const sorted = nearYou(practitioners, area, places);
  const distances = new Map(
    sorted.filter((s) => s.km !== null).map((s) => [s.healer.id, distanceLabel(s.km, area.country)])
  );
  const near = Boolean(area) && anyNear(sorted);
  // "Closest to you" only when there is a distance to show.
  const closest = Boolean(area) && !near && distances.size > 0;
  const items = sorted.map((s) => s.healer);
  const text = !area
    ? null
    : near
      ? `Near ${placeLabel(area)}, nearest first`
      : closest
        ? `Nobody near ${area.name} yet. These are the closest to you.`
        : `No practitioners near ${area.name} yet.`;

  const note = (
    <p className="text-sm text-gray-400">
      {text && <span className="mr-2">{text}</span>}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-semibold text-[#a78bfa] transition-colors hover:text-white"
      >
        {area ? 'Change' : 'Set your area'}
      </button>
    </p>
  );

  return (
    <>
      <ContentShelf
        title={closest ? 'Closest to you' : 'Practitioners Near You'}
        badge={badge}
        note={items.length || !area ? note : null}
        items={items}
        emptyHide={!area || !items.length}
        seeAllHref={seeAllHref}
        renderItem={(healer) => (
          <HealerCard
            healer={healer}
            portrait={portraits[healer.healer_slug || String(healer.id)]}
            distance={distances.get(healer.id)}
          />
        )}
        itemWidthClass="w-[260px]"
      />
      {open && <AreaModal open onClose={() => setOpen(false)} />}
    </>
  );
}

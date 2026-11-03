'use client';

import { useEffect, useState } from 'react';
import ContentShelf from './ContentShelf.js';
import HealerCard from './HealerCard.js';
import AreaModal from './AreaModal.jsx';
import { AREA_EVENT, closestTo, distanceLabel, nearYou, placeLabel, readArea } from '../utils/area.js';

// Practitioners Near You, for this visitor's area (utils/area.js): in person
// within 50 km, nearest first; then those who offer sessions online. With no
// area, everyone, as before — and "Set your area". With an area and nobody
// within 50 km, it is never empty: "Closest to you", the ten nearest with how
// far away each is (the app's rule too, shelf_rules.dart → closestTo). The
// area lives in this browser (and the account), so the shelf is ordered here,
// after the page.
export default function NearYouShelf({ practitioners, places, portraits, seeAllHref, badge }) {
  const [area, setArea] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setArea(readArea());
    refresh();
    window.addEventListener(AREA_EVENT, refresh);
    return () => window.removeEventListener(AREA_EVENT, refresh);
  }, []);

  const { near, online } = nearYou(practitioners, area, places);
  const closest = area && near.length === 0 ? closestTo(practitioners, area, places) : [];
  const distances = new Map(closest.map((c) => [c.healer.id, distanceLabel(c.km, area.country)]));
  const items = closest.length ? closest.map((c) => c.healer) : [...near, ...online];
  const text = !area
    ? null
    : near.length > 0
      ? `Near ${placeLabel(area)}`
      : closest.length
        ? `Nobody near ${area.name} yet. These are the closest to you.`
        : `No practitioners near ${area.name} yet — these offer online sessions.`;

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
        title={closest.length ? 'Closest to you' : 'Practitioners Near You'}
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

'use client';

import { useEffect, useState } from 'react';
import ContentShelf from './ContentShelf.js';
import HealerCard from './HealerCard.js';
import { AREA_EVENT, distanceLabel, nearestFirst, readArea } from '../utils/area.js';
import { tierRank } from '../utils/listings.js';

// A subject page's teachers (owner, 10 Nov 2026). They arrive in tier order,
// then by name (data/subjects.js). The page is the same for every visitor, but
// the area lives in this browser (utils/area.js), so once one is set the order
// is refined here: still tier first, then nearest first within each tier, each
// with how far away they are, then those with no town. Nobody is left out.
export default function SubjectHealersShelf({ healers, places }) {
  const [area, setArea] = useState(null);

  useEffect(() => {
    const refresh = () => setArea(readArea());
    refresh();
    window.addEventListener(AREA_EVENT, refresh);
    return () => window.removeEventListener(AREA_EVENT, refresh);
  }, []);

  const sorted = area ? nearestFirst(healers, area, places, tierRank) : null;
  const items = sorted ? sorted.map((s) => s.healer) : healers;
  const distances = new Map(
    (sorted || []).filter((s) => s.km !== null).map((s) => [s.healer.id, distanceLabel(s.km, area.country)])
  );

  return (
    <ContentShelf
      title="Healers"
      subtitle="Practitioners & Teachers"
      items={items}
      renderItem={(healer) => <HealerCard healer={healer} distance={distances.get(healer.id)} />}
      itemWidthClass="w-[260px]"
    />
  );
}

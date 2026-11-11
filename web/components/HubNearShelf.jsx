'use client';

import { useEffect, useState } from 'react';
import ContentShelf from './ContentShelf.js';
import SchoolCard from './SchoolCard.jsx';
import { AREA_EVENT, nearestFirst, readArea } from '../utils/area.js';

// Schools & Academies and Retreat Centres & Platforms, nearest first once the
// visitor has set an area (owner, 11 Nov 2026), by the same rule as
// Practitioners Near You (utils/area.js → nearestFirst): nobody is hidden,
// those with a town come nearest first, those with none go last in the order
// the page gave. With no area, the page's order as before. The area lives in
// this browser, so the shelf is ordered here, after the page.
export default function HubNearShelf({ title, subtitle, items, places, teacherCounts, kind = 'School' }) {
  const [area, setArea] = useState(null);

  useEffect(() => {
    const refresh = () => setArea(readArea());
    refresh();
    window.addEventListener(AREA_EVENT, refresh);
    return () => window.removeEventListener(AREA_EVENT, refresh);
  }, []);

  const sorted = area ? nearestFirst(items, area, places).map((s) => s.healer) : items;

  return (
    <ContentShelf
      title={title}
      subtitle={subtitle}
      items={sorted}
      renderItem={(hub) => <SchoolCard school={hub} teacherCount={teacherCounts[hub.id] || 0} kind={kind} />}
      itemWidthClass="w-[260px]"
    />
  );
}

'use client';

import { BADGES, getAppHref, storesFor } from '@/utils/appStores';
import { useDevice } from '@/utils/useDevice';

// Apple's and Google's official badges (public/badges, unmodified), for the
// visitor's device: the App Store on an iPhone or iPad, Google Play on
// Android, both on a computer or anything unrecognised (utils/appStores.js).
//
// Both are drawn at the same height, as Google asks when they sit side by side,
// with at least a quarter of that height between them, as Apple asks; never
// under 40 px on screen. Each goes through the counting address
// (/get-app/<store>?from=<placement>, migration 0052). A plain <a>, not
// next/link: a prefetch must never look like a tap.
export default function StoreBadges({ placement, height = 40, className = '' }) {
  const device = useDevice();

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {storesFor(device).map((store) => {
        const badge = BADGES[store];
        return (
          <a
            key={store}
            href={getAppHref(store, placement)}
            target="_blank"
            rel="noopener nofollow"
            className="inline-block shrink-0 transition-opacity hover:opacity-85"
          >
            <img
              src={badge.src}
              alt={badge.alt}
              width={Math.round(height * badge.ratio)}
              height={height}
              style={{ height, width: 'auto' }}
            />
          </a>
        );
      })}
    </div>
  );
}

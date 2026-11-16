import { APP_LINE } from '@/utils/appStores';

// "Spiritpedia is even better on the app →": one quiet text link, on teacher
// pages and in My Library (owner, 16 Nov 2026).
//
// It points at /get-app, which sends a phone straight to its store through the
// counting address and shows a computer both badges, keeping the placement
// either way. So it needs no script and draws the same on every device. A
// plain <a>, not next/link: /get-app redirects phones, and a prefetch must not.
export default function AppLine({ placement, className = '' }) {
  return (
    <p className={`text-sm ${className}`}>
      <a
        href={`/get-app?from=${encodeURIComponent(placement)}`}
        rel="nofollow"
        className="font-semibold text-[#a78bfa] transition-colors hover:text-white"
      >
        {APP_LINE} &rarr;
      </a>
    </p>
  );
}

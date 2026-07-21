'use client';

import Link from 'next/link';

// Context-aware back link for detail pages. The `from`/`fromTitle` pair is
// threaded in via searchParams by whatever page linked here, so the label and
// destination reflect the user's actual path rather than a hardcoded home link.
// On a direct visit (no context, or a `from` that is not an internal path) it
// falls back to "← Back to Spiritpedia" pointing at "/".
export default function BackButton({ from, fromTitle }) {
  const href = typeof from === 'string' && from.startsWith('/') ? from : '/';
  const label = fromTitle ? `Back to ${fromTitle}` : 'Back to Spiritpedia';

  return (
    <Link href={href} className="text-sm text-gray-400 hover:text-white transition-colors">
      &larr; {label}
    </Link>
  );
}

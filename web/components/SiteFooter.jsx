'use client';

import { usePathname } from 'next/navigation';

// Site-wide footer, rendered once from the root layout.
//
// It is a client component for one reason: the root layout wraps /admin as
// well, and a server layout is not told which route is rendering. Reading the
// pathname here is what keeps the disclaimer off the dashboard and its login
// screen, which are internal tools with no visitor to address. The alternative
// — a (public) route group — would mean moving every page directory to exclude
// two of them.
const HIDDEN_PREFIX = '/admin';

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname === HIDDEN_PREFIX || pathname?.startsWith(`${HIDDEN_PREFIX}/`)) return null;

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#0a0f1d] px-6 py-8">
      <div className="mx-auto max-w-4xl text-center text-xs text-gray-500">
        <p className="leading-relaxed">
          Spiritpedia celebrates the transformative power of spiritual practice, alternative
          therapies and personal growth. The teachers and resources here have helped millions of
          people live healthier, more conscious lives. As with any health or wellbeing journey, we
          encourage you to make informed choices — and to consult a healthcare professional where
          appropriate.
        </p>

        <p className="mt-4">
          © 2026 Spiritpedia
          <span aria-hidden="true"> · </span>
          <a href="#" className="transition-colors hover:text-gray-300">
            Privacy Policy
          </a>
          <span aria-hidden="true"> · </span>
          <a href="#" className="transition-colors hover:text-gray-300">
            Terms of Use
          </a>
        </p>
      </div>
    </footer>
  );
}

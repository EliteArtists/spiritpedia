'use client';

import { useEffect, useRef, useState } from 'react';
import { listingBadges } from '../utils/badges.js';

// A listing's badges (utils/badges.js): its tier, its type, ✓ Verified or
// OFFICIAL. Each with a tip from the star opens on hover, or on a tap,
// and a tap never opens the card underneath.
//
// `size` 'card' for the small pills on cards, 'profile' for a listing's page.
// `placement` 'above' or 'below': a card is overflow-hidden, so a badge at the
// card's foot opens its tip upward.

const TIER_CLASS = {
  card: {
    superhero: 'bg-amber-100 text-amber-600 border border-amber-300',
    luminary: 'bg-violet-600 text-white',
    local_hero: 'bg-emerald-500 text-white',
  },
  profile: {
    superhero: 'bg-[#fef08a] text-[#78350f]',
    luminary: 'bg-violet-600 text-white',
    local_hero: 'bg-emerald-500 text-white',
  },
};

const KIND_CLASS = {
  type: 'bg-white/10 text-white border border-white/25',
  verified: 'bg-sky-500 text-white',
  official: 'bg-white text-[#4c1d95]',
};

const SIZE_CLASS = {
  card: 'rounded-md px-2 py-0.5 text-[10px]',
  profile: 'rounded-full px-3 py-1 text-[11px]',
};

function badgeClass(badge, size) {
  const colour = badge.kind === 'tier' ? TIER_CLASS[size][badge.tier] : KIND_CLASS[badge.kind];
  return `block shrink-0 font-bold uppercase tracking-wider shadow-sm ${SIZE_CLASS[size]} ${colour || 'bg-gray-500 text-white'}`;
}

// Anything the star explains: a hover, or a tap that opens the tip and never
// what is underneath. Also used for the homepage's shelf badges.
export function Tipped({ tip, label, placement = 'above', align = 'right', children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  if (!tip) return children;
  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  };
  const vertical = placement === 'below' ? 'top-full mt-2' : 'bottom-full mb-2';
  const horizontal = align === 'left' ? 'left-0' : 'right-0';
  return (
    <span ref={ref} className="relative inline-block group/badge shrink-0">
      {/* A span, not a button: cards are links, and a button inside a link is
          invalid HTML. */}
      <span
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={`${label}: what this means`}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') toggle(e);
        }}
        className="block cursor-help rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        {children}
      </span>
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${vertical} ${horizontal} z-40 flex w-60 items-start gap-2 rounded-xl border border-white/10 bg-[#0a0f1d]/95 px-3 py-2.5 text-left text-[12px] font-normal normal-case leading-snug tracking-normal text-gray-200 shadow-xl backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'visible opacity-100' : 'invisible opacity-0 group-hover/badge:visible group-hover/badge:opacity-100'
        }`}
      >
        <img referrerPolicy="no-referrer" src="/Transparent_Symbol.png" alt="" className="mt-0.5 h-5 w-5 shrink-0 scale-150 object-contain" />
        <span>{tip}</span>
      </span>
    </span>
  );
}

function Badge({ badge, size, placement, align }) {
  return (
    <Tipped tip={badge.tip} label={badge.label} placement={placement} align={align}>
      <span className={badgeClass(badge, size)}>{badge.label}</span>
    </Tipped>
  );
}

export default function ListingBadges({
  listing,
  entityType,
  size = 'card',
  placement = 'above',
  align = 'right',
  className = '',
  kinds = null,
}) {
  // `kinds`: only these (a card puts its tier top left, its type bottom right).
  const badges = listingBadges(listing, entityType ?? listing?.entity_type).filter(
    (b) => !kinds || kinds.includes(b.kind)
  );
  if (!badges.length) return null;
  return (
    <span className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {badges.map((badge) => (
        <Badge key={badge.kind} badge={badge} size={size} placement={placement} align={align} />
      ))}
    </span>
  );
}

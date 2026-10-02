// Sidebar iconography. Inline SVG rather than a package: the whole codebase
// draws its own icons (ShareButton, HomeMasthead, PractitionerModal), and nine
// 20px glyphs are not worth a dependency in a bundle this size.
//
// All stroked, currentColor, 1.75 — so they sit at the same visual weight as
// the labels beside them and inherit the active state without extra classes.
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const Icons = {
  inbox: (p) => (
    <svg {...base} {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 13h5l1.5 2.5h5L16 13h5" />
    </svg>
  ),
  people: (p) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  ),
  content: (p) => (
    <svg {...base} {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M9 10v9" />
    </svg>
  ),
  messages: (p) => (
    <svg {...base} {...p}>
      <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
    </svg>
  ),
  claims: (p) => (
    <svg {...base} {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  flags: (p) => (
    <svg {...base} {...p}>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </svg>
  ),
  mailshots: (p) => (
    <svg {...base} {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
  analytics: (p) => (
    <svg {...base} {...p}>
      <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" />
    </svg>
  ),
  ingestion: (p) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
  ),
  settings: (p) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2m0 15v2M2.5 12h2m15 0h2M5.1 5.1l1.4 1.4m11 11 1.4 1.4m0-13.8-1.4 1.4m-11 11-1.4 1.4" />
    </svg>
  ),
  logout: (p) => (
    <svg {...base} {...p}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h12" />
    </svg>
  ),
  search: (p) => (
    <svg {...base} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  bell: (p) => (
    <svg {...base} {...p}>
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
      <path d="M10.3 20a2 2 0 0 0 3.4 0" />
    </svg>
  ),
};

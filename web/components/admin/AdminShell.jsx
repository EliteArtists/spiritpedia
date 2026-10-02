'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminDataProvider, useAdminData } from './AdminData.jsx';
import { Icons } from './AdminIcons.jsx';

// The dashboard frame: fixed sidebar, fixed top bar, scrolling content.
//
// Replaces the horizontal tab strip. Eight tabs in a row had already run out of
// width, and the sections the redesign adds would not have fitted at all — a
// vertical list grows without the labels shrinking.

const NAV = [
  { href: '/admin', label: 'Inbox', icon: 'inbox', badge: 'inbox' },
  { href: '/admin/people', label: 'People', icon: 'people' },
  { href: '/admin/content', label: 'Content', icon: 'content' },
  { href: '/admin/messages', label: 'Messages', icon: 'messages' },
  { href: '/admin/claims', label: 'Claims', icon: 'claims' },
  { href: '/admin/flags', label: 'Flags', icon: 'flags' },
  { href: '/admin/mailshots', label: 'Mailshots', icon: 'mailshots' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'analytics' },
  { href: '/admin/ingestion', label: 'Ingestion', icon: 'ingestion' },
];

// /admin is the Inbox, so it must match exactly — otherwise it would read as
// active on every page beneath it.
function isActive(pathname, href) {
  return href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href);
}

function NavItem({ item, pathname, badgeCount }) {
  const active = isActive(pathname, item.href);
  const Icon = Icons[item.icon];
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      // The label is hidden below md, leaving the icon rail. title= keeps the
      // name reachable there, where there is nothing else to identify it by.
      title={item.label}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-[#7c3aed] text-white shadow-lg shadow-[#7c3aed]/20'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="hidden flex-1 truncate md:block">{item.label}</span>
      {badgeCount > 0 && (
        <span
          className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums md:block ${
            active ? 'bg-white/25 text-white' : 'bg-[#7c3aed] text-white'
          }`}
        >
          {badgeCount}
        </span>
      )}
    </Link>
  );
}

function Sidebar({ pathname }) {
  const { pendingApplications } = useAdminData();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r border-white/10 bg-[#111827] md:w-60">
      <div className="flex items-center gap-3 px-3 py-5 md:px-4">
        <img
          src="/Spiritpedia_Header_Symbol.png"
          alt=""
          aria-hidden="true"
          className="h-9 w-9 shrink-0 object-contain"
        />
        <span className="hidden min-w-0 md:block">
          <span className="block truncate text-base font-bold tracking-wide text-white">
            Spiritpedia
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#a78bfa]">
            Admin
          </span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-4">
        {NAV.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            pathname={pathname}
            badgeCount={item.badge === 'inbox' ? pendingApplications : 0}
          />
        ))}

        <div className="my-3 border-t border-white/10" />

        <NavItem
          item={{ href: '/admin/settings', label: 'Settings', icon: 'settings' }}
          pathname={pathname}
          badgeCount={0}
        />

        {/* A form, not a link: signing out is a state change, and it POSTs to
            the route that clears the session cookie. */}
        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            title="Logout"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icons.logout className="h-5 w-5 shrink-0" />
            <span className="hidden md:block">Logout</span>
          </button>
        </form>
      </nav>
    </aside>
  );
}

function TopBar({ adminName }) {
  const { pendingApplications, loading, accountsAvailable } = useAdminData();
  const initial = (adminName || 'A').trim().charAt(0).toUpperCase();

  // Phase 1 counts only what exists. Messages, flags and content submissions
  // have no tables yet, so a larger number here would be invented.
  // null means "do not know" — while loading, and when the queue could not be
  // read at all. Saying "Nothing needs your attention" in either case would be
  // reassurance we have not earned.
  const needsAttention = loading || !accountsAvailable ? null : pendingApplications;

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-[#0a0f1d]/90 pl-16 backdrop-blur-md md:pl-60">
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-8 md:py-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-white md:text-2xl">
            Welcome back, {adminName || 'there'}
          </h1>
          <p className="hidden text-xs text-slate-500 md:block">
            {needsAttention === null
              ? loading
                ? 'Loading…'
                : 'Queue unavailable'
              : needsAttention === 0
                ? 'Nothing needs your attention'
                : `${needsAttention} item${needsAttention === 1 ? '' : 's'} ${needsAttention === 1 ? 'needs' : 'need'} your attention`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          {/* Search is deliberately inert in Phase 1 — it has nothing to search
              yet. Rendered rather than omitted so the bar is laid out for what
              is coming, and marked disabled so it cannot look broken. */}
          <label className="relative hidden lg:block">
            <span className="sr-only">Search people, content, messages</span>
            <Icons.search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            <input
              type="search"
              disabled
              title="Search is coming soon"
              placeholder="Search people, content, messages…"
              className="w-72 cursor-not-allowed rounded-full border border-white/10 bg-[#111827] py-2 pl-9 pr-4 text-sm text-white placeholder:text-slate-600"
            />
          </label>

          <button
            type="button"
            title="Notifications — coming soon"
            aria-label={`Notifications: ${pendingApplications} unread`}
            className="relative flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full border border-white/10 text-slate-500"
          >
            <Icons.bell className="h-5 w-5" />
            <span
              className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                pendingApplications > 0 ? 'bg-[#7c3aed] text-white' : 'bg-slate-800 text-slate-500'
              }`}
            >
              {pendingApplications}
            </span>
          </button>

          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-[#111827] py-1 pl-3 pr-1">
            <span className="hidden text-xs font-semibold text-slate-300 md:block">
              Spiritpedia Admin
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7c3aed] text-sm font-bold text-white">
              {initial}
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}

export default function AdminShell({ children, adminName }) {
  const pathname = usePathname();

  // The login screen lives under /admin so proxy.js can let it through, but it
  // must not wear the dashboard chrome — a sidebar full of links you cannot
  // follow yet.
  if (pathname === '/admin/login') return children;

  return (
    <AdminDataProvider>
      <div className="min-h-screen bg-[#0a0f1d] text-white">
        <Sidebar pathname={pathname} />
        <TopBar adminName={adminName} />
        <main className="pl-16 pt-16 md:pl-60 md:pt-20">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </AdminDataProvider>
  );
}

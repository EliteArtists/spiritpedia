'use client';

import { useAdminData } from './AdminData.jsx';

// The platform at a glance, across the top of the Inbox.
//
// Content counts come from public tables and are always available. The user
// count needs the service role, so it shows "n/a" rather than 0 when that key
// is missing — a 0 there would be a claim that nobody has signed up.
const CELLS = [
  { key: 'healers', label: 'Healers' },
  { key: 'videos', label: 'Videos' },
  { key: 'books', label: 'Books' },
  { key: 'courses', label: 'Courses' },
  { key: 'free_resources', label: 'Resources' },
  { key: 'publishers', label: 'Publishers' },
  { key: 'users', label: 'Users', needsAccounts: true },
];

export default function StatStrip() {
  const { counts, loading, accountsAvailable, error } = useAdminData();

  return (
    <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {CELLS.map((cell) => {
        // `?? 0` would have been a lie, not a gap: with the database
        // unreachable, counts is empty and every cell read "0 Healers" when
        // there are 127. A count we do not have is n/a, never zero.
        const missing = error || counts[cell.key] === undefined;
        const unavailable = missing || (cell.needsAccounts && !accountsAvailable);
        const value = loading ? '—' : unavailable ? 'n/a' : counts[cell.key];
        return (
          <div
            key={cell.key}
            className="rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-left"
          >
            <p
              className={`text-xl font-black tabular-nums ${unavailable ? 'text-slate-600' : 'text-white'}`}
            >
              {typeof value === 'number' ? value.toLocaleString('en-GB') : value}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {cell.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

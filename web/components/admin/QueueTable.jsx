'use client';

import { QUEUE_TYPES, STATUS_STYLES, timeAgo } from './queue.js';
import Link from 'next/link';

function TypeChip({ type }) {
  const meta = QUEUE_TYPES[type] || QUEUE_TYPES.application;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.chip}`}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
}

export function StatusPill({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span
      className={`inline-block shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style}`}
    >
      {status}
    </span>
  );
}

// One row shape for every source. A flag or a message will slot in here with no
// change beyond its entry in QUEUE_TYPES — that uniformity is the whole point
// of the queue.
export default function QueueTable({ items, onOpen, selectedId }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
      <div className="hidden grid-cols-[70px_120px_1fr_120px_90px] gap-3 border-b border-white/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 md:grid">
        <span>Time</span>
        <span>Type</span>
        <span>Person / detail</span>
        <span>Status</span>
        <span className="text-right">Actions</span>
      </div>

      <ul className="divide-y divide-white/5">
        {items.map((item) => (
          <li
            key={item.id}
            className={`grid grid-cols-1 gap-2 px-4 py-3 transition-colors md:grid-cols-[70px_120px_1fr_120px_90px] md:items-center md:gap-3 ${
              selectedId === item.id ? 'bg-[#7c3aed]/10' : 'hover:bg-white/5'
            }`}
          >
            <span className="text-xs tabular-nums text-slate-500">{timeAgo(item.at)}</span>
            <span>
              <TypeChip type={item.type} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">{item.person}</span>
              <span className="block truncate text-xs text-slate-500">
                {item.title}
                {item.detail ? ` · ${item.detail}` : ''}
              </span>
            </span>
            <span>
              <StatusPill status={item.status} />
            </span>
            <span className="flex items-center justify-start gap-1 md:justify-end">
              {/* A row that names its own destination goes there. The
                  three-pane reviewer only knows how to render the sources that
                  hang off a profile, so anything else says where it belongs and
                  is sent rather than opened. */}
              {item.href ? (
                <Link
                  href={item.href}
                  className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
                >
                  Open
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
                >
                  Open
                </button>
              )}
              {/* The kebab has nothing behind it until there are bulk and
                  per-item actions to put there. Disabled rather than omitted so
                  the row matches the design, and titled so it explains itself. */}
              <button
                type="button"
                title="More actions — coming soon"
                aria-label="More actions"
                className="cursor-not-allowed px-1.5 text-slate-600"
              >
                ⋮
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

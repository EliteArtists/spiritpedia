'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Admin → Activity: taps on Buy on Amazon buttons (migration 0046), for the
// page's range and platform. Clicks, not sales: Amazon's own reports say what
// sold. Before 0046 runs it says so instead of showing an empty list.
export default function AmazonClicksPanel({ days = 30, platform = 'all' }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/amazon-clicks?days=${days}&platform=${platform}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setError(json.error ? json.message || json.error : null);
        if (!json.error) setData(json);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [days, platform]);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111827] p-5">
      <h2 className="text-sm font-bold text-white">Amazon clicks</h2>
      <p className="mt-0.5 text-xs text-slate-500">Taps on Buy on Amazon, by item and store. Clicks, not sales.</p>
      <div className="mt-4">
        {error ? (
          <p className="text-sm text-amber-300">{error}</p>
        ) : !data ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : data.missing ? (
          <p className="text-sm text-slate-500">Not counting yet: migration 0046 hasn’t been run on this database.</p>
        ) : !data.rows.length ? (
          <p className="text-sm text-slate-500">No clicks in this period.</p>
        ) : (
          <>
            <p className="mb-3 text-2xl font-bold text-white">{data.total}</p>
            <ol className="space-y-2">
              {data.rows.map((r, i) => (
                <li key={`${r.content_type}:${r.content_slug}:${r.store}`} className="flex items-baseline gap-3 text-sm">
                  <span className="w-5 shrink-0 text-right text-xs text-slate-600">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">
                    <Link href={r.href} target="_blank" className="text-white hover:text-[#a78bfa]">
                      {r.title}
                    </Link>
                    <span className="ml-2 text-xs text-slate-500">
                      {r.content_type === 'book' ? 'Book' : 'Offering'} · {r.store}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-slate-300">{r.total} clicks</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}

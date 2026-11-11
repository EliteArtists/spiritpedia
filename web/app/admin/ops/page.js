'use client';

import { useCallback, useEffect, useState } from 'react';
import SectionHeading from '@/components/admin/SectionHeading';
import { Placeholder } from '@/components/admin/AdminPlaceholders';

// Admin → Ops (migration 0045). What the content work leaves waiting, which
// lives in the repo: plans held for the owner, listings on dev that aren't on
// live, README §18.7's retry list and the sprint reports. scripts/ops-sync.mjs
// copies them here after every sprint; this page only reads.

const GROUPS = [
  { key: 'held', title: 'Held plans', note: 'Waiting on your decision; never inserted until then.' },
  { key: 'devOnly', title: 'On dev, not on live', note: 'Listings that reached dev and never live.' },
  { key: 'retry', title: 'Retry another day', note: 'From README §18.7. Never retried the same day.' },
  { key: 'reports', title: 'Sprint reports', note: 'docs/reports, newest first.' },
];

function when(value) {
  if (!value) return null;
  return new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Row({ item }) {
  return (
    <li className="rounded-xl border border-white/10 bg-[#0a0f1d] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-white">
          {/* No link: none of these listings is on live. */}
          {item.title}
          {item.slug && <span className="ml-2 font-mono text-xs font-normal text-slate-600">{item.slug}</span>}
          {item.detail?.entity_type && item.detail.entity_type !== 'individual' && (
            <span className="ml-2 text-xs font-normal text-slate-500">{item.detail.entity_type}</span>
          )}
        </p>
        {item.source_date && <span className="text-xs text-slate-500">{item.source_date}</span>}
      </div>
      {item.reason && (
        <details className="mt-1.5 text-sm text-slate-400">
          <summary className="cursor-pointer list-none truncate marker:hidden">{item.reason}</summary>
          <p className="mt-1 whitespace-pre-line">{item.reason}</p>
        </details>
      )}
      {item.path && <p className="mt-1.5 break-all font-mono text-[11px] text-slate-600">{item.path}</p>}
    </li>
  );
}

export default function AdminOpsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/ops', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.message || json.error || 'Could not load Ops.');
      setData(json);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const filter = (rows) =>
    q ? rows.filter((r) => [r.title, r.slug, r.reason, r.path].some((v) => v && v.toLowerCase().includes(q))) : rows;

  return (
    <>
      <SectionHeading
        title="Ops"
        subtitle={
          data?.syncedAt
            ? `Copied from the repo ${when(data.syncedAt)} by scripts/ops-sync.mjs`
            : 'Held plans, dev-only listings, the retry list and sprint reports'
        }
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter…"
          className="w-56 rounded-full border border-white/10 bg-[#111827] px-4 py-2 text-sm text-white placeholder:text-slate-600"
        />
      </SectionHeading>

      {error ? (
        <Placeholder icon="⚠" title="Ops unavailable" body={error} />
      ) : !data ? (
        <Placeholder icon="◴" title="Loading…" />
      ) : data.missing ? (
        <Placeholder
          icon="○"
          title="Not set up yet"
          body="Migration 0045 hasn't been run on this database. Once it has, run node scripts/ops-sync.mjs --env live from the repo and this page fills in."
        />
      ) : !data.syncedAt ? (
        <Placeholder icon="○" title="Never synced" body="Run node scripts/ops-sync.mjs --env live from the repo." />
      ) : (
        <div className="flex flex-col gap-8">
          {GROUPS.map((g) => {
            const rows = filter(data[g.key] || []);
            return (
              <section key={g.key}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  {g.title} <span className="ml-1 font-mono text-slate-500">({rows.length})</span>
                </h3>
                <p className="mb-3 mt-0.5 text-xs text-slate-500">{g.note}</p>
                {rows.length ? (
                  <ul className="flex flex-col gap-2">
                    {rows.map((item) => (
                      <Row key={`${item.kind}:${item.item_key}`} item={item} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">None.</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

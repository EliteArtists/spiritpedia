'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SectionHeading from '@/components/admin/SectionHeading';
import { Placeholder } from '@/components/admin/AdminPlaceholders';
import DataProblem from '@/components/admin/DataProblem';
import { useAdminData } from '@/components/admin/AdminData';
import { supabase } from '@/utils/supabase';
import { tierName } from '@/utils/badges';

// THE PUBLISHER DIRECTORY (owner, 11 Nov 2026: publishers were listed nowhere
// in the admin). Publishers are public rows, read like the healer directory;
// who manages each comes from the dashboard's profiles. Edit on the public
// page's owner tools or through Claims.

const COLUMNS = 'id, name, slug, tier, verified, contact_email, website_url, founded_year, created_at';

const hasText = (v) => String(v || '').trim() !== '';

function Badge({ className, children }) {
  return (
    <span className={`inline-block shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${className}`}>
      {children}
    </span>
  );
}

export default function AdminPublishersPage() {
  const { profiles } = useAdminData();
  const [publishers, setPublishers] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: queryError } = await supabase.from('publishers').select(COLUMNS).order('name');
      if (cancelled) return;
      if (queryError) setError(queryError.message);
      else setPublishers(data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Which publishers an account manages (user_profiles.linked_publisher_id).
  // null when the profiles could not be read, so nothing claims "Unclaimed".
  const managed = useMemo(() => {
    if (!Array.isArray(profiles)) return null;
    return new Set(profiles.map((p) => p.linked_publisher_id).filter(Boolean).map(String));
  }, [profiles]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (publishers || []).filter((p) => !q || String(p.name || '').toLowerCase().includes(q));
  }, [publishers, query]);

  return (
    <>
      <SectionHeading
        title="Publishers"
        subtitle={Array.isArray(publishers) ? `${publishers.length} publisher records` : 'The publisher directory'}
      />

      {error ? (
        <DataProblem error={error} what="The publisher directory" />
      ) : !publishers ? (
        <Placeholder icon="◴" title="Loading…" />
      ) : (
        <>
          <label className="mb-5 block">
            <span className="sr-only">Search publishers by name</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full rounded-full border border-white/10 bg-[#111827] px-4 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[#7c3aed] focus:outline-none"
            />
          </label>

          {rows.length === 0 ? (
            <Placeholder icon="○" title="No publishers match" />
          ) : (
            <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
              {rows.map((p) => {
                const isManaged = managed ? managed.has(String(p.id)) : null;
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {p.slug}
                        {p.founded_year ? ` · founded ${p.founded_year}` : ''}
                        {hasText(p.website_url) ? ` · ${p.website_url}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.tier && (
                        <Badge className="border-violet-500/40 bg-violet-500/10 text-violet-300">
                          {tierName(p.tier, 'publisher') || p.tier}
                        </Badge>
                      )}
                      {p.verified && <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300">Verified</Badge>}
                      {!hasText(p.contact_email) && (
                        <Badge className="border-rose-500/40 bg-rose-500/10 text-rose-300">No email</Badge>
                      )}
                      {isManaged !== null && (
                        <Badge
                          className={
                            isManaged ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-slate-700 bg-slate-800 text-slate-400'
                          }
                        >
                          {isManaged ? 'Claimed' : 'Unclaimed'}
                        </Badge>
                      )}
                      <Link
                        href={`/publishers/${encodeURIComponent(p.slug)}`}
                        target="_blank"
                        className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
                      >
                        View
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SectionHeading from '@/components/admin/SectionHeading';
import { Placeholder } from '@/components/admin/AdminPlaceholders';
import DataProblem from '@/components/admin/DataProblem';
import { useAdminData } from '@/components/admin/AdminData';
import { supabase } from '@/utils/supabase';

// THE HEALER DIRECTORY — every record in the healers table.
//
// Distinct from People, which lists accounts. The two populations barely
// overlap: there are 129 healers and 6 accounts, and only the handful that have
// been claimed appear in both. Nothing here reads user_profiles for its rows.

// PostgREST caps a response at 1,000 rows and reports no error when it
// truncates, so a plain select would silently stop at a thousand. 129 today, so
// this is one request — but the table only grows, and the day it crosses the
// line is not the day to discover this. Ordered by `id`, not `created_at`: the
// bulk imports gave thousands of rows an identical timestamp and ties leave
// Postgres free to order differently per query, so pages would overlap and some
// rows would never be returned. Same pattern as app/sitemap.js.
const PAGE = 1000;

// Only what the list renders. `bio` and `image_urls` are the two fat columns
// and neither appears here — pulling them would be ~400KB for a list of names.
const COLUMNS = 'id, name, healer_slug, tier, subject_slugs';

const TIER_LABELS = {
  superhero: 'Superhero',
  ascended_master: 'Ascended Master',
  luminary: 'Luminary',
  local_hero: 'Local Hero',
};

const TIER_STYLES = {
  superhero: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  ascended_master: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200',
  luminary: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  local_hero: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
};

const CLAIM_FILTERS = [
  { key: 'all', label: 'Claimed or not' },
  { key: 'claimed', label: 'Claimed' },
  { key: 'unclaimed', label: 'Unclaimed' },
];

function Badge({ className, children }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${className}`}
    >
      {children}
    </span>
  );
}

export default function AdminContentPage() {
  const router = useRouter();

  // Claim state comes from the dashboard's existing payload — see the note on
  // claimedSlugs below. `profiles` is null when it could not be read.
  const { profiles } = useAdminData();

  const [healers, setHealers] = useState(null);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('all');
  const [claim, setClaim] = useState('all');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const rows = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error: queryError } = await supabase
          .from('healers')
          .select(COLUMNS)
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1);

        // supabase-js returns { data: null, error } rather than throwing, so
        // without this an unreachable database would render as an empty
        // directory — which reads as "there are no healers".
        if (queryError) {
          if (!cancelled) setError(queryError.message);
          return;
        }

        const page = data || [];
        rows.push(...page);
        if (page.length < PAGE) break;
      }

      if (!cancelled) setHealers(rows);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // WHO HAS CLAIMED WHAT.
  //
  // TODO — healers has no claimed_at column (nor any other column recording an
  // owner); the claim is stored only on the other side, as
  // user_profiles.linked_healer_slug. So this reads the profiles the dashboard
  // has already fetched rather than the healer row itself. Add claimed_at to
  // healers and this becomes a property of the row, with no cross-reference and
  // no dependence on the service role.
  //
  // null, not an empty Set, when profiles could not be read: an unknown claim
  // state must not render as "Unclaimed" on all 129 records.
  const claimedSlugs = useMemo(() => {
    if (!Array.isArray(profiles)) return null;
    return new Set(profiles.map((p) => p.linked_healer_slug).filter(Boolean));
  }, [profiles]);

  // SUBJECTS. There is no subject_category column — a healer carries
  // `subject_slugs`, a Postgres array, and averages six of them. So this is the
  // set of every slug present across the directory, and a healer matches the
  // filter if the chosen slug is among theirs.
  const subjects = useMemo(() => {
    const all = new Set();
    for (const h of healers || []) for (const slug of h.subject_slugs || []) all.add(slug);
    return [...all].sort();
  }, [healers]);

  const rows = useMemo(() => {
    if (!Array.isArray(healers)) return [];
    const q = query.trim().toLowerCase();

    return healers.filter((h) => {
      if (subject !== 'all' && !(h.subject_slugs || []).includes(subject)) return false;

      if (claim !== 'all' && claimedSlugs) {
        const isClaimed = claimedSlugs.has(h.healer_slug);
        if (claim === 'claimed' && !isClaimed) return false;
        if (claim === 'unclaimed' && isClaimed) return false;
      }

      if (!q) return true;
      return String(h.name || '').toLowerCase().includes(q);
    });
  }, [healers, query, subject, claim, claimedSlugs]);

  const total = Array.isArray(healers) ? healers.length : 0;

  return (
    <>
      <SectionHeading
        title="Content"
        subtitle={Array.isArray(healers) ? `${total} healer records` : 'The healer directory'}
      />

      {error ? (
        <DataProblem error={error} what="The healer directory" />
      ) : !healers ? (
        <Placeholder icon="◴" title="Loading…" />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <label className="min-w-[200px] flex-1">
              <span className="sr-only">Search healers by name</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                className="w-full rounded-full border border-white/10 bg-[#111827] px-4 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[#7c3aed] focus:outline-none"
              />
            </label>

            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              aria-label="Filter by subject"
              className="rounded-full border border-white/10 bg-[#111827] px-4 py-2 text-sm text-white"
            >
              <option value="all">Any subject</option>
              {subjects.map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
            </select>

            {/* Offered only when the claim state is actually known. With the
                profiles unread, every option would be a lie. */}
            <select
              hidden={!claimedSlugs}
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              aria-label="Filter by claimed status"
              className="rounded-full border border-white/10 bg-[#111827] px-4 py-2 text-sm text-white"
            >
              {CLAIM_FILTERS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <p className="mb-3 text-xs text-slate-500">
            Showing {rows.length} of {total}
          </p>

          {rows.length === 0 ? (
            <Placeholder icon="○" title="No healers match" body="Try a different search or filter." />
          ) : (
            <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
              {rows.map((h) => {
                const slugs = h.subject_slugs || [];
                const claimed = claimedSlugs ? claimedSlugs.has(h.healer_slug) : null;

                return (
                  <li
                    key={h.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{h.name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {h.healer_slug}
                        {slugs.length > 0 && (
                          <>
                            {' · '}
                            {slugs.slice(0, 2).join(', ')}
                            {slugs.length > 2 ? ` +${slugs.length - 2}` : ''}
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {h.tier && (
                        <Badge className={TIER_STYLES[h.tier] || 'border-slate-700 bg-slate-800 text-slate-400'}>
                          {TIER_LABELS[h.tier] || h.tier}
                        </Badge>
                      )}

                      {claimed !== null && (
                        <Badge
                          className={
                            claimed
                              ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                              : 'border-slate-700 bg-slate-800 text-slate-400'
                          }
                        >
                          {claimed ? 'Claimed' : 'Unclaimed'}
                        </Badge>
                      )}

                      <button
                        type="button"
                        onClick={() => router.push(`/admin/content/${encodeURIComponent(h.healer_slug)}`)}
                        className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
                      >
                        Edit
                      </button>
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

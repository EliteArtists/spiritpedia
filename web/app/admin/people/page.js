'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SectionHeading from '@/components/admin/SectionHeading';
import { useAdminData } from '@/components/admin/AdminData';
import { Placeholder } from '@/components/admin/AdminPlaceholders';
import DataProblem from '@/components/admin/DataProblem';
import PersonRecord from '@/components/admin/PersonRecord';
import { StatusPill } from '@/components/admin/QueueTable';
import { deriveStatus, hasVisibleStatus } from '@/components/admin/queue';

// Two populations, not one list with a filter on top. A practitioner is
// somebody being reviewed and listed; an explorer is somebody with an account.
// They are looked at for different reasons, so they get their own tabs — and
// the status filter only makes sense on one of them.
const TABS = [
  { key: 'practitioner', label: 'Practitioners' },
  { key: 'explorer', label: 'Explorers' },
];

const STATUS_FILTERS = [
  { key: 'all', label: 'Any status' },
  { key: 'pending', label: 'Pending' },
  { key: 'incomplete', label: 'Incomplete' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function PeopleView() {
  const { profiles, loading, error, counts, accountsAvailable, reload } = useAdminData();
  const router = useRouter();
  const params = useSearchParams();

  // The open record and where Back should go both live in the URL, so the
  // browser's own back button behaves and a record can be linked to. `from`
  // is how an approval in the Inbox returns you to the Inbox rather than
  // stranding you in a list you never opened.
  const personId = params.get('person');
  const from = params.get('from');

  const [query, setQuery] = useState('');
  // Practitioners first: the tab with work in it.
  const [tab, setTab] = useState('practitioner');
  const [status, setStatus] = useState('all');

  const rows = useMemo(() => {
    if (!Array.isArray(profiles)) return [];
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      if ((p.user_type || 'explorer') !== tab) return false;
      // Explorers have no status, so a status filter simply excludes them
      // rather than matching them against a value they do not carry.
      if (status !== 'all' && (!hasVisibleStatus(p) || deriveStatus(p) !== status)) return false;
      if (!q) return true;
      return [p.full_name, p.email, p.modality, p.linked_healer_slug]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [profiles, query, tab, status]);

  // Tab counts come from the whole set, not the filtered rows — a tab should
  // say how many people are in it, not how many survive the current search.
  const tabCounts = useMemo(() => {
    const out = { practitioner: 0, explorer: 0 };
    for (const p of Array.isArray(profiles) ? profiles : []) {
      out[(p.user_type || 'explorer') === 'practitioner' ? 'practitioner' : 'explorer'] += 1;
    }
    return out;
  }, [profiles]);

  if (personId) {
    return (
      <PersonRecord
        personId={personId}
        backLabel={from === 'inbox' ? 'Back to inbox' : 'Back to people'}
        onBack={() => router.push(from === 'inbox' ? '/admin' : '/admin/people')}
        onChanged={reload}
      />
    );
  }

  return (
    <>
      <SectionHeading
        title="People"
        subtitle={accountsAvailable ? `${counts.users ?? 0} registered` : 'Every account on Spiritpedia'}
      />

      {loading ? (
        <Placeholder icon="◴" title="Loading…" />
      ) : !accountsAvailable ? (
        <DataProblem error={error} what="Accounts" />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-1 border-b border-white/10">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  // A status chosen on one tab is meaningless on the other.
                  setStatus('all');
                }}
                className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  tab === t.key
                    ? 'border-b-2 border-[#7c3aed] text-white'
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                {t.label}
                <span className="ml-2 text-xs tabular-nums opacity-60">{tabCounts[t.key]}</span>
              </button>
            ))}
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2">
            <label className="min-w-[200px] flex-1">
              <span className="sr-only">Search people</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, modality or slug…"
                className="w-full rounded-full border border-white/10 bg-[#111827] px-4 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[#7c3aed] focus:outline-none"
              />
            </label>
            {/* Status only applies to practitioners, so it is not offered on
                the Explorers tab at all. */}
            <select
              hidden={tab !== 'practitioner'}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-full border border-white/10 bg-[#111827] px-4 py-2 text-sm text-white"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <p className="mb-3 text-xs text-slate-500">
            {rows.length} of {tabCounts[tab]} shown
          </p>

          {rows.length === 0 ? (
            <Placeholder icon="○" title="No accounts match" body="Try a different search or filter." />
          ) : (
            <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
              {rows.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {p.full_name || p.email || p.id}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {p.full_name ? `${p.email} · ` : ''}
                      Joined {formatDate(p.created_at)}
                      {p.modality ? ` · ${p.modality}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        p.user_type === 'practitioner'
                          ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      {p.user_type === 'practitioner' ? 'Practitioner' : 'Explorer'}
                    </span>
                    {hasVisibleStatus(p) && <StatusPill status={deriveStatus(p)} />}
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/people?person=${encodeURIComponent(p.id)}`)}
                      className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
                    >
                      View
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

// useSearchParams needs a Suspense boundary or the route is forced dynamic.
export default function AdminPeoplePage() {
  return (
    <Suspense fallback={<Placeholder icon="◴" title="Loading…" />}>
      <PeopleView />
    </Suspense>
  );
}

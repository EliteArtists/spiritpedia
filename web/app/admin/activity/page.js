'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SectionHeading from '@/components/admin/SectionHeading';
import { useAdminData } from '@/components/admin/AdminData';
import { StatsTab } from '@/components/admin/AdminLiveTabs';
import { Placeholder } from '@/components/admin/AdminPlaceholders';

// Admin → Activity (migration 0021). Totals only: what is opened, saved and
// searched for, across everyone, from anonymous daily counts — never what any
// one person did. Website and app together by default, with a toggle. The
// database totals that used to be "Analytics" sit at the foot.

const RANGES = [7, 30, 90];
const PLATFORMS = [
  { key: 'all', label: 'All' },
  { key: 'web', label: 'Website' },
  { key: 'app', label: 'App' },
];
const TYPE_WORDS = {
  healer: 'Teacher',
  publisher: 'Publisher',
  book: 'Book',
  video: 'Video',
  course: 'Course',
  free_resource: 'Free resource',
};

function Toggle({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-full border border-white/10 p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
            value === o.key ? 'bg-[#7c3aed] text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Panel({ title, note, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111827] p-5">
      <h2 className="text-sm font-bold text-white">{title}</h2>
      {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ children }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

function ItemList({ rows, unit }) {
  if (!rows.length) return <Empty>Nothing yet in this period.</Empty>;
  return (
    <ol className="space-y-2">
      {rows.map((r, i) => (
        <li key={`${r.content_type}:${r.content_slug}`} className="flex items-baseline gap-3 text-sm">
          <span className="w-5 shrink-0 text-right text-xs text-slate-600">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate">
            {r.href ? (
              <Link href={r.href} target="_blank" className="text-white hover:text-[#a78bfa]">
                {r.title}
              </Link>
            ) : (
              <span className="text-white">{r.title}</span>
            )}
            <span className="ml-2 text-xs text-slate-500">{TYPE_WORDS[r.content_type] || r.content_type}</span>
          </span>
          <span className="shrink-0 font-mono text-xs text-slate-300">
            {r.total} {unit}
          </span>
        </li>
      ))}
    </ol>
  );
}

// Sign-ups per day as small stacked bars: website, app, and accounts made
// before the platform was recorded.
const SIGNUP_COLOURS = { web: 'bg-[#7c3aed]', app: 'bg-emerald-500', unknown: 'bg-slate-600' };

function SignupChart({ rows, from, to }) {
  const days = [];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d = new Date(d.getTime() + 86400000)) {
    days.push(d.toISOString().slice(0, 10));
  }
  const byDay = {};
  for (const r of rows) (byDay[r.day] ||= {})[r.platform] = Number(r.total);
  const max = Math.max(1, ...days.map((d) => Object.values(byDay[d] || {}).reduce((a, b) => a + b, 0)));
  const total = rows.reduce((a, r) => a + Number(r.total), 0);

  return (
    <>
      <p className="mb-3 text-2xl font-bold text-white">{total}</p>
      <div className="flex h-32 items-end gap-[2px]" role="img" aria-label={`${total} sign-ups in this period`}>
        {days.map((d) => {
          const counts = byDay[d] || {};
          return (
            <div key={d} className="flex h-full flex-1 flex-col-reverse" title={`${d}: ${JSON.stringify(counts)}`}>
              {['web', 'app', 'unknown'].map((k) =>
                counts[k] ? (
                  <div key={k} className={`${SIGNUP_COLOURS[k]} w-full`} style={{ height: `${(counts[k] / max) * 100}%` }} />
                ) : null
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-600">
        <span>{from}</span>
        <span>{to}</span>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-slate-400">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#7c3aed]" />Website</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500" />App</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-slate-600" />Before October 2026</span>
      </div>
    </>
  );
}

export default function AdminActivityPage() {
  const { counts, loading: countsLoading, accountsAvailable } = useAdminData();
  const [days, setDays] = useState(30);
  const [platform, setPlatform] = useState('all');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async (d, p) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/activity?days=${d}&platform=${p}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.message || json.error || 'Could not load activity.');
      setData(json);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load(days, platform);
  }, [days, platform, load]);

  const fresh = data && data.days === days && data.platform === platform;

  return (
    <>
      <SectionHeading title="Activity" subtitle="Totals across everyone — never one person's browsing" />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Toggle
          options={RANGES.map((r) => ({ key: r, label: `${r} days` }))}
          value={days}
          onChange={setDays}
        />
        <Toggle options={PLATFORMS} value={platform} onChange={setPlatform} />
        {data && !fresh && <span className="text-xs text-slate-500">Updating…</span>}
      </div>

      {error ? (
        <Placeholder icon="⚠" title="Activity unavailable" body={error} />
      ) : !data ? (
        <Placeholder icon="◴" title="Loading…" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Most opened" note="Pages opened, once per visit">
            <ItemList rows={data.mostOpened} unit="opens" />
          </Panel>
          <Panel title="Most saved" note="Saves minus unsaves in this period">
            <ItemList rows={data.mostSaved} unit="saves" />
          </Panel>
          <Panel title="Rising subjects" note="The last 7 days against the weekly average of the 4 weeks before">
            {data.rising.length ? (
              <ol className="space-y-2">
                {data.rising.map((r) => (
                  <li key={r.subject_slug} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-white">{r.name}</span>
                    <span className="font-mono text-xs text-slate-300">
                      {r.this_week} <span className="text-slate-500">vs {r.weekly_before}/wk</span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty>Nothing yet this week.</Empty>
            )}
          </Panel>
          <Panel title="Searches with no results" note="Searched at least twice and found nothing: a content to-do list">
            {data.searchMisses.length ? (
              <ol className="space-y-1.5">
                {data.searchMisses.map((m) => (
                  <li key={m.term} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-white">“{m.term}”</span>
                    <span className="shrink-0 font-mono text-xs text-slate-300">{m.total}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty>None in this period.</Empty>
            )}
          </Panel>
          <div className="lg:col-span-2">
            <Panel title="Sign-ups over time" note="By where the account was made (the platform toggle doesn't apply)">
              <SignupChart rows={data.signups} from={data.from} to={data.to} />
            </Panel>
          </div>
        </div>
      )}

      <h2 className="mb-3 mt-10 text-sm font-bold uppercase tracking-wider text-slate-500">In the database</h2>
      {countsLoading ? (
        <Placeholder icon="◴" title="Loading…" />
      ) : (
        <StatsTab counts={counts} accountsAvailable={accountsAvailable} />
      )}
    </>
  );
}

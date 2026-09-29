'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import ContentIngestion from '@/components/admin/ContentIngestion';
import { FlagsTab, MailshotsTab, MessagesTab } from '@/components/admin/AdminPlaceholders';
import {
  AccountsTab,
  ClaimsTab,
  PractitionersTab,
  StatsTab,
} from '@/components/admin/AdminLiveTabs';

// The dashboard shell. Access is enforced by proxy.js (session cookie), so this
// renders unconditionally once the middleware has let it through.
//
// The ingestion form is NOT reimplemented here. It lives unchanged in
// components/admin/ContentIngestion.jsx — the same component, with the same
// handlers and the same fields — and this file only decides when to show it.

const TABS = [
  { key: 'practitioners', label: 'Practitioners', live: true },
  { key: 'accounts', label: 'Accounts', live: true },
  { key: 'messages', label: 'Messages', live: false },
  { key: 'claims', label: 'Claims', live: true },
  { key: 'flags', label: 'Flags', live: false },
  { key: 'mailshots', label: 'Mailshots', live: false },
  { key: 'stats', label: 'Stats', live: true },
  { key: 'ingestion', label: 'Content Ingestion', live: true },
];

function AdminDashboard() {
  const [tab, setTab] = useState('practitioners');
  const [overview, setOverview] = useState({ loading: true, profiles: null, counts: {}, error: null });
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const ingestionRef = useRef(null);

  // Fetch only — no state. Keeping the request pure lets the mount effect own
  // its own cancellation and lets onDecision reuse it without either one
  // reaching into the other's lifecycle.
  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      const json = await res.json();
      return {
        loading: false,
        // null (not []) means "could not be read" — the tabs render a reason
        // rather than an empty list that would read as "nobody has signed up".
        profiles: json.profiles ?? null,
        counts: json.counts || {},
        error: json.error || null,
      };
    } catch (err) {
      return { loading: false, profiles: null, counts: {}, error: err.message };
    }
  }, []);

  const load = useCallback(async () => {
    setOverview(await fetchOverview());
  }, [fetchOverview]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await fetchOverview();
      if (!cancelled) setOverview(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchOverview]);

  const onDecision = useCallback(
    async (id, action, options = {}) => {
      setBusyId(id);
      setToast(null);
      try {
        const res = await fetch('/api/admin/practitioner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action, ...options }),
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          setToast({ type: 'error', message: json.message || json.error || 'That did not work.' });
        } else {
          setToast({
            type: 'success',
            message:
              action === 'approve'
                ? `Approved — published as /healers/${json.healer_slug}`
                : 'Application rejected.',
          });
          await load();
        }
      } catch (err) {
        setToast({ type: 'error', message: err.message });
      }
      setBusyId(null);
    },
    [load]
  );

  const goToIngestion = () => {
    setTab('ingestion');
    // Runs after the tab has rendered, so the target exists to scroll to.
    requestAnimationFrame(() => {
      ingestionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const accountsAvailable = Array.isArray(overview.profiles);
  const pendingCount = accountsAvailable
    ? overview.profiles.filter(
        (p) => p.verification_status === 'pending' && p.user_type === 'practitioner'
      ).length
    : null;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 flex justify-end">
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-gray-500 transition-colors hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>

        <header className="text-center">
          <h1 className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-4xl font-black tracking-tight text-transparent">
            Spiritpedia Admin
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Review practitioners, watch the numbers, and add content.
          </p>
        </header>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={goToIngestion}
            className="rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 py-4 text-sm font-black uppercase tracking-wide text-slate-950 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            ⚙ Content Ingestion →
          </button>
        </div>

        {/* Horizontally scrollable on narrow screens; the scrollbar is hidden
            because eight tabs on a phone should feel like a swipe, not a
            widget. */}
        <nav className="mt-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
            {TABS.map((t) => {
              const active = tab === t.key;
              const badge = t.key === 'practitioners' && pendingCount ? ` (${pendingCount})` : '';
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-all ${
                    active
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-lg'
                      : t.live
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {t.label}
                  {badge}
                </button>
              );
            })}
          </div>
        </nav>

        {toast && (
          <div
            className={`mt-6 rounded-xl border p-4 text-sm ${
              toast.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/40 bg-red-500/10 text-red-300'
            }`}
          >
            {toast.type === 'success' ? '✅ ' : '⚠️ '}
            {toast.message}
          </div>
        )}

        <div className="mt-8">
          {overview.loading && tab !== 'ingestion' ? (
            <p className="py-16 text-center text-sm text-slate-600">Loading…</p>
          ) : (
            <>
              {tab === 'practitioners' && (
                <PractitionersTab
                  profiles={overview.profiles}
                  onDecision={onDecision}
                  busyId={busyId}
                />
              )}
              {tab === 'accounts' && <AccountsTab profiles={overview.profiles} />}
              {tab === 'messages' && <MessagesTab />}
              {tab === 'claims' && <ClaimsTab profiles={overview.profiles} />}
              {tab === 'flags' && <FlagsTab />}
              {tab === 'mailshots' && <MailshotsTab />}
              {tab === 'stats' && (
                <StatsTab counts={overview.counts} accountsAvailable={accountsAvailable} />
              )}
            </>
          )}

          {/* Kept mounted but hidden rather than unmounted, so a half-filled
              ingestion form is not thrown away by a glance at another tab. */}
          <div ref={ingestionRef} hidden={tab !== 'ingestion'}>
            <ContentIngestion />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <AdminDashboard />
    </Suspense>
  );
}

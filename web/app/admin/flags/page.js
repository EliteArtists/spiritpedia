'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SectionHeading from '@/components/admin/SectionHeading';
import { Placeholder } from '@/components/admin/AdminPlaceholders';
import DataProblem from '@/components/admin/DataProblem';
import { useAdminData } from '@/components/admin/AdminData';

// REPORTED REVIEWS (migration 0015). Members report a review from the app's
// "⋯" menu; each report lands here and in the Inbox, and love@ is emailed at
// once. The Terms promise a decision within 24 hours — App Store guideline 1.2
// asks for exactly that.
//
// Every report carries a snapshot of the review as it was when reported, so
// an author who edits or deletes it afterwards hides nothing. "Now" beside it
// is the review as it currently stands.
//
// Decisions go through PATCH /api/admin/review-reports (service role).

const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'dismissed', label: 'Dismissed' },
  { key: 'bans', label: 'Banned reviewers' },
];

const REASONS = {
  spam: 'Spam or advertising',
  offensive: 'Offensive or hateful',
  harassment: 'Harassment or bullying',
  misleading: 'False or misleading',
  other: 'Something else',
};

const CONTENT_PATHS = {
  book: '/books',
  video: '/videos',
  course: '/offerings',
  free_resource: '/free-resources',
};

function Star({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </svg>
  );
}

function formatWhen(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// How long a report has been waiting, against the 24-hour promise.
function age(value) {
  const hours = (Date.now() - new Date(value).getTime()) / 36e5;
  if (hours < 1) return { label: 'under an hour', late: false };
  if (hours < 24) return { label: `${Math.floor(hours)}h`, late: false };
  return { label: `${Math.floor(hours / 24)}d ${Math.floor(hours % 24)}h`, late: true };
}

const button =
  'rounded-full px-4 py-1.5 text-xs font-bold transition-colors disabled:opacity-40';

export default function AdminReportsPage() {
  const { reload: reloadInbox } = useAdminData();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('open');
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/review-reports', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json.error) return { data: null, error: json.message || json.error };
      return { data: json, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    load().then((result) => {
      if (cancelled) return;
      setData(result.data);
      setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const act = async (key, body, done) => {
    if (busy) return;
    setBusy(key);
    setToast(null);
    try {
      const res = await fetch('/api/admin/review-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setToast({ type: 'error', message: json.message || json.error || `Failed (${res.status})` });
      } else {
        setToast({ type: 'success', message: done });
        const result = await load();
        setData(result.data);
        setError(result.error);
        reloadInbox();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
    setBusy(null);
  };

  const reports = useMemo(() => data?.reports || [], [data]);
  const counts = useMemo(() => {
    const out = { open: 0, resolved: 0, dismissed: 0, bans: data?.bans?.length || 0 };
    for (const r of reports) if (out[r.status] !== undefined) out[r.status] += 1;
    return out;
  }, [reports, data]);
  const rows = useMemo(() => reports.filter((r) => r.status === tab), [reports, tab]);

  return (
    <>
      <SectionHeading
        title="Reports"
        subtitle={
          data
            ? `${counts.open} open · each to be decided within 24 hours`
            : 'Reviews reported by members'
        }
      />

      {error ? (
        <DataProblem error={error} what="Reports" />
      ) : !data ? (
        <Placeholder icon="◴" title="Loading…" />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-1 border-b border-white/10">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  tab === t.key ? 'border-b-2 border-[#7c3aed] text-white' : 'text-slate-500 hover:text-white'
                }`}
              >
                {t.label}
                <span className="ml-2 text-xs tabular-nums opacity-60">{counts[t.key]}</span>
              </button>
            ))}
          </div>

          {toast && (
            <p className={`mb-3 text-xs ${toast.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {toast.message}
            </p>
          )}

          {tab === 'bans' ? (
            data.bans.length === 0 ? (
              <Placeholder icon="○" title="Nobody is banned" />
            ) : (
              <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
                {data.bans.map((ban) => (
                  <li key={ban.user_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200">{ban.email || ban.user_id}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {ban.reason || 'No reason recorded'} · since {formatWhen(ban.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        act(`unban:${ban.user_id}`, { action: 'unban', userId: ban.user_id }, 'Ban lifted. Their old reviews stay down.')
                      }
                      className={`${button} border border-slate-600 text-slate-300 hover:bg-slate-800`}
                    >
                      Lift ban
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : rows.length === 0 ? (
            <Placeholder
              icon="○"
              title={tab === 'open' ? 'Nothing reported' : `No ${tab} reports`}
              body={tab === 'open' ? 'Every report has been dealt with.' : undefined}
            />
          ) : (
            <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
              {rows.map((r) => {
                const path = CONTENT_PATHS[r.content_type];
                const waited = age(r.created_at);
                const now = r.current;
                const key = String(r.id);
                return (
                  <li key={r.id} className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
                        {REASONS[r.reason] || r.reason}
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {r.content_type}
                      </span>
                      {r.status === 'open' && (
                        <span className={`text-xs ${waited.late ? 'font-bold text-red-400' : 'text-slate-500'}`}>
                          waiting {waited.label}
                          {waited.late ? ' — past 24 hours' : ''}
                        </span>
                      )}
                      {r.reported_banned && (
                        <span className="rounded-full border border-slate-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Reviewer banned
                        </span>
                      )}
                    </div>

                    <p className="mt-2 truncate text-xs text-slate-500">
                      {path ? (
                        <Link href={`${path}/${r.content_slug}`} target="_blank" className="text-cyan-400 hover:text-cyan-300">
                          {r.content_slug}
                        </Link>
                      ) : (
                        r.content_slug
                      )}
                    </p>

                    <div className="mt-3 rounded-xl border border-white/10 bg-[#0a0f1d] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        As reported
                      </p>
                      <p className="mt-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <Star
                            key={i}
                            className={`inline h-3.5 w-3.5 ${i < (r.review_rating || 0) ? 'text-amber-400' : 'text-slate-700'}`}
                          />
                        ))}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                        {r.review_body || <span className="italic text-slate-500">No text — rating only</span>}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        by <span className="font-semibold text-slate-400">{r.review_author_name || 'A Spiritpedia member'}</span>
                        {r.reported_email ? ` (${r.reported_email})` : ' (account deleted)'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Now:{' '}
                        {!now
                          ? 'deleted'
                          : now.status === 'approved'
                            ? now.body === r.review_body
                              ? 'still up, unchanged'
                              : 'still up, edited since'
                            : now.status}
                      </p>
                    </div>

                    {r.note && (
                      <p className="mt-2 text-sm text-slate-300">
                        <span className="text-slate-500">Their note: </span>“{r.note}”
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      Reported {formatWhen(r.created_at)} by {r.reporter_email || 'a deleted account'}
                      {r.resolved_at ? ` · ${r.status} ${formatWhen(r.resolved_at)}` : ''}
                    </p>

                    {r.status === 'open' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {now?.status === 'approved' && (
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => act(key, { id: r.id, action: 'reject_review' }, 'Review taken down; report resolved.')}
                            className={`${button} bg-red-600 text-white hover:bg-red-500`}
                          >
                            {busy === key ? '…' : 'Take review down'}
                          </button>
                        )}
                        {r.reported_user_id && !r.reported_banned && (
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => {
                              if (
                                window.confirm(
                                  'Ban this reviewer? They will not be able to post or edit reviews, every review of theirs comes down, and every open report about them is resolved.'
                                )
                              ) {
                                act(key, { id: r.id, action: 'ban' }, 'Reviewer banned; their reviews are down.');
                              }
                            }}
                            className={`${button} border border-red-500/40 text-red-400 hover:bg-red-500/10`}
                          >
                            Ban reviewer
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => act(key, { id: r.id, action: 'dismiss' }, 'Report dismissed — the review stays.')}
                          className={`${button} border border-slate-600 text-slate-300 hover:bg-slate-800`}
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => act(key, { id: r.id, action: 'resolve' }, 'Report marked resolved.')}
                          className={`${button} border border-slate-600 text-slate-300 hover:bg-slate-800`}
                        >
                          Mark resolved
                        </button>
                      </div>
                    )}
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

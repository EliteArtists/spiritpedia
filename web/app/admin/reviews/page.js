'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SectionHeading from '@/components/admin/SectionHeading';
import { Placeholder } from '@/components/admin/AdminPlaceholders';
import DataProblem from '@/components/admin/DataProblem';
import { supabase } from '@/utils/supabase';

// REVIEW MODERATION. Nothing reaches a content page until it is approved here.
//
// Reads go through the anonymous client — which is why this page cannot use it
// for the pending queue. The public policy on reviews is `status = 'approved'`,
// so anon sees approved rows and nothing else, by design. Pending reviews come
// from /api/admin/reviews, which holds the service role.
//
// Writes go through /api/admin/write. The table's trigger pins `status` against
// every ordinary caller on both insert and update, so an author cannot approve
// themselves; the service role is the one path that may set it, and that route
// is where it lives.

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

// Where a review's subject actually lives. The four content types with review
// UI today; healer and publisher are in the table's constraint but have no
// review surface yet, so they fall through to no link rather than a broken one.
const CONTENT_PATHS = {
  book: '/books',
  video: '/videos',
  course: '/offerings',
  free_resource: '/free-resources',
};

const STATUS_STYLES = {
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  approved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  rejected: 'border-red-500/40 bg-red-500/10 text-red-300',
};

function Star({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </svg>
  );
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reviews', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json.error) return { rows: null, error: json.message || json.error };
      return { rows: json.reviews || [], error: null };
    } catch (err) {
      return { rows: null, error: err.message };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    load().then(({ rows, error: loadError }) => {
      if (cancelled) return;
      setReviews(rows);
      setError(loadError);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const setStatus = async (review, status) => {
    if (busyId) return;
    setBusyId(review.id);
    setToast(null);
    try {
      const res = await fetch('/api/admin/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'reviews',
          op: 'update',
          values: { status },
          match: { id: review.id },
          // The row comes back so the change can be CHECKED rather than
          // assumed. A BEFORE UPDATE trigger that rewrites the column returns
          // success and a 200 with nothing altered, and an admin pressing
          // Approve would be told it worked every time while the review stayed
          // in the queue. Ask what the row says now.
          select: 'id, status',
          single: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setToast({ type: 'error', message: json.error || `Failed (${res.status})` });
      } else if (json.data && json.data.status !== status) {
        setToast({
          type: 'error',
          message: `The database refused the change — the review is still ${json.data.status}. The reviews_pin_author trigger freezes status against every caller, including the service role; it needs the role exemption migration 0003 uses.`,
        });
      } else {
        setToast({ type: 'success', message: `Review ${status}.` });
        const { rows, error: reloadError } = await load();
        setReviews(rows);
        setError(reloadError);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
    setBusyId(null);
  };

  const counts = useMemo(() => {
    const out = { pending: 0, approved: 0, rejected: 0 };
    for (const r of reviews || []) if (out[r.status] !== undefined) out[r.status] += 1;
    return out;
  }, [reviews]);

  const rows = useMemo(
    () => (reviews || []).filter((r) => r.status === tab),
    [reviews, tab]
  );

  return (
    <>
      <SectionHeading
        title="Reviews"
        subtitle={
          reviews ? `${counts.pending} awaiting moderation` : 'Community reviews, before they are public'
        }
      />

      {error ? (
        <DataProblem error={error} what="Reviews" />
      ) : !reviews ? (
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
                  tab === t.key
                    ? 'border-b-2 border-[#7c3aed] text-white'
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                {t.label}
                <span className="ml-2 text-xs tabular-nums opacity-60">{counts[t.key]}</span>
              </button>
            ))}
          </div>

          {toast && (
            <p
              className={`mb-3 text-xs ${toast.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {toast.message}
            </p>
          )}

          {rows.length === 0 ? (
            <Placeholder
              icon="○"
              title={tab === 'pending' ? 'Nothing waiting' : `No ${tab} reviews`}
              body={
                tab === 'pending'
                  ? 'Every review submitted has been dealt with.'
                  : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
              {rows.map((review) => {
                const path = CONTENT_PATHS[review.content_type];
                return (
                  <li key={review.id} className="px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>
                            {[0, 1, 2, 3, 4].map((i) => (
                              <Star
                                key={i}
                                className={`inline h-4 w-4 ${
                                  i < review.rating ? 'text-amber-400' : 'text-slate-700'
                                }`}
                              />
                            ))}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              STATUS_STYLES[review.status] || STATUS_STYLES.pending
                            }`}
                          >
                            {review.status}
                          </span>
                          <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {review.content_type}
                          </span>
                        </div>

                        <p className="mt-2 truncate text-xs text-slate-500">
                          {path ? (
                            <Link
                              href={`${path}/${review.content_slug}`}
                              target="_blank"
                              className="text-cyan-400 hover:text-cyan-300"
                            >
                              {review.content_slug}
                            </Link>
                          ) : (
                            review.content_slug
                          )}
                        </p>

                        {review.body && (
                          <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                            {review.body}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-slate-500">
                          {review.author_healer_slug ? (
                            <Link
                              href={`/healers/${review.author_healer_slug}`}
                              target="_blank"
                              className="font-semibold text-violet-400 hover:text-violet-300"
                            >
                              {review.author_name || 'Unnamed'}
                            </Link>
                          ) : (
                            <span className="font-semibold text-slate-400">
                              {review.author_name || 'Unnamed'}
                            </span>
                          )}
                          {' · '}
                          {formatDate(review.created_at)}
                        </p>
                      </div>

                      {/* Approve is offered on anything not already approved,
                          and Reject likewise — a decision made in haste should
                          be reversible from the tab it landed in. */}
                      <div className="flex shrink-0 items-center gap-2">
                        {review.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => setStatus(review, 'approved')}
                            disabled={busyId === review.id}
                            className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
                          >
                            {busyId === review.id ? '…' : 'Approve'}
                          </button>
                        )}
                        {review.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => setStatus(review, 'rejected')}
                            disabled={busyId === review.id}
                            className="rounded-full border border-red-500/40 px-4 py-1.5 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                          >
                            Reject
                          </button>
                        )}
                      </div>
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

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SectionHeading from '@/components/admin/SectionHeading';
import StatStrip from '@/components/admin/StatStrip';
import QueueTable from '@/components/admin/QueueTable';
import QueueReviewer from '@/components/admin/QueueReviewer';
import { useAdminData } from '@/components/admin/AdminData';
import DataProblem from '@/components/admin/DataProblem';
import { Placeholder } from '@/components/admin/AdminPlaceholders';
import { QUEUE_TYPES, buildQueue } from '@/components/admin/queue';

// Filters. The three with no table yet are rendered and disabled rather than
// omitted: the shape of the finished queue is visible, and a count of 0 is not
// claimed for something that has never been measured.
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'application', label: 'Applications' },
  { key: 'claim', label: 'Claims' },
  { key: 'message', label: 'Messages' },
  { key: 'flag', label: 'Flags' },
  { key: 'content', label: 'Content' },
];

export default function AdminInboxPage() {
  const { profiles, loading, reload, accountsAvailable, error } = useAdminData();
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  // FRESH ON EVERY VISIT.
  //
  // The data provider lives in the admin layout, which persists across route
  // changes, so it fetched once per full page load and the Inbox then served
  // whatever it had — an approval made in another tab, or a practitioner who
  // applied while the dashboard was open, simply would not appear. Re-fetching
  // when this page mounts makes clicking Inbox mean "show me what is there
  // now".
  //
  // The ref keeps it to once per mount: reload sets state, and calling it
  // unguarded from an effect would re-run on the render it causes.
  const refreshedRef = useRef(false);
  useEffect(() => {
    if (refreshedRef.current) return;
    refreshedRef.current = true;
    reload();
  }, [reload]);

  const queue = useMemo(() => buildQueue(profiles), [profiles]);
  const visible = useMemo(
    () => (filter === 'all' ? queue : queue.filter((i) => i.type === filter)),
    [queue, filter]
  );
  const selected = visible.find((i) => i.id === selectedId) || null;

  const counts = useMemo(() => {
    const out = { all: queue.length };
    for (const key of Object.keys(QUEUE_TYPES)) {
      out[key] = QUEUE_TYPES[key].live ? queue.filter((i) => i.type === key).length : null;
    }
    return out;
  }, [queue]);

  const decide = useCallback(
    async (item, action, options = {}) => {
      setBusy(true);
      setToast(null);
      try {
        const res = await fetch('/api/admin/practitioner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.profileId, action, ...options }),
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          setToast({ type: 'error', message: json.message || json.error || 'That did not work.' });
          setBusy(false);
          return false;
        }
        setToast({
          type: 'success',
          message:
            action === 'approve'
              ? `Approved — published as /healers/${json.healer_slug}`
              : 'Application rejected.',
        });
        await reload();
        setBusy(false);
        return true;
      } catch (err) {
        setToast({ type: 'error', message: err.message });
        setBusy(false);
        return false;
      }
    },
    [reload]
  );

  const onDecision = useCallback(
    async (item, action, options) => {
      const ok = await decide(item, action, options);
      // A handled item is gone from the queue, so staying on it would show a
      // stale record. Close back to the list.
      if (ok) setSelectedId(null);
    },
    [decide]
  );

  // Approve and move straight on. The next item is read BEFORE the decision,
  // because reload() rebuilds the queue and the index would otherwise point
  // somewhere else by the time we used it.
  const onApproveAndNext = useCallback(
    async (item, options) => {
      const index = visible.findIndex((i) => i.id === item.id);
      const next = visible[index + 1] || null;
      const ok = await decide(item, 'approve', options);
      setSelectedId(ok ? (next?.id ?? null) : item.id);
    },
    [decide, visible]
  );

  return (
    <>
      <SectionHeading
        title="Inbox"
        subtitle={
          // "Nothing waiting" while the data is still in flight is a claim we
          // cannot make yet — and it read as a contradiction next to the
          // Loading panel below it.
          loading
            ? 'Checking the queue…'
            : // With no data, "Nothing waiting" is a claim about an empty queue
              // rather than an unread one.
              !accountsAvailable
              ? 'Queue unavailable'
              : queue.length === 0
                ? 'Nothing waiting'
                : `${queue.length} item${queue.length === 1 ? '' : 's'} in the queue`
        }
      />

      <StatStrip />

      {toast && (
        <div
          className={`mb-5 rounded-xl border p-4 text-sm ${
            toast.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/40 bg-red-500/10 text-red-300'
          }`}
        >
          {toast.type === 'success' ? '✅ ' : '⚠️ '}
          {toast.message}
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.key === 'all' ? counts.all : counts[f.key];
          const live = f.key === 'all' || QUEUE_TYPES[f.key]?.live;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              disabled={!live}
              title={live ? undefined : 'Coming soon'}
              onClick={() => {
                setFilter(f.key);
                setSelectedId(null);
              }}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                active
                  ? 'bg-[#7c3aed] text-white'
                  : live
                    ? 'border border-white/15 text-slate-300 hover:bg-white/5 hover:text-white'
                    : 'cursor-not-allowed border border-white/5 text-slate-600'
              }`}
            >
              {f.label} {live ? `(${count})` : '· soon'}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Placeholder icon="◴" title="Loading…" />
      ) : !accountsAvailable ? (
        <DataProblem error={error} what="The queue" />
      ) : selected ? (
        <QueueReviewer
          items={visible}
          selected={selected}
          onSelect={(item) => setSelectedId(item.id)}
          onClose={() => setSelectedId(null)}
          onDecision={onDecision}
          onApproveAndNext={onApproveAndNext}
          busy={busy}
        />
      ) : visible.length === 0 ? (
        <Placeholder icon="✓" title="Nothing in the queue" body="New applications and claims appear here." />
      ) : (
        <QueueTable items={visible} onOpen={(item) => setSelectedId(item.id)} selectedId={selectedId} />
      )}
    </>
  );
}

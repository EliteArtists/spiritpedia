'use client';

import { useCallback, useEffect, useState } from 'react';

// An explorer's personal discovery editions (B3, migration 0026): the next one
// as it would go today, a test-send to love@, and what has gone before.
// Learning picks arrive already hidden (the Privacy Policy: the team never
// sees what is learned).
const SECTION_NAMES = {
  featured: 'Featured discovery',
  videos: 'More of what you love',
  nearby: 'A little closer to home',
  teacher: 'A voice worth discovering',
  free: 'Something freely shared',
};
const DROPPED = {
  no_subjects: 'no subjects to go on',
  no_person_in_their_subjects: 'nobody to feature in their subjects',
  no_videos_in_their_subjects: 'no new videos in their subjects',
  nobody_near_their_area: 'no Local Hero within 50 km of their area',
  no_area_and_nobody_online: 'no area set, and nobody online in their subjects',
  no_teacher_left: 'no Ascended Master left to show',
  no_free_resource_in_their_subjects: 'no free resource in their subjects',
};
const when = (v) =>
  v ? new Date(v).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function DiscoveriesTab({ personId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/discoveries?id=${encodeURIComponent(personId)}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) return { data: null, error: json.message || json.error || `Failed (${res.status})` };
    return { data: json, error: null };
  }, [personId]);

  useEffect(() => {
    let cancelled = false;
    load().then((r) => {
      if (cancelled) return;
      setData(r.data);
      setError(r.error);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const testSend = async () => {
    if (busy) return;
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/discoveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: personId, action: 'test' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) setToast({ type: 'error', message: json.message || json.error });
      else {
        setToast({ type: 'success', message: `Test sent to ${json.to}.` });
        const r = await load();
        setData(r.data);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
    setBusy(false);
  };

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Building their next edition…</p>;
  const { preview, log } = data;
  const dropped = Object.entries(preview.dropped || {});

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0a0f1d] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Next edition</p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              Edition {preview.editionNumber} · {preview.enough ? 'enough to send' : 'not enough to send'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {!preview.eligible
                ? preview.unsubscribed
                  ? 'They have unsubscribed: nothing will be sent to them.'
                  : 'Not an explorer who can receive editions (practitioner, declined applicant or listing owner).'
                : 'Built from their data as it is now. Picks from personal learning are hidden here.'}
            </p>
          </div>
          <button
            type="button"
            onClick={testSend}
            disabled={busy}
            className="rounded-full bg-[#7c3aed] px-5 py-2 text-xs font-bold text-white hover:bg-[#6d28d9] disabled:opacity-40"
          >
            {busy ? 'Sending…' : 'Test-send to love@'}
          </button>
        </div>
        {toast && (
          <p className={`mt-3 text-xs ${toast.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{toast.message}</p>
        )}
        <p className="mt-4 text-xs text-slate-400">
          <span className="text-slate-500">Subject:</span> {preview.subject} · <span className="text-slate-500">Preview line:</span>{' '}
          {preview.preheader || '—'}
        </p>
        {dropped.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-amber-300/80">
            {dropped.map(([section, why]) => (
              <li key={section}>
                Left out: {SECTION_NAMES[section] || section} — {DROPPED[why] || why}
              </li>
            ))}
          </ul>
        )}
        <iframe
          title="Preview of their next edition"
          srcDoc={preview.html}
          sandbox=""
          className="mt-4 h-[900px] w-full rounded-xl border border-white/10 bg-white"
        />
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Send log</p>
        {log.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No editions yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-white/5 rounded-xl border border-white/10">
            {log.map((row) => (
              <li key={row.id} className="px-4 py-3 text-xs text-slate-300">
                <span className="font-semibold text-white">Edition {row.edition_number}</span> · {row.status}
                {row.status_reason ? ` (${row.status_reason})` : ''} · {when(row.sent_at || row.created_at)}
                <div className="mt-1 text-slate-500">
                  {(row.picks || [])
                    .map((p) => (p.hidden ? `${SECTION_NAMES[p.section]}: hidden (learning)` : `${SECTION_NAMES[p.section]}: ${p.ref}`))
                    .join(' · ') || 'No picks'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

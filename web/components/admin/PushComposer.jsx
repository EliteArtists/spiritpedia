'use client';

import { useCallback, useEffect, useState } from 'react';

// Admin → Notifications (app 1.0.1). A message to everyone with Discoveries
// on, through /api/admin/push-compose: {name} becomes their first name, and
// the no-name version goes to anyone who gave none. It counts toward the
// one-a-week discovery limit, so anyone who had a discovery in the last
// 7 days is skipped, and anyone in quiet hours gets it at 08:00 their time.
// Below it, what the package has sent in the last week, as counts only.
const KIND_NAMES = {
  new_from_saved: 'New from someone saved',
  free_resource: 'Free resource',
  return_first: 'First invitation back',
  return_second: 'Second invitation back',
  first_visit: 'Welcome ("lovely getting to know you")',
  admin: 'Admin messages',
  review_approved: 'Review approved',
  listing_approved: 'Listing approved',
  claim_approved: 'Claim approved',
};

const field =
  'w-full rounded-lg border border-white/10 bg-[#0a0f1d] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[#7c3aed] focus:outline-none';

export default function PushComposer() {
  const [form, setForm] = useState({ title: '', body: '', body_no_name: '', route: '', test_email: '' });
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const needsNoName = form.body.includes('{name}');

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/admin/push-compose', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    return res.ok && !json.error ? json : { error: json.message || json.error || `Failed (${res.status})` };
  }, []);
  const loadStats = () => fetchStats().then(setStats);

  useEffect(() => {
    let cancelled = false;
    fetchStats().then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchStats]);

  const post = async (mode) => {
    if (busy) return;
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/push-compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          body_no_name: form.body_no_name,
          route: form.route,
          ...(mode === 'test' ? { test_email: form.test_email } : {}),
          ...(mode === 'dry' ? { dry: true } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        setToast({ type: 'error', message: json.message || json.error || `Failed (${res.status})` });
      } else if (mode === 'test') {
        setToast({
          type: json.sent ? 'success' : 'error',
          message: json.sent ? `Sent to ${json.sent} device(s) of ${form.test_email}.` : 'That account has no device with notifications on.',
        });
      } else if (mode === 'dry') {
        setToast({
          type: 'success',
          message: `${json.audience} people have Discoveries on. ${json.sent} would get it; ${json.skipped_limit} had a discovery this week and would be skipped.`,
        });
      } else {
        setToast({
          type: 'success',
          message: `Sent to ${json.sent}, waiting for morning for ${json.queued}, skipped ${json.skipped_limit} (weekly limit)${json.failed ? `, ${json.failed} failed` : ''}.`,
        });
        loadStats();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
    setBusy(false);
  };

  const send = () => {
    // The one irreversible action on the page: say who it goes to first.
    if (!window.confirm('Send this to everyone with Discoveries on?')) return;
    post('send');
  };

  const ready = form.body.trim() && (!needsNoName || form.body_no_name.trim());

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">New message</p>
        <p className="mt-1 text-xs text-slate-400">
          Invitations only, never reminders. Goes to everyone with Discoveries on, and counts as their one discovery this
          week. Use {'{name}'} for their first name.
        </p>
        <div className="mt-4 grid gap-3">
          <input className={field} placeholder="Title (optional)" maxLength={60} value={form.title} onChange={set('title')} />
          <textarea
            className={`${field} min-h-[72px]`}
            placeholder="Message, e.g. Happy Diwali, {name}. A little light for the evening."
            maxLength={180}
            value={form.body}
            onChange={set('body')}
          />
          {needsNoName && (
            <textarea
              className={`${field} min-h-[60px]`}
              placeholder="The same message for people who gave no name"
              maxLength={180}
              value={form.body_no_name}
              onChange={set('body_no_name')}
            />
          )}
          <input className={field} placeholder="Opens (optional in-app path, e.g. /subject/meditation)" value={form.route} onChange={set('route')} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            className={`${field} max-w-xs`}
            placeholder="Test to one account (email)"
            value={form.test_email}
            onChange={set('test_email')}
          />
          <button
            type="button"
            onClick={() => post('test')}
            disabled={busy || !ready || !form.test_email.trim()}
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white hover:bg-white/5 disabled:opacity-40"
          >
            Send test
          </button>
          <button
            type="button"
            onClick={() => post('dry')}
            disabled={busy || !ready}
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white hover:bg-white/5 disabled:opacity-40"
          >
            Who would get it?
          </button>
          <button
            type="button"
            onClick={send}
            disabled={busy || !ready}
            className="rounded-full bg-[#7c3aed] px-5 py-2 text-xs font-bold text-white hover:bg-[#6d28d9] disabled:opacity-40"
          >
            {busy ? 'Working…' : 'Send to everyone with Discoveries on'}
          </button>
        </div>
        {toast && <p className={`mt-3 text-xs ${toast.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{toast.message}</p>}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">The last 7 days</p>
        {!stats ? (
          <p className="mt-2 text-sm text-slate-500">Loading…</p>
        ) : stats.error ? (
          <p className="mt-2 text-sm text-red-400">{stats.error}</p>
        ) : (
          <>
            <p className="mt-2 text-xs text-slate-400">
              {stats.devices} accounts with notifications on · {stats.discoveries_on} with Discoveries on · {stats.queued}{' '}
              waiting for their morning
            </p>
            <ul className="mt-3 divide-y divide-white/5 rounded-xl border border-white/10">
              {Object.keys(KIND_NAMES).map((kind) => (
                <li key={kind} className="flex justify-between px-4 py-2 text-xs text-slate-300">
                  <span>{KIND_NAMES[kind]}</span>
                  <span className="tabular-nums text-white">{stats.sent?.[kind] || 0}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

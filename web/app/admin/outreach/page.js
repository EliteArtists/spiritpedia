'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SectionHeading from '@/components/admin/SectionHeading';
import { Placeholder } from '@/components/admin/AdminPlaceholders';
import { RECIPIENT_TYPE_SHORT } from '@/utils/recipientTypes';

// ADMIN → OUTREACH (owner, 11 Nov 2026). Every journey ever started, not just
// the running ones: who was written to, each of the eight emails (sent,
// delivered, bounced), and how it ended — replied, claimed, stopped, or a
// contact made by hand through the listing's form. Filter by kind and by
// state. Journeys are started from a listing's own Outreach tab, and a
// publisher's from the panel here (publishers have no listing record page).
//
// Delivered and bounced come from Resend's webhook, and replied and form
// contacts need migration 0044; before it, the page says so rather than
// showing blanks that read as "nothing was delivered".

const KINDS = [
  { key: 'all', label: 'All kinds' },
  { key: 'individual', label: 'Individuals' },
  { key: 'channel', label: 'Channels' },
  { key: 'app', label: 'Apps' },
  { key: 'organisation', label: 'Organisations' },
  { key: 'school', label: 'Schools' },
  { key: 'publisher', label: 'Publishers' },
];

const STATES = {
  running: { label: 'Running', style: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
  paused: { label: 'Paused', style: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  replied: { label: 'Replied', style: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' },
  claimed: { label: 'Claimed', style: 'border-violet-500/40 bg-violet-500/10 text-violet-300' },
  form: { label: 'Contacted via form', style: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  complete: { label: 'Sequence complete', style: 'border-slate-700 bg-slate-800 text-slate-300' },
  do_not_contact: { label: 'Do not contact', style: 'border-red-500/40 bg-red-500/10 text-red-300' },
  stopped: { label: 'Stopped', style: 'border-slate-700 bg-slate-800 text-slate-400' },
};

const STOP_REASONS = {
  claimed: 'Claimed',
  healer_removed: 'Listing removed',
  no_contact_email: 'Address removed',
  suppressed: 'Bounced or marked as spam',
  sequence_complete: 'All eight sent',
  asked_to_stop: 'Asked to stop',
  removal_requested: 'Asked for removal',
  replied: 'Replied',
  contacted_via_form: 'Contacted via form',
  stopped_by_admin: 'Stopped by admin',
  kind_not_approved: 'Its kind is switched off',
  do_not_contact_address: 'Asked to stop through another listing',
};

function day(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
        active ? 'bg-[#7c3aed] text-white' : 'border border-white/15 text-slate-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function EmailSteps({ journey, trackingReady }) {
  if (journey.channel === 'form') {
    return (
      <p className="text-xs text-slate-400">
        One message sent by hand through{' '}
        {journey.contact_form_url ? (
          <a href={journey.contact_form_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
            the listing&apos;s contact form
          </a>
        ) : (
          'the listing’s contact form'
        )}{' '}
        on {day(journey.started_at)}. Nothing is sent automatically.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
      {journey.schedule.map((step) => (
        <li key={step.number} className="flex items-baseline justify-between gap-3 rounded-lg bg-black/20 px-3 py-1.5 text-xs">
          <span className="text-slate-300">Email {step.number}</span>
          <span className="text-right">
            {step.sentAt ? (
              <>
                <span className="text-emerald-400">Sent {day(step.sentAt)}</span>
                {step.bouncedAt ? (
                  <span className="ml-2 text-red-400">
                    Bounced {day(step.bouncedAt)}
                    {step.bounceType ? ` (${step.bounceType})` : ''}
                  </span>
                ) : step.deliveredAt ? (
                  <span className="ml-2 text-cyan-400">Delivered {day(step.deliveredAt)}</span>
                ) : trackingReady ? (
                  <span className="ml-2 text-slate-500">No delivery report yet</span>
                ) : null}
              </>
            ) : journey.status === 'running' ? (
              <span className="text-slate-500">Due {day(step.dueAt)}</span>
            ) : (
              <span className="text-slate-600">Not sent</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ReplyControl({ journey, trackingReady, onDone }) {
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const send = async (action) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id: journey.id, replied_at: date }),
      });
      const json = await res.json();
      if (!res.ok || json.error) setError(json.message || json.error);
      else await onDone();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  if (!trackingReady) {
    return <p className="text-xs text-amber-300">Mark replied needs migration 0044.</p>;
  }
  if (journey.replied_at) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-cyan-300">Replied {day(journey.replied_at)}</span>
        <button type="button" disabled={busy} onClick={() => send('clear_replied')} className="text-slate-500 underline hover:text-white disabled:opacity-40">
          Undo
        </button>
        {error && <span className="text-red-400">{error}</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <input
        type="date"
        value={date}
        max={today()}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg border border-white/10 bg-[#0a0f1d] px-2 py-1 text-white"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => send('replied')}
        className="rounded-full bg-[#7c3aed] px-4 py-1.5 font-bold text-white hover:bg-[#6d28d9] disabled:opacity-40"
      >
        {busy ? 'Saving…' : 'Mark replied'}
      </button>
      {journey.status !== 'stopped' && <span className="text-slate-500">This stops the automatic emails.</span>}
      {error && <span className="text-red-400">{error}</span>}
    </div>
  );
}

// Whose inbox the address is and where it is published (migration 0048):
// the sending eligibility record the shared copy asks for. Nothing at all
// before 0048 runs (recipientType undefined).
function ContactFacts({ recipientType, source }) {
  if (recipientType === undefined && !source) return null;
  return (
    <span className="mt-0.5 block text-[11px] text-slate-500">
      {recipientType !== undefined && (
        <span className={recipientType && recipientType !== 'unknown' ? 'text-slate-400' : 'text-amber-300'}>
          {RECIPIENT_TYPE_SHORT[recipientType] || 'Inbox type not set'}
        </span>
      )}
      {recipientType !== undefined && ' · '}
      {source ? (
        <a
          href={source}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-cyan-400 hover:text-cyan-300"
        >
          email source
        </a>
      ) : (
        <span className="text-amber-300">no email source</span>
      )}
    </span>
  );
}

// START A JOURNEY FOR A PUBLISHER (owner, 11 Nov 2026). Publishers have no
// listing record page with an Outreach tab, so they are started here: find
// one by name, see its address, where it is published and whose inbox it is,
// and Start. Switched off with the other shared kinds until the owner turns
// them on: the button is then disabled with the reason, and the start route
// refuses anyway.
function PublisherStart({ onStarted }) {
  const [q, setQ] = useState('');
  const [found, setFound] = useState([]);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/journey/publishers?q=${encodeURIComponent(term)}`, { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled) setFound(json.publishers || []);
      } catch {
        if (!cancelled) setFound([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  // Under two letters nothing is searched, and nothing old is shown.
  const results = q.trim().length >= 2 ? found : [];

  const start = async () => {
    if (!picked || picked.blocked || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/journey/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publisher_slug: picked.slug }),
      });
      const json = await res.json();
      if (!res.ok || json.error) setMessage({ type: 'error', text: json.message || json.error });
      else {
        setMessage({
          type: 'success',
          text: json.redirected ? `Email 1 sent to ${json.emailSentTo} — the test address.` : `Email 1 sent to ${json.emailSentTo}.`,
        });
        setPicked(null);
        await onStarted();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setBusy(false);
  };

  return (
    <section className="mb-5 rounded-xl border border-white/10 bg-[#111827] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Start a journey for a publisher</p>
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPicked(null);
          setMessage(null);
        }}
        placeholder="Search publishers by name…"
        className="mt-3 w-full rounded-lg border border-white/10 bg-[#0a0f1d] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[#7c3aed] focus:outline-none"
      />
      {!picked && results.length > 0 && (
        <ul className="mt-2 divide-y divide-white/5 rounded-lg border border-white/10">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setPicked(p)}
                className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm text-white hover:bg-white/5"
              >
                {p.name}
                <span className="font-mono text-[11px] text-slate-500">{p.contact_email || 'no email'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!picked && q.trim().length >= 2 && results.length === 0 && (
        <p className="mt-2 text-xs text-slate-500">No publisher by that name.</p>
      )}
      {picked && (
        <div className="mt-3 space-y-2 text-xs">
          <p className="text-sm font-semibold text-white">{picked.name}</p>
          <p className="text-slate-400">
            {picked.contact_email ? <span className="font-mono">{picked.contact_email}</span> : 'No contact email'}
          </p>
          <ContactFacts recipientType={picked.recipient_type} source={picked.contact_email_source} />
          {picked.blocked && (
            <p className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-slate-300">{picked.blocked}</p>
          )}
          {!picked.blocked &&
            (picked.eligibility?.warnings || []).map((w) => (
              <p key={w} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-amber-300">
                {w}
              </p>
            ))}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={start}
              disabled={busy || Boolean(picked.blocked)}
              title={picked.blocked || undefined}
              className="rounded-full bg-[#7c3aed] px-5 py-2 text-xs font-bold text-white hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Sending…' : 'Start email journey'}
            </button>
            <button type="button" onClick={() => setPicked(null)} className="text-slate-500 underline hover:text-white">
              Choose another
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className={`mt-3 text-xs ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{message.text}</p>
      )}
    </section>
  );
}

export default function AdminOutreachPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [kind, setKind] = useState('all');
  const [state, setState] = useState('all');
  const [open, setOpen] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/journey', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.message || json.error || 'Could not load outreach.');
      setData(json);
      setLoadedAt(new Date());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const journeys = useMemo(() => data?.journeys || [], [data]);
  const visible = journeys.filter((j) => (kind === 'all' || j.kind === kind) && (state === 'all' || j.state === state));
  const stateCounts = useMemo(() => {
    const out = {};
    for (const j of journeys) if (kind === 'all' || j.kind === kind) out[j.state] = (out[j.state] || 0) + 1;
    return out;
  }, [journeys, kind]);

  return (
    <>
      <SectionHeading
        title="Outreach"
        subtitle="Every email journey and form contact, with what happened to each email"
        aside={
          <button
            type="button"
            onClick={load}
            className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white"
          >
            ↻ Refresh
          </button>
        }
      >
        {loadedAt && <span className="text-xs text-slate-500">Updated {loadedAt.toLocaleTimeString('en-GB')}</span>}
      </SectionHeading>

      <p className="mb-5 rounded-xl border border-white/10 bg-[#111827] p-4 text-xs leading-relaxed text-slate-400">
        Journeys are started from a listing&apos;s Outreach tab, and a publisher&apos;s from the panel below. Only individuals can be started for now: the wording for channels, apps,
        organisations, schools and publishers is installed, and those journeys stay switched off until the owner turns
        them on. Delivered and bounced come
        from Resend; opens and clicks are not tracked.
      </p>

      <PublisherStart onStarted={load} />

      {data && !data.trackingReady && (
        <p className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-300">
          Migration 0044 has not been run on this database yet, so replies, form contacts and delivery reports are not
          recorded. Everything else below is accurate.
        </p>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <Pill key={k.key} active={kind === k.key} onClick={() => setKind(k.key)}>
            {k.label}
          </Pill>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        <Pill active={state === 'all'} onClick={() => setState('all')}>
          Any state
        </Pill>
        {Object.entries(STATES).map(([key, s]) => (
          <Pill key={key} active={state === key} onClick={() => setState(key)}>
            {s.label} ({stateCounts[key] || 0})
          </Pill>
        ))}
      </div>

      {error ? (
        <Placeholder icon="⚠" title="Outreach unavailable" body={error} />
      ) : !data ? (
        <Placeholder icon="◴" title="Loading…" />
      ) : visible.length === 0 ? (
        <Placeholder
          icon="✉"
          title={journeys.length ? 'No journeys match these filters' : 'No journeys yet'}
          body={journeys.length ? undefined : 'Start one from a listing’s Outreach tab (Content → a listing → Outreach).'}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#111827]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Emails</th>
                <th className="px-4 py-3">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visible.map((j) => {
                const sent = j.schedule.filter((s) => s.sentAt).length;
                const bounced = j.schedule.some((s) => s.bouncedAt);
                const s = STATES[j.state] || STATES.stopped;
                const expanded = open === j.id;
                return (
                  <Fragment key={j.id}>
                    <tr className="cursor-pointer hover:bg-white/5" onClick={() => setOpen(expanded ? null : j.id)}>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white">{j.name}</span>
                        {j.contact_email && <span className="block font-mono text-[11px] text-slate-500">{j.contact_email}</span>}
                        <ContactFacts recipientType={j.recipient_type} source={j.email_source} />
                      </td>
                      <td className="px-4 py-3 text-xs capitalize text-slate-400">{j.kind}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{day(j.started_at)}</td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {j.channel === 'form' ? 'Form' : `${sent} of 8 sent`}
                        {bounced && <span className="ml-2 text-red-400">bounced</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.style}`}>
                          {s.label}
                        </span>
                        {j.stop_reason && STOP_REASONS[j.stop_reason] !== s.label && (
                          <span className="mt-1 block text-[11px] text-slate-500">{STOP_REASONS[j.stop_reason] || j.stop_reason}</span>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-black/20">
                        <td colSpan={5} className="space-y-4 px-4 py-4">
                          <EmailSteps journey={j} trackingReady={data.trackingReady} />
                          <ReplyControl journey={j} trackingReady={data.trackingReady} onDone={load} />
                          {j.href && (
                            <Link href={j.href} className="inline-block text-xs text-cyan-400 hover:text-cyan-300">
                              Open the listing →
                            </Link>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

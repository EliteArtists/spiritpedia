'use client';

import { useState } from 'react';
import Link from 'next/link';
import { QUEUE_TYPES, isIncomplete, timeAgo } from './queue.js';
import { StatusPill } from './QueueTable.jsx';

const TIERS = [
  { value: 'local_hero', label: 'Local Hero' },
  { value: 'luminary', label: 'Luminary' },
  { value: 'superhero', label: 'Superhero' },
  { value: 'ascended_master', label: 'Ascended Master' },
];

const ENTITY_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'channel', label: 'Channel' },
  { value: 'app', label: 'App' },
];

/* ── LEFT PANE — the queue stays visible while you work ─────────────────── */

function QueueList({ items, selectedId, onSelect }) {
  return (
    <ul className="divide-y divide-white/5">
      {items.map((item) => {
        const meta = QUEUE_TYPES[item.type];
        const active = item.id === selectedId;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className={`flex w-full items-start gap-2 px-4 py-3 text-left transition-colors ${
                active ? 'bg-[#7c3aed]/15' : 'hover:bg-white/5'
              }`}
            >
              <span aria-hidden="true" className="mt-0.5 text-sm">
                {meta?.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">
                  {item.person}
                </span>
                <span className="block truncate text-xs text-slate-500">{item.title}</span>
                <span className="mt-0.5 block text-[10px] text-slate-600">{timeAgo(item.at)}</span>
              </span>
              {active && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#7c3aed]" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ── CENTRE PANE — application ─────────────────────────────────────────── */

function Field({ label, value, mono }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-sm text-white ${mono ? 'break-all font-mono text-xs' : ''}`}>
        {value || <span className="text-slate-600">Not given</span>}
      </dd>
    </div>
  );
}

function ApplicationDetail({ item, busy, onDecision, onApproveAndNext, hasNext }) {
  const p = item.profile;
  const [tier, setTier] = useState('local_hero');
  const [entityType, setEntityType] = useState('individual');
  const [note, setNote] = useState(null);

  const incomplete = isIncomplete(p);
  const place = [p.location_city, p.location_country].filter(Boolean).join(', ');

  return (
    <>
      {/* THE APPROVE FIX.
          Approve was not broken — it was refusing, correctly, and saying so in
          a toast that looked like a failure. The route rejects a profile with
          no full_name, because healer_slug is derived from the name and every
          book, video and route finds a practitioner by that slug; publishing a
          nameless healer would create an unreachable profile. The people it
          refused are exactly the ones who pressed "Skip for now", which writes
          user_type and nothing else.
          So the button is now disabled for them, with the reason stated up
          front, instead of failing after the click. */}
      {incomplete && (
        <div className="mb-5 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="text-sm font-bold text-slate-300">This application is incomplete</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            They started the setup form and pressed &quot;Skip for now&quot;, so there is no name or
            modality to publish. Approving would create a healer profile with no name and no URL
            anyone could reach, so it is blocked until they finish. Message them to nudge, or reject
            if the account looks abandoned.
          </p>
        </div>
      )}

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" value={p.full_name} />
        <Field label="Email" value={p.email} mono />
        <Field label="Modality" value={p.modality} />
        <Field label="Location" value={place} />
        <Field label="Website" value={p.website_url} mono />
        <Field label="Booking" value={p.booking_url} mono />
      </dl>

      {p.bio && (
        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bio</p>
          <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-slate-300">
            {p.bio}
          </p>
        </div>
      )}

      {Array.isArray(p.image_urls) && p.image_urls.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {p.image_urls.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              loading="lazy"
              className="h-16 w-16 rounded-lg border border-white/10 object-cover"
            />
          ))}
        </div>
      )}

      {Array.isArray(p.subject_slugs) && p.subject_slugs.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {p.subject_slugs.map((slug) => (
            <span
              key={slug}
              className="rounded-full border border-slate-700 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400"
            >
              {slug}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Entity type
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            disabled={incomplete}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0a0f1d] px-3 py-2 text-sm font-normal normal-case tracking-normal text-white disabled:opacity-50"
          >
            {ENTITY_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Tier
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            disabled={incomplete}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0a0f1d] px-3 py-2 text-sm font-normal normal-case tracking-normal text-white disabled:opacity-50"
          >
            {TIERS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || incomplete}
          title={incomplete ? 'Needs a name and modality before it can be published' : undefined}
          onClick={() => onDecision(item, 'approve', { tier, entityType })}
          className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Approve
        </button>

        {hasNext && (
          <button
            type="button"
            disabled={busy || incomplete}
            onClick={() => onApproveAndNext(item, { tier, entityType })}
            className="rounded-full bg-[#7c3aed] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Approve &amp; Next →
          </button>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => onDecision(item, 'reject')}
          className="rounded-full border border-red-500/50 px-5 py-2.5 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-40"
        >
          Reject
        </button>

        <button
          type="button"
          onClick={() => setNote('Messaging coming soon')}
          className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:text-white"
        >
          Message
        </button>
        {note && <span className="self-center text-xs text-slate-500">{note}</span>}
      </div>
    </>
  );
}

/* ── CENTRE PANE — claim ───────────────────────────────────────────────── */

function ClaimDetail({ item, busy, onDecision }) {
  const p = item.profile;
  return (
    <>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Account" value={p.email} mono />
        <Field label="Claimed profile" value={p.linked_healer_slug} />
      </dl>

      <Link
        href={`/healers/${p.linked_healer_slug}`}
        target="_blank"
        className="mt-5 inline-block rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-white/5"
      >
        View public profile →
      </Link>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || p.verification_status === 'approved'}
          onClick={() => onDecision(item, 'approve')}
          className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {p.verification_status === 'approved' ? 'Already approved' : 'Approve claim'}
        </button>
        {/* Revoke needs a server path that can clear linked_healer_slug, which
            the trigger pins. Not wired rather than wired to fail silently. */}
        <button
          type="button"
          title="Revoke — coming soon"
          className="cursor-not-allowed rounded-full border border-slate-700 px-5 py-2.5 text-sm font-bold text-slate-600"
        >
          Revoke
        </button>
      </div>
    </>
  );
}

/* ── THE THREE-PANE LAYOUT ─────────────────────────────────────────────── */

export default function QueueReviewer({
  items,
  selected,
  onSelect,
  onClose,
  onDecision,
  onApproveAndNext,
  busy,
}) {
  const index = items.findIndex((i) => i.id === selected?.id);
  const hasNext = index >= 0 && index < items.length - 1;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
      {/* LEFT — hidden on small screens, where the detail takes the whole
          width and Back to queue is the way out. */}
      <aside className="hidden max-h-[75vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#111827] lg:block">
        <p className="border-b border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Queue · {items.length}
        </p>
        <QueueList items={items} selectedId={selected?.id} onSelect={onSelect} />
      </aside>

      <section className="rounded-2xl border border-white/10 bg-[#111827] p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              ← Back to queue
            </button>
            <StatusPill status={selected.status} />
          </div>
          {hasNext && (
            <button
              type="button"
              onClick={() => onSelect(items[index + 1])}
              className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Next item →
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-white">{selected.person}</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {selected.title} · {timeAgo(selected.at)} ago
            </p>
          </div>
          {/* Carries ?from=inbox so Back on the record returns here rather than
              dropping you into a People list you never opened. */}
          <Link
            href={`/admin/people?person=${encodeURIComponent(selected.profileId)}&from=inbox`}
            className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Full record →
          </Link>
        </div>

        <div className="mt-6">
          {selected.type === 'application' ? (
            <ApplicationDetail
              item={selected}
              busy={busy}
              onDecision={onDecision}
              onApproveAndNext={onApproveAndNext}
              hasNext={hasNext}
            />
          ) : (
            <ClaimDetail item={selected} busy={busy} onDecision={onDecision} />
          )}
        </div>
      </section>
    </div>
  );
}

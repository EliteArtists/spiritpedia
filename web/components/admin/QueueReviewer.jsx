'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { QUEUE_TYPES, isIncomplete, timeAgo } from './queue.js';
import { StatusPill } from './QueueTable.jsx';
import ReasonBox from './ReasonBox.jsx';
import { supabase } from '@/utils/supabase';
import { LISTING_TYPES, describedAsLabel, inPersonFrom, suggestedListingType } from '@/utils/listings';
import { isPerson, tierGuidance, tierOptions } from '@/utils/badges';

// The tier dropdown names the tiers for the listing's type: Superhero,
// Luminary, Local Hero for people; Superstar, Shining Star, Rising Star for
// everyone else (utils/badges.js).
function TierField({ entityType, tier, setTier, disabled }) {
  const options = tierOptions(entityType);
  return (
    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
      Tier
      <select
        value={tier}
        onChange={(e) => setTier(e.target.value)}
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0a0f1d] px-3 py-2 text-sm font-normal normal-case tracking-normal text-white disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="mt-1.5 block text-[11px] font-normal normal-case leading-snug tracking-normal text-slate-500">
        {tierGuidance(entityType).join(' · ')}
      </span>
    </label>
  );
}


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
  const [rejecting, setRejecting] = useState(false);
  const p = item.profile;
  const [tier, setTier] = useState('local_hero');
  // Pre-filled from what they said of themselves; "Not sure" or nothing leaves
  // it for the admin to choose (migration 0020).
  const [entityType, setEntityTypeRaw] = useState(() => suggestedListingType(p.described_as));
  // Ascended Master is for people only: a channel falls back to Rising Star.
  const setEntityType = (value) => {
    setEntityTypeRaw(value);
    if (!isPerson(value) && tier === 'ascended_master') setTier('local_hero');
  };
  // A publisher: link one already listed, or '' to create one.
  const [publisherId, setPublisherId] = useState('');
  const [publishers, setPublishers] = useState([]);
  const [note, setNote] = useState(null);

  const incomplete = isIncomplete(p);
  const place = [p.location_city, p.location_country].filter(Boolean).join(', ');
  const { inPerson, online } = inPersonFrom(p.availability_type);
  const isPublisher = entityType === 'publisher';
  const blocked = incomplete || !entityType;
  const options = { tier, entityType, publisherId: isPublisher ? publisherId || null : null };

  useEffect(() => {
    if (!isPublisher || publishers.length) return undefined;
    let cancelled = false;
    supabase
      .from('publishers')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (!cancelled) setPublishers(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, [isPublisher, publishers.length]);

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
            description to publish. Approving would create a healer profile with no name and no URL
            anyone could reach, so it is blocked until they finish. Message them to nudge, or reject
            if the account looks abandoned.
          </p>
        </div>
      )}

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" value={p.full_name} />
        <Field label="Email" value={p.email} mono />
        <Field label="Says they are" value={describedAsLabel(p.described_as)} />
        <Field label="What they do" value={p.modality} />
        <Field
          label="In person"
          value={inPerson ? `Yes${place ? `, ${place}` : ''}${online ? ' · online too' : ''}` : 'No'}
        />
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
          Listing type
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            disabled={incomplete}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0a0f1d] px-3 py-2 text-sm font-normal normal-case tracking-normal text-white disabled:opacity-50"
          >
            {!entityType && <option value="">Choose…</option>}
            {LISTING_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {/* Their own sign-up answer, to file them by. */}
          <span className="mt-1.5 block text-[11px] font-normal normal-case leading-snug tracking-normal text-slate-500">
            They described themselves as: {describedAsLabel(p.described_as) || 'no answer'}
          </span>
        </label>
        <TierField
          entityType={entityType}
          tier={tier}
          setTier={setTier}
          disabled={incomplete || !entityType}
        />
        {isPublisher && (
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Publisher
            <select
              value={publisherId}
              onChange={(e) => setPublisherId(e.target.value)}
              disabled={incomplete}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0a0f1d] px-3 py-2 text-sm font-normal normal-case tracking-normal text-white disabled:opacity-50"
            >
              <option value="">Create a new publisher</option>
              {publishers.map((o) => (
                <option key={o.id} value={o.id}>
                  Link to {o.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || blocked}
          title={
            incomplete
              ? 'Needs a name and a description before it can be published'
              : !entityType
                ? 'Choose the listing type first'
                : undefined
          }
          onClick={() => onDecision(item, 'approve', options)}
          className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Approve
        </button>

        {hasNext && (
          <button
            type="button"
            disabled={busy || blocked}
            onClick={() => onApproveAndNext(item, options)}
            className="rounded-full bg-[#7c3aed] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Approve &amp; Next →
          </button>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => setRejecting((v) => !v)}
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
      {rejecting && (
        <ReasonBox
          title="Decline this application?"
          confirmLabel="Decline and email them"
          busy={busy}
          onConfirm={(reason) => onDecision(item, 'reject', { reason })}
          onCancel={() => setRejecting(false)}
        />
      )}
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

/* ── CENTRE PANE — claim request (migration 0020) ──────────────────────── */

function ClaimRequestDetail({ item, busy, onDecision, onClaimCode, onOwnershipCheck }) {
  const [rejecting, setRejecting] = useState(false);
  const [checkSentAt, setCheckSentAt] = useState(item.request.ownership_check_sent_at || null);
  const r = item.request;
  const listing = r.healers || r.publishers || {};
  const isPublisher = Boolean(r.publisher_id);
  const href = isPublisher ? `/publishers/${listing.slug}` : `/healers/${r.healer_slug}`;
  const [proof, setProof] = useState(listing.contact_email ? 'listing_email' : 'code');
  const [code, setCode] = useState(r.proof_code || null);
  const checkAt = listing.youtube_url || listing.website_url;

  return (
    <>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Asked by" value={r.requester_email} mono />
        <Field label="Listing" value={listing.name} />
        <Field label="Listing's published email" value={listing.contact_email} mono />
        <Field label="Website or channel" value={checkAt} mono />
      </dl>

      <div className="mt-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">How they say they are connected</p>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-300">{r.connection}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={href}
          target="_blank"
          className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-white/5"
        >
          View listing →
        </Link>
        {/* The ownership check (D6): to the listing's own published address,
            from accounts@ with replies to love@. Once per request. A reply is
            for you to read; it grants nothing by itself. */}
        {listing.contact_email ? (
          checkSentAt ? (
            <span className="self-center text-xs text-emerald-300">
              Ownership check sent {new Date(checkSentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{' '}
              to <span className="font-mono">{listing.contact_email}</span>. Replies go to love@.
            </span>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={async () => setCheckSentAt((await onOwnershipCheck(item)) || null)}
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              1. Send ownership check
            </button>
          )
        ) : (
          <span className="self-center text-xs text-slate-500">No published email: use a code.</span>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={async () => setCode((await onClaimCode(item)) || code)}
          className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-white/5 disabled:opacity-40"
        >
          {code ? 'Show the code' : '2. Or make a code'}
        </button>
      </div>

      {code && (
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-sm leading-relaxed text-slate-300">
          <p>
            Code: <span className="font-mono font-bold text-white">{code}</span>
          </p>
          <p className="mt-1 text-slate-400">
            Ask {r.requester_email} to add it to the channel&apos;s About text or the website for a day, then check{' '}
            {checkAt ? (
              <a href={checkAt} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white">
                the listing&apos;s link
              </a>
            ) : (
              'the listing’s link'
            )}
            .
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Confirmed by
          <select
            value={proof}
            onChange={(e) => setProof(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-700 bg-[#0a0f1d] px-3 py-2 text-sm font-normal normal-case tracking-normal text-white"
          >
            <option value="listing_email">The listing&apos;s email replied</option>
            <option value="code">The code is on their channel or site</option>
            <option value="other">Something else</option>
          </select>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDecision(item, 'approve', { proof })}
          className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Approve claim
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setRejecting((v) => !v)}
          className="rounded-full border border-red-500/50 px-5 py-2.5 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-40"
        >
          Reject
        </button>
      </div>
      {rejecting && (
        <ReasonBox
          title="Decline this request?"
          confirmLabel="Decline and email them"
          busy={busy}
          onConfirm={(reason) => onDecision(item, 'reject', { reason })}
          onCancel={() => setRejecting(false)}
        />
      )}
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
  onClaimCode,
  onOwnershipCheck,
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
              key={selected.id}
              item={selected}
              busy={busy}
              onDecision={onDecision}
              onApproveAndNext={onApproveAndNext}
              hasNext={hasNext}
            />
          ) : selected.request ? (
            <ClaimRequestDetail
              key={selected.id}
              item={selected}
              busy={busy}
              onDecision={onDecision}
              onClaimCode={onClaimCode}
              onOwnershipCheck={onOwnershipCheck}
            />
          ) : (
            <ClaimDetail key={selected.id} item={selected} busy={busy} onDecision={onDecision} />
          )}
        </div>
      </section>
    </div>
  );
}

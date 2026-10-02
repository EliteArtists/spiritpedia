'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { StatusPill } from './QueueTable.jsx';
import { deriveStatus, hasVisibleStatus, timeAgo } from './queue.js';
import { Placeholder } from './AdminPlaceholders.jsx';

const TABS = ['Profile', 'Content', 'Admin Notes', 'Activity'];
const STATUSES = ['pending', 'approved', 'rejected'];

const TIER_WORDS = {
  superhero: 'Superhero',
  ascended_master: 'Ascended Master',
  luminary: 'Luminary',
  local_hero: 'Local Hero',
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Field({ label, value, href }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-white">
        {value ? (
          href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-slate-600">Not given</span>
        )}
      </dd>
    </div>
  );
}

/* ── CONTENT TAB ───────────────────────────────────────────────────────── */

function ContentList({ title, items, render }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {title} · {items.length}
      </p>
      <ul className="mt-2 divide-y divide-white/5 rounded-xl border border-white/10">
        {items.map((item) => (
          <li key={item.id} className="px-4 py-2.5 text-sm">
            {render(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContentTab({ healer, content }) {
  if (!healer) {
    return <Placeholder icon="○" title="No profile linked yet" body="Content appears once this practitioner has been approved and a healer profile exists." />;
  }

  const counts = [
    ['Videos', content.videos.length],
    ['Books', content.books.length],
    ['Courses', content.courses.length],
    ['Resources', content.free_resources.length],
  ];
  const total = counts.reduce((sum, [, n]) => sum + n, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {counts.map(([label, n]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-[#0a0f1d] px-4 py-3">
            <p className="text-2xl font-black tabular-nums text-white">{n}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {label}
            </p>
          </div>
        ))}
      </div>

      {total === 0 && (
        <p className="mt-6 text-sm text-slate-500">
          Nothing is tagged to <span className="font-mono text-xs">{healer.healer_slug}</span> yet.
          Add content from the Ingestion section.
        </p>
      )}

      {/* Links go to the public detail pages, which exist. There is no
          per-item editor in Ingestion to link to — that form only adds. */}
      <ContentList
        title="Videos"
        items={content.videos}
        render={(v) =>
          v.platform_url ? (
            <a href={v.platform_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
              {v.title}
            </a>
          ) : (
            <span className="text-white">{v.title}</span>
          )
        }
      />
      <ContentList
        title="Books"
        items={content.books}
        render={(b) => (
          <Link href={`/books/${b.slug}`} target="_blank" className="text-cyan-400 hover:text-cyan-300">
            {b.title}
          </Link>
        )}
      />
      <ContentList
        title="Courses & offerings"
        items={content.courses}
        render={(c) => (
          <Link href={`/offerings/${c.slug}`} target="_blank" className="text-cyan-400 hover:text-cyan-300">
            {c.title}
            {c.product_type ? <span className="ml-2 text-xs text-slate-500">{c.product_type}</span> : null}
          </Link>
        )}
      />
      <ContentList
        title="Free resources"
        items={content.free_resources}
        render={(r) => (
          <Link href={`/free-resources/${r.slug}`} target="_blank" className="text-cyan-400 hover:text-cyan-300">
            {r.title}
            {r.resource_type ? <span className="ml-2 text-xs text-slate-500">{r.resource_type}</span> : null}
          </Link>
        )}
      />
    </>
  );
}

/* ── ADMIN NOTES TAB ───────────────────────────────────────────────────── */

function NotesTab({ personId }) {
  const [notes, setNotes] = useState(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/notes?id=${encodeURIComponent(personId)}`, { cache: 'no-store' });
      const json = await res.json();
      setNotes(json.notes || []);
      if (json.error) setError(json.message || json.error);
    } catch (err) {
      setError(err.message);
      setNotes([]);
    }
  }, [personId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const save = async () => {
    if (!draft.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: personId, body: draft }),
      });
      const json = await res.json();
      if (!res.ok || json.error) setError(json.message || json.error);
      else {
        setDraft('');
        await load();
      }
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <>
      <p className="mb-4 text-xs text-slate-500">
        Internal only. These are never shown to the person they are about.
      </p>

      <div className="rounded-xl border border-white/10 bg-[#0a0f1d] p-4">
        <label htmlFor="note" className="sr-only">
          New note
        </label>
        <textarea
          id="note"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note…"
          className="w-full resize-y rounded-lg border border-white/10 bg-[#111827] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[#7c3aed] focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          {error ? <span className="text-xs text-red-400">{error}</span> : <span />}
          <button
            type="button"
            onClick={save}
            disabled={saving || !draft.trim()}
            className="rounded-full bg-[#7c3aed] px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </div>

      {notes === null ? (
        <p className="mt-5 text-sm text-slate-500">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">No notes yet.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-white/10 bg-[#0a0f1d] p-4">
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{n.body}</p>
              <p className="mt-2 text-[11px] text-slate-600">
                {n.created_by || 'Admin'} · {formatDate(n.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ── THE RECORD ────────────────────────────────────────────────────────── */

export default function PersonRecord({ personId, onBack, backLabel, onChanged }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Profile');
  const [status, setStatus] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/person?id=${encodeURIComponent(personId)}`, { cache: 'no-store' });
    const json = await res.json();
    setData(json);
    setStatus(json?.profile?.verification_status || 'pending');
  }, [personId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/person?id=${encodeURIComponent(personId)}`, { cache: 'no-store' });
      const json = await res.json();
      if (cancelled) return;
      setData(json);
      setStatus(json?.profile?.verification_status || 'pending');
    })();
    return () => {
      cancelled = true;
    };
  }, [personId]);

  if (!data) return <Placeholder icon="◴" title="Loading record…" />;
  if (data.error) return <Placeholder icon="⚠" title="Could not load this record" body={data.message || data.error} />;

  const p = data.profile;
  const healer = data.healer;
  const practitioner = p.user_type === 'practitioner';
  const initial = ((p.full_name || p.email || '?').trim()[0] || '?').toUpperCase();
  const place = [p.location_city, p.location_country].filter(Boolean).join(', ');

  // "Unnamed account" was accurate and useless — most explorers never give a
  // name, so the whole list read the same. The email's local part is what the
  // person actually calls themselves, and it is already on screen beneath.
  const displayName =
    (p.full_name || '').trim() || (p.email ? p.email.split('@')[0] : '') || 'Explorer';

  // An explorer has one profile picture; a practitioner has a gallery, because
  // a listing is judged on more than one photograph. The extras are kept in the
  // database either way — someone rejected back to explorer keeps what they
  // uploaded, and gets it back if they resubmit — they are simply not shown.
  const allImages = Array.isArray(p.image_urls) ? p.image_urls.filter(Boolean) : [];
  const images = practitioner ? allImages : allImages.slice(0, 1);

  const saveStatus = async () => {
    setSavingStatus(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/person', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: personId, verification_status: status }),
      });
      const json = await res.json();
      if (!res.ok || json.error) setToast({ type: 'error', message: json.message || json.error });
      else {
        setToast({ type: 'success', message: `Status set to ${status}.` });
        await load();
        onChanged?.();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
    setSavingStatus(false);
  };

  const visibleTabs = practitioner ? TABS : TABS.filter((t) => t !== 'Profile' && t !== 'Content');

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 rounded-full border border-white/15 px-4 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
      >
        ← {backLabel}
      </button>

      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5 md:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-xl font-bold text-white">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-white">{displayName}</h3>
            <p className="break-all text-sm text-slate-400">{p.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  practitioner
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                {practitioner ? 'Practitioner' : 'Explorer'}
              </span>
              {hasVisibleStatus(p) && <StatusPill status={deriveStatus(p)} />}
              {healer && (
                <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                  {TIER_WORDS[healer.tier] || healer.tier}
                </span>
              )}
            </div>
            {/* The images they uploaded. The Inbox reviewer already showed
                these; the record is where someone looks when deciding what a
                person actually is, and it was the one place they were missing. */}
            {images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {images.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 rounded-lg border border-white/10 object-cover transition-transform hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            )}

            <p className="mt-2 text-xs text-slate-600">
              Member since {formatDate(p.created_at)}
              {p.last_sign_in_at ? ` · last seen ${timeAgo(p.last_sign_in_at)} ago` : ''}
            </p>
          </div>

          {healer && (
            <Link
              href={`/healers/${healer.healer_slug}`}
              target="_blank"
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/5"
            >
              Open public profile →
            </Link>
          )}
        </div>

        {/* ACTIONS. Edit Status is wired because it is reversible and the
            service role is the only thing that may write that column. Message
            has no table yet. Delete Account is NOT wired: it cascades through
            the profile, saved favourites and these notes, and it deletes the
            auth user — irreversible from here and far too much to hang off one
            click without a typed confirmation. */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5">
          {/* Verification belongs to practitioners. An explorer is not pending,
              approved or rejected — they have an account — and offering a
              dropdown would invite setting a state that means nothing, on a row
              that may still carry a stale 'rejected' from a review cycle that
              ended when they were reverted. */}
          {hasVisibleStatus(p) && (
            <>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="ml-2 rounded-lg border border-slate-700 bg-[#0a0f1d] px-3 py-1.5 text-sm font-normal normal-case tracking-normal text-white"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={saveStatus}
                disabled={savingStatus || status === p.verification_status}
                className="rounded-full bg-[#7c3aed] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savingStatus ? 'Saving…' : 'Save status'}
              </button>
            </>
          )}
          <button
            type="button"
            title="Messaging coming soon"
            className="cursor-not-allowed rounded-full border border-slate-700 px-4 py-2 text-xs font-bold text-slate-600"
          >
            Message
          </button>
          <button
            type="button"
            title="Deleting an account removes their profile, saved library and notes and cannot be undone — needs a confirmation step before it is wired"
            className="cursor-not-allowed rounded-full border border-red-500/20 px-4 py-2 text-xs font-bold text-red-500/40"
          >
            Delete account
          </button>
        </div>

        {toast && (
          <p
            className={`mt-3 text-xs ${toast.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {toast.message}
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-1 border-b border-white/10">
        {visibleTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t
                ? 'border-b-2 border-[#7c3aed] text-white'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === 'Profile' && practitioner && (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Modality" value={p.modality} />
            <Field label="Location" value={place} />
            <Field label="Website" value={p.website_url} href={p.website_url} />
            <Field label="Booking" value={p.booking_url} href={p.booking_url} />
            <Field label="Availability" value={p.availability_type} />
            <Field label="Entity type" value={healer?.entity_type} />
            <Field
              label="Linked healer"
              value={p.linked_healer_slug}
              href={p.linked_healer_slug ? `/healers/${p.linked_healer_slug}` : undefined}
            />
            <Field label="YouTube" value={p.youtube_url} href={p.youtube_url} />
            <Field label="Instagram" value={p.instagram_url} href={p.instagram_url} />
            <Field label="Facebook" value={p.facebook_url} href={p.facebook_url} />
            <Field label="TikTok" value={p.tiktok_url} href={p.tiktok_url} />
            <Field label="X" value={p.twitter_url} href={p.twitter_url} />
            {p.bio && (
              <div className="sm:col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bio</dt>
                <dd className="mt-1 max-h-48 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-slate-300">
                  {p.bio}
                </dd>
              </div>
            )}
            {Array.isArray(p.subject_slugs) && p.subject_slugs.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Subjects
                </dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {p.subject_slugs.map((slug) => (
                    <span
                      key={slug}
                      className="rounded-full border border-slate-700 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400"
                    >
                      {slug}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        )}

        {tab === 'Content' && practitioner && <ContentTab healer={healer} content={data.content} />}
        {tab === 'Admin Notes' && <NotesTab personId={personId} />}
        {tab === 'Activity' && <Placeholder icon="◷" title="Activity log coming soon" />}
      </div>
    </>
  );
}

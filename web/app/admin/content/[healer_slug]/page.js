'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ClosedAccountBanner from '@/components/admin/ClosedAccountBanner';
import SectionHeading from '@/components/admin/SectionHeading';
import { Placeholder } from '@/components/admin/AdminPlaceholders';
import DataProblem from '@/components/admin/DataProblem';
import { useAdminData } from '@/components/admin/AdminData';
import CardImage from '@/components/CardImage';
import ConfirmDelete from '@/components/admin/ConfirmDelete';
import DoNotContactButton from '@/components/admin/DoNotContactButton';
import ImageField from '@/components/admin/ImageField';
import HubTeachers from '@/components/admin/HubTeachers';
import { supabase } from '@/utils/supabase';
import { tierGuidance, tierName, tierOptions } from '@/utils/badges';
import { RECIPIENT_TYPE_OPTIONS } from '@/utils/recipientTypes';
import { ITEM_TABLES } from '@/utils/listingEdit';

// ONE HEALER RECORD — read, and edit the fields that are safe to edit here.
//
// Reads use the shared anonymous client: healers, videos and books are public
// tables and this is public data. The write goes through /api/admin/write,
// which holds the service role and the admin cookie — the anon key has had no
// write grant on any content table since migration 0007.

const TABS = ['Profile', 'Content', 'Outreach', 'Admin Notes'];


const ENTITY_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'channel', label: 'Channel' },
  { value: 'app', label: 'App' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'school', label: 'School' },
];

// The three labels the ingestion form writes. The column is free text and six
// distinct values are in the table, so the current value is added to this list
// when it is not one of them — a dropdown that silently rewrote the strays on
// the next save would be worse than the drift it was trying to tidy.
const AVAILABILITY = [
  'Worldwide (Famous Names)',
  'Local Only (In-Person)',
  'Local & Online Sessions',
];

// Everything the form may write. healer_slug is deliberately absent: videos and
// books find their healer by that text, not by a foreign key, so renaming it
// would orphan every piece of content tagged to this profile and break the
// public URL. Changing it is a migration, not a field edit.
const TEXT_FIELDS = [
  ['name', 'Name'],
  ['contact_email', 'Contact email'],
  // Where the email is published (never guessed), and the contact form used
  // when there is none. Migration 0039; the email pass of 5 Nov 2026 fills them.
  ['contact_email_source', 'Email source (page URL)'],
  ['contact_form_url', 'Contact form'],
  ['contact_phone', 'Contact phone'],
  ['website_url', 'Website'],
  ['booking_url', 'Booking URL'],
  ['youtube_url', 'YouTube'],
  ['instagram_url', 'Instagram'],
  ['facebook_url', 'Facebook'],
  ['tiktok_url', 'TikTok'],
  ['twitter_url', 'X / Twitter'],
  ['city', 'City'],
  ['country', 'Country'],
];

const NUMBER_FIELDS = [
  ['birth_year', 'Born'],
  ['death_year', 'Died'],
  ['ad_rank_score', 'Ad rank score'],
  ['founded_year', 'Founded (schools)'],
];

const EDITABLE = [
  ...TEXT_FIELDS.map(([k]) => k),
  ...NUMBER_FIELDS.map(([k]) => k),
  'bio',
  'tier',
  'entity_type',
  'availability_type',
  'subject_slugs',
  'image_urls',
  'image_url',
  'is_famous',
  // Whose inbox contact_email is (migration 0048). Before 0048 the row has
  // no such key and nothing is ever sent for it.
  'contact_recipient_type',
  // No 'official' or 'verified': both set themselves from the account linked to
  // the listing (migration 0023), and the database ignores anything sent.
];

const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#0a0f1d] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[#7c3aed] focus:outline-none';

const labelClass = 'text-[10px] font-bold uppercase tracking-wider text-slate-500';

function LabelledField({ label, children }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div>
      <dt className={labelClass}>{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-white">
        {value || <span className="text-slate-600">Not given</span>}
      </dd>
    </div>
  );
}

/* ── CONTENT TAB ───────────────────────────────────────────────────────── */

// WHERE A ROW'S PICTURE LIVES, which is not the same column twice. Books keep
// it in mock_cover_url; courses and free resources in image_url. Videos have no
// column at all — their thumbnail is derived from the YouTube id in
// platform_url at render time, so there is nothing to store and nothing to edit.
const IMAGE_COLUMN = {
  videos: null,
  books: 'mock_cover_url',
  courses: 'image_url',
  free_resources: 'image_url',
};

function youTubeThumb(platformUrl) {
  const match = platformUrl?.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}

// The 40×40 at the head of a row, and the field that replaces it.
//
// SHOWING IT IS HALF THE POINT. 577 rows across these tables point at
// encrypted-tbn0.gstatic.com — Google's image cache rather than a publisher's
// own host. Those resolve today and are not a promise; when they stop, the
// public cards fall back to a placeholder and say nothing. A thumbnail here is
// where that becomes visible.
//
// CardImage is reused rather than a bare <img> so a dead URL renders exactly
// the placeholder the public site renders, and for the reason that component
// exists: an <img> that fails before hydration never fires onError, so a
// complete-check is needed as well.
// Which table a row with a picture belongs to, for the upload's folder.
const tableForImage = (column, item) =>
  column === 'mock_cover_url' ? 'books' : item.resource_type !== undefined ? 'free_resources' : 'courses';

function RowThumb({ item, column, onSave, saving, slug }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);

  const stored = column ? item[column] : null;
  const src = column ? stored : youTubeThumb(item.platform_url);
  const readOnly = !column;

  const open = () => {
    if (readOnly) return;
    setValue(stored || '');
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const next = value.trim();
    // Empty clears the picture, which is a legitimate thing to want. Anything
    // else has to look like a URL — a pasted filename would render as a broken
    // image on every public card and nowhere say why.
    if (next && !/^https?:\/\//i.test(next)) {
      setError('That does not look like a URL.');
      return;
    }
    const ok = await onSave(item, column, next || null);
    if (ok) setEditing(false);
    else setError('Could not save that.');
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={readOnly}
        title={readOnly ? 'Thumbnail comes from YouTube' : 'Change image'}
        aria-label={readOnly ? undefined : `Change image for ${item.title}`}
        className={`h-10 w-10 shrink-0 overflow-hidden rounded border border-white/10 bg-[#0a0f1d] ${
          readOnly ? 'cursor-default' : 'cursor-pointer transition-colors hover:border-[#7c3aed]'
        }`}
      >
        <CardImage
          src={src}
          alt=""
          className="h-full w-full object-cover"
          fallbackEmoji="▦"
          fallbackClassName="flex h-full w-full items-center justify-center text-slate-700"
        />
      </button>

      {editing && (
        <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-xl border border-white/10 bg-[#111827] p-3 shadow-xl">
          <ImageField
            value={value}
            autoFocus
            onChange={setValue}
            kind={tableForImage(column, item)}
            slug={slug}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') setEditing(false);
            }}
            placeholder="https://… — or Upload; leave empty to remove the image"
            inputClass="w-full rounded-lg border border-white/10 bg-[#0a0f1d] px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-[#7c3aed] focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-red-400">{error || ''}</span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-full bg-[#7c3aed] px-4 py-1 text-[11px] font-bold text-white hover:bg-[#6d28d9] disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </span>
          </div>
        </div>
      )}
    </>
  );
}

// One row's editor, under the row: the fields its table lets the admin change
// (utils/listingEdit.js → ITEM_TABLES). Only what changed is sent, and the
// route checks it again.
function ItemEditor({ table, item, onSave, onCancel, slug }) {
  const fields = ITEM_TABLES[table].fields;
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.name, item[f.name] ?? '']))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    const changed = Object.fromEntries(
      fields
        .filter((f) => String(values[f.name] ?? '').trim() !== String(item[f.name] ?? '').trim())
        .map((f) => [f.name, values[f.name]])
    );
    if (!Object.keys(changed).length) {
      onCancel();
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onSave(item, changed);
    setSaving(false);
    if (result !== true) setError(result || 'Could not save that.');
  };

  return (
    <div className="mt-2 w-full rounded-xl border border-white/10 bg-[#111827] p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.name} className={f.long || f.url ? 'sm:col-span-2' : ''}>
            <LabelledField label={f.label}>
              {f.long ? (
                <textarea
                  rows={4}
                  value={values[f.name]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  className={inputClass}
                />
              ) : f.label === 'Image' ? (
                <ImageField
                  value={values[f.name]}
                  onChange={(url) => setValues((v) => ({ ...v, [f.name]: url }))}
                  kind={table}
                  slug={slug}
                  placeholder="https://… — or Upload; leave empty to remove"
                  inputClass={inputClass}
                />
              ) : (
                <input
                  type="text"
                  value={values[f.name]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  placeholder={f.url ? 'https://…' : f.required ? '' : 'Leave empty to remove'}
                  className={inputClass}
                />
              )}
            </LabelledField>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-red-400">{error || ''}</span>
        <span className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-[#7c3aed] px-4 py-1 text-[11px] font-bold text-white hover:bg-[#6d28d9] disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </span>
      </div>
    </div>
  );
}

function ContentList({ title, table, items, render, onRemove, onEdit, imageColumn, onSaveImage, savingImageId, slug }) {
  const [editingId, setEditingId] = useState(null);
  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <p className={labelClass}>
        {title} · {items.length}
      </p>
      <ul className="mt-2 divide-y divide-white/5 rounded-xl border border-white/10">
        {items.map((item) => (
          <li key={item.id} className="group/row relative px-4 py-2.5 text-sm">
            {/* relative on the row, so the image panel can anchor to it rather
                than to the page. */}
            <div className="flex items-center gap-3">
              <RowThumb
                item={item}
                column={imageColumn}
                onSave={onSaveImage}
                saving={savingImageId === item.id}
                slug={slug}
              />
              <span className="min-w-0 flex-1">{render(item)}</span>
              {/* Quiet until the row is hovered (always shown on a phone, which has
                  no hover), so a list of fifty videos reads
                  as a list; reachable by keyboard regardless. */}
              <button
                type="button"
                onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                aria-label={`Edit ${item.title}`}
                title="Edit"
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-slate-500 transition-all hover:bg-white/5 hover:text-white focus:opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onRemove(table, item)}
                aria-label={`Remove ${item.title}`}
                title="Remove"
                className="shrink-0 rounded-full p-1.5 text-slate-600 transition-all hover:bg-red-500/10 hover:text-red-400 focus:opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                  className="h-4 w-4"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {editingId === item.id && (
              <ItemEditor
                table={table}
                item={item}
                slug={slug}
                onCancel={() => setEditingId(null)}
                onSave={async (row, values) => {
                  const result = await onEdit(table, row, values);
                  if (result === true) setEditingId(null);
                  return result;
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function when(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  });
}

// THE "KEEP MINIMAL" LOCK (migration 0053). While it is on, nothing can be
// added to this listing: the database refuses, and the sprint, restore,
// image-fix and ingest scripts check first and skip it. Removing and editing
// still work.
function LockPanel({ edits, onChange }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const lock = edits?.lock;

  if (!edits) return null;
  if (!edits.ready) {
    return (
      <div className="mb-5 rounded-xl border border-white/10 bg-[#0a0f1d] px-4 py-3 text-xs text-slate-500">
        The keep-minimal lock and the change log need migration 0053 on this database. Edits and
        removals below still work; they aren&apos;t logged until then.
      </div>
    );
  }

  const toggle = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/listing-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: lock.locked ? 'unlock' : 'lock', slug: edits.slug, note }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || json.error) {
      setError(json.message || json.error || 'Could not change the lock.');
      return;
    }
    setNote('');
    onChange();
  };

  return (
    <div
      className={`mb-5 rounded-xl border px-4 py-3 ${
        lock.locked ? 'border-amber-500/40 bg-amber-500/10' : 'border-white/10 bg-[#0a0f1d]'
      }`}
    >
      <p className="text-sm font-semibold text-white">
        {lock.locked ? '🔒 Locked: keep minimal' : 'Not locked'}
      </p>
      <p className="mt-0.5 text-xs text-slate-400">
        {lock.locked
          ? `${lock.note} · since ${when(lock.at)}. Nothing can be added to this listing until the lock is switched off.`
          : 'Switch the lock on when the owner asks for changes or removals, so no sprint, restore, image fix or ingest adds items back.'}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={lock.locked ? 'Why it is being switched off (optional)' : edits.defaultNote}
          className={inputClass}
        />
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-40 ${
            lock.locked ? 'border border-white/20 hover:bg-white/5' : 'bg-amber-600 hover:bg-amber-500'
          }`}
        >
          {busy ? 'Saving…' : lock.locked ? 'Switch lock off' : 'Switch lock on'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

// What was changed here and when, newest first (admin_edit_log, 0053). A
// removal keeps the rows as they were, under "What was removed", so anything
// can be put back by hand.
function ChangeLog({ edits }) {
  if (!edits?.ready) return null;
  return (
    <div className="mt-8">
      <p className={labelClass}>Change log · {edits.log.length}</p>
      {edits.log.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No changes made here yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-white/5 rounded-xl border border-white/10">
          {edits.log.map((entry) => (
            <li key={entry.id} className="px-4 py-2.5 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-white">{entry.summary}</span>
                <span className="text-xs text-slate-500">
                  {when(entry.created_at)}
                  {entry.created_by ? ` · ${entry.created_by}` : ''}
                </span>
              </div>
              {entry.note && <p className="mt-0.5 text-xs text-slate-400">{entry.note}</p>}
              {(entry.before || entry.after) && entry.action !== 'lock' && entry.action !== 'unlock' && (
                <details className="mt-1 text-xs text-slate-500">
                  <summary className="cursor-pointer">
                    {entry.action === 'edit' ? 'Before and after' : 'What was removed'}
                  </summary>
                  <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[#0a0f1d] p-2 font-mono text-[11px] text-slate-400">
                    {JSON.stringify(entry.action === 'edit' ? { before: entry.before, after: entry.after } : entry.before, null, 2)}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// EVERYTHING A LISTING HAS, which takes two different joins.
//
// Videos and books carry the healer's text slug; courses and free resources
// carry the bigint id. Two keys, four tables — and the reason this tab showed
// only half of it for so long is that it was handed the slug alone, so the two
// id-keyed tables were simply never asked for.
//
// NOTHING IS FILTERED BY is_active OR end_date, deliberately. The public pages
// hide an expired offering because a visitor cannot buy it; an admin screen
// that did the same would be lying about what the database holds.
//
// EVERY CHANGE goes through /api/admin/listing-edit (owner, 18 Nov 2026),
// which checks the item is this listing's and writes the change log.
const CONTENT_KEY = { videos: 'videos', books: 'books', courses: 'courses', free_resources: 'resources' };

function ContentTab({ slug, healerId, edits, onEditsChange }) {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);

  // What awaits confirmation: { table, item } for one, { table, all: n } for
  // every item of a type. One at a time.
  const [pending, setPending] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(null);
  const [notice, setNotice] = useState(null);

  // The row whose image is being written, so only that thumbnail says "Saving…".
  const [savingImageId, setSavingImageId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [videos, books, courses, resources] = await Promise.all([
        supabase.from('videos').select('*').eq('healer_slug', slug),
        supabase.from('books').select('*').eq('healer_slug', slug),
        supabase.from('courses').select('*').eq('healer_id', healerId),
        supabase.from('free_resources').select('*').eq('healer_id', healerId),
      ]);
      if (cancelled) return;
      const failure = videos.error || books.error || courses.error || resources.error;
      if (failure) setError(failure.message);
      else
        setContent({
          videos: videos.data || [],
          books: books.data || [],
          courses: courses.data || [],
          resources: resources.data || [],
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, healerId]);

  const send = async (payload) => {
    const res = await fetch('/api/admin/listing-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, ...payload }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) return { error: json.message || json.error || `Failed (${res.status})` };
    // Before 0053 a change isn't logged; say so once rather than silently.
    setNotice(json.logged === false && !edits?.ready ? 'Done. Not logged: the change log needs migration 0053.' : null);
    onEditsChange();
    return json;
  };

  // The list is corrected in place rather than refetched: four queries to
  // redraw a list we already hold would flash the whole tab.
  const editItem = async (table, item, values) => {
    const json = await send({ action: 'edit', table, id: item.id, values });
    if (json.error) return json.error;
    const key = CONTENT_KEY[table];
    setContent((prev) => ({
      ...prev,
      [key]: prev[key].map((row) => (row.id === item.id ? { ...row, ...json.item } : row)),
    }));
    return true;
  };

  // The thumbnail's own editor, through the same route, so it is logged too.
  // books keep the picture in mock_cover_url, offerings and free resources in
  // image_url; the row's shape says which table it is.
  const saveImage = async (item, column, url) => {
    if (!column || savingImageId) return false;
    const table = tableForImage(column, item);
    setSavingImageId(item.id);
    const result = await editItem(table, item, { [column]: url || '' });
    setSavingImageId(null);
    return result === true;
  };

  const confirmRemove = async () => {
    if (!pending || removing) return;
    setRemoving(true);
    setRemoveError(null);
    const { table, item } = pending;
    const json = await send(item ? { action: 'remove', table, id: item.id } : { action: 'remove_all', table });
    setRemoving(false);
    if (json.error) {
      setRemoveError(json.error);
      return;
    }
    const key = CONTENT_KEY[table];
    setContent((prev) => ({ ...prev, [key]: item ? prev[key].filter((row) => row.id !== item.id) : [] }));
    setPending(null);
  };

  const askRemove = (table, item) => {
    setRemoveError(null);
    setPending({ table, item });
  };

  if (error) return <DataProblem error={error} what="This listing's content" />;
  if (!content) return <Placeholder icon="◴" title="Loading content…" />;

  // One table, split by product_type, using the same rule as the public subject
  // page so the two can never disagree about what a thing is. Courses is the
  // catch-all: membership, meditation, podcast and a null type land there.
  const retreats = content.courses.filter((c) => c.product_type === 'retreat');
  const downloads = content.courses.filter((c) => c.product_type === 'download');
  const courses = content.courses.filter(
    (c) => c.product_type !== 'retreat' && c.product_type !== 'download'
  );

  const counts = [
    ['Videos', content.videos.length],
    ['Books', content.books.length],
    ['Courses', courses.length],
    ['Retreats', retreats.length],
    ['Downloads', downloads.length],
    ['Free Resources', content.resources.length],
  ];
  const total = counts.reduce((sum, [, n]) => sum + n, 0);

  // "Remove all" by table: offerings are courses, retreats and downloads together.
  const removeAll = [
    ['videos', content.videos.length],
    ['books', content.books.length],
    ['courses', content.courses.length],
    ['free_resources', content.resources.length],
  ].filter(([, n]) => n > 0);

  // Offerings all resolve under /offerings/[slug] whatever their product_type.
  const offeringLink = (item) => (
    <Link href={`/offerings/${item.slug}`} target="_blank" className="text-cyan-400 hover:text-cyan-300">
      {item.title}
      {item.product_type && item.product_type !== 'course' ? (
        <span className="ml-2 text-xs text-slate-500">{item.product_type}</span>
      ) : null}
      {item.price ? <span className="ml-2 text-xs text-slate-500">{item.price}</span> : null}
    </Link>
  );

  const list = { onRemove: askRemove, onEdit: editItem, onSaveImage: saveImage, savingImageId, slug };
  const pendingNoun = pending ? ITEM_TABLES[pending.table] : null;
  const pendingCount = pending && !pending.item ? content[CONTENT_KEY[pending.table]].length : 0;

  return (
    <>
      <LockPanel edits={edits ? { ...edits, slug } : null} onChange={onEditsChange} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {counts.map(([label, n]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-[#0a0f1d] px-4 py-3">
            <p className="text-2xl font-black tabular-nums text-white">{n}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {label}
            </p>
          </div>
        ))}
      </div>

      {removeAll.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={labelClass}>Remove all</span>
          {removeAll.map(([table, n]) => (
            <button
              key={table}
              type="button"
              onClick={() => askRemove(table, null)}
              className="rounded-full border border-red-500/30 px-3 py-1 text-[11px] font-bold text-red-400 transition-colors hover:bg-red-500/10"
            >
              {ITEM_TABLES[table].plural} ({n})
            </button>
          ))}
        </div>
      )}

      {notice && <p className="mt-3 text-xs text-amber-300">{notice}</p>}

      {total === 0 && (
        <p className="mt-6 text-sm text-slate-500">
          Nothing is tagged to <span className="font-mono text-xs">{slug}</span> yet.
          {edits?.lock?.locked ? ' The listing is locked, so nothing can be added.' : ' Add content from the Ingestion section.'}
        </p>
      )}

      <ContentList
        title="Videos"
        table="videos"
        items={content.videos}
        imageColumn={IMAGE_COLUMN.videos}
        {...list}
        render={(v) =>
          v.slug ? (
            <Link href={`/videos/${v.slug}`} target="_blank" className="text-cyan-400 hover:text-cyan-300">
              {v.title}
            </Link>
          ) : (
            <span className="text-white">{v.title}</span>
          )
        }
      />
      <ContentList
        title="Books"
        table="books"
        items={content.books}
        imageColumn={IMAGE_COLUMN.books}
        {...list}
        render={(b) => (
          <Link href={`/books/${b.slug}`} target="_blank" className="text-cyan-400 hover:text-cyan-300">
            {b.title}
          </Link>
        )}
      />
      {/* ContentList renders nothing when its list is empty. */}
      <ContentList
        title="Courses & Programmes"
        table="courses"
        items={courses}
        imageColumn={IMAGE_COLUMN.courses}
        render={offeringLink}
        {...list}
      />
      <ContentList
        title="Retreats & Live Events"
        table="courses"
        items={retreats}
        imageColumn={IMAGE_COLUMN.courses}
        render={offeringLink}
        {...list}
      />
      <ContentList
        title="Downloads & Audio"
        table="courses"
        items={downloads}
        imageColumn={IMAGE_COLUMN.courses}
        render={offeringLink}
        {...list}
      />
      <ContentList
        title="Free Resources"
        table="free_resources"
        items={content.resources}
        imageColumn={IMAGE_COLUMN.free_resources}
        {...list}
        render={(r) => (
          <Link
            href={`/free-resources/${r.slug}`}
            target="_blank"
            className="text-cyan-400 hover:text-cyan-300"
          >
            {r.title}
            {r.resource_type ? (
              <span className="ml-2 text-xs text-slate-500">{r.resource_type}</span>
            ) : null}
          </Link>
        )}
      />

      <ChangeLog edits={edits} />

      {/* The same dialog the listing delete uses. */}
      <ConfirmDelete
        open={Boolean(pending)}
        title={
          pending
            ? pending.item
              ? `Remove this ${pendingNoun.noun}?`
              : `Remove all ${pendingCount} ${pendingNoun.plural}?`
            : ''
        }
        body={pending?.item ? pending.item.title : pending ? `Every ${pendingNoun.noun} on this listing.` : ''}
        consequences={[
          'Removed from the database, not hidden; the change log keeps a copy of what was removed',
          'Anyone holding a link to its public page will get a 404',
        ]}
        confirmLabel={pending?.item ? 'Remove' : `Remove all ${pendingCount}`}
        busy={removing}
        error={removeError}
        onCancel={() => setPending(null)}
        onConfirm={confirmRemove}
      />
    </>
  );
}

/* ── OUTREACH TAB ──────────────────────────────────────────────────────── */

const JOURNEY_STATUS_STYLES = {
  running: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  paused: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  stopped: 'border-slate-700 bg-slate-800 text-slate-400',
};

function journeyDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// The eight-email outreach sequence, started by hand and stopped by itself.
//
// Everything here is admin-only and goes through /api/admin/journey: the
// healer_journeys table has RLS on and no policies at all, so the browser's
// anonymous key cannot read a word of it. That is deliberate — it is a record
// of what was sent to somebody who has not joined.
function OutreachTab({ healer, onChanged }) {
  const [state, setState] = useState(null); // { journey, claimed, doNotContact }
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmingStop, setConfirmingStop] = useState(false);
  const [reason, setReason] = useState('');

  const slug = healer.healer_slug;

  const read = useCallback(async () => {
    const res = await fetch(`/api/admin/journey/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    const json = await res.json();
    return res.ok && !json.error ? json : { journey: null, history: [], claimed: false, error: json.error };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    read().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [read]);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/journey/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ healer_slug: slug }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setToast({ type: 'error', message: json.message || json.error });
      } else {
        setToast({
          type: 'success',
          message: json.redirected
            ? `Email 1 sent to ${json.emailSentTo} — the test address, not the listing's own.`
            : `Email 1 sent to ${json.emailSentTo}.`,
        });
        setState(await read());
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
    setBusy(false);
  };

  const setStatus = async (status, stopReason) => {
    if (busy) return;
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/journey/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, stop_reason: stopReason }),
      });
      const json = await res.json();
      if (!res.ok || json.error) setToast({ type: 'error', message: json.message || json.error });
      else {
        setToast({ type: 'success', message: `Journey ${status}.` });
        setConfirmingStop(false);
        setReason('');
        setState(await read());
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
    setBusy(false);
  };

  // Mark replied, undo it, or record a contact made through the listing's
  // form (POST /api/admin/journey, migration 0044).
  const act = async (body, success) => {
    if (busy) return;
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.error) setToast({ type: 'error', message: json.message || json.error });
      else {
        setToast({ type: 'success', message: success });
        setState(await read());
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
    setBusy(false);
  };

  if (!state) return <Placeholder icon="◴" title="Loading…" />;

  const { journey, claimed, doNotContact, kindRefusal, eligibility, history = [], trackingReady } = state;

  // Do not contact (0055): the listing loses the address, so reload both.
  const neverAgain = (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
      <DoNotContactButton
        email={healer.contact_email}
        onDone={async () => {
          await onChanged?.();
          setState(await read());
        }}
      />
      {healer.contact_email && (
        <span className="text-xs text-slate-500">
          Never send <span className="font-mono">{healer.contact_email}</span> anything again, and take it off every listing.
        </span>
      )}
    </div>
  );

  // NOTHING RUNNING — the start button, and the reasons it might refuse.
  if (!journey) {
    const blocked = claimed
      ? 'This healer has claimed their account.'
      : doNotContact
        ? `Not to be emailed again. ${doNotContact}`
        : kindRefusal
          ? kindRefusal
          : !healer.contact_email
            ? healer.contact_form_url
              ? 'No contact email, only a contact form. Write to them through the form yourself, then record it below.'
              : 'No contact email — add one to the healer profile first.'
            : eligibility?.problems?.length
              ? eligibility.problems.join(' ')
              : null;
    const warnings = blocked ? [] : eligibility?.warnings || [];
    // A form-only listing (owner, 11 Nov 2026): the admin writes through the
    // form by hand and records the day here. Nothing is sent from Spiritpedia.
    const formOnly = !claimed && !doNotContact && !healer.contact_email && Boolean(healer.contact_form_url);

    return (
      <>
        <p className="text-sm leading-relaxed text-slate-400">
          Eight emails over 21 weeks, inviting them to talk and to claim the listing:
          the practitioner sequence for a person, the shared one for every other kind. It stops by itself the moment they claim it, or if their address bounces or
          marks one as spam. If they reply asking to stop or to be removed, press Stop and choose
          that reason: they are never emailed again.
        </p>

        {blocked && (
          <p className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-sm text-slate-300">
            {blocked}
          </p>
        )}
        {warnings.map((w) => (
          <p key={w} className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
            {w}
          </p>
        ))}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={start}
            disabled={busy || Boolean(blocked)}
            className="rounded-full bg-[#7c3aed] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Sending…' : 'Start email journey'}
          </button>
          {!blocked && (
            <span className="text-xs text-slate-500">
              Email 1 goes immediately to{' '}
              <span className="font-mono">{healer.contact_email}</span>
            </span>
          )}
          {toast && (
            <span className={`text-xs ${toast.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {toast.message}
            </span>
          )}
        </div>

        {formOnly && (
          <FormContact
            healer={healer}
            busy={busy}
            trackingReady={trackingReady}
            onRecord={(date) =>
              act({ action: 'form', healer_slug: slug, contacted_at: date }, 'Form contact recorded.')
            }
          />
        )}

        <JourneyHistory history={history} trackingReady={trackingReady} busy={busy} act={act} />
        {neverAgain}
      </>
    );
  }

  // RUNNING OR PAUSED — the status card.
  const steps = journey.schedule || [];

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-[#0a0f1d] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Journey started
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              {journeyDate(journey.started_at)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                JOURNEY_STATUS_STYLES[journey.status] || JOURNEY_STATUS_STYLES.stopped
              }`}
            >
              {journey.status}
            </span>

            {journey.status === 'running' && (
              <button
                type="button"
                onClick={() => setStatus('paused')}
                disabled={busy}
                className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                Pause
              </button>
            )}
            {journey.status === 'paused' && (
              <button
                type="button"
                onClick={() => setStatus('running')}
                disabled={busy}
                className="rounded-full bg-[#7c3aed] px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#6d28d9] disabled:opacity-40"
              >
                Resume
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmingStop((v) => !v)}
              disabled={busy}
              className="rounded-full border border-red-500/40 px-4 py-1.5 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-40"
            >
              Stop
            </button>
          </div>
        </div>

        {claimed && (
          <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-300">
            This healer has claimed their account. The next daily run will stop the journey.
          </p>
        )}

        {/* Stopping asks why. The reason is the only record of what happened —
            a reply asking to stop and a sequence that simply ran out look
            identical in the data otherwise. */}
        {confirmingStop && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
            <p className="text-sm font-bold text-red-300">Stop this journey?</p>
            <p className="mt-1 text-xs leading-relaxed text-red-200/70">
              No further emails are sent. The record is kept, and a new journey can be started
              later unless they asked to stop or to be removed.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ['asked_to_stop', 'Asked to stop emails'],
                ['removal_requested', 'Asked for removal'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReason(value)}
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    reason === value
                      ? 'border-red-400 bg-red-500/20 text-red-200'
                      : 'border-white/15 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-red-200/60">
              Either of these means this listing is never emailed again.
            </p>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Or another reason — interview arranged, …"
              className="mt-3 w-full rounded-lg border border-white/10 bg-[#0a0f1d] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[#7c3aed] focus:outline-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingStop(false)}
                className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStatus('stopped', reason.trim() || undefined)}
                disabled={busy}
                className="rounded-full bg-red-600 px-5 py-1.5 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-40"
              >
                Stop journey
              </button>
            </div>
          </div>
        )}

        {/* A reply ends the automatic emails (owner, 11 Nov 2026). */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {trackingReady ? (
            <button
              type="button"
              onClick={() =>
                act({ action: 'replied', id: journey.id }, 'Marked replied. The automatic emails have stopped.')
              }
              disabled={busy}
              className="rounded-full border border-cyan-500/40 px-4 py-1.5 text-xs font-bold text-cyan-300 transition-colors hover:bg-cyan-500/10 disabled:opacity-40"
            >
              Mark replied (today)
            </button>
          ) : (
            <span className="text-xs text-amber-300">Mark replied needs migration 0044.</span>
          )}
        </div>

        <ul className="mt-5 divide-y divide-white/5 border-t border-white/10">
          {steps.map((step) => (
            <li key={step.number} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm text-white">Email {step.number}</span>
              <span className="text-xs text-slate-500">
                {step.sentAt ? (
                  <>
                    <span className="text-emerald-400">Sent {journeyDate(step.sentAt)}</span>
                    {step.bouncedAt ? (
                      <span className="ml-2 text-red-400">Bounced {journeyDate(step.bouncedAt)}</span>
                    ) : step.deliveredAt ? (
                      <span className="ml-2 text-cyan-400">Delivered {journeyDate(step.deliveredAt)}</span>
                    ) : null}
                  </>
                ) : journey.status === 'running' ? (
                  <>Scheduled {journeyDate(step.dueAt)}</>
                ) : (
                  <>Was due {journeyDate(step.dueAt)}</>
                )}
              </span>
            </li>
          ))}
        </ul>

        {toast && (
          <p className={`mt-4 text-xs ${toast.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {toast.message}
          </p>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-600">
        Emails 2 to 8 go out 21, 42, 63, 84, 105, 126 and 147 days after the start, one per day at
        most, sent by the daily job. Only emails that are due are sent, and a claim or a reply stops
        the sequence whatever stage it has reached. Every journey is listed in Admin → Outreach.
      </p>

      <JourneyHistory history={history} trackingReady={trackingReady} busy={busy} act={act} />
      {neverAgain}
    </>
  );
}

// Recording a message sent through the listing's own contact form, with the
// day it was sent. Nothing is sent from here.
function FormContact({ healer, busy, trackingReady, onRecord }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  return (
    <div className="mt-6 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-5">
      <p className="text-sm font-bold text-sky-200">Contacted through their form?</p>
      <p className="mt-1 text-xs leading-relaxed text-sky-100/70">
        Open{' '}
        <a href={healer.contact_form_url} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">
          their contact form
        </a>
        , send your message there, then record the day here. It appears in Admin → Outreach as
        &ldquo;Contacted via form&rdquo;.
      </p>
      {trackingReady === false ? (
        <p className="mt-3 text-xs text-amber-300">Recording a form contact needs migration 0044.</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0a0f1d] px-2 py-1 text-xs text-white"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => onRecord(date)}
            className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-40"
          >
            Record form contact
          </button>
        </div>
      )}
    </div>
  );
}

// Journeys that have ended, newest first: what was sent, delivered or bounced,
// and how each one ended. A reply can be marked here too, after the event.
const STOP_WORDS = {
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
  do_not_contact_email: 'Address marked do not contact',
};

function JourneyHistory({ history, trackingReady, busy, act }) {
  if (!history.length) return null;
  return (
    <div className="mt-6">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Earlier</p>
      <ul className="space-y-2">
        {history.map((j) => {
          const sent = (j.schedule || []).filter((step) => step.sentAt);
          return (
            <li key={j.id} className="rounded-xl border border-white/10 bg-[#0a0f1d] p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-white">
                  {j.channel === 'form' ? 'Form contact' : 'Email journey'} · {journeyDate(j.started_at)}
                </span>
                <span className="text-slate-400">
                  {STOP_WORDS[j.stop_reason] || j.stop_reason || 'Stopped'}
                  {j.replied_at && j.stop_reason !== 'replied' ? ` · replied ${journeyDate(j.replied_at)}` : ''}
                </span>
              </div>
              {j.channel !== 'form' && (
                <p className="mt-1 text-slate-500">
                  {sent.length} of 8 sent
                  {sent.some((step) => step.bouncedAt) ? ' · bounced' : ''}
                  {sent.some((step) => step.deliveredAt) ? ` · ${sent.filter((step) => step.deliveredAt).length} delivered` : ''}
                </p>
              )}
              {trackingReady && !j.replied_at && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act({ action: 'replied', id: j.id }, 'Marked replied.')}
                  className="mt-2 text-cyan-400 underline hover:text-cyan-300 disabled:opacity-40"
                >
                  Mark replied (today)
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── THE RECORD ────────────────────────────────────────────────────────── */

export default function AdminHealerRecordPage({ params }) {
  // In Next.js 16 params is a Promise; `use` unwraps it in a client component.
  const { healer_slug: slug } = use(params);

  const router = useRouter();
  const { profiles } = useAdminData();

  const [healer, setHealer] = useState(undefined); // undefined = loading, null = not found
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState(null);

  // ?tab=content OPENS ON THE CONTENT TAB, which is what makes the Inbox's
  // "Fix" button land on the thumbnail rather than one click away from it. A
  // queue row that deposits you on a Profile form and leaves you to find the
  // broken picture yourself is a link to a page, not a fix.
  //
  // Read once, as the initial value only. Changing the tab afterwards must not
  // write to the URL: this page is reached from the Inbox and from the healer
  // directory, and a back button that stepped through four tabs before
  // returning to the list would be worse than one that goes back.
  const searchParams = useSearchParams();
  const requestedTab = TABS.find(
    (t) => t.toLowerCase() === (searchParams.get('tab') || '').toLowerCase()
  );
  const [tab, setTab] = useState(requestedTab || 'Profile');
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [deleted, setDeleted] = useState(null);
  // "Removed at owner's request — never re-add" (0055), and do not contact
  // its address: chosen in the Delete dialog, done before the delete.
  const [neverReAdd, setNeverReAdd] = useState(false);
  const [blockAddress, setBlockAddress] = useState(false);
  // What this row is holding up. Counted when the dialog opens rather than on
  // every page load, so the cost falls on the one action that needs it.
  const [attached, setAttached] = useState(null);

  const load = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('healers')
      .select('*')
      .eq('healer_slug', slug)
      .maybeSingle();

    if (queryError) {
      setError(queryError.message);
      return null;
    }
    setHealer(data || null);
    if (data) setDraft(data);
    return data;
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: queryError } = await supabase
        .from('healers')
        .select('*')
        .eq('healer_slug', slug)
        .maybeSingle();
      if (cancelled) return;
      if (queryError) setError(queryError.message);
      else {
        setHealer(data || null);
        if (data) setDraft(data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // THE LOCK AND THE CHANGE LOG (migration 0053), for the badge here and the
  // Content tab. Fetched again after every change the tab makes.
  const [edits, setEdits] = useState(null);
  const [editsVersion, setEditsVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/listing-edit?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && res.ok && !json.error) setEdits(json);
      } catch {
        /* the badge and the log stay hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, editsVersion]);
  const refreshEdits = useCallback(() => setEditsVersion((v) => v + 1), []);

  // The canonical taxonomy, not the slugs that happen to be in use — a healer
  // should be taggable with a subject nobody carries yet.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('subjects').select('slug, name').order('name');
      if (!cancelled) setSubjects(data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // WHO CLAIMED IT. healers carries no owner column, so the link is only
  // recorded on the account side as user_profiles.linked_healer_slug.
  // undefined = profiles unreadable, so the claim state is unknown and no badge
  // is shown rather than a confident "Unclaimed" on every record.
  const owner = useMemo(() => {
    if (!Array.isArray(profiles)) return undefined;
    return profiles.find((p) => p.linked_healer_slug === slug) || null;
  }, [profiles, slug]);

  // Only what actually changed. Sending the whole row back would overwrite any
  // column touched elsewhere since this page loaded.
  const changes = useMemo(() => {
    if (!healer) return {};
    const out = {};
    for (const key of EDITABLE) {
      const before = healer[key];
      const after = draft[key];
      if (Array.isArray(before) || Array.isArray(after)) {
        // image_urls carries a blank slot while it is being typed into, and an
        // emptied field means "remove this image". Normalising here keeps both
        // the dirty flag and the payload honest in one place.
        const clean = (list) => (list || []).filter((v) => String(v || '').trim() !== '');
        const a = clean(before);
        const b = clean(after);
        if (JSON.stringify(a) !== JSON.stringify(b)) out[key] = b;
      } else if ((before ?? null) !== (after ?? null)) {
        out[key] = after ?? null;
      }
    }
    return out;
  }, [healer, draft]);

  const dirty = Object.keys(changes).length > 0;

  const set = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const setNumber = (key, raw) => {
    const trimmed = String(raw).trim();
    set(key, trimmed === '' ? null : Number(trimmed));
  };

  const toggleSubject = (subjectSlug) => {
    const current = draft.subject_slugs || [];
    set(
      'subject_slugs',
      current.includes(subjectSlug)
        ? current.filter((s) => s !== subjectSlug)
        : [...current, subjectSlug]
    );
  };

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'healers',
          op: 'update',
          values: changes,
          // Matched on the primary key, not the slug, so the write is scoped to
          // exactly one row whatever else is edited.
          match: { id: healer.id },
          select: '*',
          single: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setToast({ type: 'error', message: json.error || `Save failed (${res.status})` });
      } else {
        // Re-read rather than trusting the draft: what came back is what the
        // database actually holds, defaults and triggers included.
        const fresh = json.data || (await load());
        if (fresh) {
          setHealer(fresh);
          setDraft(fresh);
        }
        // CLEAR THE PORTRAIT ROW NOW, not at the next audit.
        //
        // Content thumbnails do this in saveImage(); a healer's three
        // portraits are edited as part of the whole-draft save, so the same
        // clearing has to happen here or a fixed face photo would sit in the
        // Inbox until tomorrow's run still claiming to be broken.
        //
        // Only when the images were actually touched — saving a phone number
        // should not quietly dismiss a genuine finding. The next audit re-adds
        // the row if the new URL is broken too, so a wrong guess costs a day,
        // not a permanent blind spot.
        if (changes.image_urls || changes.image_url) {
          await fetch('/api/admin/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table: 'broken_images',
              op: 'delete',
              // record_id is text across every audited table; healers.id is a
              // bigint, so it is stringified to match what the audit stored.
              match: { table_name: 'healers', record_id: String(healer.id) },
            }),
          }).catch(() => {});
        }

        // The old photos are in the Change log now (api/admin/write).
        if (changes.image_urls) refreshEdits();

        const n = Object.keys(changes).length;
        setToast({ type: 'success', message: `Saved. ${n} field${n === 1 ? '' : 's'} updated.` });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
    setSaving(false);
  };

  // DELETING A HEALER ORPHANS ITS CONTENT, and nothing in the schema stops it:
  // videos and books find their healer by the text healer_slug and courses and
  // free resources by the bigint healer_id, none of them a foreign key with a
  // cascade. The rows survive the healer and point at nobody. Counting them
  // first is the difference between a confirmation and a guess.
  const openDeleteDialog = async () => {
    setDeleteError(null);
    setDeleted(null);
    setAttached(null);
    setNeverReAdd(false);
    setBlockAddress(false);
    setConfirmingDelete(true);

    const [videos, books, courses, resources] = await Promise.all([
      supabase.from('videos').select('*', { count: 'exact', head: true }).eq('healer_slug', slug),
      supabase.from('books').select('*', { count: 'exact', head: true }).eq('healer_slug', slug),
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('healer_id', healer.id),
      supabase
        .from('free_resources')
        .select('*', { count: 'exact', head: true })
        .eq('healer_id', healer.id),
    ]);

    setAttached({
      videos: videos.count ?? null,
      books: books.count ?? null,
      courses: courses.count ?? null,
      free_resources: resources.count ?? null,
    });
  };

  const confirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    // The lists first: if either fails, nothing is deleted and the dialog
    // says why, so the record they need is still there to try again.
    const first = [
      neverReAdd && ['/api/admin/do-not-revive', { healer_slug: slug }],
      blockAddress && healer.contact_email && ['/api/admin/do-not-contact', { email: healer.contact_email, note: `${healer.name} removed at the owner's request` }],
    ].filter(Boolean);
    for (const [url, body] of first) {
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json();
        if (!res.ok || json.error) {
          setDeleteError(`Nothing deleted. ${json.message || json.error || `Failed (${res.status})`}`);
          setDeleting(false);
          return;
        }
      } catch (err) {
        setDeleteError(`Nothing deleted. ${err.message}`);
        setDeleting(false);
        return;
      }
    }
    try {
      const res = await fetch('/api/admin/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'healers',
          op: 'delete',
          // By slug, as the brief asks, and it is unique — but the route
          // refuses any delete without a match clause, so this cannot widen.
          match: { healer_slug: slug },
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setDeleteError(json.error || `Delete failed (${res.status})`);
        setDeleting(false);
        return;
      }
      setDeleted(
        [
          'Healer deleted.',
          neverReAdd ? 'On the do-not-revive list.' : '',
          blockAddress && healer.contact_email ? `${healer.contact_email} is do not contact.` : '',
        ]
          .filter(Boolean)
          .join(' ')
      );
      setTimeout(() => router.push('/admin/content'), 900);
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  if (error) return <DataProblem error={error} what="This healer record" />;
  if (healer === undefined) return <Placeholder icon="◴" title="Loading record…" />;
  if (healer === null) {
    return (
      <>
        <BackLink />
        <Placeholder
          icon="○"
          title="No such healer"
          body={`Nothing in the directory carries the slug "${slug}".`}
        />
      </>
    );
  }

  const images = (draft.image_urls || []).filter(Boolean);
  const initial = ((healer.name || '?').trim()[0] || '?').toUpperCase();

  return (
    <>
      <BackLink />

      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5 md:p-6">
        <div className="flex flex-wrap items-start gap-4">
          {images[0] ? (
            <img
              referrerPolicy="no-referrer"
              src={images[0]}
              alt=""
              className="h-14 w-14 shrink-0 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-xl font-bold text-white">
              {initial}
            </span>
          )}

          <div className="min-w-0 flex-1 basis-64">
            <h3 className="text-xl font-bold text-white">{healer.name}</h3>
            <p className="break-all font-mono text-xs text-slate-500">{healer.healer_slug}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                {tierName(healer.tier, healer.entity_type) || healer.tier || 'No tier'}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {healer.entity_type || 'individual'}
              </span>

              {owner !== undefined &&
                (owner ? (
                  <Link
                    href={`/admin/people?person=${encodeURIComponent(owner.id)}`}
                    className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300 transition-colors hover:bg-cyan-500/20"
                  >
                    Claimed by {owner.full_name || owner.email || 'an account'}
                  </Link>
                ) : (
                  <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Unclaimed
                  </span>
                ))}

              {edits?.lock?.locked && (
                <button
                  type="button"
                  onClick={() => setTab('Content')}
                  title={edits.lock.note}
                  className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-500/20"
                >
                  🔒 Keep minimal
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/healers/${healer.healer_slug}`}
              target="_blank"
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/5"
            >
              Open public profile →
            </Link>
            <button
              type="button"
              onClick={openDeleteDialog}
              className="rounded-full border border-red-500/40 px-4 py-2 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              Delete healer
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-1 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t ? 'border-b-2 border-[#7c3aed] text-white' : 'text-slate-500 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <ClosedAccountBanner closedId={searchParams.get('closed')} />
        {tab === 'Profile' && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {TEXT_FIELDS.map(([key, label]) => (
                <LabelledField key={key} label={label}>
                  <input
                    type="text"
                    value={draft[key] ?? ''}
                    onChange={(e) => set(key, e.target.value === '' ? null : e.target.value)}
                    className={inputClass}
                  />
                </LabelledField>
              ))}

              <LabelledField label="Tier">
                <select
                  value={draft.tier ?? ''}
                  onChange={(e) => set('tier', e.target.value || null)}
                  className={inputClass}
                >
                  <option value="">No tier</option>
                  {/* Named for the listing's type (utils/badges.js). */}
                  {tierOptions(draft.entity_type).map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1.5 block text-[11px] leading-snug text-slate-500">
                  {tierGuidance(draft.entity_type).join(' · ')}
                </span>
                {healer.official && (
                  <span className="mt-1.5 block text-[11px] leading-snug text-slate-500">
                    Spiritpedia’s own listing shows OFFICIAL and no tier.
                  </span>
                )}
              </LabelledField>

              <LabelledField label="Email recipient type">
                {'contact_recipient_type' in healer ? (
                  <select
                    value={draft.contact_recipient_type ?? ''}
                    onChange={(e) => set('contact_recipient_type', e.target.value || null)}
                    className={inputClass}
                  >
                    <option value="">Not looked at yet</option>
                    {RECIPIENT_TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="block py-2 text-xs text-amber-300">Needs migration 0048.</span>
                )}
                <span className="mt-1.5 block text-[11px] leading-snug text-slate-500">
                  Whose inbox the contact email is. Outreach to anyone but a person needs a business or
                  organisation inbox, and every journey needs the email source.
                </span>
              </LabelledField>

              <LabelledField label="Entity type">
                <select
                  value={draft.entity_type ?? ''}
                  onChange={(e) => set('entity_type', e.target.value || null)}
                  className={inputClass}
                >
                  <option value="">Not set</option>
                  {ENTITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </LabelledField>

              <LabelledField label="Availability">
                <select
                  value={draft.availability_type ?? ''}
                  onChange={(e) => set('availability_type', e.target.value || null)}
                  className={inputClass}
                >
                  <option value="">Not set</option>
                  {[
                    ...AVAILABILITY,
                    ...(healer.availability_type && !AVAILABILITY.includes(healer.availability_type)
                      ? [healer.availability_type]
                      : []),
                  ].map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </LabelledField>

              {NUMBER_FIELDS.map(([key, label]) => (
                <LabelledField key={key} label={label}>
                  <input
                    type="number"
                    value={draft[key] ?? ''}
                    onChange={(e) => setNumber(key, e.target.value)}
                    className={inputClass}
                  />
                </LabelledField>
              ))}

              <label className="flex items-center gap-2 self-end pb-2">
                <input
                  type="checkbox"
                  checked={Boolean(draft.is_famous)}
                  onChange={(e) => set('is_famous', e.target.checked)}
                  className="h-4 w-4 accent-[#7c3aed]"
                />
                <span className={labelClass}>Famous name</span>
              </label>

              {/* Automatic, never ticked (migration 0023): ✓ Verified once an
                  approved account is linked; OFFICIAL for love@spiritpedia.co's. */}
              <p className="self-end pb-2 text-[11px] leading-snug text-slate-500">
                <span className={labelClass}>Badges</span>
                <br />
                {healer.official ? 'OFFICIAL' : healer.verified ? '✓ Verified' : 'Not claimed'}
                <span className="text-slate-600"> · set automatically</span>
              </p>

              <div className="sm:col-span-2">
                <LabelledField label="Bio">
                  <textarea
                    rows={8}
                    value={draft.bio ?? ''}
                    onChange={(e) => set('bio', e.target.value === '' ? null : e.target.value)}
                    className={`${inputClass} resize-y leading-relaxed`}
                  />
                </LabelledField>
              </div>

              {/* One input per image already on the row, plus an empty slot, so
                  the count is whatever the row carries rather than a fixed
                  three. Blank entries are dropped on save. */}
              <div className="sm:col-span-2">
                <p className={labelClass}>Images</p>
                <div className="mt-1 space-y-2">
                  {[...(draft.image_urls || []), ''].map((url, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {/* CardImage, not a bare <img>: a dead portrait renders
                          the same ▦ placeholder the public site renders,
                          instead of the browser's broken-image icon. 73% of
                          these URLs point at Google's image cache, so this is
                          the field where a broken one is actually noticed —
                          and an <img> that fails before hydration never fires
                          onError, which is the case CardImage exists for. */}
                      {url ? (
                        <span className="h-9 w-9 shrink-0 overflow-hidden rounded border border-white/10 bg-[#0a0f1d]">
                          <CardImage
                            src={url}
                            alt=""
                            className="h-full w-full object-cover"
                            fallbackEmoji="▦"
                            fallbackClassName="flex h-full w-full items-center justify-center text-slate-700"
                          />
                        </span>
                      ) : (
                        <span className="h-9 w-9 shrink-0 rounded border border-dashed border-white/10" />
                      )}
                      <ImageField
                        value={url}
                        placeholder="https://… — or Upload"
                        kind="healers"
                        slug={healer.healer_slug}
                        onChange={(value) => {
                          const next = [...(draft.image_urls || [])];
                          if (i < next.length) next[i] = value;
                          else next.push(value);
                          set('image_urls', next);
                        }}
                        inputClass={inputClass}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <p className={labelClass}>Subjects · {(draft.subject_slugs || []).length}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {subjects.map((s) => {
                    const on = (draft.subject_slugs || []).includes(s.slug);
                    return (
                      <button
                        key={s.slug}
                        type="button"
                        onClick={() => toggleSubject(s.slug)}
                        aria-pressed={on}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          on
                            ? 'border-[#7c3aed] bg-[#7c3aed]/20 text-white'
                            : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                        }`}
                      >
                        {s.slug}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2">
                <dl className="grid grid-cols-1 gap-4 border-t border-white/10 pt-4 sm:grid-cols-3">
                  {/* Not editable. The slug is how videos and books find this
                      healer — they store the text, not a foreign key — so
                      changing it here would orphan their content and 404 the
                      public page. */}
                  <ReadOnly label="Slug (fixed)" value={healer.healer_slug} />
                  <ReadOnly label="Record id" value={String(healer.id)} />
                  <ReadOnly
                    label="Created"
                    value={healer.created_at ? new Date(healer.created_at).toLocaleDateString('en-GB') : null}
                  />
                </dl>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
              <button
                type="button"
                onClick={save}
                disabled={!dirty || saving}
                className="rounded-full bg-[#7c3aed] px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(healer);
                  setToast(null);
                }}
                disabled={!dirty || saving}
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Discard
              </button>
              <span className="text-xs text-slate-500">
                {dirty ? `${Object.keys(changes).length} unsaved change${Object.keys(changes).length === 1 ? '' : 's'}` : 'No changes'}
              </span>
              {toast && (
                <span className={`text-xs ${toast.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {toast.message}
                </span>
              )}
            </div>

            {/* A school's teachers (0029). Saved type only: a listing being
                turned into a school is saved first, then shows this. */}
            {(healer.entity_type === 'school' || healer.entity_type === 'organisation') && <HubTeachers hub={healer} />}
          </>
        )}

        {tab === 'Content' && (
          <ContentTab slug={healer.healer_slug} healerId={healer.id} edits={edits} onEditsChange={refreshEdits} />
        )}

        {tab === 'Outreach' && <OutreachTab healer={healer} onChanged={load} />}

        {tab === 'Admin Notes' && (
          <Placeholder
            icon="✎"
            title="Notes about a healer record — not yet possible"
            body="admin_notes.subject_user_id is a foreign key onto auth.users, so a note can only be attached to an account. An unclaimed healer has none. TODO: either add a nullable subject_healer_id to admin_notes, or a notes column to healers."
          >
            {owner && (
              <Link
                href={`/admin/people?person=${encodeURIComponent(owner.id)}`}
                className="mt-4 inline-block rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/5"
              >
                Notes on the account that claimed this →
              </Link>
            )}
          </Placeholder>
        )}
      </div>

      <ConfirmDelete
        open={confirmingDelete}
        title={`Delete ${healer.name}?`}
        body="This will permanently remove this healer record and cannot be undone."
        consequences={[
          ...(attached === null
            ? ['Counting what is attached to this record…']
            : [
                `${attached.videos ?? '?'} videos and ${attached.books ?? '?'} books tagged to this slug stay in the database, pointing at nobody`,
                `${attached.courses ?? '?'} offerings and ${attached.free_resources ?? '?'} free resources likewise`,
                'The public page at /healers/' + slug + ' will 404',
              ]),
          ...(owner
            ? [`${owner.full_name || 'An account'} has claimed this profile; their claim will point at a row that no longer exists`]
            : []),
        ]}
        confirmLabel="Delete healer"
        busy={deleting}
        error={deleteError}
        done={deleted}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={confirmDelete}
      >
        <div className="mt-3 space-y-2 text-xs text-slate-300">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={neverReAdd} onChange={(e) => setNeverReAdd(e.target.checked)} className="mt-0.5" />
            <span>
              <strong className="text-white">Removed at owner&apos;s request — never re-add.</strong> Adds it to the
              do-not-revive list, so no sprint or ingest brings it back.
            </span>
          </label>
          {healer.contact_email && (
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={blockAddress} onChange={(e) => setBlockAddress(e.target.checked)} className="mt-0.5" />
              <span>
                <strong className="text-white">Do not contact</strong>{' '}
                <span className="break-all font-mono">{healer.contact_email}</span>: never send it anything again, and take
                it off any other listing that shows it.
              </span>
            </label>
          )}
        </div>
      </ConfirmDelete>
    </>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/content"
      className="mb-5 inline-block rounded-full border border-white/15 px-4 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
    >
      ← Back to Healer Directory
    </Link>
  );
}

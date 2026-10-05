'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SectionHeading from '@/components/admin/SectionHeading';
import { Placeholder } from '@/components/admin/AdminPlaceholders';
import DataProblem from '@/components/admin/DataProblem';
import { useAdminData } from '@/components/admin/AdminData';
import CardImage from '@/components/CardImage';
import ConfirmDelete from '@/components/admin/ConfirmDelete';
import { supabase } from '@/utils/supabase';

// ONE HEALER RECORD — read, and edit the fields that are safe to edit here.
//
// Reads use the shared anonymous client: healers, videos and books are public
// tables and this is public data. The write goes through /api/admin/write,
// which holds the service role and the admin cookie — the anon key has had no
// write grant on any content table since migration 0007.

const TABS = ['Profile', 'Content', 'Outreach', 'Admin Notes'];

const TIERS = [
  { value: 'superhero', label: 'Superhero' },
  { value: 'ascended_master', label: 'Ascended Master' },
  { value: 'luminary', label: 'Luminary' },
  { value: 'local_hero', label: 'Local Hero' },
];

const ENTITY_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'channel', label: 'Channel' },
  { value: 'app', label: 'App' },
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
function RowThumb({ item, column, onSave, saving }) {
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
          <input
            type="text"
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') setEditing(false);
            }}
            placeholder="https://… — leave empty to remove the image"
            className="w-full rounded-lg border border-white/10 bg-[#0a0f1d] px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-[#7c3aed] focus:outline-none"
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

function ContentList({ title, items, render, onDelete, imageColumn, onSaveImage, savingImageId }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <p className={labelClass}>
        {title} · {items.length}
      </p>
      <ul className="mt-2 divide-y divide-white/5 rounded-xl border border-white/10">
        {items.map((item) => (
          <li
            key={item.id}
            className="group/row relative flex items-center gap-3 px-4 py-2.5 text-sm"
          >
            {/* relative on the row, so the editor panel below can anchor to it
                rather than to the page. */}
            <RowThumb
              item={item}
              column={imageColumn}
              onSave={onSaveImage}
              saving={savingImageId === item.id}
            />
            <span className="min-w-0 flex-1">{render(item)}</span>
            {onDelete && (
              // Barely there until the row is hovered: a list of fifty videos
              // should read as a list, not as fifty invitations to delete
              // something. It stays reachable by keyboard regardless — opacity
              // hides it from the eye, not from focus or a screen reader.
              <button
                type="button"
                onClick={() => onDelete(item)}
                aria-label={`Delete ${item.title}`}
                title="Delete"
                className="shrink-0 rounded-full p-1.5 text-slate-600 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 focus:opacity-100 group-hover/row:opacity-100"
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
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// EVERYTHING A HEALER HAS, which takes two different joins.
//
// Videos and books carry the healer's text slug; courses and free resources
// carry the bigint id. Two keys, four tables — and the reason this tab showed
// only half of it for so long is that it was handed the slug alone, so the two
// id-keyed tables were simply never asked for. 1,103 courses and 461 free
// resources were invisible here while the delete dialog on the same page was
// already counting them.
//
// NOTHING IS FILTERED BY is_active OR end_date, deliberately. The public pages
// hide an expired offering because a visitor cannot buy it; an admin screen
// that did the same would be lying about what the database holds.
// Which table a row belongs to, and what to call it when asking. Keyed by the
// bucket the UI groups rows into rather than by table, because three of the six
// buckets are the same table split by product_type.
const DELETABLE = {
  videos: { table: 'videos', noun: 'video' },
  books: { table: 'books', noun: 'book' },
  courses: { table: 'courses', noun: 'offering' },
  retreats: { table: 'courses', noun: 'retreat' },
  downloads: { table: 'courses', noun: 'download' },
  resources: { table: 'free_resources', noun: 'free resource' },
};

function ContentTab({ slug, healerId }) {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);

  // The row awaiting confirmation: { bucket, item } or null. One piece of state
  // for all six lists, because only one thing can be being deleted at a time.
  const [pending, setPending] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // The row whose image is being written, so only that thumbnail says "Saving…".
  const [savingImageId, setSavingImageId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [videos, books, courses, resources] = await Promise.all([
        supabase.from('videos').select('id, title, slug, platform_url').eq('healer_slug', slug),
        supabase.from('books').select('id, title, slug, mock_cover_url').eq('healer_slug', slug),
        supabase
          .from('courses')
          .select('id, title, slug, product_type, image_url')
          .eq('healer_id', healerId),
        supabase
          .from('free_resources')
          .select('id, title, slug, resource_type, image_url')
          .eq('healer_id', healerId),
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

  // DELETING ONE PIECE OF CONTENT.
  //
  // Through /api/admin/write, like every other content write: the anon key has
  // had no delete grant on these tables since migration 0007, and the route
  // refuses any delete without a match clause so this cannot widen beyond the
  // one row.
  //
  // The list is corrected in place rather than refetched. Four queries to
  // redraw a list we already hold, minus one row, would be slower and would
  // flash the whole tab through its loading state for a change the admin can
  // already see.
  const confirmDelete = async () => {
    if (!pending || deleting) return;
    const { bucket, item } = pending;
    const source = DELETABLE[bucket];
    if (!source) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/admin/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: source.table,
          op: 'delete',
          match: { id: item.id },
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setDeleteError(json.error || `Delete failed (${res.status})`);
        setDeleting(false);
        return;
      }

      // Courses, retreats and downloads are three views of one array, so the
      // row is removed from whichever array actually holds it rather than from
      // the bucket it was displayed in.
      const key = source.table === 'free_resources' ? 'resources' : source.table;
      setContent((prev) => ({
        ...prev,
        [key]: (prev[key] || []).filter((row) => row.id !== item.id),
      }));
      setPending(null);
    } catch (err) {
      setDeleteError(err.message);
    }
    setDeleting(false);
  };

  // CHANGING A ROW'S PICTURE.
  //
  // Through /api/admin/write like every other content write — the anon key has
  // had no write grant on these tables since migration 0007 — and matched on
  // the primary key, so it touches exactly one row.
  //
  // The column differs by table and is passed in rather than guessed, because
  // books call it mock_cover_url and the other two call it image_url. Written
  // back into the list in memory rather than refetched, for the same reason the
  // delete is: redrawing four queries to change one string would flash the
  // whole tab through its loading state.
  const saveImage = async (item, column, url) => {
    if (!column || savingImageId) return false;
    setSavingImageId(item.id);
    try {
      // books is the only table using mock_cover_url, so the column identifies
      // it outright. image_url is shared, so the row's own shape settles it: a
      // free resource carries resource_type, an offering does not.
      const target =
        column === 'mock_cover_url'
          ? 'books'
          : item.resource_type !== undefined
            ? 'free_resources'
            : 'courses';

      const res = await fetch('/api/admin/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: target,
          op: 'update',
          values: { [column]: url },
          match: { id: item.id },
          select: `id, ${column}`,
          single: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setSavingImageId(null);
        return false;
      }

      const key = target === 'free_resources' ? 'resources' : target;
      setContent((prev) => ({
        ...prev,
        [key]: (prev[key] || []).map((row) =>
          row.id === item.id ? { ...row, [column]: url } : row
        ),
      }));
      setSavingImageId(null);
      return true;
    } catch {
      setSavingImageId(null);
      return false;
    }
  };

  const askDelete = (bucket) => (item) => {
    setDeleteError(null);
    setPending({ bucket, item });
  };

  if (error) return <DataProblem error={error} what="This healer's content" />;
  if (!content) return <Placeholder icon="◴" title="Loading content…" />;

  // One table, split by product_type, using the same rule as the public subject
  // page so the two can never disagree about what a thing is.
  //
  // Courses is the CATCH-ALL. The column holds six values, not the three with
  // their own shelf — membership, meditation and podcast between them account
  // for 106 rows, and a screen whose job is showing what exists must not drop
  // them on the floor. A null product_type lands here too, as it does publicly.
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

  // Offerings all resolve under /offerings/[slug] whatever their product_type —
  // they are one table and one route.
  const offeringLink = (item) => (
    <Link href={`/offerings/${item.slug}`} target="_blank" className="text-cyan-400 hover:text-cyan-300">
      {item.title}
      {item.product_type && item.product_type !== 'course' ? (
        <span className="ml-2 text-xs text-slate-500">{item.product_type}</span>
      ) : null}
    </Link>
  );

  return (
    <>
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

      {total === 0 && (
        <p className="mt-6 text-sm text-slate-500">
          Nothing is tagged to <span className="font-mono text-xs">{slug}</span> yet. Add content
          from the Ingestion section.
        </p>
      )}

      {/* Read-only on purpose: adding and editing content is Ingestion's job,
          and these links go to the public pages that already exist. */}
      <ContentList
        title="Videos"
        items={content.videos}
        onDelete={askDelete('videos')}
        imageColumn={null}
        onSaveImage={saveImage}
        savingImageId={savingImageId}
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
        items={content.books}
        onDelete={askDelete('books')}
        imageColumn={IMAGE_COLUMN.books}
        onSaveImage={saveImage}
        savingImageId={savingImageId}
        render={(b) => (
          <Link href={`/books/${b.slug}`} target="_blank" className="text-cyan-400 hover:text-cyan-300">
            {b.title}
          </Link>
        )}
      />
      {/* ContentList renders nothing when its list is empty, so a healer with
          no retreats shows no Retreats heading — no guards needed here. */}
      <ContentList
        title="Courses & Programmes"
        items={courses}
        render={offeringLink}
        onDelete={askDelete('courses')}
        imageColumn={IMAGE_COLUMN.courses}
        onSaveImage={saveImage}
        savingImageId={savingImageId}
      />
      <ContentList
        title="Retreats & Live Events"
        items={retreats}
        render={offeringLink}
        onDelete={askDelete('retreats')}
        imageColumn={IMAGE_COLUMN.courses}
        onSaveImage={saveImage}
        savingImageId={savingImageId}
      />
      <ContentList
        title="Downloads & Audio"
        items={downloads}
        render={offeringLink}
        onDelete={askDelete('downloads')}
        imageColumn={IMAGE_COLUMN.courses}
        onSaveImage={saveImage}
        savingImageId={savingImageId}
      />
      <ContentList
        title="Free Resources"
        items={content.resources}
        onDelete={askDelete('resources')}
        imageColumn={IMAGE_COLUMN.free_resources}
        onSaveImage={saveImage}
        savingImageId={savingImageId}
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

      {/* The same dialog the healer delete uses, so one confirmation looks and
          behaves the same everywhere in the admin. */}
      <ConfirmDelete
        open={Boolean(pending)}
        title={pending ? `Delete this ${DELETABLE[pending.bucket]?.noun}?` : ''}
        body={pending?.item?.title || ''}
        consequences={[
          'It is removed from the database, not hidden — this cannot be undone',
          'Anyone holding a link to its public page will get a 404',
        ]}
        confirmLabel="Delete"
        busy={deleting}
        error={deleteError}
        onCancel={() => setPending(null)}
        onConfirm={confirmDelete}
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

// The five-email outreach sequence, started by hand and stopped by itself.
//
// Everything here is admin-only and goes through /api/admin/journey: the
// healer_journeys table has RLS on and no policies at all, so the browser's
// anonymous key cannot read a word of it. That is deliberate — it is a record
// of what was sent to somebody who has not joined.
function OutreachTab({ healer }) {
  const [state, setState] = useState(null); // { journey, claimed }
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
    return res.ok && !json.error ? json : { journey: null, claimed: false, error: json.error };
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
            ? `Email 1 sent to ${json.emailSentTo} — the test address, not the practitioner.`
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

  if (!state) return <Placeholder icon="◴" title="Loading…" />;

  const { journey, claimed } = state;

  // NOTHING RUNNING — the start button, and the reasons it might refuse.
  if (!journey) {
    const blocked = claimed
      ? 'This healer has claimed their account.'
      : !healer.contact_email
        ? 'No contact email — add one to the healer profile first.'
        : null;

    return (
      <>
        <p className="text-sm leading-relaxed text-slate-400">
          Five emails over twelve weeks, inviting this practitioner to talk and to claim their
          listing. It stops by itself the moment they claim it.
        </p>

        {blocked && (
          <p className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-sm text-slate-300">
            {blocked}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={start}
            disabled={busy || Boolean(blocked)}
            className="rounded-full bg-[#7c3aed] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Sending…' : 'Start Journey'}
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
              later.
            </p>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why — asked to stop, interview arranged, …"
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

        <ul className="mt-5 divide-y divide-white/5 border-t border-white/10">
          {steps.map((step) => (
            <li key={step.number} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm text-white">Email {step.number}</span>
              <span className="text-xs text-slate-500">
                {step.sentAt ? (
                  <span className="text-emerald-400">Sent {journeyDate(step.sentAt)}</span>
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
        Emails 2 to 5 go out 21, 42, 63 and 84 days after the start, one per day at most, sent by
        the daily job. Only emails that are due are sent, and a claim stops the sequence whatever
        stage it has reached.
      </p>
    </>
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

  const [tab, setTab] = useState('Profile');
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [deleted, setDeleted] = useState(null);
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
      setDeleted('Healer deleted.');
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
              src={images[0]}
              alt=""
              className="h-14 w-14 shrink-0 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-xl font-bold text-white">
              {initial}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-white">{healer.name}</h3>
            <p className="break-all font-mono text-xs text-slate-500">{healer.healer_slug}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                {TIERS.find((t) => t.value === healer.tier)?.label || healer.tier || 'No tier'}
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
                  {TIERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
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
                      {url ? (
                        <img src={url} alt="" className="h-9 w-9 shrink-0 rounded border border-white/10 object-cover" />
                      ) : (
                        <span className="h-9 w-9 shrink-0 rounded border border-dashed border-white/10" />
                      )}
                      <input
                        type="text"
                        value={url}
                        placeholder="https://…"
                        onChange={(e) => {
                          const next = [...(draft.image_urls || [])];
                          if (i < next.length) next[i] = e.target.value;
                          else next.push(e.target.value);
                          set('image_urls', next);
                        }}
                        className={inputClass}
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
          </>
        )}

        {tab === 'Content' && <ContentTab slug={healer.healer_slug} healerId={healer.id} />}

        {tab === 'Outreach' && <OutreachTab healer={healer} />}

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
      />
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

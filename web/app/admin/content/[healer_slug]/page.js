'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SectionHeading from '@/components/admin/SectionHeading';
import { Placeholder } from '@/components/admin/AdminPlaceholders';
import DataProblem from '@/components/admin/DataProblem';
import { useAdminData } from '@/components/admin/AdminData';
import ConfirmDelete from '@/components/admin/ConfirmDelete';
import { supabase } from '@/utils/supabase';

// ONE HEALER RECORD — read, and edit the fields that are safe to edit here.
//
// Reads use the shared anonymous client: healers, videos and books are public
// tables and this is public data. The write goes through /api/admin/write,
// which holds the service role and the admin cookie — the anon key has had no
// write grant on any content table since migration 0007.

const TABS = ['Profile', 'Content', 'Admin Notes'];

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

function ContentList({ title, items, render }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <p className={labelClass}>
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
function ContentTab({ slug, healerId }) {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [videos, books, courses, resources] = await Promise.all([
        supabase.from('videos').select('id, title, slug, platform_url').eq('healer_slug', slug),
        supabase.from('books').select('id, title, slug').eq('healer_slug', slug),
        supabase.from('courses').select('id, title, slug, product_type').eq('healer_id', healerId),
        supabase
          .from('free_resources')
          .select('id, title, slug, resource_type')
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
        render={(b) => (
          <Link href={`/books/${b.slug}`} target="_blank" className="text-cyan-400 hover:text-cyan-300">
            {b.title}
          </Link>
        )}
      />
      {/* ContentList renders nothing when its list is empty, so a healer with
          no retreats shows no Retreats heading — no guards needed here. */}
      <ContentList title="Courses & Programmes" items={courses} render={offeringLink} />
      <ContentList title="Retreats & Live Events" items={retreats} render={offeringLink} />
      <ContentList title="Downloads & Audio" items={downloads} render={offeringLink} />
      <ContentList
        title="Free Resources"
        items={content.resources}
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

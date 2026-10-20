'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SectionHeading from '@/components/admin/SectionHeading';
import { Placeholder } from '@/components/admin/AdminPlaceholders';
import { useAdminData } from '@/components/admin/AdminData';
import ContentForm, { Field, SubjectPicker, formFieldsFor, inputClass, kindLabel } from '@/components/ContentForm';
import OfferingCard from '@/components/OfferingCard';
import FreeResourceCard from '@/components/FreeResourceCard';
import BookCard from '@/components/BookCard';
import { IMAGE_COLUMNS, PRODUCT_LABELS, REJECT_REASONS, URL_COLUMNS, kindOf, youtubeId } from '@/utils/contentSubmissions';

// One thing an owner added or changed (content_submissions, migration 0024),
// opened from the Inbox. Every field is editable; Approve puts the admin's
// version live (a new item at once; an edit's changed fields only), Reject
// tells the owner why. /api/admin/submissions does both.

const PATHS = { video: '/videos', book: '/books', course: '/offerings', free_resource: '/free-resources' };

function Notice({ tone = 'slate', children }) {
  const tones = {
    red: 'border-red-500/40 bg-red-500/10 text-red-200',
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    green: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    slate: 'border-white/10 bg-white/5 text-slate-300',
  };
  return <div className={`rounded-xl border p-3 text-sm ${tones[tone]}`}>{children}</div>;
}

function VideoPreview({ values }) {
  const id = youtubeId(values.platform_url);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
      {id ? (
        <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" className="aspect-video w-full object-cover" />
      ) : (
        <div className="flex aspect-video items-center justify-center text-slate-500">No video</div>
      )}
      <p className="p-4 text-sm font-semibold text-white">{values.title || 'Untitled'}</p>
    </div>
  );
}

function Preview({ contentType, values, image, healerName }) {
  const item = { ...values, slug: 'preview' };
  if (contentType === 'video') return <VideoPreview values={values} />;
  // The real cards, with the click and the heart switched off.
  return (
    <div className="pointer-events-none max-w-[260px]" aria-hidden="true">
      {contentType === 'book' && <BookCard book={{ ...item, mock_cover_url: image }} />}
      {contentType === 'course' && <OfferingCard item={{ ...item, image_url: image }} healerName={healerName} />}
      {contentType === 'free_resource' && <FreeResourceCard item={{ ...item, image_url: image }} healerName={healerName} />}
    </div>
  );
}

export default function SubmissionReviewPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { reload } = useAdminData();
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState(null);
  const [values, setValues] = useState({});
  const [chosen, setChosen] = useState([]);
  const [healerSlug, setHealerSlug] = useState('');
  const [affiliate, setAffiliate] = useState('none');
  const [featured, setFeatured] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/submissions?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json.error) {
        setProblem(json.message || json.error || 'Couldn’t load it.');
        return;
      }
      const row = json.submission;
      const kind = kindOf(row.content_type, json.live || row.fields || {});
      const start = { ...(json.live || {}), ...(row.fields || {}) };
      setValues(Object.fromEntries(formFieldsFor(kind).map((c) => [c, start[c] ?? ''])));
      setChosen(row.suggested_subjects || []);
      setAffiliate(json.live?.affiliate_status || 'none');
      setFeatured(Boolean(json.live?.is_featured));
      setData({ ...json, kind });
    } catch (err) {
      setProblem(err.message);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const decide = async (action) => {
    setBusy(true);
    setErrors({});
    setResult(null);
    try {
      const res = await fetch('/api/admin/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'approve'
            ? { id, action, fields: values, subjects: chosen, healer_slug: healerSlug || undefined, affiliate_status: affiliate, is_featured: featured }
            : { id, action, reason, note }
        ),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setErrors(json.errors || {});
        setResult({ tone: 'red', text: json.message || json.error || 'That didn’t work.' });
      } else {
        const told = json.notified ? ' They have been emailed.' : ' The email to them didn’t go: tell them yourself.';
        setResult({
          tone: 'green',
          text: action === 'approve' ? `Approved and live.${told}` : `Rejected.${told}`,
          link: action === 'approve' && json.slug ? `${PATHS[json.content_type]}/${json.slug}` : null,
        });
        await reload();
        await load();
      }
    } catch (err) {
      setResult({ tone: 'red', text: err.message });
    }
    setBusy(false);
  };

  if (problem) return <Placeholder icon="⚠️" title="Couldn’t open this" body={problem} />;
  if (!data) return <Placeholder icon="◴" title="Loading…" />;

  const { submission: row, live, result: published, person, subjects, duplicate, removal, linkCheck, imagePreview, healers, changes } = data;
  const contentType = row.content_type;
  const productType = live?.product_type || row.fields?.product_type;
  const what = contentType === 'course' ? PRODUCT_LABELS[productType] || 'Course' : kindLabel(contentType);
  const listing = row.healers?.name || row.publishers?.name || 'their listing';
  const pending = row.status === 'pending';
  const imageColumn = IMAGE_COLUMNS[contentType];
  const image = imagePreview || (imageColumn ? (live || published || {})[imageColumn] : null);
  const healerName = row.author_pending ? healers.find((h) => h.healer_slug === healerSlug)?.name : row.healers?.name;

  return (
    <>
      <Link href="/admin" className="mb-4 inline-block text-sm text-slate-400 hover:text-white">
        ← Inbox
      </Link>
      <SectionHeading
        title={row.kind === 'edit' ? `Edit to a ${what.toLowerCase()}` : `New ${what.toLowerCase()} from ${listing}`}
        subtitle={[
          person?.name,
          person?.email,
          row.publishers?.name ? `for ${row.publishers.name}` : null,
          `sent ${new Date((pending && row.updated_at) || row.created_at).toLocaleString('en-GB')}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      />

      <div className="mb-6 flex flex-col gap-3">
        {!pending && (
          <Notice tone="slate">
            This was {row.status}
            {row.decided_at ? ` on ${new Date(row.decided_at).toLocaleDateString('en-GB')}` : ''}.{' '}
            {published?.slug && (
              <a href={`${PATHS[contentType]}/${published.slug}`} target="_blank" rel="noreferrer" className="underline">
                See it →
              </a>
            )}
          </Notice>
        )}
        {result && (
          <Notice tone={result.tone}>
            {result.text}{' '}
            {result.link && (
              <a href={result.link} target="_blank" rel="noreferrer" className="underline">
                See it →
              </a>
            )}
          </Notice>
        )}
        {row.kind === 'edit' && live && (
          <Notice tone="slate">
            Live now:{' '}
            <a href={`${PATHS[contentType]}/${live.slug}`} target="_blank" rel="noreferrer" className="underline">
              {live.title}
            </a>
            . It stays as it is until you approve. Changed fields are marked “Was”.{' '}
            {changes && Object.keys(changes).length === 0 && !imagePreview ? 'Nothing differs from the live version now.' : ''}
          </Notice>
        )}
        {row.notes && (
          <Notice tone="slate">
            <span className="font-semibold">Their notes:</span> <span className="whitespace-pre-wrap">{row.notes}</span>
          </Notice>
        )}
        {duplicate && pending && (
          <Notice tone="red">
            Already on Spiritpedia: “{duplicate.title}”
            {duplicate.slug && (
              <>
                {' '}
                <a href={`${PATHS[contentType]}/${duplicate.slug}`} target="_blank" rel="noreferrer" className="underline">
                  open it
                </a>
              </>
            )}
            . Approve is blocked; reject as “already listed”.
          </Notice>
        )}
        {removal && (
          <Notice tone="amber">
            {removal.removed_by_name || 'Its owner'} removed “{removal.title}” on {new Date(removal.removed_at).toLocaleDateString('en-GB')}
            {removal.healer_slug ? ` (from /healers/${removal.healer_slug})` : ''}.
          </Notice>
        )}
        {linkCheck && (
          <Notice tone={linkCheck.ok === true ? 'green' : linkCheck.ok === false ? 'red' : 'amber'}>
            Link check: {linkCheck.label}{' '}
            <a href={row.fields?.[URL_COLUMNS[contentType]]} target="_blank" rel="noreferrer" className="underline">
              Open it →
            </a>
          </Notice>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex flex-col gap-5">
          {row.author_pending && pending && (
            <Field
              id="healer_slug"
              label="Author"
              hint="Not on Spiritpedia yet. Create them in Ingestion (and link them to the publisher), then choose them here."
              error={errors.healer_slug}
            >
              <div className="flex flex-wrap gap-2">
                <select id="healer_slug" value={healerSlug} onChange={(e) => setHealerSlug(e.target.value)} className={`${inputClass} flex-1`}>
                  <option value="">Choose…</option>
                  {healers.map((h) => (
                    <option key={h.healer_slug} value={h.healer_slug}>
                      {h.name}
                    </option>
                  ))}
                </select>
                <a href="/admin/ingestion" target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-300 hover:text-white">
                  Ingestion →
                </a>
                <button type="button" onClick={load} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-300 hover:text-white">
                  Refresh list
                </button>
              </div>
            </Field>
          )}

          <ContentForm
            kind={data.kind}
            values={values}
            onChange={(column, value) => setValues((v) => ({ ...v, [column]: value }))}
            errors={errors}
            before={live}
            idPrefix="review"
          />
          <SubjectPicker
            subjects={subjects}
            chosen={chosen}
            onChange={setChosen}
            error={errors.subjects}
            was={live && changes?.subject_slugs ? live.subject_slugs || [] : undefined}
          />

          {contentType === 'course' && (
            <Field id="affiliate" label="Affiliate status">
              <select id="affiliate" value={affiliate} onChange={(e) => setAffiliate(e.target.value)} className={inputClass}>
                <option value="none">None</option>
                <option value="applied">Applied</option>
                <option value="active">Active</option>
              </select>
            </Field>
          )}
          {contentType === 'free_resource' && (
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
              Featured
            </label>
          )}

          {pending && (
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 p-5">
              <button
                type="button"
                onClick={() => decide('approve')}
                disabled={busy || Boolean(duplicate) || (row.author_pending && !healerSlug)}
                className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                {busy ? 'Working…' : row.kind === 'edit' ? 'Approve changes' : 'Approve: put it live'}
              </button>
              <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
                <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} aria-label="Reason">
                  <option value="">Reject: choose a reason…</option>
                  {Object.entries(REJECT_REASONS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={reason === 'other' ? 'Say why (they’ll see this)' : 'Optional note (they’ll see this)'}
                  className={`${inputClass} resize-y`}
                />
                <button
                  type="button"
                  onClick={() => decide('reject')}
                  disabled={busy || !reason || (reason === 'other' && !note.trim())}
                  className="rounded-full border border-red-500/50 px-6 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                >
                  Reject and tell them
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">How it will look</p>
          <Preview contentType={contentType} values={values} image={image} healerName={healerName} />
          {imagePreview && live && imageColumn && live[imageColumn] && (
            <div>
              <p className="text-xs text-amber-300/80">New image above. Was:</p>
              <img src={live[imageColumn]} alt="" className="mt-2 h-24 w-24 rounded-xl object-cover" />
            </div>
          )}
        </aside>
      </div>

      <button type="button" onClick={() => router.push('/admin/submissions')} className="mt-8 text-sm text-slate-400 hover:text-white">
        Everything from owners →
      </button>
    </>
  );
}

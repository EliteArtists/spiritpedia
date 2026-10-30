'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabaseAuth } from '../utils/supabaseAuth.js';
import {
  CONTENT_KINDS,
  IMAGE_COLUMNS,
  IMAGE_TYPES,
  LIMITS,
  MAX_IMAGE_BYTES,
  PRODUCT_LABELS,
  REJECT_REASONS,
  kindOf,
  youtubeId,
} from '../utils/contentSubmissions.js';
import ContentForm, { Field, SubjectPicker, formFieldsFor, inputClass, kindLabel } from './ContentForm.jsx';

// An owner's own content (migration 0024), on their dashboard: add, edit and
// remove. Adding and editing wait for Spiritpedia's approval, and the live
// version stays up meanwhile; removing is immediate. /api/content does the work.
//
// `as`: 'healer' (a practitioner, channel, app or organisation: everything on
// the listing) or 'publisher' (books, for one of its authors).

const PATHS = { video: '/videos', book: '/books', course: '/offerings', free_resource: '/free-resources' };
const GROUPS = [
  ['video', 'Videos'],
  ['book', 'Books'],
  ['course', 'Courses, retreats & memberships'],
  ['free_resource', 'Free resources'],
];
const ADD_KINDS = {
  healer: ['video', 'book', 'course', 'retreat', 'membership', 'free_resource'],
  publisher: ['book'],
};

async function token() {
  const { data } = await supabaseAuth.auth.getSession();
  return data?.session?.access_token || null;
}

async function api(method, body, query = '') {
  const t = await token();
  if (!t) return { error: 'no_session', message: 'Your session expired. Please sign in again.' };
  try {
    const res = await fetch(`/api/content${query}`, {
      method,
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    return await res.json();
  } catch {
    return { error: 'network', message: 'We couldn’t reach Spiritpedia. Please try again.' };
  }
}

function thumbFor(type, item) {
  if (type === 'video') {
    const id = youtubeId(item.platform_url);
    return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
  }
  return item[IMAGE_COLUMNS[type]] || null;
}

function itemKindWord(type, item) {
  if (type === 'course') return PRODUCT_LABELS[item.product_type] || 'Course';
  return kindLabel(type);
}

/* ── The editor ───────────────────────────────────────────────────────── */

// mode: { kind, target? (live row), submission? (one turned down) }
function Editor({ as, mode, subjects, authors, onDone, onCancel }) {
  const { target, submission } = mode;
  const kind = mode.kind;
  const contentType = CONTENT_KINDS[kind]?.contentType || mode.contentType;
  const start = submission?.fields || target || {};
  const [values, setValues] = useState(() =>
    Object.fromEntries(formFieldsFor(kind).map((c) => [c, start[c] ?? '']))
  );
  const [chosen, setChosen] = useState(() => submission?.suggested_subjects || target?.subject_slugs || []);
  const [notes, setNotes] = useState(submission?.notes || '');
  const [authorSlug, setAuthorSlug] = useState(submission?.healer_slug || '');
  const [authorPending, setAuthorPending] = useState(Boolean(submission?.author_pending));
  const [image, setImage] = useState(
    submission?.image_path ? { path: null, preview: submission.image_preview } : null
  );
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);

  const hasImage = Boolean(IMAGE_COLUMNS[contentType]);
  const currentImage = target ? target[IMAGE_COLUMNS[contentType]] : null;
  const set = (column, value) => setValues((v) => ({ ...v, [column]: value }));

  // A video's title, from YouTube, when the link is pasted and no title typed.
  const fillTitle = async (link) => {
    if (!link || values.title) return;
    const json = await api('POST', { action: 'youtube_title', as, url: link });
    if (json.ok) {
      setValues((v) => ({ ...v, platform_url: json.url, title: v.title || json.title || '' }));
    }
  };

  const upload = async (file) => {
    if (!file) return;
    if (!IMAGE_TYPES[file.type]) {
      setErrors((e) => ({ ...e, image: 'Use a JPEG, PNG or WebP image.' }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((e) => ({ ...e, image: 'That image is larger than 5 MB.' }));
      return;
    }
    setUploading(true);
    setErrors((e) => ({ ...e, image: null }));
    const t = await token();
    const body = new FormData();
    body.append('file', file);
    body.append('as', as);
    try {
      const res = await fetch('/api/content/image', { method: 'POST', headers: { Authorization: `Bearer ${t}` }, body });
      const json = await res.json();
      if (json.ok) setImage({ path: json.path, preview: json.preview });
      else setErrors((e) => ({ ...e, image: json.message || 'The upload didn’t work.' }));
    } catch {
      setErrors((e) => ({ ...e, image: 'The upload didn’t work. Please try again.' }));
    }
    setUploading(false);
  };

  const send = async () => {
    if (sending || uploading) return;
    setSending(true);
    setMessage(null);
    const body = {
      as,
      kind,
      content_type: contentType,
      form: values,
      subjects: chosen,
      notes,
      image_path: image?.path || undefined,
      author_slug: authorPending ? null : authorSlug,
      author_pending: as === 'publisher' && !target ? authorPending : undefined,
    };
    const json = submission
      ? await api('POST', { ...body, action: 'resubmit', id: submission.id })
      : await api('POST', { ...body, action: 'submit', target_id: target ? target.id : undefined });
    setSending(false);
    if (json.ok) {
      onDone(target ? 'Sent. Your changes will show once they’re approved; until then the live version stays up.' : 'Sent. It will appear on your listing once it’s approved.');
      return;
    }
    setErrors(json.errors || {});
    setMessage(json.message || 'We couldn’t send that. Please try again.');
  };

  const heading = target
    ? `Edit ${itemKindWord(contentType, target).toLowerCase()}`
    : submission
      ? 'Edit and send again'
      : `Add a ${kindLabel(kind).toLowerCase()}`;

  return (
    <section className="rounded-2xl border border-[#7c3aed]/40 bg-[#111827] p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{heading}</h3>
        <button type="button" onClick={onCancel} className="text-sm text-gray-400 hover:text-white">
          Cancel
        </button>
      </div>
      {target && (
        <p className="mt-1 text-xs text-gray-500">Your changes come to us to approve. The live version stays as it is until then.</p>
      )}
      {submission?.reject_reason && (
        <p className="mt-2 text-xs text-red-300">
          We couldn’t add it: {REJECT_REASONS[submission.reject_reason]}
          {submission.admin_note ? ` ${submission.admin_note}` : ''}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-4">
        {as === 'publisher' && !target && (
          <Field id="author_slug" label="Author" error={errors.author_slug}>
            <select
              id="author_slug"
              value={authorPending ? '__pending' : authorSlug}
              onChange={(e) => {
                const v = e.target.value;
                setAuthorPending(v === '__pending');
                setAuthorSlug(v === '__pending' ? '' : v);
                const named = authors.find((a) => a.slug === v);
                if (named && !values.author) set('author', named.name);
              }}
              className={inputClass}
            >
              <option value="">Choose…</option>
              {authors.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.name}
                </option>
              ))}
              <option value="__pending">Author not on Spiritpedia yet</option>
            </select>
          </Field>
        )}

        <ContentForm kind={kind} values={values} onChange={set} errors={errors} before={target} onLinkBlur={kind === 'video' ? fillTitle : undefined} />

        <SubjectPicker subjects={subjects} chosen={chosen} onChange={setChosen} error={errors.subjects} />

        {hasImage && (
          <Field
            id="image"
            label={contentType === 'book' ? 'Cover' : 'Image'}
            hint="Optional. Upload a JPEG, PNG or WebP, up to 5 MB."
            error={errors.image}
          >
            <div className="flex items-center gap-4">
              {(image?.preview || currentImage) && (
                <img referrerPolicy="no-referrer" src={image?.preview || currentImage} alt="" className="h-20 w-20 rounded-xl border border-white/10 object-cover" />
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-gray-200 hover:border-[#7c3aed] hover:text-white disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : image?.preview || currentImage ? 'Replace image' : 'Upload image'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept={Object.keys(IMAGE_TYPES).join(',')}
                hidden
                onChange={(e) => {
                  upload(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
          </Field>
        )}

        <Field
          id="notes"
          label="Notes for Spiritpedia"
          hint={authorPending ? 'Tell us the author’s name, and anything that helps us find them.' : 'Optional. Anything we should know.'}
          error={errors.notes}
        >
          <textarea
            id="notes"
            rows={3}
            maxLength={LIMITS.notes}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${inputClass} resize-y`}
          />
        </Field>
      </div>

      {message && (
        <p role="status" className="mt-4 text-sm text-red-400">
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={send}
        disabled={sending || uploading}
        className="mt-5 w-full rounded-full bg-[#7c3aed] px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#6d28d9] disabled:opacity-50"
      >
        {sending ? 'Sending…' : target ? 'Send changes for approval' : 'Send for approval'}
      </button>
    </section>
  );
}

/* ── The lists ────────────────────────────────────────────────────────── */

function Row({ thumb, title, sub, children }) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      {thumb ? (
        <img referrerPolicy="no-referrer" src={thumb} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded object-cover" />
      ) : (
        <span className="h-12 w-12 shrink-0 rounded bg-white/5" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-white">{title || 'Untitled'}</span>
        {sub && <span className="block text-xs text-gray-500">{sub}</span>}
      </span>
      <span className="flex flex-wrap items-center gap-3">{children}</span>
    </li>
  );
}

const linkBtn = 'text-xs text-[#a78bfa] hover:text-white disabled:opacity-40';

function LiveItem({ type, item, editWaiting, onEdit, onRemoved, as }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  const remove = async () => {
    setBusy(true);
    setProblem(null);
    const json = await api('POST', { action: 'remove', as, content_type: type, id: item.id });
    setBusy(false);
    if (json.ok) onRemoved(item.title);
    else setProblem(json.message || 'We couldn’t remove that. Please try again.');
  };

  return (
    <Row thumb={thumbFor(type, item)} title={item.title} sub={editWaiting ? 'Edit awaiting approval' : itemKindWord(type, item)}>
      {confirming ? (
        <>
          <span className="text-xs text-gray-300">Remove “{item.title}”? This can’t be undone.</span>
          <button type="button" onClick={remove} disabled={busy} className="rounded-full bg-red-500/80 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50">
            {busy ? 'Removing…' : 'Remove'}
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="text-xs text-gray-400 hover:text-white">
            Cancel
          </button>
        </>
      ) : (
        <>
          {item.slug && (
            <Link href={`${PATHS[type]}/${item.slug}`} target="_blank" className={linkBtn}>
              View
            </Link>
          )}
          <button type="button" onClick={onEdit} disabled={editWaiting} className={linkBtn}>
            Edit
          </button>
          <button type="button" onClick={() => setConfirming(true)} className="text-xs text-gray-400 hover:text-red-300">
            Remove
          </button>
        </>
      )}
      {problem && <span className="w-full text-xs text-red-400">{problem}</span>}
    </Row>
  );
}

function Section({ title, count, children }) {
  if (!count) return null;
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#a78bfa]">
        {title} · {count}
      </h3>
      <ul className="mt-3 divide-y divide-white/5 rounded-2xl border border-white/10">{children}</ul>
    </section>
  );
}

export default function OwnContent({ as }) {
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState(null);
  const [mode, setMode] = useState(null);
  const [notice, setNotice] = useState(null);
  const top = useRef(null);

  const load = useCallback(async () => {
    const json = await api('GET', null, `?as=${as}`);
    if (json.live) {
      setData(json);
      setProblem(null);
    } else {
      setProblem(json.message || 'We couldn’t load your content. Please try again in a moment.');
    }
  }, [as]);

  useEffect(() => {
    let cancelled = false;
    api('GET', null, `?as=${as}`).then((json) => {
      if (cancelled) return;
      if (json.live) setData(json);
      else setProblem(json.message || 'We couldn’t load your content. Please try again in a moment.');
    });
    return () => {
      cancelled = true;
    };
  }, [as]);

  const open = (next) => {
    setNotice(null);
    setMode(next);
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const done = async (text) => {
    setMode(null);
    setNotice(text);
    await load();
  };

  const withdraw = async (id, text) => {
    const json = await api('POST', { action: 'withdraw', as, id });
    if (json.ok) await done(text);
    else setNotice(json.message || 'That didn’t work. Please try again.');
  };

  if (problem) return <p className="text-sm text-gray-400">{problem}</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading your content…</p>;

  const waiting = data.submissions.filter((s) => s.status === 'pending');
  const turnedDown = data.submissions.filter((s) => s.status === 'rejected');
  const editsWaiting = new Set(waiting.filter((s) => s.kind === 'edit').map((s) => `${s.content_type}:${s.target_id}`));
  const liveCount = GROUPS.reduce((n, [type]) => n + (data.live[type]?.length || 0), 0);
  const titleOf = (s) => s.fields?.title || 'Untitled';
  const subOf = (s) => {
    const what = s.content_type === 'course' ? PRODUCT_LABELS[s.fields?.product_type] || 'Course' : kindLabel(s.content_type);
    return s.kind === 'edit' ? `Changes to a ${what.toLowerCase()}` : `New ${what.toLowerCase()}`;
  };

  return (
    <div ref={top} className="flex scroll-mt-24 flex-col gap-6 text-left">
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#a78bfa]">
          {as === 'publisher' ? 'Add a book' : 'Add to your listing'}
        </h3>
        {as === 'publisher' && (
          <p className="mt-1 text-xs text-gray-500">
            Books go on their author’s page, and so on yours. Authors with their own account can add their own.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {ADD_KINDS[as].map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => open({ kind })}
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-gray-200 transition-colors hover:border-[#7c3aed] hover:text-white"
            >
              + {kindLabel(kind)}
            </button>
          ))}
        </div>
      </section>

      {notice && (
        <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {notice}
        </p>
      )}

      {mode && (
        <Editor
          key={JSON.stringify([mode.kind, mode.target?.id, mode.submission?.id])}
          as={as}
          mode={mode}
          subjects={data.subjects}
          authors={data.authors}
          onDone={done}
          onCancel={() => setMode(null)}
        />
      )}

      <Section title="Waiting for review" count={waiting.length}>
        {waiting.map((s) => (
          <Row key={s.id} thumb={s.image_preview || thumbFor(s.content_type, s.fields || {})} title={titleOf(s)} sub={`${subOf(s)} · Awaiting approval`}>
            <button type="button" onClick={() => withdraw(s.id, 'Withdrawn.')} className="text-xs text-gray-400 hover:text-white">
              Withdraw
            </button>
          </Row>
        ))}
      </Section>

      <Section title="Not added" count={turnedDown.length}>
        {turnedDown.map((s) => (
          <Row
            key={s.id}
            thumb={s.image_preview || thumbFor(s.content_type, s.fields || {})}
            title={titleOf(s)}
            sub={`${subOf(s)} · ${REJECT_REASONS[s.reject_reason] || 'Not added.'}${s.admin_note ? ` ${s.admin_note}` : ''}`}
          >
            <button
              type="button"
              onClick={() => {
                const target = s.kind === 'edit' ? data.live[s.content_type]?.find((i) => String(i.id) === s.target_id) : null;
                open({ kind: kindOf(s.content_type, target || s.fields), contentType: s.content_type, submission: s, target });
              }}
              className={linkBtn}
            >
              Edit and send again
            </button>
            <button type="button" onClick={() => withdraw(s.id, 'Removed from this list.')} className="text-xs text-gray-400 hover:text-white">
              Dismiss
            </button>
          </Row>
        ))}
      </Section>

      <div>
        <h3 className="text-sm font-semibold text-white">Live on Spiritpedia</h3>
        {liveCount === 0 && (
          <p className="mt-2 text-sm text-gray-500">
            {as === 'publisher' ? 'Books you add appear here once they’re approved.' : 'Nothing is listed under your profile yet.'}
          </p>
        )}
      </div>
      {GROUPS.map(([type, title]) => (
        <Section key={type} title={title} count={data.live[type]?.length || 0}>
          {(data.live[type] || []).map((item) => (
            <LiveItem
              key={item.id}
              as={as}
              type={type}
              item={item}
              editWaiting={editsWaiting.has(`${type}:${item.id}`)}
              onEdit={() => open({ kind: kindOf(type, item), contentType: type, target: item })}
              onRemoved={(t) => done(`“${t}” has been removed from Spiritpedia.`)}
            />
          ))}
        </Section>
      ))}
    </div>
  );
}

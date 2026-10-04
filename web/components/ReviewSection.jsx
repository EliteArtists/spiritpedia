'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../utils/supabase.js';
import { getSession, supabaseAuth } from '../utils/supabaseAuth.js';

// COMMUNITY REVIEWS — the live version of what used to be a placeholder.
//
// Two components, mounted in two different places on each content page: a
// summary line under the title and the block at the foot. They cannot share a
// parent without restructuring four pages, so they share a module-level
// request instead — see `readApproved` below.
//
// WHICH CLIENT READS WHAT. Public reads go through `supabase`, the anonymous
// client: the read policy is `status = 'approved'`, so RLS does the filtering
// and an unapproved review is not merely hidden by the UI, it never arrives.
// Anything belonging to the signed-in reader — their own pending or rejected
// review, and every write — goes through `supabaseAuth`, which carries the
// session that `auth.uid()` resolves from.
//
// WHAT THE CLIENT MUST NOT SEND. `status` and `author_healer_slug` are set by
// the database trigger, which forces the first to 'pending' and derives the
// second from the submitter's own profile. Sending either is pointless at best
// and an impersonation attempt at worst, so neither appears in the payload.
// `author_name` is the one denormalised field the trigger cannot fill:
// user_profiles is readable only by its owner, so a public list has no way to
// join for it afterwards.

const PAGE_LIMIT = 50;

/* ── SHARED READ ───────────────────────────────────────────────────────── */

// One request per item per page load, shared by the summary and the block.
// Both mount at the same moment, and without this they would each fetch the
// same rows. Keyed by item; the promise is cached, not the result, so a second
// caller arriving mid-flight waits on the first rather than starting another.
const inFlight = new Map();

function readApproved(contentType, contentSlug) {
  const key = `${contentType}:${contentSlug}`;
  if (!inFlight.has(key)) {
    inFlight.set(
      key,
      supabase
        .from('reviews')
        .select('id, rating, body, author_name, author_healer_slug, created_at')
        .eq('content_type', contentType)
        .eq('content_slug', contentSlug)
        .order('created_at', { ascending: false })
        .limit(PAGE_LIMIT)
        // A failure is an empty list, not an error on screen. Reviews are an
        // addition to a page that works without them.
        .then(({ data, error }) => (error ? [] : data || []))
        .catch(() => [])
    );
  }
  return inFlight.get(key);
}

// Dropped after a successful submission, so the next read is not served the
// list from before it.
function forget(contentType, contentSlug) {
  inFlight.delete(`${contentType}:${contentSlug}`);
}

function average(reviews) {
  if (reviews.length === 0) return 0;
  return reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/* ── STARS ─────────────────────────────────────────────────────────────── */

// Filled-outline star glyph. Sized/coloured by the caller via className so the
// same shape serves the inline rating row and the large empty-state icon.
export function Star({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </svg>
  );
}

// Five stars, lit up to `value`. Rounded rather than clipped: a half star costs
// a mask and a gradient to say something the number beside it already says.
function Stars({ value, size = 'w-5 h-5' }) {
  const lit = Math.round(value);
  return [0, 1, 2, 3, 4].map((i) => (
    <Star key={i} className={`${size} inline ${i < lit ? 'text-amber-400' : 'text-gray-600'}`} />
  ));
}

/* ── INLINE SUMMARY ────────────────────────────────────────────────────── */

// Replaces the old RatingRow. Same markup when there is nothing to show, so a
// page with no reviews reads exactly as it did before.
export function RatingRow({ className = 'mb-6', contentType, contentSlug }) {
  const [reviews, setReviews] = useState(null);

  useEffect(() => {
    let cancelled = false;
    readApproved(contentType, contentSlug).then((rows) => {
      if (!cancelled) setReviews(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [contentType, contentSlug]);

  // null is "not known yet" and renders the empty state rather than a spinner:
  // this is one line under a title, and a flicker of "Loading…" is worse than
  // a line that fills in.
  const list = reviews || [];
  const mean = average(list);

  return (
    <div className={className}>
      <Stars value={mean} />
      {list.length > 0 ? (
        <span className="text-sm text-gray-400 ml-2">
          {mean.toFixed(1)} · {list.length} review{list.length === 1 ? '' : 's'}
        </span>
      ) : (
        <span className="text-sm text-gray-500 ml-2">Be the first to review</span>
      )}
    </div>
  );
}

/* ── SUBMISSION FORM ───────────────────────────────────────────────────── */

const inputClass =
  'w-full rounded-xl border border-white/10 bg-[#0a0f1d] px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#7c3aed] focus:outline-none';

function StarPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          onClick={() => onChange(n)}
          className="p-1 transition-transform hover:scale-110"
        >
          <Star className={`w-7 h-7 ${n <= value ? 'text-amber-400' : 'text-gray-700'}`} />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ contentType, contentSlug, existing, profileName, onSaved }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [body, setBody] = useState(existing?.body || '');
  const [name, setName] = useState(existing?.author_name || profileName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  // What the confirmation should say, captured when the write succeeds rather
  // than read at render: onSaved refreshes the parent's copy of "my review", so
  // by the time this renders, a first submission looks like an edit and would
  // report itself as one.
  const [done, setDone] = useState(null);

  const editing = Boolean(existing);

  const submit = async () => {
    if (rating === 0 || saving) return;
    setSaving(true);
    setError(null);

    const { data: session } = await getSession();
    const userId = session?.user?.id;
    if (!userId) {
      setError('Your session has expired. Please sign in again.');
      setSaving(false);
      return;
    }

    // Upserted on (user_id, content_type, content_slug): the table's unique
    // constraint makes a second submission an edit of the first rather than a
    // second row, so this one call covers both.
    //
    // status and author_healer_slug are absent on purpose — the trigger owns
    // them, and an update resets neither, which is what keeps an edit from
    // re-approving itself.
    const { error: writeError } = await supabaseAuth.from('reviews').upsert(
      {
        user_id: userId,
        content_type: contentType,
        content_slug: contentSlug,
        rating,
        body: body.trim() || null,
        author_name: name.trim() || null,
      },
      { onConflict: 'user_id,content_type,content_slug' }
    );

    if (writeError) {
      setError(writeError.message);
      setSaving(false);
      return;
    }

    setDone(editing ? 'updated' : 'submitted');
    setSaving(false);
    forget(contentType, contentSlug);
    onSaved?.();
  };

  if (done) {
    return (
      <p className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center text-sm text-emerald-300">
        Your review has been {done} and is awaiting approval.
      </p>
    );
  }

  return (
    <div className="mt-8 rounded-2xl bg-[#111827] p-6 md:p-8">
      <h3 className="text-lg font-semibold text-white">
        {editing ? 'Edit your review' : 'Write a review'}
      </h3>

      <div className="mt-4">
        <StarPicker value={rating} onChange={setRating} />
      </div>

      <label className="mt-5 block">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Your name
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="How your name appears on the review"
          className={`${inputClass} mt-1.5`}
        />
      </label>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Your review <span className="normal-case tracking-normal text-gray-600">(optional)</span>
        </span>
        <textarea
          rows={5}
          value={body}
          // Capped in the browser as well as by the database, so the limit is
          // something you can see coming rather than an error after writing.
          maxLength={4000}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did you take from this?"
          className={`${inputClass} mt-1.5 resize-y leading-relaxed`}
        />
      </label>

      <div className="mt-2 flex items-center justify-between gap-4">
        <span className="text-xs text-gray-600">{body.length} / 4000</span>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={rating === 0 || saving}
          className="rounded-xl bg-[#7c3aed] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Submitting…' : editing ? 'Save changes' : 'Submit review'}
        </button>
        {rating === 0 && <span className="text-xs text-gray-600">Choose a rating first.</span>}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-gray-600">
        Reviews are read by a moderator before they appear. Yours will be visible to you in the
        meantime.
      </p>
    </div>
  );
}

/* ── ONE REVIEW ────────────────────────────────────────────────────────── */

const STATUS_STYLES = {
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  rejected: 'border-red-500/40 bg-red-500/10 text-red-300',
  approved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
};

function ReviewCard({ review, status }) {
  const name = review.author_name || 'A Spiritpedia member';

  return (
    <li className="border-t border-white/10 py-6 first:border-t-0">
      <div className="flex flex-wrap items-center gap-3">
        <span>
          <Stars value={review.rating} size="w-4 h-4" />
        </span>
        {status && (
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              STATUS_STYLES[status] || STATUS_STYLES.pending
            }`}
          >
            {status === 'pending' ? 'Awaiting approval' : status}
          </span>
        )}
      </div>

      {review.body && (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-300">
          {review.body}
        </p>
      )}

      <p className="mt-3 text-xs text-gray-500">
        {/* A practitioner who has claimed their profile gets their name linked
            to it. The slug comes from the trigger, never from the submitter. */}
        {review.author_healer_slug ? (
          <Link
            href={`/healers/${review.author_healer_slug}`}
            className="font-semibold text-violet-400 transition-colors hover:text-violet-300"
          >
            {name}
          </Link>
        ) : (
          <span className="font-semibold text-gray-400">{name}</span>
        )}
        {review.created_at ? ` · ${formatDate(review.created_at)}` : ''}
      </p>
    </li>
  );
}

/* ── THE BLOCK ─────────────────────────────────────────────────────────── */

export default function ReviewSection({ contentType, contentSlug }) {
  const [approved, setApproved] = useState(null);
  const [mine, setMine] = useState(undefined); // undefined = not checked, null = none
  const [signedIn, setSignedIn] = useState(null);
  const [profileName, setProfileName] = useState('');

  const loadApproved = useCallback(() => {
    readApproved(contentType, contentSlug).then(setApproved);
  }, [contentType, contentSlug]);

  useEffect(() => {
    loadApproved();
  }, [loadApproved]);

  // The reader's own review, whatever its status. A separate query through the
  // auth client, because the public policy would not return a pending one.
  // Returns what it found rather than setting state itself, so every caller —
  // the effect below and the form's onSaved — applies it the same way and
  // nothing writes state synchronously inside an effect body.
  const resolveMine = useCallback(async () => {
    try {
      const { data: session } = await getSession();
      const userId = session?.user?.id;
      if (!userId) return { signedIn: false, review: null, name: '' };

      const [{ data: review }, { data: profile }] = await Promise.all([
        supabaseAuth
          .from('reviews')
          .select('id, rating, body, author_name, author_healer_slug, status, created_at')
          .eq('user_id', userId)
          .eq('content_type', contentType)
          .eq('content_slug', contentSlug)
          .maybeSingle(),
        supabaseAuth.from('user_profiles').select('full_name').eq('id', userId).maybeSingle(),
      ]);

      return { signedIn: true, review: review || null, name: profile?.full_name || '' };
    } catch {
      // Treated as signed out. A reader who cannot be identified is offered
      // the sign-in line, which is the honest answer either way.
      return { signedIn: false, review: null, name: '' };
    }
  }, [contentType, contentSlug]);

  const applyMine = useCallback((result) => {
    setSignedIn(result.signedIn);
    setMine(result.review);
    setProfileName(result.name);
  }, []);

  useEffect(() => {
    let cancelled = false;
    resolveMine().then((result) => {
      if (!cancelled) applyMine(result);
    });
    return () => {
      cancelled = true;
    };
  }, [resolveMine, applyMine]);

  const list = useMemo(() => approved || [], [approved]);
  const mean = useMemo(() => average(list), [list]);

  // An approved review of the reader's own is already in the public list;
  // showing it twice, once with a badge, would read as two reviews.
  const showOwn = mine && mine.status !== 'approved';

  return (
    <div className="max-w-4xl mx-auto px-6 pb-16">
      <div className="border-t border-white/10 mb-10 mt-4" />
      <h2 className="text-xl font-bold text-white mb-2">Community Reviews</h2>
      <div className="flex items-center">
        <Stars value={mean} size="w-6 h-6" />
        <span className="text-gray-500 text-sm ml-2">
          {list.length === 0
            ? '0 ratings'
            : `${mean.toFixed(1)} from ${list.length} rating${list.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {showOwn && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-[#111827] px-6">
          <ul>
            <ReviewCard review={mine} status={mine.status} />
          </ul>
        </div>
      )}

      {list.length > 0 && (
        <ul className="mt-6">
          {list.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </ul>
      )}

      {list.length === 0 && !showOwn && (
        <div className="mt-8 bg-[#111827] rounded-2xl p-8 text-center max-w-xl mx-auto">
          <Star className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Be the first to review</h3>
          <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
            Reviews from the Spiritpedia community will appear here.
          </p>
        </div>
      )}

      {/* The form, or the reason there is no form. `mine === undefined` is the
          moment before the session is known: nothing is rendered rather than a
          sign-in prompt that would flash at someone who is already signed in. */}
      {mine !== undefined &&
        (signedIn ? (
          <ReviewForm
            contentType={contentType}
            contentSlug={contentSlug}
            existing={mine}
            profileName={profileName}
            onSaved={() => {
              loadApproved();
              resolveMine().then(applyMine);
            }}
          />
        ) : (
          <p className="mt-8 rounded-2xl bg-[#111827] p-6 text-center text-sm text-gray-500">
            Sign in to leave a review.
          </p>
        ))}
    </div>
  );
}

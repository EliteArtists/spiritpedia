'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import { getUser, supabaseAuth } from '@/utils/supabaseAuth';
import {
  AVAILABILITY_OPTIONS,
  SUBJECT_SLUGS,
  subjectLabel,
} from '@/utils/practitionerSubjects';

const BUCKET = 'practitioner-images';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const EMPTY_FORM = {
  full_name: '',
  bio: '',
  modality: '',
  website_url: '',
  booking_url: '',
  location_city: '',
  location_country: '',
  availability_type: 'worldwide',
  youtube_url: '',
  instagram_url: '',
  facebook_url: '',
  tiktok_url: '',
  twitter_url: '',
};

function Section({ title, children }) {
  return (
    <section className="mt-10 text-left">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#a78bfa]">{title}</h2>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, required, children, htmlFor }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="ml-1 text-[#a78bfa]">*</span>}
      </label>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-white/15 bg-[#111827] px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#7c3aed] focus:outline-none';

export default function PractitionerSetupPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  // True when they are back after a rejection, so the page can say so.
  const [returning, setReturning] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [subjects, setSubjects] = useState([]);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await getUser();
      if (cancelled) return;
      if (!data) {
        router.replace('/auth/signup');
        return;
      }
      setUser(data);

      // Load whatever they have already told us. Someone whose application was
      // rejected is coming back to CHANGE something, not to retype it from
      // memory — an empty form would lose the work and make a small correction
      // feel like starting over.
      const { data: existing } = await supabaseAuth
        .from('user_profiles')
        .select('*')
        .eq('id', data.id)
        .maybeSingle();

      if (cancelled) return;
      if (existing) {
        setForm((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(EMPTY_FORM)) {
            if (existing[key] !== null && existing[key] !== undefined) next[key] = existing[key];
          }
          return next;
        });
        if (Array.isArray(existing.subject_slugs)) setSubjects(existing.subject_slugs);
        if (Array.isArray(existing.image_urls)) setImages(existing.image_urls);
        setReturning(existing.verification_status === 'rejected');
      }

      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const toggleSubject = (slug) =>
    setSubjects((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  // Uploads go to <user id>/<random>.<ext>. The leading folder is not
  // cosmetic: the storage policy checks it against auth.uid(), so it is what
  // stops one practitioner writing into another's space.
  const uploadFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      if (files.length === 0 || !user) return;

      setImageError(null);
      setUploading(true);

      const accepted = [];
      const rejected = [];

      for (const file of files) {
        if (!ACCEPTED.includes(file.type)) {
          rejected.push(`${file.name} is not a JPEG, PNG, WebP or GIF`);
          continue;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          rejected.push(`${file.name} is larger than 5MB`);
          continue;
        }

        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabaseAuth.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          rejected.push(`${file.name} — ${uploadError.message}`);
          continue;
        }

        const { data } = supabaseAuth.storage.from(BUCKET).getPublicUrl(path);
        if (data?.publicUrl) accepted.push(data.publicUrl);
      }

      if (accepted.length) setImages((prev) => [...prev, ...accepted]);
      // Named failures rather than a silent drop: someone who adds four photos
      // and gets three should be told which one did not make it, and why.
      if (rejected.length) setImageError(rejected.join(' · '));
      setUploading(false);
    },
    [user]
  );

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    uploadFiles(event.dataTransfer?.files);
  };

  // Removes the thumbnail only. The uploaded object is left in the bucket: a
  // delete that raced a save could strip an image the profile still points at,
  // and an orphaned file costs pennies where a broken profile costs trust.
  const removeImage = (url) => setImages((prev) => prev.filter((u) => u !== url));

  const save = useCallback(
    async (mode) => {
      if (saving) return;
      setError(null);

      if (mode === 'submit') {
        if (!form.full_name.trim()) {
          setError('Please tell us your name.');
          return;
        }
        if (!form.modality.trim()) {
          setError('Please tell us what you practise.');
          return;
        }
      }

      setSaving(mode);

      // Skipping stores only what makes them a practitioner; the form is theirs
      // to finish later from settings.
      const payload =
        mode === 'submit'
          ? {
              id: user.id,
              user_type: 'practitioner',
              full_name: form.full_name.trim(),
              bio: form.bio.trim() || null,
              modality: form.modality.trim(),
              website_url: form.website_url.trim() || null,
              booking_url: form.booking_url.trim() || null,
              location_city: form.location_city.trim() || null,
              location_country: form.location_country.trim() || null,
              availability_type: form.availability_type,
              youtube_url: form.youtube_url.trim() || null,
              instagram_url: form.instagram_url.trim() || null,
              facebook_url: form.facebook_url.trim() || null,
              tiktok_url: form.tiktok_url.trim() || null,
              twitter_url: form.twitter_url.trim() || null,
              subject_slugs: subjects,
              image_urls: images,
            }
          : { id: user.id, user_type: 'practitioner' };

      // verification_status is deliberately absent. It is already 'pending' —
      // the insert trigger sets it and pins it on update — so sending it would
      // be a value the database discards, and reading this code later you would
      // wrongly believe the page controls it.
      const { error: saveError } = await supabaseAuth
        .from('user_profiles')
        .upsert(payload, { onConflict: 'id' });

      if (saveError) {
        setError(saveError.message || 'We could not save that. Please try again.');
        setSaving(null);
        return;
      }

      // Put the application back in the queue. The upsert above cannot: the
      // field-protection trigger pins verification_status, so a rejected
      // applicant would keep writing new answers into a row that still reads
      // 'rejected' and never reappears in the Inbox. The route verifies the
      // caller's own token and only ever writes 'pending'.
      if (mode === 'submit') {
        const { data: sessionData } = await supabaseAuth.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (token) {
          await fetch('/api/profile/resubmit', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
      }

      router.replace(mode === 'submit' ? '/auth/pending' : '/account');
    },
    [saving, form, subjects, images, user, router]
  );

  if (checking) {
    return (
      <AuthShell>
        <p className="mt-8 text-sm text-gray-500">Loading…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell maxWidthClass="max-w-xl">
      <h1 className="mt-8 text-3xl font-bold">
        {returning ? 'Update your application' : 'Tell us about your practice'}
      </h1>
      <p className="mt-2 text-sm text-gray-500">(You can edit all of this later in settings)</p>

      {returning && (
        <p className="mt-4 rounded-xl border border-white/10 bg-[#111827] p-4 text-left text-sm leading-relaxed text-gray-400">
          Your previous application was not approved. Your details are below as you left them —
          change whatever you would like us to look at again, and resubmit.
        </p>
      )}

      <Section title="Images">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            dragging ? 'border-[#7c3aed] bg-[#7c3aed]/5' : 'border-white/15'
          }`}
        >
          <p className="text-sm text-gray-400">
            Drag photos here, or{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="font-semibold text-[#a78bfa] underline underline-offset-2 hover:text-white"
            >
              choose files
            </button>
          </p>
          <p className="mt-2 text-xs text-gray-600">JPEG, PNG, WebP or GIF · up to 5MB each</p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            multiple
            hidden
            onChange={(e) => {
              uploadFiles(e.target.files);
              // Cleared so choosing the same file twice still fires a change.
              e.target.value = '';
            }}
          />
        </div>

        {uploading && <p className="text-sm text-gray-400">Uploading…</p>}
        {imageError && (
          <p role="alert" className="text-sm leading-relaxed text-red-400">
            {imageError}
          </p>
        )}

        {images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {images.map((url) => (
              <div key={url} className="relative">
                <img
                  src={url}
                  alt=""
                  className="h-20 w-20 rounded-xl border border-white/10 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  aria-label="Remove image"
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-[#0a0f1d] text-xs text-gray-300 hover:text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="About you">
        <Field label="Full practitioner name" required htmlFor="full_name">
          <input
            id="full_name"
            value={form.full_name}
            onChange={set('full_name')}
            className={inputClass}
          />
        </Field>

        <Field label="Email" htmlFor="email">
          <input
            id="email"
            value={user?.email || ''}
            readOnly
            aria-readonly="true"
            className={`${inputClass} cursor-not-allowed text-gray-500`}
          />
        </Field>

        <Field
          label="Bio / about your practice"
          hint="(This appears on your Spiritpedia profile)"
          htmlFor="bio"
        >
          <textarea
            id="bio"
            rows={5}
            value={form.bio}
            onChange={set('bio')}
            className={`${inputClass} resize-y`}
          />
        </Field>
      </Section>

      <Section title="Your practice">
        <Field label="Modality / practice" required htmlFor="modality">
          <input
            id="modality"
            value={form.modality}
            onChange={set('modality')}
            placeholder="e.g. Reiki, Homeopathy, Yoga Teacher..."
            className={inputClass}
          />
        </Field>

        <Field label="Website URL" htmlFor="website_url">
          <input
            id="website_url"
            type="url"
            value={form.website_url}
            onChange={set('website_url')}
            placeholder="https://yourpractice.com"
            className={inputClass}
          />
        </Field>

        <Field label="Booking URL" htmlFor="booking_url">
          <input
            id="booking_url"
            type="url"
            value={form.booking_url}
            onChange={set('booking_url')}
            placeholder="https://yourpractice.com/book"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City" htmlFor="location_city">
            <input
              id="location_city"
              value={form.location_city}
              onChange={set('location_city')}
              placeholder="London"
              className={inputClass}
            />
          </Field>
          <Field label="Country" htmlFor="location_country">
            <input
              id="location_country"
              value={form.location_country}
              onChange={set('location_country')}
              placeholder="United Kingdom"
              className={inputClass}
            />
          </Field>
        </div>

        <Field
          label="Availability"
          hint="(This helps users find practitioners near them)"
          htmlFor="availability_type"
        >
          <select
            id="availability_type"
            value={form.availability_type}
            onChange={set('availability_type')}
            className={inputClass}
          >
            {AVAILABILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Social media (all optional)">
        <Field label="YouTube" htmlFor="youtube_url">
          <input
            id="youtube_url"
            type="url"
            value={form.youtube_url}
            onChange={set('youtube_url')}
            placeholder="https://youtube.com/@yourchannel"
            className={inputClass}
          />
        </Field>
        <Field label="Instagram" htmlFor="instagram_url">
          <input
            id="instagram_url"
            type="url"
            value={form.instagram_url}
            onChange={set('instagram_url')}
            placeholder="https://instagram.com/yourhandle"
            className={inputClass}
          />
        </Field>
        <Field label="Facebook" htmlFor="facebook_url">
          <input
            id="facebook_url"
            type="url"
            value={form.facebook_url}
            onChange={set('facebook_url')}
            placeholder="https://facebook.com/yourpage"
            className={inputClass}
          />
        </Field>
        <Field label="TikTok" htmlFor="tiktok_url">
          <input
            id="tiktok_url"
            type="url"
            value={form.tiktok_url}
            onChange={set('tiktok_url')}
            placeholder="https://tiktok.com/@yourhandle"
            className={inputClass}
          />
        </Field>
        <Field label="X" htmlFor="twitter_url">
          <input
            id="twitter_url"
            type="url"
            value={form.twitter_url}
            onChange={set('twitter_url')}
            placeholder="https://x.com/yourhandle"
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="Your subjects">
        <p className="-mt-2 text-sm text-gray-400">Click all that apply to your practice</p>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_SLUGS.map((slug) => {
            const selected = subjects.includes(slug);
            return (
              <button
                key={slug}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleSubject(slug)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  selected
                    ? 'bg-[#7c3aed] text-white'
                    : 'border border-white/20 text-gray-300 hover:border-white/40 hover:text-white'
                }`}
              >
                {subjectLabel(slug)}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-600">
          {subjects.length} selected
        </p>
      </Section>

      {error && (
        <p role="alert" className="mt-8 text-left text-sm leading-relaxed text-red-400">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 pb-4">
        <button
          type="button"
          onClick={() => save('submit')}
          disabled={Boolean(saving) || uploading}
          className="w-full rounded-full bg-[#7c3aed] px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-[#6d28d9] hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {saving === 'submit' ? 'Submitting…' : 'Submit for review →'}
        </button>
        <button
          type="button"
          onClick={() => save('skip')}
          disabled={Boolean(saving) || uploading}
          className="w-full rounded-full border border-white/20 px-6 py-4 text-base font-semibold text-white transition-all duration-200 hover:border-white/40 hover:bg-white/5 disabled:opacity-50"
        >
          {saving === 'skip' ? 'Saving…' : 'Skip for now →'}
        </button>
      </div>
    </AuthShell>
  );
}

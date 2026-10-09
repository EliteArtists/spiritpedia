'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabaseAuth } from '../utils/supabaseAuth.js';

const TABS = ['Profile', 'Content', 'Settings'];
const BUCKET = 'practitioner-images';
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const SUPPORT_EMAIL = 'love@spiritpedia.co';

const SOCIAL_FIELDS = [
  ['youtube_url', 'YouTube', 'https://youtube.com/@yourchannel'],
  ['instagram_url', 'Instagram', 'https://instagram.com/yourhandle'],
  ['facebook_url', 'Facebook', 'https://facebook.com/yourpage'],
  ['twitter_url', 'X', 'https://x.com/yourhandle'],
  ['tiktok_url', 'TikTok', 'https://tiktok.com/@yourhandle'],
];

const input =
  'w-full rounded-xl border border-white/15 bg-[#111827] px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#7c3aed] focus:outline-none';

function Field({ label, hint, children, htmlFor, error }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-300">
        {label}
      </label>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

// Read-only facts. Shown rather than hidden, because a practitioner should be
// able to see how they are listed — they just cannot set it themselves.
function Managed({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-white">
        {value || <span className="text-gray-600">Not set</span>}
      </dd>
    </div>
  );
}

// A group that opens by itself when it already has something in it, so nothing
// a practitioner has filled in is hidden behind a closed heading.
function Collapsible({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-white"
      >
        {title}
        <span aria-hidden="true" className="text-gray-500">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && <div className="flex flex-col gap-4 px-5 pb-5">{children}</div>}
    </div>
  );
}

const TIER_WORDS = {
  superhero: 'Superhero',
  ascended_master: 'Ascended Master',
  luminary: 'Luminary',
  local_hero: 'Local Hero',
};

/* ── PROFILE ───────────────────────────────────────────────────────────── */

function ProfileTab({ healer, onSaved }) {
  const [form, setForm] = useState(() => ({
    bio: healer.bio || '',
    website_url: healer.website_url || '',
    booking_url: healer.booking_url || '',
    youtube_url: healer.youtube_url || '',
    instagram_url: healer.instagram_url || '',
    facebook_url: healer.facebook_url || '',
    twitter_url: healer.twitter_url || '',
    tiktok_url: healer.tiktok_url || '',
    contact_phone: healer.contact_phone || '',
  }));
  const [images, setImages] = useState(() =>
    (Array.isArray(healer.image_urls) ? healer.image_urls.filter(Boolean) : []).slice(0, MAX_IMAGES)
  );
  const [uploading, setUploading] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});
  const fileRefs = useRef([]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const hasSocial = SOCIAL_FIELDS.some(([k]) => (healer[k] || '').trim());
  const hasContact = Boolean((healer.contact_phone || '').trim());

  // Validated here as well as on the server. The server decides; this just
  // means someone is told before they press Save rather than after.
  const validate = () => {
    const next = {};
    const urlish = ['website_url', 'booking_url', ...SOCIAL_FIELDS.map(([k]) => k)];
    for (const key of urlish) {
      const v = (form[key] || '').trim();
      if (!v) continue;
      try {
        const u = new URL(v);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('scheme');
      } catch {
        next[key] = 'Must be a full address starting http:// or https://';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const uploadImage = async (slot, file) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setToast({ type: 'error', message: `${file.name} is not a JPEG, PNG, WebP or GIF.` });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setToast({ type: 'error', message: `${file.name} is larger than 5MB.` });
      return;
    }

    setUploading(slot);
    setToast(null);

    const { data: userData } = await supabaseAuth.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) {
      setToast({ type: 'error', message: 'Your session expired. Please sign in again.' });
      setUploading(null);
      return;
    }

    // The leading folder is the storage policy's check against auth.uid(), so
    // it is what stops one practitioner writing into another's space.
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${uid}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAuth.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      setToast({ type: 'error', message: `Upload failed — ${error.message}` });
      setUploading(null);
      return;
    }

    const { data } = supabaseAuth.storage.from(BUCKET).getPublicUrl(path);
    setImages((prev) => {
      const next = [...prev];
      next[slot] = data.publicUrl;
      return next.filter(Boolean).slice(0, MAX_IMAGES);
    });
    setUploading(null);
  };

  // Removes the slot only. The uploaded object stays in the bucket: a delete
  // that raced a save could strip an image the saved profile still points at.
  const removeImage = (slot) => setImages((prev) => prev.filter((_, i) => i !== slot));

  const save = async () => {
    if (saving) return;
    if (!validate()) {
      setToast({ type: 'error', message: 'Please fix the highlighted fields.' });
      return;
    }
    setSaving(true);
    setToast(null);

    const { data: sessionData } = await supabaseAuth.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      setToast({ type: 'error', message: 'Your session expired. Please sign in again.' });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/practitioner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, image_urls: images }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setToast({ type: 'error', message: json.message || json.error || 'Could not save.' });
      } else {
        setToast({ type: 'success', message: 'Saved. Your profile is updated.' });
        onSaved?.();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
    setSaving(false);
  };

  const slots = [...images, ...Array(MAX_IMAGES - images.length).fill(null)].slice(0, MAX_IMAGES);

  return (
    <div className="flex flex-col gap-6 text-left">
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#a78bfa]">Photos</h3>
        <p className="mt-1 text-xs text-gray-500">Up to three. The first is used as your main portrait.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {slots.map((url, slot) => (
            <div key={slot} className="relative">
              {url ? (
                <>
                  <img
                    src={url}
                    alt=""
                    className="aspect-square w-full rounded-xl border border-white/10 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(slot)}
                    aria-label={`Remove photo ${slot + 1}`}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-[#0a0f1d] text-xs text-gray-300 hover:text-white"
                  >
                    ×
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRefs.current[slot]?.click()}
                  disabled={uploading !== null}
                  className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-white/15 text-xs text-gray-500 transition-colors hover:border-[#7c3aed] hover:text-white disabled:opacity-50"
                >
                  {uploading === slot ? 'Uploading…' : 'Add image'}
                </button>
              )}
              <input
                ref={(el) => {
                  fileRefs.current[slot] = el;
                }}
                type="file"
                accept={ACCEPTED.join(',')}
                hidden
                onChange={(e) => {
                  uploadImage(slot, e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <Field label="Bio" hint="This appears on your public profile." htmlFor="bio">
        <textarea id="bio" rows={6} value={form.bio} onChange={set('bio')} className={`${input} resize-y`} />
      </Field>

      <Field label="Website" htmlFor="website_url" error={errors.website_url}>
        <input id="website_url" value={form.website_url} onChange={set('website_url')} placeholder="https://yourpractice.com" className={input} />
      </Field>

      <Field label="Booking link" htmlFor="booking_url" error={errors.booking_url}>
        <input id="booking_url" value={form.booking_url} onChange={set('booking_url')} placeholder="https://yourpractice.com/book" className={input} />
      </Field>

      <Collapsible title="Social media" defaultOpen={hasSocial}>
        {SOCIAL_FIELDS.map(([key, label, placeholder]) => (
          <Field key={key} label={label} htmlFor={key} error={errors[key]}>
            <input id={key} value={form[key]} onChange={set(key)} placeholder={placeholder} className={input} />
          </Field>
        ))}
      </Collapsible>

      <Collapsible title="Contact details" defaultOpen={hasContact}>
        <Field
          label="Contact email"
          hint="Managed by Spiritpedia — this is what we match a profile claim against, so it cannot be changed here."
          htmlFor="contact_email"
        >
          <input
            id="contact_email"
            value={healer.contact_email || ''}
            readOnly
            aria-readonly="true"
            className={`${input} cursor-not-allowed text-gray-500`}
          />
        </Field>
        <Field label="Phone" htmlFor="contact_phone">
          <input id="contact_phone" value={form.contact_phone} onChange={set('contact_phone')} className={input} />
        </Field>
      </Collapsible>

      <section className="rounded-2xl border border-white/10 bg-[#111827] p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Managed by Spiritpedia</h3>
        <p className="mt-1 text-xs text-gray-600">
          Get in touch at {SUPPORT_EMAIL} if any of this needs changing.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Managed label="Name" value={healer.name} />
          <Managed label="Tier" value={TIER_WORDS[healer.tier] || healer.tier} />
          <Managed label="Availability" value={healer.availability_type} />
          <Managed
            label="Subjects"
            value={(healer.subject_slugs || []).join(', ')}
          />
        </dl>
      </section>

      {toast && (
        <p
          role="status"
          className={`text-sm ${toast.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {toast.message}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving || uploading !== null}
        className="w-full rounded-full bg-[#7c3aed] px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

/* ── CONTENT ───────────────────────────────────────────────────────────── */

function ContentGroup({ title, items, render }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#a78bfa]">
        {title} · {items.length}
      </h3>
      <ul className="mt-3 divide-y divide-white/5 rounded-2xl border border-white/10">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            {render(item)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ContentTab({ content, claimed }) {
  const total =
    content.videos.length + content.books.length + content.courses.length + content.free_resources.length;

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Editing is deferred on purpose. videos and books have no published
          flag, and the homepage, subject pages and sitemap read those tables
          whole — so anything added here would be live on the site and submitted
          to Google before anyone had looked at it. That needs a staging table
          and a review queue, which is its own piece of work. */}
      <p className="rounded-2xl border border-white/10 bg-[#111827] p-5 text-sm leading-relaxed text-gray-400">
        {claimed
          ? `This is everything listed under your profile. Editing is coming soon — to add or change something in the meantime, email ${SUPPORT_EMAIL}.`
          : `Your content is managed by the Spiritpedia team. To suggest additions or changes, contact ${SUPPORT_EMAIL}.`}
      </p>

      {total === 0 && <p className="text-sm text-gray-500">Nothing is listed under your profile yet.</p>}

      <ContentGroup
        title="Videos"
        items={content.videos}
        render={(v) => (
          <>
            <span className="flex-1 text-sm text-white">{v.title}</span>
            {v.platform_url && (
              <a href={v.platform_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#a78bfa] hover:text-white">
                View →
              </a>
            )}
          </>
        )}
      />
      <ContentGroup
        title="Books"
        items={content.books}
        render={(b) => (
          <>
            {b.mock_cover_url && (
              <img src={b.mock_cover_url} alt="" loading="lazy" className="h-12 w-9 rounded object-cover" />
            )}
            <span className="flex-1 text-sm text-white">{b.title}</span>
            <Link href={`/books/${b.slug}`} target="_blank" className="text-xs text-[#a78bfa] hover:text-white">
              View →
            </Link>
          </>
        )}
      />
      <ContentGroup
        title="Courses & offerings"
        items={content.courses}
        render={(c) => (
          <>
            {c.image_url && <img src={c.image_url} alt="" loading="lazy" className="h-12 w-12 rounded object-cover" />}
            <span className="flex-1 text-sm text-white">
              {c.title}
              {c.product_type && <span className="ml-2 text-xs text-gray-500">{c.product_type}</span>}
            </span>
            <Link href={`/offerings/${c.slug}`} target="_blank" className="text-xs text-[#a78bfa] hover:text-white">
              View →
            </Link>
          </>
        )}
      />
      <ContentGroup
        title="Free resources"
        items={content.free_resources}
        render={(r) => (
          <>
            {r.image_url && <img src={r.image_url} alt="" loading="lazy" className="h-12 w-12 rounded object-cover" />}
            <span className="flex-1 text-sm text-white">
              {r.title}
              {r.resource_type && <span className="ml-2 text-xs text-gray-500">{r.resource_type}</span>}
            </span>
            <Link href={`/free-resources/${r.slug}`} target="_blank" className="text-xs text-[#a78bfa] hover:text-white">
              View →
            </Link>
          </>
        )}
      />
    </div>
  );
}

/* ── SETTINGS ──────────────────────────────────────────────────────────── */

function SettingsTab({ email }) {
  const [note, setNote] = useState(null);
  return (
    <div className="flex flex-col gap-5 text-left">
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Your login email</p>
        <p className="mt-1 break-all text-sm text-white">{email}</p>
      </div>

      <div className="rounded-2xl border border-white/10 p-5">
        <p className="text-sm font-semibold text-white">Delete account</p>
        {/* Deliberately unwired. Deleting cascades through the profile, saved
            library and admin notes and removes the auth user — irreversible,
            and not something to hang off one click. */}
        <button
          type="button"
          onClick={() => setNote(`To delete your account, contact us at ${SUPPORT_EMAIL}.`)}
          className="mt-3 rounded-full border border-red-500/40 px-5 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10"
        >
          Delete account
        </button>
        {note && <p className="mt-3 text-sm text-gray-400">{note}</p>}
      </div>
    </div>
  );
}

/* ── THE DASHBOARD ─────────────────────────────────────────────────────── */

export default function PractitionerDashboard({ email }) {
  const [tab, setTab] = useState('Profile');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabaseAuth.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      setError('Your session expired. Please sign in again.');
      return;
    }
    try {
      const res = await fetch('/api/practitioner/profile', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || json.error) setError(json.message || json.error);
      else setData(json);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabaseAuth.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        if (!cancelled) setError('Your session expired. Please sign in again.');
        return;
      }
      try {
        const res = await fetch('/api/practitioner/profile', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || json.error) setError(json.message || json.error);
        else setData(json);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-6 text-left">
        <p className="text-sm font-semibold text-red-200">We could not load your dashboard</p>
        <p className="mt-1 text-sm text-red-200/70">{error}</p>
      </div>
    );
  }

  if (!data) return <p className="text-sm text-gray-500">Loading your dashboard…</p>;

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-1 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-t-lg px-5 py-3 text-sm font-semibold transition-colors ${
              tab === t ? 'border-b-2 border-[#7c3aed] text-white' : 'text-gray-500 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' && <ProfileTab healer={data.healer} onSaved={load} />}
      {tab === 'Content' && <ContentTab content={data.content} claimed={data.claimed} />}
      {tab === 'Settings' && <SettingsTab email={data.email || email} />}
    </>
  );
}

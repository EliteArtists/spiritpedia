'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { tierGuidance, tierName, tierOptions } from '@/utils/badges';
import { KINDS, MAX_SUBJECTS, checkListing, isHub, isPublisher, slugify } from '@/utils/listingIngest';
import { suggestTier } from '@/utils/youtubeChannel';
import { RECIPIENT_TYPE_OPTIONS } from '@/utils/recipientTypes';

// Admin → Ingestion → Add Listing (owner, 11 Nov 2026): one new person,
// channel, app, organisation, school or publisher, with every field a sprint
// plan carries and the sprint ingest's checks (utils/listingIngest.js). The
// checks run here as you type, for a preview, and again on the server
// (/api/admin/ingest-listing), which also looks for duplicates and finds the
// base town. Adding is allowed only after a server check of exactly what is
// on the form, with nothing stopping it.

const inputClass =
  'w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent';
const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2';
const hintClass = 'mt-1.5 block text-[11px] leading-snug text-slate-500';

const EMPTY = {
  kind: 'individual',
  name: '',
  slug: '',
  bio: '',
  tier: 'local_hero',
  birth_year: '',
  death_year: '',
  founded_year: '',
  availability: 'worldwide',
  city: '',
  country: '',
  location_source: '',
  no_public_base: '',
  image_urls: ['', '', ''],
  contact_email: '',
  contact_email_source: '',
  contact_recipient_type: '',
  contact_form_url: '',
  contact_phone: '',
  booking_url: '',
  website_url: '',
  youtube_url: '',
  instagram_url: '',
  facebook_url: '',
  twitter_url: '',
  tiktok_url: '',
  subjects: [],
  teachers: [], // [{ slug, name, role }] for a school or organisation
  authors: [], // [{ slug, name }] for a publisher
};

function Field({ label, hint, children }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
      {hint && <span className={hintClass}>{hint}</span>}
    </div>
  );
}

// Teachers or authors: listings already on Spiritpedia, found by name as you
// type (the whole catalogue is more than one page, so it is searched rather
// than listed).
function ListingPicker({ placeholder, onPick, exclude }) {
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState([]);
  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('healers')
        .select('id, name, healer_slug, entity_type')
        .ilike('name', `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`)
        .order('name')
        .limit(12);
      if (active) setHits((data || []).filter((h) => !exclude.includes(h.healer_slug)));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [term, exclude]);
  const shown = term.trim().length < 2 ? [] : hits;

  return (
    <div>
      <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={placeholder} className={inputClass} />
      {shown.length > 0 && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-700 divide-y divide-slate-800">
          {shown.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                onPick({ slug: h.healer_slug, name: h.name });
                setTerm('');
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-800"
            >
              {h.name} <span className="text-xs text-slate-500">/{h.healer_slug}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Notes({ items, tone }) {
  if (!items?.length) return null;
  const tones = {
    problem: 'border-red-500/40 bg-red-500/10 text-red-300',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  };
  return (
    <ul className={`space-y-1 rounded-xl border p-4 text-sm ${tones[tone]}`}>
      {items.map((t) => (
        <li key={t}>
          {tone === 'problem' ? '✕ ' : '! '}
          {t}
        </li>
      ))}
    </ul>
  );
}

export default function ListingIngestion({ subjects }) {
  const [form, setForm] = useState(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [channel, setChannel] = useState(null); // the YouTube Data API's answer
  const [channelError, setChannelError] = useState(null);
  const [reading, setReading] = useState(false);
  const [check, setCheck] = useState(null); // the server's answer, with the form it checked
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);

  const kind = form.kind;
  const publisher = isPublisher(kind);
  const hub = isHub(kind);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // What goes to the server: the form, with only this kind's links.
  const payload = useMemo(
    () => ({
      ...form,
      image_urls: publisher ? [form.image_urls[0]] : form.image_urls,
      teachers: hub ? form.teachers.map(({ slug, role }) => ({ slug, role })) : [],
      authors: publisher ? form.authors.map(({ slug }) => slug) : [],
    }),
    [form, publisher, hub]
  );
  const payloadKey = JSON.stringify(payload);
  const local = useMemo(
    () => checkListing({ ...payload, teachers: payload.teachers.map((t) => ({ ...t, name: t.slug })) }),
    [payload]
  );
  const checkedNow = check && check.key === payloadKey;
  const canAdd = checkedNow && check.result.problems.length === 0 && !busy;

  function setKind(next) {
    setForm((f) => {
      // A tier that this kind doesn't have falls back to its lowest.
      const tiers = tierOptions(next).map((t) => t.value);
      return { ...f, kind: next, tier: tiers.includes(f.tier) ? f.tier : 'local_hero' };
    });
  }

  function setName(value) {
    setForm((f) => ({ ...f, name: value, slug: slugTouched ? f.slug : slugify(value) }));
  }

  function toggleSubject(slug) {
    setForm((f) => {
      if (f.subjects.includes(slug)) return { ...f, subjects: f.subjects.filter((s) => s !== slug) };
      if (f.subjects.length >= MAX_SUBJECTS) return f;
      return { ...f, subjects: [...f.subjects, slug] };
    });
  }

  async function readChannel() {
    setReading(true);
    setChannelError(null);
    setChannel(null);
    try {
      const res = await fetch(`/api/admin/youtube?ref=${encodeURIComponent(form.youtube_url)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.message || json.error || 'Could not read the channel.');
      setChannel(json.channel);
    } catch (err) {
      setChannelError(err.message);
    }
    setReading(false);
  }

  async function send(insert) {
    setBusy(true);
    setError(null);
    const key = payloadKey;
    try {
      const res = await fetch('/api/admin/ingest-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing: payload, insert }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.message || json.error || `Failed (${res.status})`);
      if (json.inserted) {
        setDone({ ...json.inserted, name: form.name, linkError: json.linkError || null, kind });
        setForm({ ...EMPTY, kind });
        setSlugTouched(false);
        setChannel(null);
        setCheck(null);
      } else {
        setCheck({ key, result: json });
      }
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  const suggested = channel ? suggestTier(channel.subscribers) : null;
  const tierLabel = (t) => tierName(t, publisher ? 'publisher' : kind);

  return (
    <div className="space-y-6">
      {done && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          ✅ {done.name} is on Spiritpedia:{' '}
          <Link
            href={done.table === 'publishers' ? `/publishers/${done.slug}` : `/healers/${done.healer_slug}`}
            target="_blank"
            className="font-bold underline"
          >
            open the page
          </Link>
          {done.table === 'healers' && (
            <>
              {' · '}
              <Link href={`/admin/content/${done.healer_slug}`} className="font-bold underline">
                add videos, books and offerings
              </Link>
            </>
          )}
          {done.linked > 0 && ` · ${done.linked} ${done.table === 'publishers' ? 'author' : 'teacher'}${done.linked === 1 ? '' : 's'} linked`}
          {done.table === 'healers' && !done.place_id && done.kind !== 'channel' && done.kind !== 'app' && ' · no town yet, so Near You won’t find it'}
          {done.linkError && <span className="block text-red-300">The links didn’t go in: {done.linkError}</span>}
        </div>
      )}

      <Field label="Kind">
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass}>
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input value={form.name} onChange={(e) => setName(e.target.value)} placeholder="As they name themselves" className={inputClass} />
        </Field>
        <Field label="Slug" hint={`/${publisher ? 'publishers' : 'healers'}/${form.slug || 'slug'}`}>
          <input
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set('slug', slugify(e.target.value));
            }}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tier" hint={tierGuidance(publisher ? 'publisher' : kind).join(' · ')}>
          <select value={form.tier} onChange={(e) => set('tier', e.target.value)} className={inputClass}>
            {tierOptions(publisher ? 'publisher' : kind).map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        {kind !== 'individual' && (
          <Field label="Founded (year, optional)">
            <input type="number" value={form.founded_year} onChange={(e) => set('founded_year', e.target.value)} className={inputClass} />
          </Field>
        )}
        {kind === 'individual' && form.tier !== 'ascended_master' && (
          <Field label="Availability">
            <select value={form.availability} onChange={(e) => set('availability', e.target.value)} className={inputClass}>
              <option value="worldwide">Worldwide (Famous Names)</option>
              <option value="local">Local Only (In-Person)</option>
              <option value="local_online">Local &amp; Online Sessions</option>
            </select>
          </Field>
        )}
      </div>

      {form.tier === 'ascended_master' && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Birth year (if known)">
            <input type="number" value={form.birth_year} onChange={(e) => set('birth_year', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Death year">
            <input type="number" value={form.death_year} onChange={(e) => set('death_year', e.target.value)} className={inputClass} />
          </Field>
        </div>
      )}

      <Field
        label={publisher ? 'Description' : 'Bio'}
        hint="In our own words only: no run of 8 or more words from their site or another profile."
      >
        <textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} rows={4} className={inputClass} />
      </Field>

      {/* THE BASE — not for publishers, and never for an Ascended Master. */}
      {!publisher && form.tier !== 'ascended_master' && (
        <div className="space-y-4 rounded-xl border border-slate-800 p-4">
          <p className="text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider">Base</span> · the town they publish as their base, city level only
            {['channel', 'app'].includes(kind) ? ' (optional for channels and apps)' : ''}.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Town or city">
              <input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Sedona" className={inputClass} />
            </Field>
            <Field label="Country">
              <input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="e.g. United States" className={inputClass} />
            </Field>
          </div>
          <Field label="Where the base is published">
            <input value={form.location_source} onChange={(e) => set('location_source', e.target.value)} placeholder="https://…/about" className={inputClass} />
          </Field>
          <Field label="No public base? Say why" hint="Only when no town is published, e.g. “Online only”.">
            <input value={form.no_public_base} onChange={(e) => set('no_public_base', e.target.value)} className={inputClass} />
          </Field>
          {checkedNow && check.result.place && (
            <p className="text-xs text-emerald-300">
              ✓ Near You will find it at {check.result.place.name}
              {check.result.place.region ? `, ${check.result.place.region}` : ''}
              {check.result.place.country ? `, ${check.result.place.country}` : ''}.
            </p>
          )}
        </div>
      )}

      {/* PICTURES */}
      {publisher ? (
        <Field label="Logo URL">
          <input
            value={form.image_urls[0]}
            onChange={(e) => set('image_urls', [e.target.value, '', ''])}
            placeholder="https://…/logo.png"
            className={inputClass}
          />
        </Field>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Field key={i} label={`${kind === 'individual' ? 'Photo' : 'Logo or photo'} ${i + 1}`}>
              <input
                value={form.image_urls[i]}
                onChange={(e) => set('image_urls', form.image_urls.map((u, j) => (j === i ? e.target.value : u)))}
                placeholder="https://..."
                className={inputClass}
              />
            </Field>
          ))}
        </div>
      )}

      {/* CONTACT — README §18.4: a published email with its page, or a form. */}
      <div className="space-y-4 rounded-xl border border-slate-800 p-4">
        <p className="text-xs text-slate-400">
          <span className="font-bold uppercase tracking-wider">Contact</span> ·{' '}
          {publisher
            ? 'the publisher’s published email, for claims and outreach.'
            : 'a published email with the page that shows it, or their own contact form. A phone or address alone isn’t enough; a protected address is never decoded.'}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contact email">
            <input type="email" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Where the email is published">
            <input value={form.contact_email_source} onChange={(e) => set('contact_email_source', e.target.value)} placeholder="https://…/contact" className={inputClass} />
          </Field>
          {/* Whose inbox it is (migration 0048), for outreach eligibility. */}
          <Field label="Whose inbox is it?">
            <select value={form.contact_recipient_type} onChange={(e) => set('contact_recipient_type', e.target.value)} className={inputClass}>
              <option value="">Not looked at yet</option>
              {RECIPIENT_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {!publisher && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Contact form URL">
              <input value={form.contact_form_url} onChange={(e) => set('contact_form_url', e.target.value)} placeholder="https://…/contact" className={inputClass} />
            </Field>
            <Field label="Phone (optional)">
              <input value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Booking link (optional)">
              <input value={form.booking_url} onChange={(e) => set('booking_url', e.target.value)} className={inputClass} />
            </Field>
          </div>
        )}
      </div>

      {/* LINKS */}
      <Field label="Website">
        <input value={form.website_url} onChange={(e) => set('website_url', e.target.value)} placeholder="https://..." className={inputClass} />
      </Field>

      {!publisher && (
        <>
          <Field label="YouTube channel" hint="An @handle, a channel link or one of its videos. Read through the YouTube Data API; the channel page itself is never opened.">
            <div className="flex gap-2">
              <input
                value={form.youtube_url}
                onChange={(e) => set('youtube_url', e.target.value)}
                placeholder="https://www.youtube.com/@..."
                className={inputClass}
              />
              <button
                type="button"
                onClick={readChannel}
                disabled={reading || !form.youtube_url.trim()}
                className="shrink-0 rounded-lg border border-cyan-500/50 px-4 text-xs font-bold text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-40"
              >
                {reading ? 'Reading…' : 'Read channel'}
              </button>
            </div>
          </Field>
          {channelError && <p className="-mt-3 text-xs text-amber-300">{channelError}</p>}
          {channel && (
            <div className="-mt-2 flex flex-wrap items-center gap-4 rounded-xl border border-slate-800 p-4 text-sm">
              {channel.avatar && <img src={channel.avatar} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white">{channel.title}</p>
                <p className="text-xs text-slate-400">
                  {channel.handle || channel.id} ·{' '}
                  {channel.subscribersHidden
                    ? 'subscriber count hidden'
                    : `${channel.subscribers.toLocaleString('en-GB')} subscribers`}{' '}
                  · {channel.videos.toLocaleString('en-GB')} videos{channel.country ? ` · ${channel.country}` : ''}
                </p>
                {suggested && (
                  <p className="mt-1 text-xs text-slate-400">
                    Suggested tier: <span className="font-bold text-white">{tierLabel(suggested)}</span> (other platforms and stature can raise it)
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {form.youtube_url !== channel.url && (
                  <button type="button" onClick={() => set('youtube_url', channel.url)} className="rounded-full border border-slate-600 px-3 py-1 text-xs font-bold text-slate-200 hover:text-white">
                    Use channel link
                  </button>
                )}
                {suggested && suggested !== form.tier && tierOptions(kind).some((t) => t.value === suggested) && (
                  <button type="button" onClick={() => set('tier', suggested)} className="rounded-full border border-slate-600 px-3 py-1 text-xs font-bold text-slate-200 hover:text-white">
                    Use {tierLabel(suggested)}
                  </button>
                )}
                {channel.avatar && !form.image_urls.includes(channel.avatar) && (
                  <button
                    type="button"
                    onClick={() => set('image_urls', [channel.avatar, ...form.image_urls.filter((u) => u && u !== channel.avatar)].concat(['', '', '']).slice(0, 3))}
                    className="rounded-full border border-slate-600 px-3 py-1 text-xs font-bold text-slate-200 hover:text-white"
                  >
                    Use avatar as photo 1
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['instagram_url', 'Instagram'],
              ['facebook_url', 'Facebook'],
              ['twitter_url', 'Twitter / X'],
              ['tiktok_url', 'TikTok'],
            ].map(([key, label]) => (
              <Field key={key} label={`${label} (optional)`}>
                <input value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder="https://..." className={inputClass} />
              </Field>
            ))}
          </div>
        </>
      )}

      {/* TEACHERS for a hub; AUTHORS for a publisher. */}
      {(hub || publisher) && (
        <div className="space-y-3 rounded-xl border border-slate-800 p-4">
          <p className="text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider">{hub ? 'Teachers' : 'Authors'}</span> ·{' '}
            {hub
              ? 'listings already on Spiritpedia who teach here. Guests and named guides aren’t linked.'
              : 'listings already on Spiritpedia whose books this house publishes.'}
          </p>
          {(hub ? form.teachers : form.authors).map((t) => (
            <div key={t.slug} className="flex items-center gap-3 text-sm">
              <span className="flex-1 text-white">
                {t.name} <span className="text-xs text-slate-500">/{t.slug}</span>
              </span>
              {hub && (
                <select
                  value={t.role}
                  onChange={(e) => set('teachers', form.teachers.map((x) => (x.slug === t.slug ? { ...x, role: e.target.value } : x)))}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
                >
                  <option value="instructor">Instructor</option>
                  <option value="founder">Founder</option>
                </select>
              )}
              <button
                type="button"
                onClick={() => set(hub ? 'teachers' : 'authors', (hub ? form.teachers : form.authors).filter((x) => x.slug !== t.slug))}
                className="text-xs font-bold text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          ))}
          <ListingPicker
            placeholder={hub ? 'Find a teacher by name…' : 'Find an author by name…'}
            exclude={(hub ? form.teachers : form.authors).map((t) => t.slug)}
            onPick={(t) =>
              hub ? set('teachers', [...form.teachers, { ...t, role: 'instructor' }]) : set('authors', [...form.authors, t])
            }
          />
        </div>
      )}

      {/* SUBJECTS — at most three (README §18.4). */}
      <Field label={`Subjects · ${form.subjects.length} of ${MAX_SUBJECTS}`}>
        {subjects.length === 0 ? (
          <p className="text-sm text-slate-500">Loading subjects…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => {
              const active = form.subjects.includes(s.slug);
              const full = !active && form.subjects.length >= MAX_SUBJECTS;
              return (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => toggleSubject(s.slug)}
                  disabled={full}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    active
                      ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 border-transparent'
                      : full
                        ? 'bg-slate-900 text-slate-600 border-slate-800'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  {active ? '✓ ' : ''}
                  {s.name}
                </button>
              );
            })}
          </div>
        )}
      </Field>

      {/* CHECKS — the preview while typing, then the server's. */}
      {!checkedNow && local.problems.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Still needed</p>
          <Notes items={local.problems} tone="problem" />
        </div>
      )}
      {checkedNow && (
        <div className="space-y-3">
          {check.result.problems.length === 0 ? (
            <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              ✓ Checked: no duplicates, nothing stopping it. Read the warnings, if any, then add it.
            </p>
          ) : (
            <Notes items={check.result.problems} tone="problem" />
          )}
          <Notes items={check.result.warnings} tone="warning" />
        </div>
      )}
      {error && <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => send(false)}
          disabled={busy}
          className="flex-1 rounded-xl border border-cyan-500/50 py-4 text-sm font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-40"
        >
          {busy && !canAdd ? 'Checking…' : 'Check'}
        </button>
        <button
          type="button"
          onClick={() => send(true)}
          disabled={!canAdd}
          title={canAdd ? undefined : 'Check first: adding is allowed once the check passes for exactly what is on the form.'}
          className="flex-1 rounded-xl py-4 text-sm font-black uppercase tracking-widest text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy && canAdd ? 'Adding…' : `Add ${KINDS.find((k) => k.value === kind)?.label.split(' (')[0].toLowerCase() || 'listing'}`}
        </button>
      </div>
    </div>
  );
}

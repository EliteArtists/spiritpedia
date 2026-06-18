'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase';

// Extract the canonical YouTube video ID from any common URL shape.
function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/, // watch?v=ID
    /youtu\.be\/([A-Za-z0-9_-]{11})/, // youtu.be/ID
    /\/embed\/([A-Za-z0-9_-]{11})/, // /embed/ID
    /\/shorts\/([A-Za-z0-9_-]{11})/, // /shorts/ID
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

// Human-readable label persisted to healers.availability_type (drives the
// modality badge on the healer profile page).
const AVAILABILITY_LABELS = {
  worldwide: 'Worldwide (Famous Names)',
  local: 'Local Only (In-Person)',
  local_online: 'Local & Online Sessions',
};

// Convert a free-text name into a web-safe, lowercase, hyphenated slug.
function slugify(value) {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // strip punctuation/symbols
    .replace(/[\s_]+/g, '-') // whitespace/underscores -> hyphen
    .replace(/-+/g, '-') // collapse repeats
    .replace(/^-+|-+$/g, ''); // trim edge hyphens
}

// ---------------------------------------------------------------------------
// ACCESS DENIED VIEW
// ---------------------------------------------------------------------------
function AccessDenied() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white px-6">
      <div className="text-6xl mb-6">🔒</div>
      <h1 className="text-3xl font-black uppercase tracking-widest text-red-400">Access Denied</h1>
      <p className="mt-4 text-slate-400 text-center max-w-md">
        You do not have permission to view the Admin Ingestion Dashboard.
        A valid access secret is required.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DASHBOARD (reads searchParams — must live under a Suspense boundary)
// ---------------------------------------------------------------------------
function AdminDashboard() {
  const searchParams = useSearchParams();
  const secret = searchParams.get('secret');

  // Form + UI state
  const [tab, setTab] = useState('video'); // 'video' | 'book'
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [author, setAuthor] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  // Advanced book metadata
  const [goodreadsUrl, setGoodreadsUrl] = useState('');
  const [worldOfBooksUrl, setWorldOfBooksUrl] = useState('');
  const [bookDescription, setBookDescription] = useState('');
  // Healer-specific fields
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [slug, setSlug] = useState('');
  const [imageUrl1, setImageUrl1] = useState('');
  const [imageUrl2, setImageUrl2] = useState('');
  const [imageUrl3, setImageUrl3] = useState('');
  const [availability, setAvailability] = useState('worldwide'); // 'worldwide' | 'local' | 'local_online'
  const [tier, setTier] = useState('superhero'); // 'superhero' | 'luminary' | 'local_hero'
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [healers, setHealers] = useState([]); // for relational Link Healer/Author dropdown
  const [linkedHealerSlug, setLinkedHealerSlug] = useState(''); // '' = None / General Content
  const [selectedSlugs, setSelectedSlugs] = useState([]); // multi-tag selection
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message }

  // DYNAMIC CATEGORY DROPDOWN — fetch subjects alphabetically on mount.
  useEffect(() => {
    let active = true;
    async function loadCategories() {
      const { data, error } = await supabase
        .from('subjects')
        .select('name, slug')
        .order('name', { ascending: true });

      if (!active) return;
      if (error) {
        console.error('Failed to load subjects:', error);
        return;
      }
      setSubjects(data || []);
    }
    loadCategories();
    return () => {
      active = false;
    };
  }, []);

  // DYNAMIC HEALER FETCH — load all healers for the relational link dropdown.
  // The slug column is `healer_slug`; alias it to `slug` for a clean shape.
  useEffect(() => {
    let active = true;
    async function loadHealers() {
      const { data, error } = await supabase
        .from('healers')
        .select('id, name, slug:healer_slug, subject_slugs')
        .order('name', { ascending: true });

      if (!active) return;
      if (error) {
        console.error('Failed to load healers:', error);
        return;
      }
      setHealers(data || []);
    }
    loadHealers();
    return () => {
      active = false;
    };
  }, []);

  // SECURITY GUARD — render gate after hooks so hook order stays stable.
  if (secret !== 'spiritpass') {
    return <AccessDenied />;
  }

  // Toggle a subject slug in/out of the active multi-tag selection.
  function toggleTag(slug) {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  // SMART TAG PRE-POPULATION — picking a healer in the relational dropdown seeds
  // the subject tags with that healer's own subject_slugs, so linked videos/books
  // inherit their topics by default. Resetting to "None / General Content" clears
  // the selection back to a fresh, empty slate.
  function handleHealerLink(slug) {
    setLinkedHealerSlug(slug);
    if (!slug) {
      setSelectedSlugs([]);
      return;
    }
    const match = healers.find((h) => h.slug === slug);
    setSelectedSlugs(Array.isArray(match?.subject_slugs) ? match.subject_slugs : []);
  }

  function resetForm() {
    setTitle('');
    setUrl('');
    setAuthor('');
    setCoverUrl('');
    setGoodreadsUrl('');
    setWorldOfBooksUrl('');
    setBookDescription('');
    setName('');
    setBio('');
    setSlug('');
    setImageUrl1('');
    setImageUrl2('');
    setImageUrl3('');
    setAvailability('worldwide');
    setTier('superhero');
    setCountry('');
    setCity('');
    setContactEmail('');
    setContactPhone('');
    setBookingUrl('');
    setLinkedHealerSlug('');
    setSelectedSlugs([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setToast(null);

    if (tab === 'healer') {
      if (!name.trim() || !slug.trim()) {
        setToast({ type: 'error', message: 'Name and Slug are both required.' });
        return;
      }
    } else if (!title.trim() || !url.trim()) {
      setToast({ type: 'error', message: 'Title and URL are both required.' });
      return;
    }

    // The manually selected tags are the direct payload for subject_slugs.
    const tags = selectedSlugs;
    if (tags.length === 0) {
      setToast({ type: 'error', message: 'Select at least one subject tag before saving.' });
      return;
    }

    setSaving(true);
    try {
      let error;

      if (tab === 'video') {
        // Extract the YouTube ID and store a canonical watch URL.
        const videoId = extractYouTubeId(url.trim());
        const platformUrl = videoId
          ? `https://www.youtube.com/watch?v=${videoId}`
          : url.trim();

        ({ error } = await supabase.from('videos').insert({
          title: title.trim(),
          platform_url: platformUrl,
          healer_slug: linkedHealerSlug || null,
          subject_slugs: tags,
        }));
      } else if (tab === 'book') {
        ({ error } = await supabase.from('books').insert({
          title: title.trim(),
          amazon_url: url.trim(),
          author: author.trim() || null,
          mock_cover_url: coverUrl.trim() || null,
          goodreads_url: goodreadsUrl.trim() || null,
          worldofbooks_url: worldOfBooksUrl.trim() || null,
          description: bookDescription.trim() || null,
          healer_slug: linkedHealerSlug || null,
          subject_slugs: tags,
        }));
      } else {
        // Healer: `tier` classifies the practitioner (superhero / luminary /
        // local_hero); availability options carry country/city for local healers.
        const isLocal = availability === 'local' || availability === 'local_online';
        // Collect the three image inputs, drop blanks, store as a clean array.
        const imageUrls = [imageUrl1, imageUrl2, imageUrl3]
          .map((s) => s.trim())
          .filter(Boolean);
        ({ error } = await supabase.from('healers').insert({
          name: name.trim(),
          bio: bio.trim() || null,
          healer_slug: slug.trim(),
          image_urls: imageUrls,
          tier,
          availability_type: AVAILABILITY_LABELS[availability],
          country: isLocal ? country.trim() || null : null,
          city: isLocal ? city.trim() || null : null,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
          booking_url: bookingUrl.trim() || null,
          subject_slugs: tags,
        }));
      }

      if (error) throw error;

      const savedLabel = tab === 'video' ? 'Video' : tab === 'book' ? 'Book' : 'Healer';
      setToast({
        type: 'success',
        message: `${savedLabel} saved! Tagged: ${tags.join(', ')}`,
      });
      resetForm();
    } catch (err) {
      console.error('Insert failed:', err);
      setToast({ type: 'error', message: `Save failed: ${err.message || 'unknown error'}` });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent';
  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2';

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">
            Admin Ingestion Dashboard
          </h1>
          <p className="mt-2 text-slate-400 text-sm">Add new content to Spiritpedia with automated tagging.</p>
        </header>

        {/* TAB SWITCHER */}
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 mb-8">
          {[
            { key: 'video', label: '🎬 Add Video' },
            { key: 'book', label: '📚 Add Book' },
            { key: 'healer', label: '👤 Add Healer' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setToast(null);
              }}
              className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${
                tab === t.key
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900 border border-slate-800 rounded-2xl p-8">
          {/* VIDEO + BOOK SHARED FIELDS */}
          {tab !== 'healer' && (
            <>
              <div>
                <label className={labelClass}>Link Healer / Author</label>
                <select
                  value={linkedHealerSlug}
                  onChange={(e) => handleHealerLink(e.target.value)}
                  className={inputClass}
                >
                  <option value="">None / General Content</option>
                  {healers.map((h) => (
                    <option key={h.id} value={h.slug}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Daily Meditation for Beginners"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>{tab === 'video' ? 'YouTube Link' : 'Amazon Link'}</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={tab === 'video' ? 'https://www.youtube.com/watch?v=...' : 'https://www.amazon.com/dp/...'}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* BOOK-ONLY OPTIONAL FIELDS */}
          {tab === 'book' && (
            <>
              <div>
                <label className={labelClass}>Author Name (optional)</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Esther Hicks"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Mock Cover Image URL (optional)</label>
                <input
                  type="text"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Goodreads Link (optional)</label>
                <input
                  type="text"
                  value={goodreadsUrl}
                  onChange={(e) => setGoodreadsUrl(e.target.value)}
                  placeholder="https://www.goodreads.com/book/..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>World of Books Link (optional)</label>
                <input
                  type="text"
                  value={worldOfBooksUrl}
                  onChange={(e) => setWorldOfBooksUrl(e.target.value)}
                  placeholder="https://www.wob.com/..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Book Description (Synopsis)</label>
                <textarea
                  value={bookDescription}
                  onChange={(e) => setBookDescription(e.target.value)}
                  placeholder="A short synopsis of the book…"
                  rows={4}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* HEALER FIELDS */}
          {tab === 'healer' && (
            <>
              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const next = e.target.value;
                    setName(next);
                    // Auto-derive a web-safe slug as the admin types the name.
                    setSlug(slugify(next));
                  }}
                  placeholder="e.g. Esther Hicks"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Short biography…"
                  rows={4}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Slug (unique)</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. esther-hicks"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Profile Image URL 1</label>
                <input
                  type="text"
                  value={imageUrl1}
                  onChange={(e) => setImageUrl1(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Profile Image URL 2</label>
                <input
                  type="text"
                  value={imageUrl2}
                  onChange={(e) => setImageUrl2(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Profile Image URL 3</label>
                <input
                  type="text"
                  value={imageUrl3}
                  onChange={(e) => setImageUrl3(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Tier</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className={inputClass}
                >
                  <option value="superhero">Superhero</option>
                  <option value="luminary">Luminary</option>
                  <option value="local_hero">Local Hero</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Availability Type</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className={inputClass}
                >
                  <option value="worldwide">Worldwide (Famous Names)</option>
                  <option value="local">Local Only (In-Person)</option>
                  <option value="local_online">Local &amp; Online Sessions</option>
                </select>
              </div>

              {/* Country + City slide open for either Local option */}
              {(availability === 'local' || availability === 'local_online') && (
                <>
                  <div>
                    <label className={labelClass}>Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. United States"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Sedona"
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              {/* DIRECT CONTACT DETAILS */}
              <div>
                <label className={labelClass}>Contact Email (optional)</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. hello@practitioner.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Contact Phone (optional)</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. +1 555 123 4567"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Booking URL (optional)</label>
                <input
                  type="text"
                  value={bookingUrl}
                  onChange={(e) => setBookingUrl(e.target.value)}
                  placeholder="https://calendly.com/..."
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* MULTI-TAG SUBJECT SELECTOR — shared by Video, Book, and Healer forms */}
          <div>
            <label className={labelClass}>
              Subject Tags
              <span className="ml-2 text-cyan-400 normal-case tracking-normal font-semibold">
                {selectedSlugs.length} selected
              </span>
            </label>
            {subjects.length === 0 ? (
              <p className="text-sm text-slate-500">Loading subjects…</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((c) => {
                  const active = selectedSlugs.includes(c.slug);
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => toggleTag(c.slug)}
                      aria-pressed={active}
                      className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                        active
                          ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 border-transparent shadow-lg shadow-cyan-500/20'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-cyan-400/50 hover:text-white'
                      }`}
                    >
                      {active ? '✓ ' : ''}
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Click to toggle. Selected tags are written directly to the subject_slugs array.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : `Save ${tab === 'video' ? 'Video' : tab === 'book' ? 'Book' : 'Healer'}`}
          </button>
        </form>

        {/* SUCCESS / ERROR TOAST */}
        {toast && (
          <div
            className={`mt-6 px-5 py-4 rounded-xl border text-sm font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-red-500/10 border-red-500/40 text-red-300'
            }`}
          >
            {toast.type === 'success' ? '✅ ' : '⚠️ '}
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PAGE — Suspense boundary required for useSearchParams in a Client Component.
// ---------------------------------------------------------------------------
export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <AdminDashboard />
    </Suspense>
  );
}

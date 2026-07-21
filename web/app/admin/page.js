'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
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

// Extract the 10-character Amazon ASIN / ISBN-10 from a product URL. Covers the
// common /dp/, /gp/product/, /product/ and /ASIN/ path shapes.
function extractAmazonId(url) {
  if (!url) return null;
  const m = url.match(/(?:\/dp\/|\/gp\/product\/|\/product\/|\/ASIN\/)([A-Z0-9]{10})/i);
  return m ? m[1].toUpperCase() : null;
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

// Build a slug from `rawTitle` that is unique within `table`. Detail pages
// (/books, /offerings, /free-resources) resolve by slug, so every insert MUST
// carry one — a NULL slug 404s the page. On a clash with an existing row the
// slug gains a numeric suffix (-2, -3, …) so no two rows ever collide.
async function uniqueSlug(table, rawTitle) {
  const baseSlug = slugify(rawTitle) || table;
  const { data: clashes } = await supabase
    .from(table)
    .select('slug')
    .or(`slug.eq.${baseSlug},slug.like.${baseSlug}-%`);
  const taken = new Set((clashes || []).map((r) => r.slug));
  if (!taken.has(baseSlug)) return baseSlug;
  let n = 2;
  while (taken.has(`${baseSlug}-${n}`)) n += 1;
  return `${baseSlug}-${n}`;
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
  const [tab, setTab] = useState('video'); // 'video' | 'book' | 'course' | 'healer' | 'free_resource'
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [author, setAuthor] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  // Advanced book metadata
  const [goodreadsUrl, setGoodreadsUrl] = useState('');
  const [worldOfBooksUrl, setWorldOfBooksUrl] = useState('');
  const [bookDescription, setBookDescription] = useState('');
  // Course-specific fields (course_url reuses the shared `url` field)
  const [courseDescription, setCourseDescription] = useState('');
  const [coursePrice, setCoursePrice] = useState('');
  const [courseImageUrl, setCourseImageUrl] = useState('');
  const [courseSubjects, setCourseSubjects] = useState(''); // comma-separated slug string
  const [productType, setProductType] = useState('course'); // course | download | membership | retreat
  const [affiliateStatus, setAffiliateStatus] = useState('none'); // none | applied | active
  // Optional availability window — blank saves as NULL (evergreen content).
  const [courseStartDate, setCourseStartDate] = useState('');
  const [courseEndDate, setCourseEndDate] = useState('');
  // Free-resource fields (resource_url reuses the shared `url` field)
  const [resourceType, setResourceType] = useState('meditation'); // meditation | download | mini_course | workshop | practice
  const [freeResourceDescription, setFreeResourceDescription] = useState('');
  const [freeResourceImageUrl, setFreeResourceImageUrl] = useState('');
  const [freeResourceSubjects, setFreeResourceSubjects] = useState(''); // comma-separated slug string
  const [isFeatured, setIsFeatured] = useState(false); // homepage scroller eligibility
  // Optional availability window — blank saves as NULL (evergreen content).
  const [freeResourceStartDate, setFreeResourceStartDate] = useState('');
  const [freeResourceEndDate, setFreeResourceEndDate] = useState('');
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
  // Social media + web links (all optional)
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [healers, setHealers] = useState([]); // for relational Link Healer/Author dropdown
  const [linkedHealerSlug, setLinkedHealerSlug] = useState(''); // '' = None / General Content
  const [selectedSlugs, setSelectedSlugs] = useState([]); // multi-tag selection
  // PUBLISHER form — links a publishing house to many healers via publisher_healers.
  const [publisherName, setPublisherName] = useState('');
  const [publisherSlug, setPublisherSlug] = useState('');
  const [publisherDescription, setPublisherDescription] = useState('');
  const [publisherWebsite, setPublisherWebsite] = useState('');
  const [publisherLogoUrl, setPublisherLogoUrl] = useState('');
  const [publisherFoundedYear, setPublisherFoundedYear] = useState('');
  const [publisherHealerIds, setPublisherHealerIds] = useState([]); // linked healer ids
  const [publisherHealerSearch, setPublisherHealerSearch] = useState(''); // dropdown filter
  // EDIT PUBLISHER — a second workspace below the create form for updating an
  // existing house and managing its healer junction links.
  const [publisherList, setPublisherList] = useState([]); // dropdown options
  const [selectedPublisherId, setSelectedPublisherId] = useState('');
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editFoundedYear, setEditFoundedYear] = useState('');
  const [editSubjectSlugs, setEditSubjectSlugs] = useState([]); // pre-checked subject tags
  const [linkedAuthors, setLinkedAuthors] = useState([]); // [{ healer_id, name }] currently linked
  const [editNewHealerIds, setEditNewHealerIds] = useState([]); // authors staged to add
  const [editHealerSearch, setEditHealerSearch] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editToast, setEditToast] = useState(null); // self-fading edit-section feedback
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

  // PUBLISHER DROPDOWN — load the existing houses for the edit selector, sorted
  // by name. Bumping `publisherReload` after a save refreshes this list.
  const [publisherReload, setPublisherReload] = useState(0);
  useEffect(() => {
    let active = true;
    async function loadPublishers() {
      const { data, error } = await supabase
        .from('publishers')
        .select('id, name, slug')
        .order('name', { ascending: true });
      if (!active) return;
      if (error) {
        console.error('Failed to load publishers:', error);
        return;
      }
      setPublisherList(data || []);
    }
    loadPublishers();
    return () => {
      active = false;
    };
  }, [publisherReload]);

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

  // Auto-generate the publisher slug from the name as the admin types (they can
  // still override the slug field manually afterwards).
  function handlePublisherName(value) {
    setPublisherName(value);
    setPublisherSlug(slugify(value));
  }

  // Toggle a healer id in/out of the publisher's linked-healer selection.
  function togglePublisherHealer(id) {
    setPublisherHealerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // --- EDIT PUBLISHER handlers --------------------------------------------

  // Brief, self-fading feedback for the edit workspace (pill removal / save).
  const editToastTimer = useRef(null);
  function flashEditToast(message, type = 'success') {
    setEditToast({ type, message });
    clearTimeout(editToastTimer.current);
    editToastTimer.current = setTimeout(() => setEditToast(null), 2500);
  }

  // Fetch the current junction links for a publisher, embedding each healer's
  // name (and id) for the "currently linked authors" pills.
  async function fetchLinkedAuthors(publisherId) {
    const { data } = await supabase
      .from('publisher_healers')
      .select('healer_id, healers (name)')
      .eq('publisher_id', publisherId);
    return (data || []).map((row) => ({
      healer_id: row.healer_id,
      name: row.healers?.name || `#${row.healer_id}`,
    }));
  }

  // Selecting a publisher seeds every edit field in one shot: the full row and
  // its linked authors are fetched in parallel.
  async function handleSelectPublisher(id) {
    setSelectedPublisherId(id);
    setEditToast(null);
    setEditNewHealerIds([]);
    setEditHealerSearch('');
    if (!id) {
      setLinkedAuthors([]);
      return;
    }
    const [{ data: pub }, authors] = await Promise.all([
      supabase.from('publishers').select('*').eq('id', id).single(),
      fetchLinkedAuthors(id),
    ]);
    if (pub) {
      setEditName(pub.name || '');
      setEditSlug(pub.slug || '');
      setEditDescription(pub.description || '');
      setEditWebsite(pub.website_url || '');
      setEditLogoUrl(pub.logo_url || '');
      setEditFoundedYear(pub.founded_year != null ? String(pub.founded_year) : '');
      setEditSubjectSlugs(Array.isArray(pub.subject_slugs) ? pub.subject_slugs : []);
    }
    setLinkedAuthors(authors);
  }

  function handleEditName(value) {
    setEditName(value);
    setEditSlug(slugify(value));
  }

  function toggleEditSubject(slug) {
    setEditSubjectSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function toggleEditNewHealer(id) {
    setEditNewHealerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Remove a currently-linked author: delete the junction row immediately, then
  // strip the pill from local state so the UI updates without a refetch.
  async function handleRemoveAuthor(healerId) {
    const { error } = await supabase
      .from('publisher_healers')
      .delete()
      .eq('publisher_id', selectedPublisherId)
      .eq('healer_id', healerId);
    if (error) {
      flashEditToast(`Remove failed: ${error.message}`, 'error');
      return;
    }
    setLinkedAuthors((prev) => prev.filter((a) => a.healer_id !== healerId));
    flashEditToast('Author unlinked.');
  }

  async function handleSaveEdit() {
    if (!selectedPublisherId) return;
    if (!editName.trim() || !editSlug.trim()) {
      flashEditToast('Name and slug are both required.', 'error');
      return;
    }
    const site = editWebsite.trim();
    if (site && !/^https?:\/\/.+\..+/i.test(site)) {
      flashEditToast('Website URL must be a valid http(s) address.', 'error');
      return;
    }
    const foundedNum = editFoundedYear.trim() ? parseInt(editFoundedYear.trim(), 10) : null;

    setEditSaving(true);
    try {
      // 1. Update the publisher record.
      const { error: updErr } = await supabase
        .from('publishers')
        .update({
          name: editName.trim(),
          slug: editSlug.trim(),
          description: editDescription.trim() || null,
          website_url: site || null,
          logo_url: editLogoUrl.trim() || null,
          founded_year: Number.isFinite(foundedNum) ? foundedNum : null,
          subject_slugs: editSubjectSlugs,
        })
        .eq('id', selectedPublisherId);
      if (updErr) throw updErr;

      // 2. Bulk-insert any newly staged authors.
      if (editNewHealerIds.length > 0) {
        const rows = editNewHealerIds.map((healerId) => ({
          publisher_id: selectedPublisherId,
          healer_id: healerId,
        }));
        const { error: linkErr } = await supabase.from('publisher_healers').insert(rows);
        if (linkErr) throw linkErr;
      }

      // 3. Re-fetch the active junction links + refresh the dropdown (name may
      //    have changed), then confirm.
      const authors = await fetchLinkedAuthors(selectedPublisherId);
      setLinkedAuthors(authors);
      setEditNewHealerIds([]);
      setEditHealerSearch('');
      setPublisherReload((n) => n + 1);
      flashEditToast('Publisher updated successfully');
    } catch (err) {
      console.error('Publisher update failed:', err);
      flashEditToast(`Update failed: ${err.message || 'unknown error'}`, 'error');
    } finally {
      setEditSaving(false);
    }
  }

  // SMART TAG PRE-POPULATION — picking a healer in the relational dropdown seeds
  // the subject tags with that healer's own subject_slugs, so linked videos/books
  // inherit their topics by default. Resetting to "None / General Content" clears
  // the selection back to a fresh, empty slate.
  function handleHealerLink(slug) {
    setLinkedHealerSlug(slug);
    if (!slug) {
      setSelectedSlugs([]);
      setCourseSubjects('');
      setFreeResourceSubjects('');
      return;
    }
    const match = healers.find((h) => h.slug === slug);
    const slugs = Array.isArray(match?.subject_slugs) ? match.subject_slugs : [];
    setSelectedSlugs(slugs);
    // The Course and Free Resource forms read their slugs from a comma-separated
    // string, so mirror the linked healer's tags into those fields too for the
    // same pre-population.
    setCourseSubjects(slugs.join(', '));
    setFreeResourceSubjects(slugs.join(', '));
  }

  function resetForm() {
    setTitle('');
    setUrl('');
    setAuthor('');
    setCoverUrl('');
    setGoodreadsUrl('');
    setWorldOfBooksUrl('');
    setBookDescription('');
    setCourseDescription('');
    setCoursePrice('');
    setCourseImageUrl('');
    setCourseSubjects('');
    setProductType('course');
    setAffiliateStatus('none');
    setCourseStartDate('');
    setCourseEndDate('');
    setResourceType('meditation');
    setFreeResourceDescription('');
    setFreeResourceImageUrl('');
    setFreeResourceSubjects('');
    setIsFeatured(false);
    setFreeResourceStartDate('');
    setFreeResourceEndDate('');
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
    setWebsiteUrl('');
    setYoutubeUrl('');
    setInstagramUrl('');
    setFacebookUrl('');
    setTwitterUrl('');
    setTiktokUrl('');
    setLinkedHealerSlug('');
    setSelectedSlugs([]);
    setPublisherName('');
    setPublisherSlug('');
    setPublisherDescription('');
    setPublisherWebsite('');
    setPublisherLogoUrl('');
    setPublisherFoundedYear('');
    setPublisherHealerIds([]);
    setPublisherHealerSearch('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setToast(null);

    // PUBLISHER — self-contained flow: insert the house, then bulk-link healers
    // through the publisher_healers join. Handled up front and returned so it
    // stays clear of the content/healer insert path below.
    if (tab === 'publisher') {
      if (!publisherName.trim() || !publisherSlug.trim()) {
        setToast({ type: 'error', message: 'Publisher name and slug are both required.' });
        return;
      }
      const site = publisherWebsite.trim();
      if (site && !/^https?:\/\/.+\..+/i.test(site)) {
        setToast({ type: 'error', message: 'Website URL must be a valid http(s) address.' });
        return;
      }
      const foundedNum = publisherFoundedYear.trim() ? parseInt(publisherFoundedYear.trim(), 10) : null;

      setSaving(true);
      try {
        // 1. Insert the publisher and retrieve its generated id.
        const { data: created, error: pubErr } = await supabase
          .from('publishers')
          .insert({
            name: publisherName.trim(),
            slug: publisherSlug.trim(),
            description: publisherDescription.trim() || null,
            website_url: site || null,
            logo_url: publisherLogoUrl.trim() || null,
            founded_year: Number.isFinite(foundedNum) ? foundedNum : null,
            subject_slugs: selectedSlugs,
          })
          .select('id')
          .single();
        if (pubErr) throw pubErr;

        // 2 & 3. Map each selected healer to a join row and bulk insert.
        if (publisherHealerIds.length > 0) {
          const rows = publisherHealerIds.map((healerId) => ({
            publisher_id: created.id,
            healer_id: healerId,
          }));
          const { error: linkErr } = await supabase.from('publisher_healers').insert(rows);
          if (linkErr) throw linkErr;
        }

        setToast({
          type: 'success',
          message: `Publisher saved! Linked ${publisherHealerIds.length} healer${
            publisherHealerIds.length === 1 ? '' : 's'
          }.`,
        });
        resetForm();
      } catch (err) {
        console.error('Publisher save failed:', err);
        setToast({ type: 'error', message: `Save failed: ${err.message || 'unknown error'}` });
      } finally {
        setSaving(false);
      }
      return;
    }

    if (tab === 'healer') {
      if (!name.trim() || !slug.trim()) {
        setToast({ type: 'error', message: 'Name and Slug are both required.' });
        return;
      }
    } else if (!title.trim() || !url.trim()) {
      setToast({ type: 'error', message: 'Title and URL are both required.' });
      return;
    }

    // The manually selected tags are the direct payload for subject_slugs. The
    // Course form supplies its slugs as a comma-separated string instead of the
    // shared tag chips, so parse those into the same array shape.
    const usesSlugString = tab === 'course' || tab === 'free_resource';
    const tags = usesSlugString
      ? (tab === 'course' ? courseSubjects : freeResourceSubjects)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : selectedSlugs;
    if (tags.length === 0) {
      setToast({
        type: 'error',
        message: usesSlugString
          ? 'Enter at least one subject slug before saving.'
          : 'Select at least one subject tag before saving.',
      });
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

        // DUPLICATE GUARD — videos are stored as canonical watch URLs, so an
        // exact platform_url match means this YouTube ID is already ingested.
        const { data: videoDupes, error: videoDupeErr } = await supabase
          .from('videos')
          .select('id')
          .eq('platform_url', platformUrl)
          .limit(1);
        if (videoDupeErr) throw videoDupeErr;
        if (videoDupes && videoDupes.length > 0) {
          setToast({
            type: 'error',
            message: 'Duplicate Error: This YouTube video has already been added to Spiritpedia.',
          });
          return; // leave form values intact; finally{} clears the saving flag
        }

        ({ error } = await supabase.from('videos').insert({
          title: title.trim(),
          platform_url: platformUrl,
          healer_slug: linkedHealerSlug || null,
          subject_slugs: tags,
        }));
      } else if (tab === 'book') {
        // DUPLICATE GUARD — match on the 10-char ASIN / ISBN embedded in the
        // Amazon URL when present, otherwise fall back to the exact URL.
        const asin = extractAmazonId(url.trim());
        let bookDupeQuery = supabase.from('books').select('id').limit(1);
        bookDupeQuery = asin
          ? bookDupeQuery.ilike('amazon_url', `%${asin}%`)
          : bookDupeQuery.eq('amazon_url', url.trim());
        const { data: bookDupes, error: bookDupeErr } = await bookDupeQuery;
        if (bookDupeErr) throw bookDupeErr;
        if (bookDupes && bookDupes.length > 0) {
          setToast({
            type: 'error',
            message: 'Duplicate Error: This book is already active in our catalog.',
          });
          return; // leave form values intact; finally{} clears the saving flag
        }

        // Books resolve by `slug` on /books/[slug], so every insert MUST carry a
        // unique slug — a NULL slug 404s the detail page.
        const bookSlug = await uniqueSlug('books', title.trim());

        ({ error } = await supabase.from('books').insert({
          title: title.trim(),
          slug: bookSlug,
          amazon_url: url.trim(),
          author: author.trim() || null,
          mock_cover_url: coverUrl.trim() || null,
          goodreads_url: goodreadsUrl.trim() || null,
          worldofbooks_url: worldOfBooksUrl.trim() || null,
          description: bookDescription.trim() || null,
          healer_slug: linkedHealerSlug || null,
          subject_slugs: tags,
        }));
      } else if (tab === 'course') {
        // DUPLICATE GUARD — courses carry a UNIQUE constraint on course_url, so
        // an exact match means this course is already in the catalog. Block the
        // insert before it round-trips to the database constraint.
        const { data: courseDupes, error: courseDupeErr } = await supabase
          .from('courses')
          .select('id')
          .eq('course_url', url.trim())
          .limit(1);
        if (courseDupeErr) throw courseDupeErr;
        if (courseDupes && courseDupes.length > 0) {
          setToast({
            type: 'error',
            message: 'Duplicate Error: This course is already active in our catalog.',
          });
          return; // leave form values intact; finally{} clears the saving flag
        }

        // Resolve the relational bigint healer_id from the linked healer slug.
        const linkedHealer = healers.find((h) => h.slug === linkedHealerSlug);

        // Offerings resolve by `slug` on /offerings/[slug]; generate a unique one.
        const courseSlug = await uniqueSlug('courses', title.trim());

        ({ error } = await supabase.from('courses').insert({
          title: title.trim(),
          slug: courseSlug,
          description: courseDescription.trim() || null,
          course_url: url.trim(),
          price: coursePrice.trim() || null,
          image_url: courseImageUrl.trim() || null,
          healer_id: linkedHealer?.id ?? null,
          subject_slugs: tags,
          product_type: productType,
          affiliate_status: affiliateStatus,
          start_date: courseStartDate || null,
          end_date: courseEndDate || null,
        }));
      } else if (tab === 'free_resource') {
        // Free resource: a no-cost offering (guided meditation, download, mini
        // course, workshop, or practice). Resolve the relational bigint healer_id
        // from the linked healer slug, mirroring the Course pipeline.
        const linkedHealer = healers.find((h) => h.slug === linkedHealerSlug);

        // Free resources resolve by `slug` on /free-resources/[slug]; likewise.
        const freeResourceSlug = await uniqueSlug('free_resources', title.trim());

        ({ error } = await supabase.from('free_resources').insert({
          title: title.trim(),
          slug: freeResourceSlug,
          description: freeResourceDescription.trim() || null,
          resource_type: resourceType,
          resource_url: url.trim(),
          image_url: freeResourceImageUrl.trim() || null,
          healer_id: linkedHealer?.id ?? null,
          subject_slugs: tags,
          is_featured: isFeatured,
          start_date: freeResourceStartDate || null,
          end_date: freeResourceEndDate || null,
        }));
      } else {
        // Healer: `tier` classifies the practitioner (superhero / luminary /
        // local_hero); availability options carry country/city for local healers.
        const isLocal = availability === 'local' || availability === 'local_online';
        // Collect the three image inputs, drop blanks, store as a clean array.
        const imageUrls = [imageUrl1, imageUrl2, imageUrl3]
          .map((s) => s.trim())
          .filter(Boolean);

        // DUPLICATE GUARD — block insert if a healer already exists with the
        // same slug or name.
        const { data: healerDupes, error: healerDupeErr } = await supabase
          .from('healers')
          .select('id')
          .or(`healer_slug.eq.${slug.trim()},name.eq.${name.trim()}`)
          .limit(1);
        if (healerDupeErr) throw healerDupeErr;
        if (healerDupes && healerDupes.length > 0) {
          setToast({ type: 'error', message: 'A healer profile with this name already exists' });
          return; // halt execution; finally{} clears the saving flag
        }

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
          website_url: websiteUrl.trim() || null,
          youtube_url: youtubeUrl.trim() || null,
          instagram_url: instagramUrl.trim() || null,
          facebook_url: facebookUrl.trim() || null,
          twitter_url: twitterUrl.trim() || null,
          tiktok_url: tiktokUrl.trim() || null,
          subject_slugs: tags,
        }));
      }

      if (error) throw error;

      const savedLabel =
        tab === 'video'
          ? 'Video'
          : tab === 'book'
            ? 'Book'
            : tab === 'course'
              ? 'Course'
              : tab === 'free_resource'
                ? 'Free Resource'
                : 'Healer';
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

  // Course form copy shifts with the selected product_type so one form serves
  // courses, downloads, memberships, and retreats with the right terminology.
  const courseUrlLabel =
    productType === 'download' ? 'Download Store URL' : productType === 'retreat' ? 'Booking URL' : 'Enrol URL';
  const courseUrlHelper =
    productType === 'download'
      ? 'e.g. DPDCart, Gumroad, direct store link'
      : productType === 'retreat'
        ? 'e.g. direct event or application page'
        : '';
  const coursePriceLabel = productType === 'membership' ? 'Membership Price' : 'Price';
  const coursePriceHelper = productType === 'membership' ? 'e.g. From $19.99/month' : '';

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
            { key: 'course', label: '🎓 Add Course' },
            { key: 'healer', label: '👤 Add Healer' },
            { key: 'free_resource', label: '✨ Add Free Resource' },
            { key: 'publisher', label: '🏢 Add Publisher' },
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
          {tab !== 'healer' && tab !== 'publisher' && (
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
                <label className={labelClass}>
                  {tab === 'video'
                    ? 'YouTube Link'
                    : tab === 'book'
                      ? 'Amazon Link'
                      : tab === 'free_resource'
                        ? 'Resource URL'
                        : courseUrlLabel}
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={
                    tab === 'video'
                      ? 'https://www.youtube.com/watch?v=...'
                      : tab === 'book'
                        ? 'https://www.amazon.com/dp/...'
                        : 'https://...'
                  }
                  className={inputClass}
                />
                {tab === 'course' && courseUrlHelper && (
                  <p className="mt-3 text-xs text-slate-500">{courseUrlHelper}</p>
                )}
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

          {/* COURSE-ONLY FIELDS */}
          {tab === 'course' && (
            <>
              <div>
                <label className={labelClass}>Product Type</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className={inputClass}
                >
                  <option value="course">Course</option>
                  <option value="download">Download</option>
                  <option value="membership">Membership</option>
                  <option value="retreat">Retreat</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Affiliate Status (internal)</label>
                <select
                  value={affiliateStatus}
                  onChange={(e) => setAffiliateStatus(e.target.value)}
                  className={inputClass}
                >
                  <option value="none">None</option>
                  <option value="applied">Applied</option>
                  <option value="active">Active</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  placeholder="What the course covers…"
                  rows={4}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{coursePriceLabel}</label>
                <input
                  type="text"
                  value={coursePrice}
                  onChange={(e) => setCoursePrice(e.target.value)}
                  placeholder="e.g. £49 or Free"
                  className={inputClass}
                />
                {coursePriceHelper && (
                  <p className="mt-3 text-xs text-slate-500">{coursePriceHelper}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Image URL</label>
                <input
                  type="text"
                  value={courseImageUrl}
                  onChange={(e) => setCourseImageUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Subject Slugs (comma-separated)</label>
                <input
                  type="text"
                  value={courseSubjects}
                  onChange={(e) => setCourseSubjects(e.target.value)}
                  placeholder="e.g. reiki, meditation, energy-healing"
                  className={inputClass}
                />
                <p className="mt-3 text-xs text-slate-500">
                  Comma-separated slugs written directly to the subject_slugs array. Auto-filled from the
                  linked healer&apos;s tags when one is selected above.
                </p>
              </div>
              {/* OPTIONAL AVAILABILITY WINDOW — blanks save as NULL (evergreen). */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Start Date (optional)</label>
                  <input
                    type="date"
                    value={courseStartDate}
                    onChange={(e) => setCourseStartDate(e.target.value)}
                    className={`${inputClass} [color-scheme:dark]`}
                  />
                </div>
                <div>
                  <label className={labelClass}>End Date (optional)</label>
                  <input
                    type="date"
                    value={courseEndDate}
                    onChange={(e) => setCourseEndDate(e.target.value)}
                    className={`${inputClass} [color-scheme:dark]`}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Leave both blank for lifetime evergreen content. An End Date expires the listing automatically.
              </p>
            </>
          )}

          {/* FREE RESOURCE-ONLY FIELDS */}
          {tab === 'free_resource' && (
            <>
              <div>
                <label className={labelClass}>Resource Type</label>
                <select
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value)}
                  className={inputClass}
                >
                  <option value="meditation">Meditation</option>
                  <option value="download">Download</option>
                  <option value="mini_course">Mini Course</option>
                  <option value="workshop">Workshop</option>
                  <option value="practice">Practice</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={freeResourceDescription}
                  onChange={(e) => setFreeResourceDescription(e.target.value)}
                  placeholder="What this free resource offers…"
                  rows={4}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Image URL</label>
                <input
                  type="text"
                  value={freeResourceImageUrl}
                  onChange={(e) => setFreeResourceImageUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Subject Slugs (comma-separated)</label>
                <input
                  type="text"
                  value={freeResourceSubjects}
                  onChange={(e) => setFreeResourceSubjects(e.target.value)}
                  placeholder="e.g. reiki, meditation, energy-healing"
                  className={inputClass}
                />
                <p className="mt-3 text-xs text-slate-500">
                  Comma-separated slugs written directly to the subject_slugs array. Auto-filled from the
                  linked healer&apos;s tags when one is selected above.
                </p>
              </div>
              <div>
                <label className={labelClass}>Featured</label>
                <button
                  type="button"
                  onClick={() => setIsFeatured((v) => !v)}
                  aria-pressed={isFeatured}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border transition-all ${
                    isFeatured
                      ? 'bg-gradient-to-r from-cyan-400/10 to-emerald-400/10 border-emerald-400/50 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-cyan-400/50'
                  }`}
                >
                  <span
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      isFeatured ? 'bg-emerald-400' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        isFeatured ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                  <span className="text-sm font-bold">
                    {isFeatured ? 'Eligible for homepage scroller' : 'Not featured'}
                  </span>
                </button>
                <p className="mt-3 text-xs text-slate-500">
                  Toggles the is_featured boolean that manages homepage scroller eligibility.
                </p>
              </div>
              {/* OPTIONAL AVAILABILITY WINDOW — blanks save as NULL (evergreen). */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Start Date (optional)</label>
                  <input
                    type="date"
                    value={freeResourceStartDate}
                    onChange={(e) => setFreeResourceStartDate(e.target.value)}
                    className={`${inputClass} [color-scheme:dark]`}
                  />
                </div>
                <div>
                  <label className={labelClass}>End Date (optional)</label>
                  <input
                    type="date"
                    value={freeResourceEndDate}
                    onChange={(e) => setFreeResourceEndDate(e.target.value)}
                    className={`${inputClass} [color-scheme:dark]`}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Leave both blank for lifetime evergreen content. An End Date expires the listing automatically.
              </p>
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

              {/* SOCIAL MEDIA + WEB LINKS — all optional, mapped to *_url columns */}
              <div>
                <label className={labelClass}>Website URL (optional)</label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>YouTube URL (optional)</label>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/@..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Instagram URL (optional)</label>
                <input
                  type="text"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://www.instagram.com/..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Facebook URL (optional)</label>
                <input
                  type="text"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://www.facebook.com/..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Twitter URL (optional)</label>
                <input
                  type="text"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://twitter.com/..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>TikTok URL (optional)</label>
                <input
                  type="text"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@..."
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* PUBLISHER FIELDS */}
          {tab === 'publisher' && (
            <>
              <div>
                <label className={labelClass}>Publisher Name</label>
                <input
                  type="text"
                  value={publisherName}
                  onChange={(e) => handlePublisherName(e.target.value)}
                  placeholder="e.g. Hay House"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Slug (auto-generated)</label>
                <input
                  type="text"
                  value={publisherSlug}
                  onChange={(e) => setPublisherSlug(slugify(e.target.value))}
                  placeholder="hay-house"
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Public profile lives at <span className="text-cyan-400">/publishers/{publisherSlug || 'your-slug'}</span>
                </p>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={publisherDescription}
                  onChange={(e) => setPublisherDescription(e.target.value)}
                  placeholder="2–3 sentences about the publishing house."
                  rows={3}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Website URL</label>
                <input
                  type="url"
                  value={publisherWebsite}
                  onChange={(e) => setPublisherWebsite(e.target.value)}
                  placeholder="https://www.hayhouse.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Logo Image URL</label>
                <input
                  type="text"
                  value={publisherLogoUrl}
                  onChange={(e) => setPublisherLogoUrl(e.target.value)}
                  placeholder="https://…/logo.png"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Founded Year (optional)</label>
                <input
                  type="number"
                  value={publisherFoundedYear}
                  onChange={(e) => setPublisherFoundedYear(e.target.value)}
                  placeholder="1984"
                  className={inputClass}
                />
              </div>

              {/* LINK HEALERS — searchable, chainable multi-select */}
              <div>
                <label className={labelClass}>
                  Link Healers
                  <span className="ml-2 text-cyan-400 normal-case tracking-normal font-semibold">
                    {publisherHealerIds.length} selected
                  </span>
                </label>
                <input
                  type="text"
                  value={publisherHealerSearch}
                  onChange={(e) => setPublisherHealerSearch(e.target.value)}
                  placeholder="Search healers by name…"
                  className={inputClass}
                />

                {publisherHealerIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {publisherHealerIds.map((id) => {
                      const h = healers.find((x) => x.id === id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => togglePublisherHealer(id)}
                          className="px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950"
                        >
                          {h?.name || `#${id}`} ✕
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-slate-700 divide-y divide-slate-800">
                  {healers
                    .filter((h) =>
                      h.name.toLowerCase().includes(publisherHealerSearch.trim().toLowerCase())
                    )
                    .map((h) => {
                      const active = publisherHealerIds.includes(h.id);
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => togglePublisherHealer(h.id)}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            active ? 'bg-cyan-500/20 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {active ? '✓ ' : ''}
                          {h.name}
                        </button>
                      );
                    })}
                  {healers.length === 0 && (
                    <p className="px-4 py-2 text-sm text-slate-500">Loading healers…</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* MULTI-TAG SUBJECT SELECTOR — shared by Video, Book, Healer and
              Publisher forms. The Course and Free Resource forms supply their
              slugs via their own comma-separated fields. */}
          {tab !== 'course' && tab !== 'free_resource' && (
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
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? 'Saving…'
              : `Save ${
                  tab === 'video'
                    ? 'Video'
                    : tab === 'book'
                      ? 'Book'
                      : tab === 'course'
                        ? 'Course'
                        : tab === 'free_resource'
                          ? 'Free Resource'
                          : tab === 'publisher'
                            ? 'Publisher'
                            : 'Healer'
                }`}
          </button>
        </form>

        {/* ================= EDIT EXISTING PUBLISHER ================= */}
        {tab === 'publisher' && (
          <>
            {/* Section divider */}
            <div className="border-t border-white/10 my-10 text-center relative">
              <span className="bg-[#0a0f1d] px-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium uppercase tracking-wider">
                — or edit an existing publisher —
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
              <h2 className="text-lg font-semibold text-white mb-6">Edit Existing Publisher</h2>

              {/* Step 1 — pick a publisher to seed the edit form */}
              <select
                value={selectedPublisherId}
                onChange={(e) => handleSelectPublisher(e.target.value)}
                className={inputClass}
              >
                <option value="">Choose a publisher to edit...</option>
                {publisherList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {selectedPublisherId && (
                <div className="mt-6 space-y-6">
                  <div>
                    <label className={labelClass}>Publisher Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => handleEditName(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Slug</label>
                    <input
                      type="text"
                      value={editSlug}
                      onChange={(e) => setEditSlug(slugify(e.target.value))}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Website URL</label>
                    <input
                      type="url"
                      value={editWebsite}
                      onChange={(e) => setEditWebsite(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Logo Image URL</label>
                    <input
                      type="text"
                      value={editLogoUrl}
                      onChange={(e) => setEditLogoUrl(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Founded Year</label>
                    <input
                      type="number"
                      value={editFoundedYear}
                      onChange={(e) => setEditFoundedYear(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  {/* Subject tags — pre-checked from the stored subject_slugs */}
                  <div>
                    <label className={labelClass}>
                      Subject Tags
                      <span className="ml-2 text-cyan-400 normal-case tracking-normal font-semibold">
                        {editSubjectSlugs.length} selected
                      </span>
                    </label>
                    {subjects.length === 0 ? (
                      <p className="text-sm text-slate-500">Loading subjects…</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {subjects.map((c) => {
                          const active = editSubjectSlugs.includes(c.slug);
                          return (
                            <button
                              key={c.slug}
                              type="button"
                              onClick={() => toggleEditSubject(c.slug)}
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
                  </div>

                  {/* Currently linked authors — remove a pill to unlink instantly */}
                  <div>
                    <span className="text-xs uppercase tracking-wider text-gray-400 mb-3 block">
                      Currently Linked Authors
                    </span>
                    {linkedAuthors.length === 0 ? (
                      <p className="text-sm text-slate-500">No authors linked yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {linkedAuthors.map((a) => (
                          <span
                            key={a.healer_id}
                            className="bg-[#111827] border border-white/10 rounded-full px-3 py-1 text-sm text-white flex items-center gap-2"
                          >
                            {a.name}
                            <button
                              type="button"
                              onClick={() => handleRemoveAuthor(a.healer_id)}
                              className="text-red-400 hover:text-red-300 ml-1 font-bold transition-colors cursor-pointer"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add new authors — currently-linked healers are filtered out to
                      protect the junction table's unique constraint */}
                  <div>
                    <span className="text-xs uppercase tracking-wider text-gray-400 mb-3 mt-6 block">
                      Add New Authors
                    </span>
                    <input
                      type="text"
                      value={editHealerSearch}
                      onChange={(e) => setEditHealerSearch(e.target.value)}
                      placeholder="Search healers by name…"
                      className={inputClass}
                    />

                    {editNewHealerIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {editNewHealerIds.map((id) => {
                          const h = healers.find((x) => x.id === id);
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => toggleEditNewHealer(id)}
                              className="px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950"
                            >
                              {h?.name || `#${id}`} ✕
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-slate-700 divide-y divide-slate-800">
                      {healers
                        .filter(
                          (h) =>
                            !linkedAuthors.some((a) => a.healer_id === h.id) &&
                            h.name.toLowerCase().includes(editHealerSearch.trim().toLowerCase())
                        )
                        .map((h) => {
                          const active = editNewHealerIds.includes(h.id);
                          return (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => toggleEditNewHealer(h.id)}
                              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                active ? 'bg-cyan-500/20 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {active ? '✓ ' : ''}
                              {h.name}
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                    className="w-full py-3 px-6 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl transition-colors mt-6 block text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editSaving ? 'Saving…' : 'Save Changes'}
                  </button>

                  {editToast && (
                    <div
                      className={`mt-4 px-4 py-3 rounded-xl border text-sm font-semibold ${
                        editToast.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-500/10 border-red-500/40 text-red-300'
                      }`}
                    >
                      {editToast.type === 'success' ? '✅ ' : '⚠️ '}
                      {editToast.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

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

'use client';

import { useState, useEffect, useMemo } from 'react';
import HealerCard from './HealerCard.js';
import BookCard from './BookCard.js';
import VideoPlayer from './VideoPlayer.js';

// Read a localStorage key expected to hold a JSON array; always returns an array.
function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

// Fallback human-readable label for a slug with no matching subjects row.
function titleCase(slug) {
  return String(slug)
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// The Dynamic Subject Parser Engine — resolves favorited ids/slugs against the
// master catalogs, then bucket-sorts every matched entity by its subject_slugs.
export default function LibraryView({ books = [], videos = [], healers = [], subjects = [] }) {
  // null = still hydrating from localStorage (avoids an empty-state flash).
  const [buckets, setBuckets] = useState(null);
  // Drill-down state.
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [activeTab, setActiveTab] = useState('healers');

  // slug -> name lookup for readable folder titles.
  const nameForSlug = useMemo(() => {
    const map = {};
    subjects.forEach((s) => {
      if (s?.slug) map[s.slug] = s.name;
    });
    return (slug) => map[slug] || titleCase(slug);
  }, [subjects]);

  useEffect(() => {
    const favBookIds = readArray('favorited_books').map(String);
    const favVideoIds = readArray('favorite_videos').map(String);
    const favHealerKeys = readArray('favorited_healers').map(String);

    // Look up favorited records in the master catalogs.
    const matchedBooks = books.filter((b) => favBookIds.includes(String(b.id)));
    const matchedVideos = videos.filter((v) => favVideoIds.includes(String(v.id)));
    const matchedHealers = healers.filter(
      (h) => favHealerKeys.includes(String(h.healer_slug)) || favHealerKeys.includes(String(h.id))
    );

    // Bucket reduction: drop each entity into a per-subject folder, split by type.
    const map = {};
    const addToBuckets = (item, type) => {
      const slugs = Array.isArray(item.subject_slugs) ? item.subject_slugs : [];
      slugs.forEach((slug) => {
        if (!slug) return;
        if (!map[slug]) map[slug] = { slug, healers: [], books: [], videos: [] };
        map[slug][type].push(item);
      });
    };
    matchedHealers.forEach((h) => addToBuckets(h, 'healers'));
    matchedBooks.forEach((b) => addToBuckets(b, 'books'));
    matchedVideos.forEach((v) => addToBuckets(v, 'videos'));

    setBuckets(map);
  }, [books, videos, healers]);

  const bucketList = buckets
    ? Object.values(buckets).sort((a, b) => nameForSlug(a.slug).localeCompare(nameForSlug(b.slug)))
    : [];
  const hasItems = bucketList.length > 0;

  const countFor = (bucket) => bucket.healers.length + bucket.books.length + bucket.videos.length;

  // Open a folder and default to its first non-empty content tab.
  function openSubject(bucket) {
    setSelectedSubject(bucket.slug);
    setActiveTab(
      bucket.healers.length ? 'healers' : bucket.books.length ? 'books' : 'videos'
    );
  }

  const canvas =
    'min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white p-8 md:p-12 relative font-sans';
  const activeBucket = selectedSubject ? buckets?.[selectedSubject] : null;

  // ---- DRILL-DOWN VIEW ----
  if (activeBucket) {
    const tabs = [
      { key: 'healers', label: 'Healers', items: activeBucket.healers },
      { key: 'books', label: 'Books', items: activeBucket.books },
      { key: 'videos', label: 'Videos', items: activeBucket.videos },
    ].filter((t) => t.items.length > 0);

    return (
      <div className={canvas}>
        <button
          type="button"
          onClick={() => setSelectedSubject(null)}
          className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer block mb-8"
        >
          &larr; Back to Library
        </button>

        <h1 className="text-4xl font-black mb-6">{nameForSlug(activeBucket.slug)}</h1>

        {/* Tri-tab segment bar (empty sub-types are hidden) */}
        <div className="inline-flex rounded-xl bg-white/5 border border-white/10 p-1 gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${
                activeTab === t.key
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-lg'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {t.label} ({t.items.length})
            </button>
          ))}
        </div>

        {/* Active tab content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {activeTab === 'healers' &&
            activeBucket.healers.map((healer) => <HealerCard key={healer.id} healer={healer} />)}
          {activeTab === 'books' &&
            activeBucket.books.map((book) => <BookCard key={book.id} book={book} variant="light" />)}
          {activeTab === 'videos' &&
            activeBucket.videos.map((video) => <VideoPlayer key={video.id} video={video} />)}
        </div>
      </div>
    );
  }

  // ---- FOLDER LIST / EMPTY STATE ----
  return (
    <div className={canvas}>
      {/* Back to Explorer */}
      <a
        href="/"
        className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer block mb-8"
      >
        &larr; Back to Explorer
      </a>

      {buckets === null ? null : !hasItems ? (
        // EMPTY STATE
        <div className="flex flex-col items-center justify-center text-center min-h-[60vh]">
          <div className="text-7xl mb-6 opacity-30 select-none">📚</div>
          <h1 className="text-3xl font-bold mb-3">Your library is empty.</h1>
          <p className="text-slate-400 max-w-md">
            Start exploring Spiritpedia to build your unique spiritual archive.
          </p>
        </div>
      ) : (
        // SELF-ORGANIZING SUBJECT FOLDERS
        <div>
          <h1 className="text-4xl font-black mb-2">My Library</h1>
          <p className="text-slate-400 mb-10">Your saved archive, organized by subject.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bucketList.map((bucket) => (
              <button
                key={bucket.slug}
                type="button"
                onClick={() => openSubject(bucket)}
                className="text-left p-6 rounded-2xl bg-gradient-to-br from-slate-900/60 to-indigo-950/40 border border-white/10 hover:border-purple-500/40 cursor-pointer shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col gap-2 relative overflow-hidden group"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold text-white">{nameForSlug(bucket.slug)}</h3>
                  <span className="shrink-0 text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30">
                    {countFor(bucket)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                  {countFor(bucket)} saved item{countFor(bucket) === 1 ? '' : 's'}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

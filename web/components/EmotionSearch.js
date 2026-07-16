'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase.js';

// Filler words/prefixes stripped before matching so "I'm really lost" and "lost"
// hit the same emotion_mappings row. Multi-word phrases must come before their
// single-word substrings are considered — order within the list is fine because
// each is removed as a whole \b-bounded token.
const FILLERS = ["i feel", "i am", "i'm", 'feeling', 'very', 'so', 'really', 'quite'];

// Subject slugs are hyphenated db keys; these render as friendly labels. Anything
// not special-cased is title-cased word by word.
const SPECIAL_LABELS = {
  'eft-tapping': 'EFT / Tapping',
  'non-duality': 'Non-Duality',
  'qi-gong': 'Qi Gong',
  'tai-chi': 'Tai Chi',
  nde: 'Near Death Experiences',
};

// Starter emotions shown as one-tap pills. `label` is the friendly phrasing; `q`
// is the bare keyword actually queried.
const SUGGESTIONS = [
  { label: 'I feel lost', q: 'lost' },
  { label: 'I feel anxious', q: 'anxious' },
  { label: 'I feel heartbroken', q: 'heartbroken' },
  { label: 'I feel stuck', q: 'stuck' },
  { label: 'I feel disconnected', q: 'disconnected' },
  { label: 'I feel overwhelmed', q: 'overwhelmed' },
];

function normalize(raw) {
  let s = (raw || '').toLowerCase();
  for (const f of FILLERS) {
    s = s.replace(new RegExp(`\\b${f}\\b`, 'g'), ' ');
  }
  return s.replace(/\s+/g, ' ').trim();
}

function formatSlug(slug) {
  if (SPECIAL_LABELS[slug]) return SPECIAL_LABELS[slug];
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Collapse the flat (emotion, subject_slug, weight) rows down to unique subjects,
// preserving the weight-desc order they arrived in, capped at 6.
function uniqueSubjects(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    if (seen.has(row.subject_slug)) continue;
    seen.add(row.subject_slug);
    out.push(row);
    if (out.length === 6) break;
  }
  return out;
}

export default function EmotionSearch() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const blurTimer = useRef(null);

  const normalized = normalize(value);

  // Debounced live search — 300ms after the last keystroke, look up the cleaned
  // phrase and dedupe to unique subjects.
  useEffect(() => {
    if (!normalized) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('emotion_mappings')
        .select('*')
        .ilike('emotion', `%${normalized}%`)
        .order('weight', { ascending: false })
        .limit(12);
      setResults(uniqueSubjects(data));
      setLoading(false);
      setOpen(true);
    }, 300);
    return () => clearTimeout(t);
  }, [normalized]);

  // Close on click-outside and Esc so no stale dropdown lingers.
  useEffect(() => {
    function onPointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  function goToSubject(slug) {
    setOpen(false);
    router.push(`/subject/${slug}`);
  }

  // Resolve the single highest-weighted subject for a phrase and route straight
  // to it — used by Enter/submit and by the suggested pills.
  async function routeToTop(raw) {
    const norm = normalize(raw);
    if (!norm) return;
    const { data } = await supabase
      .from('emotion_mappings')
      .select('*')
      .ilike('emotion', `%${norm}%`)
      .order('weight', { ascending: false })
      .limit(1);
    if (data && data[0]) goToSubject(data[0].subject_slug);
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Prefer the already-loaded top result; fall back to a fresh lookup.
    if (results[0]) goToSubject(results[0].subject_slug);
    else routeToTop(value);
  }

  function handlePill(keyword) {
    setValue(keyword);
    routeToTop(keyword);
  }

  return (
    <section className="py-10">
      <div ref={containerRef} className="relative mx-auto w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => normalized && setOpen(true)}
            onBlur={() => {
              // Delay so a click on a result row fires before the dropdown unmounts.
              blurTimer.current = setTimeout(() => setOpen(false), 150);
            }}
            placeholder="How are you feeling today?"
            aria-label="How are you feeling today?"
            className="block w-full rounded-full border border-white/15 bg-[#111827] px-6 py-4 text-center text-lg text-white placeholder-gray-400 shadow-lg transition-all focus:border-[#7c3aed] focus:shadow-[0_0_25px_rgba(124,58,237,0.45)] focus:outline-none"
          />
        </form>

        {open && normalized && (
          <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#111827] border border-white/10 rounded-2xl p-2 shadow-2xl">
            {results.length > 0 ? (
              results.map((row) => (
                <div
                  key={row.id}
                  onClick={() => goToSubject(row.subject_slug)}
                  className="flex items-center justify-between px-4 py-3 text-white text-sm rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <span>{formatSlug(row.subject_slug)}</span>
                  <span className="text-gray-500">→</span>
                </div>
              ))
            ) : (
              !loading && (
                <span className="text-gray-500 text-sm px-4 py-3 block text-center">
                  No matches found — try &apos;anxious&apos;, &apos;lost&apos;, or &apos;heartbroken&apos;
                </span>
              )
            )}
          </div>
        )}
      </div>

      {/* Suggested starting emotions */}
      <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center gap-2">
        <span className="text-gray-500 text-sm mr-2">Try:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s.q}
            type="button"
            onClick={() => handlePill(s.q)}
            className="bg-[#111827] hover:bg-white/10 text-gray-300 hover:text-white text-sm px-4 py-2 rounded-full border border-white/10 hover:border-white/20 transition-all cursor-pointer"
          >
            {s.label}
          </button>
        ))}
      </div>
    </section>
  );
}

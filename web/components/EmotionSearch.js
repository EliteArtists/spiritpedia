'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase.js';
import { backContextQuery } from '../utils/backContext.js';

// Filler words/prefixes stripped before matching so "I'm really lost" and "lost"
// hit the same emotion_mappings row. Each is removed as a whole \b-bounded token.
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

// Placeholder phrases cycled by the typewriter, alternating uplifting and
// challenging states so the entry point feels alive and non-judgemental.
const PHRASES = [
  'I feel lost',
  'I feel grateful',
  'I feel anxious',
  'I feel excited',
  'I feel heartbroken',
  'I feel on top of the world',
  'I feel stuck',
  'I feel curious',
  'I feel overwhelmed',
  'I feel peaceful',
];

// Typewriter timing (ms).
const TYPE_MS = 80; // per character while typing
const DELETE_MS = 40; // per character while deleting
const HOLD_TYPED_MS = 2000; // pause once a phrase is fully typed
const HOLD_EMPTY_MS = 400; // pause once a phrase is fully deleted
const INITIAL_DELAY_MS = 1000; // wait before the first phrase begins
const IDLE_RESUME_MS = 1500; // wait after blur-on-empty before resuming

// Shared classes for every universal-result row.
const ROW_CLASS =
  'flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors';
const HEADER_CLASS = 'px-4 pt-3 pb-1 text-xs uppercase tracking-wider text-gray-500 font-medium';
const EMPTY_UNIVERSAL = { healers: [], books: [], videos: [], subjects: [] };

// The search dropdown is a homepage-level entry point, so any detail page it
// opens gets "← Back to Spiritpedia" as its contextual back link.
const SEARCH_BACK = backContextQuery('/', 'Spiritpedia');

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

// Pull the YouTube video ID out of any stored platform_url shape (mirrors the
// helper in VideoPlayer.js). videos carry no dedicated youtube_id column.
function extractYouTubeId(url) {
  if (!url) return null;
  if (url.includes('v=')) return url.split('v=')[1]?.split('&')[0];
  return url.split('/').pop();
}

// Up to two initials for a healer avatar fallback.
function initials(name) {
  return (
    (name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '?'
  );
}

// Tiny tier glyph shown at the right edge of a healer row.
function tierBadge(tier) {
  if (tier === 'superhero') return { symbol: '★', className: 'text-[#78350f]' };
  if (tier === 'luminary') return { symbol: '✦', className: 'text-violet-600' };
  return { symbol: '◆', className: 'text-emerald-500' };
}

function CompassIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

export default function EmotionSearch() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [emotions, setEmotions] = useState([]);
  const [universal, setUniversal] = useState(EMPTY_UNIVERSAL);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Typewriter state.
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isUserActive, setIsUserActive] = useState(false);
  const [ready, setReady] = useState(false); // gates the initial mount delay
  const [cursorOn, setCursorOn] = useState(true);

  const containerRef = useRef(null);
  const blurTimer = useRef(null); // closes the dropdown after a click grace period
  const idleTimer = useRef(null); // resumes the typewriter after blur-on-empty
  const typeTimer = useRef(null); // active typewriter step

  const normalized = normalize(value);
  const term = value.trim();

  // --- Search: emotion path + universal path, run in parallel --------------

  // Debounced live search — 300ms after the last keystroke, fire the emotion
  // lookup and the four universal-table lookups together via Promise.all.
  useEffect(() => {
    if (!term) {
      setEmotions([]);
      setUniversal(EMPTY_UNIVERSAL);
      setLoading(false);
      return undefined;
    }
    const norm = normalize(value);
    setLoading(true);
    setOpen(true);
    const t = setTimeout(async () => {
      // Emotion intent only searches when something survives normalisation.
      const emotionQuery = norm
        ? supabase
            .from('emotion_mappings')
            .select('*')
            .ilike('emotion', `%${norm}%`)
            .order('weight', { ascending: false })
            .limit(12)
        : Promise.resolve({ data: [] });

      const [emotionRes, healersRes, booksRes, videosRes, subjectsRes] = await Promise.all([
        emotionQuery,
        supabase
          .from('healers')
          .select('id, name, healer_slug, tier, image_urls')
          .ilike('name', `%${term}%`)
          .limit(4),
        supabase.from('books').select('id, title, slug, mock_cover_url').ilike('title', `%${term}%`).limit(4),
        supabase.from('videos').select('id, title, platform_url').ilike('title', `%${term}%`).limit(3),
        supabase.from('subjects').select('id, name, slug').ilike('name', `%${term}%`).limit(3),
      ]);

      setEmotions(uniqueSubjects(emotionRes.data));
      setUniversal({
        healers: healersRes.data || [],
        books: booksRes.data || [],
        videos: videosRes.data || [],
        subjects: subjectsRes.data || [],
      });
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [value, term]);

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

  // --- Typewriter animation (unchanged) ------------------------------------

  // Hold the first phrase back for a beat after the page mounts.
  useEffect(() => {
    const t = setTimeout(() => setReady(true), INITIAL_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Single self-scheduling step. Re-runs whenever the visible text or phase
  // changes, advancing type → hold → delete → next phrase. Paused entirely while
  // the user is interacting with the input.
  useEffect(() => {
    if (!ready || isUserActive) return undefined;
    const phrase = PHRASES[phraseIndex];

    if (isTyping) {
      if (displayText.length < phrase.length) {
        typeTimer.current = setTimeout(
          () => setDisplayText(phrase.slice(0, displayText.length + 1)),
          TYPE_MS
        );
      } else {
        typeTimer.current = setTimeout(() => setIsTyping(false), HOLD_TYPED_MS);
      }
    } else if (displayText.length > 0) {
      typeTimer.current = setTimeout(
        () => setDisplayText(phrase.slice(0, displayText.length - 1)),
        DELETE_MS
      );
    } else {
      typeTimer.current = setTimeout(() => {
        setPhraseIndex((i) => (i + 1) % PHRASES.length);
        setIsTyping(true);
      }, HOLD_EMPTY_MS);
    }

    return () => clearTimeout(typeTimer.current);
  }, [ready, isUserActive, isTyping, displayText, phraseIndex]);

  // Blinking cursor — only while typing; hidden during the deleting phase.
  useEffect(() => {
    if (!isTyping) return undefined;
    const id = setInterval(() => setCursorOn((v) => !v), 500);
    return () => clearInterval(id);
  }, [isTyping]);

  // Belt-and-braces: clear every outstanding timer on unmount.
  useEffect(
    () => () => {
      clearTimeout(blurTimer.current);
      clearTimeout(idleTimer.current);
      clearTimeout(typeTimer.current);
    },
    []
  );

  // --- Interaction ---------------------------------------------------------

  function activate() {
    clearTimeout(idleTimer.current);
    setIsUserActive(true);
  }

  function navigate(path) {
    setOpen(false);
    router.push(path);
  }

  function navigateExternal(url) {
    setOpen(false);
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Resolve the single highest-weighted subject for a phrase and route straight
  // to it — used by Enter/submit.
  async function routeToTop(raw) {
    const norm = normalize(raw);
    if (!norm) return;
    const { data } = await supabase
      .from('emotion_mappings')
      .select('*')
      .ilike('emotion', `%${norm}%`)
      .order('weight', { ascending: false })
      .limit(1);
    if (data && data[0]) navigate(`/subject/${data[0].subject_slug}`);
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Enter keeps emotion-first intent: route to the top-weighted subject.
    if (emotions[0]) navigate(`/subject/${emotions[0].subject_slug}`);
    else routeToTop(value);
  }

  function handleBlur() {
    // Delay so a click on a result row fires before the dropdown unmounts.
    blurTimer.current = setTimeout(() => setOpen(false), 150);
    // If the field is left empty, drift back into the idle animation.
    if (value === '') {
      idleTimer.current = setTimeout(() => {
        setDisplayText('');
        setIsTyping(true);
        setIsUserActive(false);
      }, IDLE_RESUME_MS);
    }
  }

  // The animated overlay stands in for the placeholder until the user engages.
  const showOverlay = !isUserActive && value === '';

  const { healers, books, videos, subjects } = universal;
  const hasUniversal = healers.length || books.length || videos.length || subjects.length;

  return (
    <section className="py-10">
      <div ref={containerRef} className="relative mx-auto w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type="text"
              value={value}
              onChange={(e) => {
                activate();
                setValue(e.target.value);
              }}
              onFocus={() => {
                activate();
                if (term) setOpen(true);
              }}
              onBlur={handleBlur}
              placeholder={isUserActive ? 'How are you feeling today?' : ''}
              aria-label="How are you feeling today?"
              className="block w-full rounded-full border border-white/15 bg-[#111827] px-6 py-4 text-center text-lg text-white placeholder-gray-400 shadow-lg transition-all focus:border-[#7c3aed] focus:shadow-[0_0_25px_rgba(124,58,237,0.45)] focus:outline-none"
            />

            {/* Typewriter overlay — mirrors the input's padding, size and centring */}
            {showOverlay && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-lg">
                <span className="text-gray-400">{displayText}</span>
                {isTyping && (
                  <span className={`text-violet-400 ${cursorOn ? 'opacity-100' : 'opacity-0'}`}>|</span>
                )}
              </div>
            )}
          </div>
        </form>

        {open && term && (
          <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-[70vh] overflow-y-auto bg-[#111827] border border-white/10 rounded-2xl p-2 shadow-2xl">
            {loading ? (
              <span className="text-gray-500 text-sm px-4 py-3 block text-center">Searching...</span>
            ) : emotions.length > 0 ? (
              // Emotion intent wins — show subject suggestions only.
              emotions.map((row) => (
                <div
                  key={row.id}
                  // onMouseDown (not onClick) + preventDefault fires before the
                  // input's onBlur and stops it firing at all, so the dropdown
                  // never closes out from under the navigation.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    navigate(`/subject/${row.subject_slug}`);
                  }}
                  className="flex items-center justify-between px-4 py-3 text-white text-sm rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <span>{formatSlug(row.subject_slug)}</span>
                  <span className="text-gray-500">→</span>
                </div>
              ))
            ) : hasUniversal ? (
              <>
                {healers.length > 0 && (
                  <>
                    <div className={HEADER_CLASS}>HEALERS</div>
                    {healers.map((h) => {
                      const img = Array.isArray(h.image_urls) && h.image_urls[0] ? h.image_urls[0] : null;
                      const badge = tierBadge(h.tier);
                      return (
                        <div
                          key={`h-${h.id}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            navigate(`/healers/${h.healer_slug}${SEARCH_BACK}`);
                          }}
                          className={ROW_CLASS}
                        >
                          {img ? (
                            <img src={img} alt={h.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <span className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-semibold">
                              {initials(h.name)}
                            </span>
                          )}
                          <span className="flex-1 text-white text-sm truncate">{h.name}</span>
                          <span className={`text-sm ${badge.className}`}>{badge.symbol}</span>
                        </div>
                      );
                    })}
                  </>
                )}

                {books.length > 0 && (
                  <>
                    <div className={HEADER_CLASS}>BOOKS</div>
                    {books.map((b) => {
                      const cover = b.mock_cover_url && b.mock_cover_url !== 'NULL' ? b.mock_cover_url : null;
                      return (
                        <div
                          key={`b-${b.id}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            navigate(`/books/${b.slug}${SEARCH_BACK}`);
                          }}
                          className={ROW_CLASS}
                        >
                          {cover ? (
                            <img src={cover} alt={b.title} className="w-8 h-11 rounded object-cover" />
                          ) : (
                            <span className="w-8 h-11 rounded bg-[#0a0f1d] border border-white/10 flex items-center justify-center text-gray-600 text-xs">
                              📖
                            </span>
                          )}
                          <span className="flex-1 text-white text-sm truncate">{b.title}</span>
                        </div>
                      );
                    })}
                  </>
                )}

                {videos.length > 0 && (
                  <>
                    <div className={HEADER_CLASS}>VIDEOS</div>
                    {videos.map((v) => {
                      const vid = extractYouTubeId(v.platform_url);
                      const thumb = vid ? `https://img.youtube.com/vi/${vid}/mqdefault.jpg` : null;
                      const watch = vid ? `https://www.youtube.com/watch?v=${vid}` : v.platform_url;
                      return (
                        <div
                          key={`v-${v.id}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            navigateExternal(watch);
                          }}
                          className={ROW_CLASS}
                        >
                          {thumb ? (
                            <img src={thumb} alt={v.title} className="w-12 h-8 rounded object-cover" />
                          ) : (
                            <span className="w-12 h-8 rounded bg-[#0a0f1d] border border-white/10" />
                          )}
                          <span className="flex-1 text-white text-sm truncate">{v.title}</span>
                        </div>
                      );
                    })}
                  </>
                )}

                {subjects.length > 0 && (
                  <>
                    <div className={HEADER_CLASS}>SUBJECTS</div>
                    {subjects.map((s) => (
                      <div
                        key={`s-${s.id}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          navigate(`/subject/${s.slug}`);
                        }}
                        className={ROW_CLASS}
                      >
                        <CompassIcon className="w-4 h-4 text-violet-400 shrink-0" />
                        <span className="flex-1 text-white text-sm truncate">{s.name}</span>
                      </div>
                    ))}
                  </>
                )}
              </>
            ) : (
              <span className="text-gray-500 text-sm px-4 py-3 block text-center">
                No matches found — try &apos;anxious&apos;, &apos;lost&apos;, or &apos;heartbroken&apos; to explore
                by feeling, or search for a healer or book
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

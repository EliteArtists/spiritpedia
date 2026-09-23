'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase.js';
import { backContextQuery } from '../utils/backContext.js';
import {
  normaliseQuery,
  checkCrisis,
  checkAmbiguous,
  checkSoftTier,
  needsMedicalDisclaimer,
  resolveEmotionSearch,
  CRISIS_INTERSTITIAL,
  DUAL_PATH,
  SOFT_TIER_LINE,
  MEDICAL_DISCLAIMER,
} from '../utils/emotionSearchPatterns.js';

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

// Exact-match lookup — the contract resolveEmotionSearch() expects. The
// candidate cascade calls this once per candidate and stops at the first with
// rows, so these must be equality hits against the indexed `emotion` column.
async function lookupExactEmotion(emotion) {
  const { data } = await supabase
    .from('emotion_mappings')
    .select('id, emotion, subject_slug, weight')
    .eq('emotion', emotion)
    .order('weight', { ascending: false });
  return data || [];
}

// Last resort only, once every exact candidate has missed: the old substring
// behaviour, so a partial phrase still surfaces something rather than nothing.
async function lookupPartialEmotion(normalised) {
  const { data } = await supabase
    .from('emotion_mappings')
    .select('id, emotion, subject_slug, weight')
    .ilike('emotion', `%${normalised}%`)
    .order('weight', { ascending: false })
    .limit(12);
  return data || [];
}

// The dual path's "exploring" option names its own subjects. `hearing voices`
// and its variants are deliberately absent from emotion_mappings, so without
// this the cascade returns nothing and someone who just answered a sensitive
// question lands on an empty dropdown. Shaped like mapping rows so the render
// path does not care where they came from.
function rowsFromSubjects(slugs) {
  return slugs.map((slug, i) => ({
    id: `dual-${slug}`,
    subject_slug: slug,
    weight: slugs.length - i,
  }));
}

// Decorate a bare row set the same way resolveEmotionSearch() would, so the
// fallback paths carry the soft-tier line and medical disclaimer too.
function decorate(rows, normalised, matchedEmotion = null) {
  return {
    type: 'results',
    matchedEmotion,
    rows,
    softTier: checkSoftTier(normalised) ? SOFT_TIER_LINE : null,
    medicalDisclaimer: needsMedicalDisclaimer(rows) ? MEDICAL_DISCLAIMER : null,
  };
}

const CRISIS_RESULT = (category) => ({ type: 'crisis', category, content: CRISIS_INTERSTITIAL });

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
  if (tier === 'ascended_master') return { symbol: '✧', className: 'text-[#c9a84c]' };
  if (tier === 'luminary') return { symbol: '✦', className: 'text-violet-600' };
  if (tier === 'local_hero') return { symbol: '◆', className: 'text-emerald-500' };
  // Unknown or NULL tier — neutral, matching the "Teacher" card badge.
  return { symbol: '●', className: 'text-gray-500' };
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
  // The module's resolution object: { type: 'crisis' | 'dual_path' | 'results'
  // | 'no_results' }. Everything the dropdown renders derives from this.
  const [resolution, setResolution] = useState(null);
  const [universal, setUniversal] = useState(EMPTY_UNIVERSAL);
  const [dualPathAnswer, setDualPathAnswer] = useState(null);
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

  const term = value.trim();

  // --- Search: emotion path + universal path, run in parallel --------------

  // THE PIPELINE. The order below is the module's contract and is not
  // negotiable: normalise → crisis → dual path → cascade → soft tier →
  // disclaimer. The two safety gates run SYNCHRONOUSLY on every keystroke,
  // ahead of the 300ms debounce and ahead of every network call — a crisis
  // interstitial must not wait on a timer, and the lookup must never run.
  useEffect(() => {
    if (!term) {
      setResolution(null);
      setUniversal(EMPTY_UNIVERSAL);
      setLoading(false);
      return undefined;
    }

    const normalised = normaliseQuery(value);

    // GATE 1 — crisis. Suppresses the emotion lookup AND the universal search:
    // book covers under a suicidal phrase would be worse than nothing.
    const crisis = checkCrisis(normalised);
    if (crisis.intercept) {
      setResolution(CRISIS_RESULT(crisis.category));
      setUniversal(EMPTY_UNIVERSAL);
      setLoading(false);
      setOpen(true);
      return undefined;
    }

    // GATE 2 — the dual path, and the crisis branch of its answer.
    if (dualPathAnswer === 'distressing') {
      setResolution(CRISIS_RESULT('acute_crisis'));
      setUniversal(EMPTY_UNIVERSAL);
      setLoading(false);
      setOpen(true);
      return undefined;
    }
    if (!dualPathAnswer && checkAmbiguous(normalised)) {
      setResolution({ type: 'dual_path', content: DUAL_PATH });
      setUniversal(EMPTY_UNIVERSAL);
      setLoading(false);
      setOpen(true);
      return undefined;
    }

    setLoading(true);
    setOpen(true);
    const t = setTimeout(async () => {
      const [emotionRes, healersRes, booksRes, videosRes, subjectsRes] = await Promise.all([
        // Steps 1-6 live inside the module; lookupExactEmotion is the injected
        // contract, one indexed equality hit per candidate.
        resolveEmotionSearch(value, lookupExactEmotion, { dualPathAnswer }),
        supabase
          .from('healers')
          .select('id, name, healer_slug, tier, image_urls')
          .ilike('name', `%${term}%`)
          .limit(4),
        supabase.from('books').select('id, title, slug, mock_cover_url').ilike('title', `%${term}%`).limit(4),
        supabase.from('videos').select('id, title, platform_url').ilike('title', `%${term}%`).limit(3),
        supabase.from('subjects').select('id, name, slug').ilike('name', `%${term}%`).limit(3),
      ]);

      let resolved = emotionRes;

      // Partial match, only once every exact candidate has missed.
      if (resolved.type === 'no_results') {
        const partial = await lookupPartialEmotion(normalised);
        if (partial.length) resolved = decorate(partial, normalised);
      }

      // And if even that misses, honour the answer the user just gave us.
      if (resolved.type === 'no_results' && dualPathAnswer === 'exploring') {
        const option = DUAL_PATH.options.find((o) => o.key === 'exploring');
        resolved = decorate(rowsFromSubjects(option.subjects), normalised);
      }

      setResolution(resolved);
      setUniversal({
        healers: healersRes.data || [],
        books: booksRes.data || [],
        videos: videosRes.data || [],
        subjects: subjectsRes.data || [],
      });
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [value, term, dualPathAnswer]);

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

  // Enter/submit runs the SAME pipeline as the dropdown. It previously issued
  // its own ilike query, which would have routed straight past the crisis
  // intercept to a subject page — the one bypass that must not exist.
  async function routeToTop(raw) {
    const normalised = normaliseQuery(raw);
    if (!normalised) return;

    const crisis = checkCrisis(normalised);
    if (crisis.intercept) {
      setResolution(CRISIS_RESULT(crisis.category));
      setUniversal(EMPTY_UNIVERSAL);
      setOpen(true);
      return;
    }
    if (!dualPathAnswer && checkAmbiguous(normalised)) {
      setResolution({ type: 'dual_path', content: DUAL_PATH });
      setUniversal(EMPTY_UNIVERSAL);
      setOpen(true);
      return;
    }

    const resolved = await resolveEmotionSearch(raw, lookupExactEmotion, { dualPathAnswer });
    if (resolved.type === 'results' && resolved.rows[0]) {
      navigate(`/subject/${resolved.rows[0].subject_slug}`);
      return;
    }
    const partial = await lookupPartialEmotion(normalised);
    if (partial[0]) navigate(`/subject/${partial[0].subject_slug}`);
  }

  function handleSubmit(e) {
    e.preventDefault();
    // A crisis interstitial or an unanswered dual path owns the screen —
    // Enter must not navigate out from under either of them.
    if (resolution && (resolution.type === 'crisis' || resolution.type === 'dual_path')) return;
    if (resolution?.type === 'results' && resolution.rows[0]) {
      navigate(`/subject/${resolution.rows[0].subject_slug}`);
      return;
    }
    routeToTop(value);
  }

  // Returns the person to an ordinary search from the interstitial: clears the
  // field and every trace of the intercepted query.
  function returnToSearch() {
    setValue('');
    setResolution(null);
    setUniversal(EMPTY_UNIVERSAL);
    setDualPathAnswer(null);
    setOpen(false);
    setIsUserActive(true);
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
  const isCrisis = resolution?.type === 'crisis';
  const isDualPath = resolution?.type === 'dual_path';
  // Six unique subjects, weight order preserved — as before.
  const emotions = resolution?.type === 'results' ? uniqueSubjects(resolution.rows) : [];

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
                // A new query is a new question — never carry an old answer on.
                setDualPathAnswer(null);
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
            {isCrisis ? (
              /* THE INTERSTITIAL. Nothing else renders on this screen — no
                 carousels, no universal results, no warning icons, no red.
                 The platform's ordinary calm voice, and a real way back. */
              <div className="px-5 py-6 text-left">
                <h2 className="text-white text-base font-semibold">
                  {CRISIS_INTERSTITIAL.heading}
                </h2>
                {CRISIS_INTERSTITIAL.body.map((para) => (
                  <p key={para.slice(0, 24)} className="mt-3 text-sm leading-relaxed text-gray-300">
                    {para}
                  </p>
                ))}

                <a
                  href={CRISIS_INTERSTITIAL.primaryAction.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseDown={(e) => e.preventDefault()}
                  className="mt-5 inline-block rounded-full bg-[#7c3aed] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9]"
                >
                  {CRISIS_INTERSTITIAL.primaryAction.label}
                </a>
                <p className="mt-2 text-xs text-gray-500">
                  {CRISIS_INTERSTITIAL.primaryAction.note}
                </p>

                {/* A real, obvious, unshamed way out — not a tiny close icon. */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    returnToSearch();
                  }}
                  className="mt-5 block w-full rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  {CRISIS_INTERSTITIAL.secondaryAction.label}
                </button>

                <p className="mt-4 text-sm text-gray-400">{CRISIS_INTERSTITIAL.closing}</p>
              </div>
            ) : isDualPath ? (
              /* Both options carry identical weight — same classes, same size,
                 no primary/secondary styling, no clinical vocabulary. */
              <div className="px-5 py-6 text-left">
                <h2 className="text-white text-base font-semibold">{DUAL_PATH.heading}</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">{DUAL_PATH.body}</p>
                <div className="mt-4 flex flex-col gap-3">
                  {DUAL_PATH.options.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setDualPathAnswer(option.key);
                      }}
                      className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : loading ? (
              <span className="text-gray-500 text-sm px-4 py-3 block text-center">Searching...</span>
            ) : emotions.length > 0 ? (
              // Emotion intent wins — show subject suggestions only.
              <>
                {emotions.map((row) => (
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
                ))}

                {/* Beneath the results it qualifies, never above them. */}
                {resolution?.medicalDisclaimer && (
                  <p className="px-4 pt-2 text-xs text-gray-500">{resolution.medicalDisclaimer}</p>
                )}

                {/* Soft tier — quiet. No icon, no alert box, no border, last. */}
                {resolution?.softTier && (
                  <p className="px-4 pb-2 pt-3 text-xs leading-relaxed text-gray-500">
                    {resolution.softTier}
                  </p>
                )}
              </>
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
                            <img
                              src={img}
                              alt={h.name}
                              loading="lazy"
                              decoding="async"
                              className="w-8 h-8 rounded-full object-cover"
                            />
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
                            <img
                              src={cover}
                              alt={b.title}
                              loading="lazy"
                              decoding="async"
                              className="w-8 h-11 rounded object-cover"
                            />
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
                            <img
                              src={thumb}
                              alt={v.title}
                              loading="lazy"
                              decoding="async"
                              className="w-12 h-8 rounded object-cover"
                            />
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

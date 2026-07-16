'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase.js';

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

  // --- Emotional search (unchanged behaviour) ------------------------------

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

  // --- Typewriter animation ------------------------------------------------

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
        // Fully typed → pause, then switch to deleting.
        typeTimer.current = setTimeout(() => setIsTyping(false), HOLD_TYPED_MS);
      }
    } else if (displayText.length > 0) {
      typeTimer.current = setTimeout(
        () => setDisplayText(phrase.slice(0, displayText.length - 1)),
        DELETE_MS
      );
    } else {
      // Fully deleted → pause, then advance to the next phrase and type again.
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

  function goToSubject(slug) {
    setOpen(false);
    router.push(`/subject/${slug}`);
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
    if (data && data[0]) goToSubject(data[0].subject_slug);
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Prefer the already-loaded top result; fall back to a fresh lookup.
    if (results[0]) goToSubject(results[0].subject_slug);
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
                if (normalized) setOpen(true);
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
                  <span
                    className={`text-violet-400 ${cursorOn ? 'opacity-100' : 'opacity-0'}`}
                  >
                    |
                  </span>
                )}
              </div>
            )}
          </div>
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
    </section>
  );
}

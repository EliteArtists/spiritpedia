/* =====================================================================
 * SPIRITPEDIA — EmotionSearch patterns, crisis intercept & duty-of-care
 * =====================================================================
 *
 * Phase 4  — natural-language stripping for EmotionSearch.js
 * Phase 4b — crisis intercept, interstitial copy, dual path, soft tier,
 *            medical-care disclaimer
 *
 * Companion to the emotion_mappings table — exported in full to
 * supabase/seed/emotion_mappings.sql (701 emotions, 3,531 rows, 9 Oct 2026).
 * The original seed, spiritpedia-emotion-mappings.sql, was never committed.
 * Spec: claude/emotion-mapping-phase1-review.md  (approved 2026-09-19)
 * Build notes: claude/emotion-mapping-build-report.md
 *
 * THE ORDER OF OPERATIONS IS NOT NEGOTIABLE. See resolveEmotionSearch()
 * at the bottom. In particular the crisis check runs BEFORE the mapping
 * lookup — it is a pre-match intercept, not a filter on results.
 *
 * WHERE THE DATA LIVES (2026-10-09): every list, phrase, threshold and
 * copy string is in web/shared/emotion-safety.json — ONE file, read by
 * this module AND by the Flutter app (app/lib/core/safety/), so the two
 * can never drift. This module keeps the logic and the reasons; edit the
 * JSON to change what is matched. web/shared/emotion-safety.cases.json
 * pins the behaviour, and both `npm test` and `flutter test` check it.
 *
 * INTEGRATION NOTE (2026-09-22): this file is the delivered module,
 * unchanged apart from its final block — the CommonJS/window tail was
 * replaced with ES module exports so Next can bundle it. No pattern,
 * phrase, threshold, copy string or ordering has been altered.
 * ===================================================================== */

import SAFETY from '../shared/emotion-safety.json' with { type: 'json' };



/* ---------------------------------------------------------------------
 * 1. NORMALISATION
 *
 * Every emotion string in the database is lower-cased, trimmed,
 * single-spaced and APOSTROPHE-FREE by design ("cant sleep",
 * "dont know what to do", "whats my purpose").
 *
 * Apostrophes are REMOVED, not replaced with a space — replacing would
 * turn "can't" into "can t" and match nothing. Handles both the straight
 * quote and the curly one that iOS and Word insert automatically.
 * ------------------------------------------------------------------- */

const APOSTROPHES = new RegExp('[' + SAFETY.normalisation.apostropheCharacters + ']', 'g');

function normaliseQuery(raw) {
  if (!raw) return '';
  return String(raw)
    .toLowerCase()
    .replace(APOSTROPHES, '')          // remove, never substitute
    .replace(/[^\w\s-]/g, ' ')          // punctuation to space
    .replace(/\s+/g, ' ')               // collapse whitespace
    .trim();
}


/* ---------------------------------------------------------------------
 * 2. PREFIX STRIPPING (Phase 4)
 *
 * ORDER MATTERS. Longer phrases must come before shorter ones they
 * contain, or "i want to let go" is reduced by "i want" and the rest
 * mangles. The array below is deliberately ordered longest-intent-first;
 * buildStripRegex() also sorts by length as a safety net, so adding a
 * new entry anywhere in the list is safe.
 *
 * All matching happens AFTER normaliseQuery(), so every pattern here is
 * lower-case and apostrophe-free.
 * ------------------------------------------------------------------- */

/* The list itself is SAFETY.stripPrefixes. Notes that belong to it:
 *
 * - It opens with the multi-clause openers, then the shorter ones.
 * - BARE PRONOUN OPENERS ('ive', 'id', 'im', 'i', 'we'), added 2026-10-07.
 *   "dont know what to do" is a stored emotion; "i dont know what to do" is
 *   what people type, and nothing in the list above reached it — the nearest
 *   entry is "i dont know what to do ABOUT", which requires a word the user
 *   did not write. One of only two stored emotions made entirely of stopwords
 *   (the other is "why me"), so the content-token fallback below cannot reach
 *   them either. These strip to them exactly.
 * - BARE INTENSIFIERS ('really', 'very', … 'just') close the list.
 * - 'im' appears twice. Harmless — candidates are de-duplicated — and kept
 *   so the list is byte-for-byte what was approved. */
const STRIP_PREFIXES = SAFETY.stripPrefixes;

/* Leading determiners. Stripped AFTER the prefixes above — see build
 * report §4.2. Without this, "what to do about my inner critic" stalls
 * at "my inner critic" and "im going through a divorce" at "a divorce".
 * Stored emotions that legitimately begin with a determiner ("my mum
 * died", "the void", "my chart", "my calling", "my ego") are unharmed,
 * because the raw normalised query is always tried FIRST. */
const STRIP_DETERMINERS = SAFETY.stripDeterminers;

/* Trailing filler that adds nothing to a lookup. */
const STRIP_SUFFIXES = SAFETY.stripSuffixes;

function escapeForRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* Longest-first so that no pattern is shadowed by a shorter prefix of itself. */
function buildStripRegex(patterns, anchor) {
  const ordered = [...patterns].sort((a, b) => b.length - a.length).map(escapeForRegex);
  return anchor === 'start'
    ? new RegExp('^(?:' + ordered.join('|') + ')\\b\\s*')
    : new RegExp('\\s*\\b(?:' + ordered.join('|') + ')$');
}

const PREFIX_RE      = buildStripRegex(STRIP_PREFIXES, 'start');
const DETERMINER_RE  = buildStripRegex(STRIP_DETERMINERS, 'start');
const SUFFIX_RE      = buildStripRegex(STRIP_SUFFIXES, 'end');

/* One pass. Empty guard: a strip that empties the string is discarded.
 * "help me" is BOTH a strip prefix and a stored emotion — without this
 * guard it strips to "" and resolves to nothing. Build report §3.4. */
function stripOnce(s) {
  let out = s.replace(PREFIX_RE, '').trim();
  if (!out) return s;
  out = out.replace(SUFFIX_RE, '').trim();
  return out || s;
}

function stripAll(s) {
  let prev = s;
  let out = s;
  for (let i = 0; i < SAFETY.maxStripPasses; i++) {           // bounded; no while(true)
    out = stripOnce(prev);
    out = out.replace(DETERMINER_RE, '').trim() || out;
    if (out === prev) break;
    prev = out;
  }
  return out || s;
}

/* ---------------------------------------------------------------------
 * THE CANDIDATE CASCADE — do not replace this with a single replace()
 *
 * Build report §3.3: "belt-and-braces" (storing both "let go" and
 * "i want to let go") only holds if the RAW query is tried before any
 * stripping. A single destructive replace() reduces
 * "i want to change my life" to "change my life", which is not a stored
 * emotion, and the search returns nothing — recreating the exact failure
 * this work exists to eliminate.
 *
 * A SINGLE LONGEST-MATCH STRIP IS ALSO WRONG, and this was found by
 * sweeping all 686 stored emotions against eight common prefixes.
 * "how do i find love" matches the prefix "how do i find" before it
 * matches "how do i", so the longest-match strip eats the word "find"
 * and looks up "love" — while the stored emotion is "find love". Same
 * failure for "how do i stop being a victim" (stored: "stop being a
 * victim"), "i want to be present" (stored: "be present"), and
 * "how do i let go of anger at someone".
 *
 * So we generate a candidate for EVERY prefix that matches, ordered
 * shortest-prefix-first — i.e. most of the user's words retained first,
 * so the most specific stored emotion wins over a broader one.
 *
 * Returns an ordered, de-duplicated list, capped at MAX_CANDIDATES.
 * Try each against emotion_mappings; the first with rows wins. These are
 * indexed equality lookups — a handful is cheap.
 * ------------------------------------------------------------------- */

const MAX_CANDIDATES = SAFETY.maxCandidates;

function buildLookupCandidates(normalised) {
  const out = [];
  const push = (s) => {
    const v = (s || '').trim();
    if (v && !out.includes(v)) out.push(v);
  };

  push(normalised);                                     // 1. exactly as typed

  // 2. every matching prefix, shortest first (retains the most words)
  const matching = STRIP_PREFIXES
    .filter((p) => new RegExp('^' + escapeForRegex(p) + '\\b').test(normalised))
    .sort((a, b) => a.length - b.length);

  for (const p of matching) {
    const rest = normalised.slice(p.length).trim();
    push(rest);
    push(rest.replace(DETERMINER_RE, '').trim());
    push(rest.replace(SUFFIX_RE, '').trim());
    if (out.length >= MAX_CANDIDATES) break;
  }

  // 3. determiner / suffix variants of the raw query
  push(normalised.replace(DETERMINER_RE, '').trim());
  push(normalised.replace(SUFFIX_RE, '').trim());

  // 4. fully stripped, as a last resort
  push(stripAll(normalised));

  return out.slice(0, MAX_CANDIDATES);
}


/* ---------------------------------------------------------------------
 * 2b. CONTENT-TOKEN CONTAINMENT  (added 2026-10-07)
 *
 * THE CASCADE ABOVE ONLY EVER FINDS AN EXACT STORED PHRASE. It strips known
 * lead-ins and tries each result as an equality lookup, so it succeeds only
 * when the query is [known prefix] + [exact stored emotion] and nothing more.
 * Any extra word anywhere and it returns nothing.
 *
 * Measured against 51 phrases of the kind people actually type: 7 matched.
 * The vocabulary was not the problem — "my mum died", "broken heart" and
 * "end of my marriage" are all stored, and all three were unreachable because
 * the person wrote "my mum JUST died", "my heart IS broken", "my marriage
 * ENDED".
 *
 * So: after the cascade misses, find the stored emotion whose every content
 * word appears somewhere in the query. "my mum just died" contains both "mum"
 * and "died", so "my mum died" matches.
 *
 * FULL COVERAGE OF THE STORED PHRASE IS REQUIRED, and that threshold is the
 * difference between this working and this being worse than nothing. A looser
 * rule — half the stored words — lifted coverage to 86% and produced
 * "everyone else has it figured out" -> "burnt out", matching on the word
 * "out". For someone describing how they feel, a confidently wrong answer is
 * worse than an honest blank.
 *
 * Stopwords carry the same lesson. "all the time" is already a strip suffix,
 * but inside a longer sentence it survives, and without "time" and "out" on
 * this list "my chest feels tight all the time" matches "angry all the time".
 * ------------------------------------------------------------------- */

/* Words that carry no emotional signal. Deliberately broad: a token that
 * survives here has to be worth matching on by itself.
 *
 * Checked against the vocabulary: exactly TWO stored emotions are made
 * entirely of these — "dont know what to do" and "why me". Both are reachable
 * by the bare-pronoun prefixes added above, which is why they were added. */
/* 'myself' is deliberately NOT a stopword. It is the difference between
 * "i hate myself" and "i hate the way i look": with it stripped, the stored
 * phrase reduces to the single token "hate" and hijacks every sentence
 * containing that word — including one about body image, which would then
 * also raise the soft-tier support line meant for self-directed hatred.
 * Self-reference is signal here, not noise. */
const CONTENT_STOPWORDS = new Set(SAFETY.contentStopwords);

/* FIX B — WHAT TO DO WHEN THE QUERY IS ALL STOPWORDS.
 *
 * The list above is tuned for sentences with a noun in them. Some of the most
 * common things people type have none: "i feel nothing" and "i dont know who
 * i am anymore" both strip to ZERO tokens, so containment never ran at all
 * and the search returned a blank.
 *
 * The words doing the work in those two are exactly the ones a generic
 * stopword list throws away — "nothing", "who", "know". So when the strict
 * pass empties the query, it is retried against this much smaller set of
 * pure function words, where those survive.
 *
 * Only ever a FALLBACK. Running relaxed by default would let "who", "what"
 * and "know" match far too much; it earns its keep precisely because it runs
 * when the alternative is nothing at all. */
const CORE_STOPWORDS = new Set(SAFETY.coreStopwords);

function contentTokens(s, relaxed = false) {
  const stop = relaxed ? CORE_STOPWORDS : CONTENT_STOPWORDS;
  return String(s || '')
    .split(' ')
    .filter((w) => w && !stop.has(w));
}

/* The best stored emotion whose content words ALL appear in the query.
 *
 * Ranked by how many content words it covers — a two-word match is more
 * specific than a one-word match, so "my mum died" beats "mum guilt" on
 * "my mum just died". Ties go to the SHORTER stored string, which favours the
 * canonical form: "life purpose" over "whats my purpose".
 *
 * `vocabulary` is a list of stored emotion strings. Supplying only the ones
 * that share a word with the query is the caller's business; this function
 * works on whatever it is handed. */
function bestContainedEmotion(normalised, vocabulary, relaxed = false) {
  const queryWords = new Set(contentTokens(normalised, relaxed));
  if (!queryWords.size) return null;

  let best = null;
  for (const emotion of vocabulary || []) {
    // The stored phrase is tokenised the same way as the query, or the two
    // sides would be measured against different rulers.
    const words = contentTokens(emotion, relaxed);
    // An emotion made only of stopwords would match everything. The cascade
    // reaches both of those already.
    if (!words.length) continue;
    if (!words.every((w) => queryWords.has(w))) continue;

    /* Most content words wins — a two-word match is more specific than a
     * one-word one, so "my mum died" beats "mum guilt" on "my mum just died".
     *
     * Ties go to the LONGER stored string, and that is not arbitrary: on
     * "i cant sleep because my mind wont stop", both "cant sleep" and
     * "cant stop" reduce to a single content token, and preferring the
     * shorter picked "cant stop" by one character. The longer phrase is the
     * more specific one and here it is also the right one. */
    if (
      !best ||
      words.length > best.count ||
      (words.length === best.count && emotion.length > best.emotion.length)
    ) {
      best = { emotion, count: words.length };
    }
  }
  return best ? best.emotion : null;
}


/* ---------------------------------------------------------------------
 * 3. CRISIS INTERCEPT (Phase 4b)
 *
 * Checked BEFORE the mapping lookup. If a query matches, the lookup
 * NEVER RUNS and no content carousel is rendered.
 *
 * Phrases are multi-word wherever a single word would misfire —
 * "cutting myself" not "cutting", "starving myself" not "starving".
 * Genuinely unambiguous single words stand alone. Verified: zero false
 * positives across all 686 stored emotions.
 *
 * DO NOT log the raw query string for an intercepted search. Category
 * only, if anything at all.
 * ------------------------------------------------------------------- */

/* Seven categories, checked in this order; the first that matches wins.
 * The phrases are SAFETY.crisisPatterns. Notes that belong to them:
 *
 * WIDENED 2026-10-07 — the oblique register (from 'want to disappear' to
 * 'hope i dont wake up' in suicidal_ideation). The original list caught
 * people who say it plainly. Testing 19 realistic phrasings against it, 16
 * went straight through and returned an empty dropdown. They were safe only by
 * accident: nothing matched them, so nothing was served. The content-token
 * fallback added in the same release removes that accident, which is why
 * these ship together and not one after the other. Still multi-word wherever
 * a single word would misfire: "disappear" alone would catch "i want my
 * anxiety to disappear"; "want to disappear" does not. Verified against all
 * 693 stored emotions: zero collisions.
 *
 * INVISIBILITY ('i feel invisible to everyone' … 'i dont exist to anyone') —
 * moved here from the soft tier on Ross's call (2026-10-07), having first
 * been placed there. The argument for the soft tier was that feeling
 * invisible is more often loneliness than suicidality, and that a full-screen
 * takeover misfires on the majority who type it. The argument for here is
 * that the cost of the two mistakes is not symmetrical: a lonely person shown
 * a helpline has been over-served, and a suicidal person shown a carousel of
 * videos has been failed. Ross's call, and on that reading it is the right
 * one. Consequence to know rather than discover: 'i feel invisible' is broad
 * enough to catch "i feel invisible at work", which will now be intercepted.
 * That is accepted, not overlooked. Narrow it by removing that one entry and
 * keeping only the longer forms. */
const CRISIS_PATTERNS = Object.fromEntries(
  SAFETY.crisisPatterns.map(({ category, phrases }) => [category, phrases])
);

/* Word-boundary containment, so "rape" does not fire inside "grape" and
 * "in crisis" does not fire inside a longer benign phrase by accident. */
function buildPhraseRegex(phrase) {
  return new RegExp('(?:^|\\b)' + escapeForRegex(phrase) + '(?:\\b|$)');
}

const CRISIS_COMPILED = Object.entries(CRISIS_PATTERNS).map(([category, phrases]) => ({
  category,
  regexes: phrases.map(buildPhraseRegex),
}));

function checkCrisis(normalised) {
  for (const { category, regexes } of CRISIS_COMPILED) {
    if (regexes.some((re) => re.test(normalised))) return { intercept: true, category };
  }
  return { intercept: false };
}


/* ---------------------------------------------------------------------
 * 4. THE INTERSTITIAL
 *
 * Warm, human, not clinical, not a wall. This person came to Spiritpedia
 * in pain hoping for something gentle. Acknowledge them, be honest that
 * this is bigger than a content library, point to real help, and leave
 * an unshamed way back.
 *
 * findahelpline.com resolves by country automatically — which is why it
 * suits a global audience and why Spiritpedia should not attempt to
 * maintain its own jurisdiction-by-jurisdiction list.
 * ------------------------------------------------------------------- */

/* Presentation requirements — these are part of the deliverable:
 *  - "Take me back" must be a real, obvious, unshamed way out.
 *    Not greyed out. Not a tiny close icon in a corner.
 *  - No content carousels render on this screen. None.
 *  - No clinical vocabulary, no diagnosis language, no warning icons,
 *    no red. Keep the platform's calm visual language.
 *  - Do not ask the user to confirm or explain what they meant. */
const CRISIS_INTERSTITIAL = SAFETY.crisisInterstitial;


/* ---------------------------------------------------------------------
 * 5. THE DUAL PATH
 *
 * "Hearing voices" means channelling to one user and psychosis to
 * another. A hard intercept insults the first; a straight mapping to
 * channelled-teachings fails the second, potentially badly.
 *
 * So we ask — warmly, without clinical language, with both options
 * carrying equal visual weight.
 * ------------------------------------------------------------------- */

const AMBIGUOUS_PATTERNS = SAFETY.ambiguousPatterns;

const AMBIGUOUS_COMPILED = AMBIGUOUS_PATTERNS.map(buildPhraseRegex);

function checkAmbiguous(normalised) {
  return AMBIGUOUS_COMPILED.some((re) => re.test(normalised));
}

/* Presentation: equal visual weight on both options — no primary/
 * secondary styling, no ordering that implies a "right" answer, no
 * clinical vocabulary anywhere on this screen. */
const DUAL_PATH = SAFETY.dualPath;


/* ---------------------------------------------------------------------
 * 6. SOFT TIER  (Ross, 2026-09-19)
 *
 * Distinct from the crisis intercept. These map NORMALLY to content and
 * additionally show a quiet support line beneath the results. They are
 * common non-crisis phrasings; hard-blocking them would misfire on most
 * of the people who type them.
 *
 * All three exist as normal variants in emotion_mappings:
 *   i hate myself -> Shame           hopeless -> Depression
 *   hate my body  -> Body image & embodiment
 * ------------------------------------------------------------------- */

/* Invisibility briefly lived here and now sits in the hard intercept above —
 * see the note there. This tier is back to the three it was approved with.
 *
 * The crisis check runs first and returns, so a phrase in both lists would
 * never reach this one; keeping it in a single place avoids a second list to
 * remember when either changes. */
const SOFT_TIER_PATTERNS = SAFETY.softTierPatterns;
const SOFT_TIER_COMPILED = SOFT_TIER_PATTERNS.map(buildPhraseRegex);

function checkSoftTier(normalised) {
  return SOFT_TIER_COMPILED.some((re) => re.test(normalised));
}

const SOFT_TIER_LINE = SAFETY.softTierLine;

/* Presentation: quiet. Small, muted text. No icon, no coloured alert
 * box, no border. Rendered AFTER the carousels, never above them. */


/* ---------------------------------------------------------------------
 * 7. MEDICAL-CARE DISCLAIMER
 *
 * Fires on result sets surfacing quantum-healing, homeopathy,
 * energy-medicine or ayurveda.
 *
 * NOTE (build report §4.4): this fires more often than you might expect,
 * because energy-medicine sits at weight 1 in several bundles unrelated
 * to health — a search for "hopeless" triggers it via the Depression
 * bundle. That is correct per the rule as approved. The mitigation is
 * placement, not logic: render it beneath the TRIGGERING CAROUSEL, not
 * at the top of the page.
 *
 * To narrow it to weight >= 2, set MEDICAL_MIN_WEIGHT to 2.
 * ------------------------------------------------------------------- */

const MEDICAL_SUBJECTS = SAFETY.medicalSubjects;
const MEDICAL_MIN_WEIGHT = SAFETY.medicalMinWeight;

const MEDICAL_DISCLAIMER = SAFETY.medicalDisclaimer;

function needsMedicalDisclaimer(rows) {
  return (rows || []).some(
    (r) => MEDICAL_SUBJECTS.includes(r.subject_slug) && r.weight >= MEDICAL_MIN_WEIGHT
  );
}

function medicalDisclaimerSubjects(rows) {
  return (rows || [])
    .filter((r) => MEDICAL_SUBJECTS.includes(r.subject_slug) && r.weight >= MEDICAL_MIN_WEIGHT)
    .map((r) => r.subject_slug);
}


/* ---------------------------------------------------------------------
 * 8. REFERENCE IMPLEMENTATION
 *
 * The required flow, in the required order. Wiring this into
 * EmotionSearch.js — component state, routing, render — is the dev's
 * work; this function defines the contract it must honour.
 *
 * `lookup` is injected: (emotion) => Promise<[{subject_slug, weight}]>
 *
 *   SELECT subject_slug, weight
 *   FROM public.emotion_mappings
 *   WHERE emotion = $1
 *   ORDER BY weight DESC;
 *
 * The emotion_mappings_emotion_idx index is what keeps this off a
 * sequential scan.
 * ------------------------------------------------------------------- */

async function resolveEmotionSearch(rawQuery, lookup, opts = {}) {
  const normalised = normaliseQuery(rawQuery);
  if (!normalised) return { type: 'empty' };

  // 1 — crisis intercept. Before the lookup. Always.
  const crisis = checkCrisis(normalised);
  if (crisis.intercept) {
    // Log the category only — never the raw query.
    return { type: 'crisis', category: crisis.category, content: CRISIS_INTERSTITIAL };
  }

  // 2 — dual path, unless the user has already answered it
  if (!opts.dualPathAnswer && checkAmbiguous(normalised)) {
    return { type: 'dual_path', content: DUAL_PATH };
  }
  if (opts.dualPathAnswer === 'distressing') {
    return { type: 'crisis', category: 'acute_crisis', content: CRISIS_INTERSTITIAL };
  }

  // 3 — mapping lookup via the candidate cascade
  const candidates = buildLookupCandidates(normalised);
  let rows = [];
  let matched = null;
  for (const candidate of candidates) {
    rows = await lookup(candidate);
    if (rows && rows.length) { matched = candidate; break; }
  }

  // 3b — content-token containment, ONLY once every exact candidate has
  // missed. The cascade still runs first and still wins, so nothing that
  // resolved before this existed resolves differently now.
  //
  // `vocabularyLookup` is injected like `lookup`: given the query's content
  // words it returns stored emotion strings worth testing. Optional — without
  // it this step is skipped and the function behaves exactly as before.
  let containedVia = null;
  if ((!rows || !rows.length) && typeof opts.vocabularyLookup === 'function') {
    // Strict first. Relaxed only if the strict pass left nothing to search
    // with — see CORE_STOPWORDS. Two attempts at most.
    const attempts = [];
    const strict = contentTokens(normalised);
    if (strict.length) attempts.push({ words: strict, relaxed: false });
    else {
      const loose = contentTokens(normalised, true);
      if (loose.length) attempts.push({ words: loose, relaxed: true });
    }

    for (const attempt of attempts) {
      const vocabulary = await opts.vocabularyLookup(attempt.words);
      const hit = bestContainedEmotion(normalised, vocabulary, attempt.relaxed);
      if (!hit) continue;
      const containedRows = await lookup(hit);
      if (containedRows && containedRows.length) {
        rows = containedRows;
        matched = hit;
        containedVia = hit;
        break;
      }
    }
  }

  if (!rows || !rows.length) {
    return {
      type: 'no_results',
      normalised,
      triedCandidates: candidates,
      // The support line belongs on this screen too. Someone who types
      // "hopeless" or "i feel invisible" and matches nothing was previously
      // shown a bare dead end — the one tier whose entire purpose is to say
      // "there is help" said nothing, because it only ever decorated results.
      softTier: checkSoftTier(normalised) ? SOFT_TIER_LINE : null,
    };
  }

  // 4 — soft tier and disclaimer decorate the results; they never replace them
  return {
    type: 'results',
    matchedEmotion: matched,
    // Which path found it, so the caller can tell an exact hit from an
    // inferred one — and so a future session can measure the split.
    via: containedVia ? 'containment' : 'cascade',
    rows,
    softTier: checkSoftTier(normalised) ? SOFT_TIER_LINE : null,
    medicalDisclaimer: needsMedicalDisclaimer(rows) ? MEDICAL_DISCLAIMER : null,
    medicalDisclaimerSubjects: medicalDisclaimerSubjects(rows),
  };
}


/* ------------------------------------------------------------------- */

const SpiritpediaEmotionSearch = {
  normaliseQuery,
  buildLookupCandidates,
  contentTokens,
  bestContainedEmotion,
  CORE_STOPWORDS,
  stripOnce,
  stripAll,
  checkCrisis,
  checkAmbiguous,
  checkSoftTier,
  needsMedicalDisclaimer,
  medicalDisclaimerSubjects,
  resolveEmotionSearch,
  STRIP_PREFIXES,
  STRIP_DETERMINERS,
  STRIP_SUFFIXES,
  CRISIS_PATTERNS,
  AMBIGUOUS_PATTERNS,
  SOFT_TIER_PATTERNS,
  CONTENT_STOPWORDS,
  CRISIS_INTERSTITIAL,
  DUAL_PATH,
  SOFT_TIER_LINE,
  MEDICAL_DISCLAIMER,
  MEDICAL_SUBJECTS,
};

export {
  normaliseQuery,
  buildLookupCandidates,
  contentTokens,
  bestContainedEmotion,
  CORE_STOPWORDS,
  stripOnce,
  stripAll,
  checkCrisis,
  checkAmbiguous,
  checkSoftTier,
  needsMedicalDisclaimer,
  medicalDisclaimerSubjects,
  resolveEmotionSearch,
  STRIP_PREFIXES,
  STRIP_DETERMINERS,
  STRIP_SUFFIXES,
  CRISIS_PATTERNS,
  AMBIGUOUS_PATTERNS,
  SOFT_TIER_PATTERNS,
  CONTENT_STOPWORDS,
  CRISIS_INTERSTITIAL,
  DUAL_PATH,
  SOFT_TIER_LINE,
  MEDICAL_DISCLAIMER,
  MEDICAL_SUBJECTS,
};

export default SpiritpediaEmotionSearch;

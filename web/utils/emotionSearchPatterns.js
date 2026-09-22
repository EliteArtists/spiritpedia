/* =====================================================================
 * SPIRITPEDIA — EmotionSearch patterns, crisis intercept & duty-of-care
 * =====================================================================
 *
 * Phase 4  — natural-language stripping for EmotionSearch.js
 * Phase 4b — crisis intercept, interstitial copy, dual path, soft tier,
 *            medical-care disclaimer
 *
 * Companion to spiritpedia-emotion-mappings.sql (686 emotions, 3,430 rows).
 * Spec: claude/emotion-mapping-phase1-review.md  (approved 2026-09-19)
 * Build notes: claude/emotion-mapping-build-report.md
 *
 * THE ORDER OF OPERATIONS IS NOT NEGOTIABLE. See resolveEmotionSearch()
 * at the bottom. In particular the crisis check runs BEFORE the mapping
 * lookup — it is a pre-match intercept, not a filter on results.
 *
 * INTEGRATION NOTE (2026-09-22): this file is the delivered module,
 * unchanged apart from its final block — the CommonJS/window tail was
 * replaced with ES module exports so Next can bundle it. No pattern,
 * phrase, threshold, copy string or ordering has been altered.
 * ===================================================================== */


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

const APOSTROPHES = /['‘’ʼ`´]/g;

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

const STRIP_PREFIXES = [
  // --- multi-clause openers ---
  'i have been struggling with',
  'i have been feeling like',
  'i dont know how to deal with',
  'i dont know how to cope with',
  'i dont know what to do about',
  'i am struggling to cope with',
  'im struggling to cope with',
  'can you help me with',
  'i have been feeling',
  'ive been feeling',
  'i am struggling with',
  'im struggling with',
  'i am going through',
  'im going through',
  'i am dealing with',
  'im dealing with',
  'i am suffering from',
  'im suffering from',
  'what to do about',
  'what do i do about',
  'what do i do when',
  'how do i deal with',
  'how do i cope with',
  'how do i stop',
  'how do i get over',
  'how do i let go of',
  'how do i find',
  'how do i',
  'how to stop',
  'how to get over',
  'how to deal with',
  'how to cope with',
  'how to',
  'why do i keep',
  'why do i always',
  'why am i so',
  'why am i',
  'why do i',
  'help me with',
  'help me to',
  'help with',
  'i need help with',
  'i want to stop',
  'i want to learn',
  'i want to feel',
  'i want to be',
  'i want to',
  'i need to feel',
  'i need to',
  'i would like to',
  'id like to',
  'i keep on',
  'i keep',
  'i cannot stop',
  'i cant stop',
  'i cant seem to',
  'i cant',
  'i dont want to feel',
  'i dont want to be',
  'i always feel',
  'i often feel',
  'i just feel',
  'i still feel',
  'i sometimes feel',
  'i have been',
  'ive been',
  'i am feeling',
  'im feeling',
  'i feel like',
  'i feel so',
  'i feel',
  'im so',
  'im really',
  'im very',
  'i am so',
  'i am really',
  'i am very',
  'i am',
  'im',
  'looking for',
  'searching for',
  'show me',
  'find me',
  'anything for',
  'something for',
  'content about',
  'teachers for',
  'books about',
  'feeling really',
  'feeling very',
  'feeling so',
  'feeling',
  // --- bare intensifiers ---
  'really',
  'very',
  'quite',
  'so',
  'super',
  'incredibly',
  'extremely',
  'totally',
  'completely',
  'absolutely',
  'a bit',
  'a little',
  'kind of',
  'kinda',
  'sort of',
  'somewhat',
  'always',
  'constantly',
  'still',
  'just',
];

/* Leading determiners. Stripped AFTER the prefixes above — see build
 * report §4.2. Without this, "what to do about my inner critic" stalls
 * at "my inner critic" and "im going through a divorce" at "a divorce".
 * Stored emotions that legitimately begin with a determiner ("my mum
 * died", "the void", "my chart", "my calling", "my ego") are unharmed,
 * because the raw normalised query is always tried FIRST. */
const STRIP_DETERMINERS = ['my', 'the', 'this', 'that', 'some', 'a', 'an'];

/* Trailing filler that adds nothing to a lookup. */
const STRIP_SUFFIXES = [
  'right now',
  'at the moment',
  'all the time',
  'lately',
  'today',
  'these days',
  'again',
  'please',
  'help',
];

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
  for (let i = 0; i < 6; i++) {           // bounded; no while(true)
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

const MAX_CANDIDATES = 10;

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

const CRISIS_PATTERNS = {
  suicidal_ideation: [
    'suicidal', 'suicide', 'kill myself', 'killing myself', 'want to die',
    'want to be dead', 'wish i was dead', 'wish i were dead', 'end my life',
    'ending my life', 'end it all', 'take my own life', 'no reason to live',
    'nothing to live for', 'no point living', 'no point in living',
    'better off without me', 'better off dead', 'dont want to be here anymore',
    'dont want to live', 'cant go on', 'cant keep going', 'ready to give up on life',
    'planning to end', 'how to kill myself',
  ],
  self_harm: [
    'self harm', 'selfharm', 'self harming', 'harm myself', 'harming myself',
    'hurt myself', 'hurting myself', 'cutting myself', 'cut myself',
    'burning myself', 'want to hurt myself', 'urge to cut',
  ],
  eating_disorder: [
    'anorexia', 'anorexic', 'bulimia', 'bulimic', 'eating disorder',
    'purging after eating', 'making myself sick after eating', 'starving myself',
    'stop eating to lose', 'binge and purge', 'binge eating disorder',
    'restricting food', 'scared to eat', 'cant stop binging',
  ],
  active_abuse: [
    'domestic violence', 'domestic abuse', 'abusive partner', 'abusive husband',
    'abusive wife', 'abusive relationship', 'he hits me', 'she hits me',
    'he beats me', 'my partner hits me', 'scared of my husband',
    'scared of my wife', 'scared of my partner', 'afraid he will hurt me',
    'afraid of my partner', 'threatens to hurt me', 'im being abused',
    'being abused', 'physically abused', 'he threatens me',
  ],
  sexual_assault: [
    'raped', 'was raped', 'rape', 'sexual assault', 'sexually assaulted',
    'assaulted me', 'sexual abuse', 'sexually abused', 'molested',
    'without my consent',
  ],
  child_protection: [
    'child abuse', 'child is being hurt', 'my child is being abused',
    'worried about a child', 'someone is hurting my child',
    'child is in danger', 'abusing a child',
  ],
  acute_crisis: [
    'psychosis', 'psychotic', 'schizophrenia', 'having a breakdown',
    'mental breakdown', 'losing touch with reality', 'paranoid delusions',
    'they are watching me', 'they are following me', 'voices telling me to',
    'voices tell me to hurt', 'cant tell what is real', 'in crisis',
    'emergency mental health', 'i need urgent help',
  ],
};

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

const CRISIS_INTERSTITIAL = {
  heading: 'We want to make sure you have the right support',
  body: [
    'Thank you for telling us how you are feeling. That takes something, and we do not want to hand you a list of videos in response to it.',
    'What you are carrying deserves a real person, not a library. There are people trained for exactly this, available right now, free and confidential — wherever in the world you are.',
  ],
  primaryAction: {
    label: 'Find someone to talk to',
    href: 'https://findahelpline.com/',
    note: 'Finds free, confidential support in your country — by phone, text or chat.',
  },
  secondaryAction: {
    label: 'Take me back to Spiritpedia',
    behaviour: 'returnToSearch',
  },
  closing: 'Whenever you are ready, we will still be here.',

  /* Presentation requirements — these are part of the deliverable:
   *  - "Take me back" must be a real, obvious, unshamed way out.
   *    Not greyed out. Not a tiny close icon in a corner.
   *  - No content carousels render on this screen. None.
   *  - No clinical vocabulary, no diagnosis language, no warning icons,
   *    no red. Keep the platform's calm visual language.
   *  - Do not ask the user to confirm or explain what they meant. */
};


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

const AMBIGUOUS_PATTERNS = [
  'hearing voices', 'i hear voices', 'i keep hearing voices',
  'voices in my head', 'hearing a voice',
  'seeing things', 'i see things that arent there', 'seeing things that arent there',
  'spirits are talking to me', 'spirits talking to me', 'something is talking to me',
  'i think im losing my mind', 'losing my mind', 'am i losing my mind',
  'going mad', 'am i going mad',
];

const AMBIGUOUS_COMPILED = AMBIGUOUS_PATTERNS.map(buildPhraseRegex);

function checkAmbiguous(normalised) {
  return AMBIGUOUS_COMPILED.some((re) => re.test(normalised));
}

const DUAL_PATH = {
  heading: 'That can mean very different things',
  body: 'We would rather ask than guess. Which is closer to where you are?',
  options: [
    {
      key: 'exploring',
      label: 'I am exploring channelling and spiritual communication',
      subjects: ['channelled-teachings', 'mediumship-spirits', 'mysticism'],
      behaviour: 'continueToResults',
    },
    {
      key: 'distressing',
      label: 'This is frightening or distressing me',
      behaviour: 'showInterstitial',
    },
  ],
  /* Presentation: equal visual weight on both options — no primary/
   * secondary styling, no ordering that implies a "right" answer, no
   * clinical vocabulary anywhere on this screen. */
};


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

const SOFT_TIER_PATTERNS = ['i hate myself', 'hopeless', 'hate my body'];
const SOFT_TIER_COMPILED = SOFT_TIER_PATTERNS.map(buildPhraseRegex);

function checkSoftTier(normalised) {
  return SOFT_TIER_COMPILED.some((re) => re.test(normalised));
}

const SOFT_TIER_LINE =
  'If this is heavier than it looks from the outside, talking to someone can help. ' +
  'findahelpline.com finds free, confidential support in your country.';

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

const MEDICAL_SUBJECTS = ['quantum-healing', 'homeopathy', 'energy-medicine', 'ayurveda'];
const MEDICAL_MIN_WEIGHT = 1;

const MEDICAL_DISCLAIMER = 'Complementary to, not a replacement for, medical care.';

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

  if (!rows || !rows.length) {
    return { type: 'no_results', normalised, triedCandidates: candidates };
  }

  // 4 — soft tier and disclaimer decorate the results; they never replace them
  return {
    type: 'results',
    matchedEmotion: matched,
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
  CRISIS_INTERSTITIAL,
  DUAL_PATH,
  SOFT_TIER_LINE,
  MEDICAL_DISCLAIMER,
  MEDICAL_SUBJECTS,
};

export {
  normaliseQuery,
  buildLookupCandidates,
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
  CRISIS_INTERSTITIAL,
  DUAL_PATH,
  SOFT_TIER_LINE,
  MEDICAL_DISCLAIMER,
  MEDICAL_SUBJECTS,
};

export default SpiritpediaEmotionSearch;

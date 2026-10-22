// The personal discovery edition's words (B3), approved on 21 October 2026.
// Every line the system can put in front of a reader is here, and only here,
// so nothing reaches an email that wasn't approved. Plain functions with no
// imports (discoveryWords.test.mjs).
//
// No he/she anywhere: a name doesn't tell us someone's pronouns.

export const SUBJECT_LINE = 'A little space for discovery';
export const HEADLINE = 'A little space for discovery.';
export const KICKER = 'Your discoveries · a personal edition';
export const CLOSING = "No need to explore everything today. Your Library is there for the discoveries you'd like to keep.";

// A "popular" line only when this many people have saved the item; below it,
// the neutral line.
export const POPULAR_MIN_SAVES = 10;

// "Jane" → "Jane's"; "James" → "James's" (British usage).
export function possessive(name) {
  return `${name}'s`;
}

// The first name of a person on a listing, past any title: "Dr Jane Smith" →
// "Jane". Falls back to the whole name.
const TITLES = new Set(['dr', 'mr', 'mrs', 'ms', 'miss', 'mx', 'prof', 'professor', 'rev', 'revd', 'sir', 'dame']);
export function listingFirstName(name) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  return words.find((w) => !TITLES.has(w.toLowerCase().replace(/\.$/, ''))) || (name || '').trim();
}

/* ── The intro line ── */

// Up to three pieces, in this order, from the sections present.
const INTRO_ORDER = ['featured', 'teacher', 'nearby', 'free', 'videos'];

function introPiece(section, edition) {
  switch (section) {
    case 'featured':
      return edition.featured?.subjectName ? `a little ${edition.featured.subjectName}` : null;
    case 'teacher':
      return 'a voice worth returning to';
    case 'nearby':
      return edition.nearby?.mode === 'online' ? 'someone you can meet online' : 'someone closer to home';
    case 'free':
      return 'something freely shared';
    case 'videos':
      return 'something to watch';
    default:
      return null;
  }
}

// "A little Qigong, a voice worth returning to, and someone closer to home.
// I've brought together a few places for your curiosity to wander."
export function introLine(edition) {
  const pieces = INTRO_ORDER.filter((s) => present(edition, s))
    .map((s) => introPiece(s, edition))
    .filter(Boolean)
    .slice(0, 3);
  const close = "I've brought together a few places for your curiosity to wander.";
  if (!pieces.length) return close;
  const joined =
    pieces.length === 1
      ? pieces[0]
      : pieces.length === 2
        ? `${pieces[0]} and ${pieces[1]}`
        : `${pieces[0]}, ${pieces[1]}, and ${pieces[2]}`;
  return `${joined[0].toUpperCase()}${joined.slice(1)}. ${close}`;
}

function present(edition, section) {
  if (section === 'videos') return Boolean(edition.videos?.length);
  return Boolean(edition[section]);
}

/* ── The preview line (inbox text after the subject) ── */

// "Meet Jeffrey Chand, and a little more Consciousness." The subject is the
// first video's, else the featured one's; without one, just "Meet …".
export function previewLine(edition) {
  const name = edition.featured?.healer?.name;
  const subject = edition.videos?.[0]?.subjectName || edition.featured?.subjectName;
  if (!name) return subject ? `A little more ${subject}.` : '';
  return subject ? `Meet ${name}, and a little more ${subject}.` : `Meet ${name}.`;
}

/* ── "Why" lines ── */

// reason: more_of | saves | learning | popular | neutral
export function featuredWhy({ reason, subjectName, name, savedName }) {
  const first = listingFirstName(name);
  switch (reason) {
    case 'more_of':
      return `You asked for more ${subjectName}. Explore ${possessive(first)} approach and find your next practice.`;
    case 'saves':
      return `Because you saved ${savedName}, here's someone else exploring ${subjectName}.`;
    case 'learning':
      return `Something new in ${subjectName}, a subject you've been exploring.`;
    case 'popular':
      return `Many explorers interested in ${subjectName} have saved ${possessive(first)} work.`;
    default:
      return `Someone to explore in ${subjectName}.`;
  }
}

export function featuredButton(name) {
  return `Explore ${possessive(listingFirstName(name))} work →`;
}

// reason: more_of | learning | popular | neutral (saves reads as neutral)
export function videoWhy({ reason, subjectName }) {
  switch (reason) {
    case 'more_of':
      return `Picked for your interest in ${subjectName}.`;
    case 'learning':
      return "More from a subject you've been exploring.";
    case 'popular':
      return `Popular with explorers interested in ${subjectName}.`;
    default:
      return `Picked for ${subjectName}.`;
  }
}

// mode: area | online
export function nearbyWhy({ mode, subjectName, town, name }) {
  if (mode === 'online') return `${listingFirstName(name)} offers sessions online, so distance needn't matter.`;
  return subjectName
    ? `You asked for more ${subjectName}. Here's a ${town} practitioner whose work you can get to know.`
    : `A practitioner near ${town} whose work you can get to know.`;
}

export function teacherWhy({ subjectName }) {
  return subjectName
    ? `Another voice to explore alongside your interest in ${subjectName.toLowerCase()}.`
    : 'A voice whose wisdom lives on, waiting to be discovered.';
}

export function freeWhy({ subjectName }) {
  return `Something freely shared in ${subjectName}, to explore whenever you like.`;
}

/* ── Labels and links ── */

export const LABELS = {
  featured: (tierName) => `Your featured discovery${tierName ? ` · ${tierName}` : ''}`,
  videosKicker: 'Picked for your interests',
  videosTitle: 'More of what you love',
  video: 'Video',
  exploreVideo: 'Explore this video →',
  nearbyKicker: (mode, town) => (mode === 'online' ? 'Online sessions' : `Local hero · ${town}`),
  nearbyTitle: 'A little closer to home',
  meet: (name) => `Meet ${listingFirstName(name)} →`,
  teacherKicker: 'Timeless teachers',
  teacherTitle: 'A voice worth discovering',
  teacherLink: 'Explore the teachings →',
  freeKicker: 'Room for a little more',
  freeTitle: 'Something freely shared',
  freeLabel: (subjectName) => `Free resources · ${subjectName}`,
  freeLink: 'Explore this free resource →',
  save: '♡ Save',
};

export const FOOTER = {
  library: 'Visit your Library',
  online: 'View this edition online',
  preferences: 'Change what I receive',
  unsubscribe: 'Unsubscribe',
  line: 'Spiritpedia · Discover wisdom. Explore consciousness.',
  tagline: 'Discover wisdom. Explore consciousness.',
};

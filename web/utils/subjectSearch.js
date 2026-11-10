// Subject names in the search box, ignoring spaces, hyphens, other
// punctuation and capitals (owner, 10 Nov 2026): "Quantum-Touch",
// "quantumtouch" and "quantum touch" all find Quantum Touch; "breath work"
// finds Breathwork; "qigong" finds Qi Gong.
//
// Only the subject-name lookup uses this. The feelings search keeps its own
// normaliser (utils/emotionSearchPatterns.js → normaliseQuery), which keeps
// hyphens: its crisis and safety checks are pinned by
// shared/emotion-safety.cases.json for both the website and the app, and
// treating a hyphen as a space there would change which phrases they catch.
//
// Plain ES module with no React dependency, so `node --test` can import it.

// Lower case, letters and digits only. Accents are folded ("é" → "e").
export function squashName(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// The subjects whose name (or slug) contains what was typed, squashed.
// An exact name first, then names that start with it, then the rest; ties in
// the order given (the caller passes them by name).
export function matchSubjectsByName(subjects, term, limit = 3) {
  const q = squashName(term);
  if (!q) return [];
  const list = Array.isArray(subjects) ? subjects : [];
  return list
    .map((s, i) => ({ s, i, name: squashName(s?.name), slug: squashName(s?.slug) }))
    .filter(({ name, slug }) => name.includes(q) || slug.includes(q))
    .map((m) => ({ ...m, score: m.name === q || m.slug === q ? 0 : m.name.startsWith(q) ? 1 : 2 }))
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .slice(0, limit)
    .map(({ s }) => s);
}

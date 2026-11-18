import '../../data/models.dart';

/// Subject names in the search box, ignoring spaces, hyphens, other
/// punctuation and capitals (owner, 10 Nov 2026): "Quantum-Touch",
/// "quantumtouch" and "quantum touch" all find Quantum Touch; "breath work"
/// finds Breathwork; "tai-chi" finds Tai Chi. The website's
/// web/utils/subjectSearch.js — change both together.
///
/// Only the subject-name lookup uses this. The feelings search keeps its own
/// normaliser (core/safety/emotion_safety.dart), whose crisis and safety
/// checks are pinned by shared/emotion-safety.cases.json for both the
/// website and the app.

// The accented letters subject names could carry, folded to plain ones (the
// website folds with NFKD, which Dart has no built-in for).
const _plain = {
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'ā': 'a', //
  'ç': 'c', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ē': 'e', 'ì': 'i',
  'í': 'i', 'î': 'i', 'ï': 'i', 'ī': 'i', 'ñ': 'n', 'ò': 'o', 'ó': 'o',
  'ô': 'o', 'õ': 'o', 'ö': 'o', 'ō': 'o', 'ù': 'u', 'ú': 'u', 'û': 'u',
  'ü': 'u', 'ū': 'u', 'ý': 'y', 'ÿ': 'y',
};

/// Lower case, letters and digits only. Accents are folded ("é" → "e").
String squashName(String? text) {
  final lower = (text ?? '').toLowerCase();
  final folded = StringBuffer();
  for (final ch in lower.split('')) {
    folded.write(_plain[ch] ?? ch);
  }
  return folded.toString().replaceAll(RegExp(r'[^a-z0-9]'), '');
}

/// The [subjects] whose name (or slug) contains what was typed, squashed.
/// An exact name first, then names that start with it, then the rest; ties
/// in the order given (callers pass them by name). [limit] at most.
List<Subject> matchSubjectsByName(
  List<Subject> subjects,
  String term, {
  int limit = 3,
}) {
  final q = squashName(term);
  if (q.isEmpty) return const [];
  final scored = <(Subject, int, int)>[];
  for (final (i, s) in subjects.indexed) {
    final name = squashName(s.name);
    final slug = squashName(s.slug);
    if (!name.contains(q) && !slug.contains(q)) continue;
    final score = name == q || slug == q
        ? 0
        : name.startsWith(q)
        ? 1
        : 2;
    scored.add((s, score, i));
  }
  scored.sort((a, b) {
    final c = a.$2 - b.$2;
    return c != 0 ? c : a.$3 - b.$3;
  });
  return [for (final (s, _, _) in scored.take(limit)) s];
}

/// Every subject, fetched once and matched here: a database "contains" on
/// the typed text cannot ignore spaces and hyphens, and the list is a few
/// dozen short rows. A failed fetch is not kept, so the next search tries
/// again.
class SubjectList {
  SubjectList(this._fetch);

  final Future<List<Subject>> Function() _fetch;
  Future<List<Subject>>? _all;

  Future<List<Subject>> get all => _all ??= _fetch().catchError((Object _) {
    _all = null;
    return const <Subject>[];
  });

  /// [matchSubjectsByName] over every subject.
  Future<List<Subject>> match(String term, {int limit = 3}) async =>
      matchSubjectsByName(await all, term, limit: limit);
}

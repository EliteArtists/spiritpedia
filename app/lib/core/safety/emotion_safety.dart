// The emotional search's safety checks and phrase handling — a line-for-line
// port of web/utils/emotionSearchPatterns.js.
//
// ONE SOURCE OF DATA. Every phrase list, threshold and copy string comes from
// web/shared/emotion-safety.json, which this app bundles through the symlink
// assets/safety/emotion-safety.json. The website reads the same file. Nothing
// here may be retyped from it.
//
// ONE BEHAVIOUR. test/core/safety/emotion_safety_test.dart runs this against
// web/shared/emotion-safety.cases.json — the same cases the website's
// `npm test` runs — so any difference between the two fails a test.
//
// THE ORDER OF OPERATIONS IS NOT NEGOTIABLE (see resolve()): the crisis check
// runs BEFORE any lookup. A crisis phrase must never reach the network.
//
// The reasons behind each rule live in the comments of the JavaScript module;
// they are not repeated here.

import 'dart:convert';

import 'package:flutter/services.dart';

/// Where the shared JSON is bundled (a symlink to web/shared/).
const emotionSafetyAsset = 'assets/safety/emotion-safety.json';

Future<EmotionSafety> loadEmotionSafety(AssetBundle bundle) async =>
    EmotionSafety.parse(await bundle.loadString(emotionSafetyAsset));

/// One row of emotion_mappings, as the lookup returns it.
class MappingRow {
  const MappingRow(this.subjectSlug, this.weight);

  final String subjectSlug;
  final int weight;

  Map<String, Object?> toJson() => {
    'subject_slug': subjectSlug,
    'weight': weight,
  };

  @override
  bool operator ==(Object other) =>
      other is MappingRow &&
      other.subjectSlug == subjectSlug &&
      other.weight == weight;

  @override
  int get hashCode => Object.hash(subjectSlug, weight);
}

/// `lookup` in the JavaScript: one stored emotion → its rows, weight-descending.
typedef EmotionLookup = Future<List<MappingRow>> Function(String emotion);

/// `vocabularyLookup`: the query's content words → stored emotions worth testing.
typedef VocabularyLookup = Future<List<String>> Function(List<String> words);

class CrisisInterstitial {
  const CrisisInterstitial({
    required this.heading,
    required this.body,
    required this.primaryLabel,
    required this.primaryHref,
    required this.primaryNote,
    required this.secondaryLabel,
    required this.closing,
  });

  final String heading;
  final List<String> body;
  final String primaryLabel;
  final String primaryHref;
  final String primaryNote;
  final String secondaryLabel;
  final String closing;
}

class DualPathOption {
  const DualPathOption({
    required this.key,
    required this.label,
    required this.subjects,
  });

  final String key; // 'exploring' | 'distressing'
  final String label;
  final List<String> subjects;
}

class DualPath {
  const DualPath({
    required this.heading,
    required this.body,
    required this.options,
  });

  final String heading;
  final String body;
  final List<DualPathOption> options;
}

/// What resolve() decided. [type] is one of: empty, crisis, dual_path,
/// no_results, results — the same values as the website.
class EmotionSearchResult {
  const EmotionSearchResult._({
    required this.type,
    this.category,
    this.normalised,
    this.triedCandidates,
    this.matchedEmotion,
    this.via,
    this.rows = const [],
    this.softTier,
    this.medicalDisclaimer,
    this.medicalDisclaimerSubjects = const [],
  });

  final String type;
  final String? category;
  final String? normalised;
  final List<String>? triedCandidates;
  final String? matchedEmotion;
  final String? via; // 'cascade' | 'containment'
  final List<MappingRow> rows;
  final String? softTier;
  final String? medicalDisclaimer;
  final List<String> medicalDisclaimerSubjects;

  bool get isCrisis => type == 'crisis';
  bool get isDualPath => type == 'dual_path';

  /// The same shape the JavaScript returns (content objects named by key), so
  /// the shared test cases can compare the two directly.
  Map<String, Object?> toComparable() => switch (type) {
    'empty' => {'type': type},
    'crisis' => {
      'type': type,
      'category': category,
      'content': 'crisisInterstitial',
    },
    'dual_path' => {'type': type, 'content': 'dualPath'},
    'no_results' => {
      'type': type,
      'normalised': normalised,
      'triedCandidates': triedCandidates,
      'softTier': softTier,
    },
    _ => {
      'type': type,
      'matchedEmotion': matchedEmotion,
      'via': via,
      'rows': [for (final r in rows) r.toJson()],
      'softTier': softTier,
      'medicalDisclaimer': medicalDisclaimer,
      'medicalDisclaimerSubjects': medicalDisclaimerSubjects,
    },
  };
}

class EmotionSafety {
  EmotionSafety._({
    required String apostropheCharacters,
    required this.stripPrefixes,
    required this.stripDeterminers,
    required this.stripSuffixes,
    required this.maxCandidates,
    required this.maxStripPasses,
    required this.contentStopwords,
    required this.coreStopwords,
    required this.crisisCategories,
    required this.crisisInterstitial,
    required this.ambiguousPatterns,
    required this.dualPath,
    required this.softTierPatterns,
    required this.softTierLine,
    required this.medicalSubjects,
    required this.medicalMinWeight,
    required this.medicalDisclaimer,
  }) : _apostrophes = RegExp('[$apostropheCharacters]'),
       _prefixRe = _buildStripRegex(stripPrefixes, start: true),
       _determinerRe = _buildStripRegex(stripDeterminers, start: true),
       _suffixRe = _buildStripRegex(stripSuffixes, start: false),
       _crisisCompiled = [
         for (final c in crisisCategories)
           (
             category: c.category,
             regexes: [for (final p in c.phrases) _phraseRegex(p)],
           ),
       ],
       _ambiguousCompiled = [
         for (final p in ambiguousPatterns) _phraseRegex(p),
       ],
       _softTierCompiled = [for (final p in softTierPatterns) _phraseRegex(p)];

  factory EmotionSafety.parse(String json) =>
      EmotionSafety.fromJson(jsonDecode(json) as Map<String, dynamic>);

  factory EmotionSafety.fromJson(Map<String, dynamic> j) {
    List<String> strings(Object? v) => [
      for (final s in v! as List) s as String,
    ];
    final ci = j['crisisInterstitial'] as Map<String, dynamic>;
    final dp = j['dualPath'] as Map<String, dynamic>;
    return EmotionSafety._(
      apostropheCharacters:
          (j['normalisation'] as Map<String, dynamic>)['apostropheCharacters']
              as String,
      stripPrefixes: strings(j['stripPrefixes']),
      stripDeterminers: strings(j['stripDeterminers']),
      stripSuffixes: strings(j['stripSuffixes']),
      maxCandidates: j['maxCandidates'] as int,
      maxStripPasses: j['maxStripPasses'] as int,
      contentStopwords: strings(j['contentStopwords']).toSet(),
      coreStopwords: strings(j['coreStopwords']).toSet(),
      crisisCategories: [
        for (final c in j['crisisPatterns'] as List)
          (
            category: (c as Map<String, dynamic>)['category'] as String,
            phrases: strings(c['phrases']),
          ),
      ],
      crisisInterstitial: CrisisInterstitial(
        heading: ci['heading'] as String,
        body: strings(ci['body']),
        primaryLabel: (ci['primaryAction'] as Map)['label'] as String,
        primaryHref: (ci['primaryAction'] as Map)['href'] as String,
        primaryNote: (ci['primaryAction'] as Map)['note'] as String,
        secondaryLabel: (ci['secondaryAction'] as Map)['label'] as String,
        closing: ci['closing'] as String,
      ),
      ambiguousPatterns: strings(j['ambiguousPatterns']),
      dualPath: DualPath(
        heading: dp['heading'] as String,
        body: dp['body'] as String,
        options: [
          for (final o in dp['options'] as List)
            DualPathOption(
              key: (o as Map<String, dynamic>)['key'] as String,
              label: o['label'] as String,
              subjects: o['subjects'] == null
                  ? const []
                  : strings(o['subjects']),
            ),
        ],
      ),
      softTierPatterns: strings(j['softTierPatterns']),
      softTierLine: j['softTierLine'] as String,
      medicalSubjects: strings(j['medicalSubjects']),
      medicalMinWeight: j['medicalMinWeight'] as int,
      medicalDisclaimer: j['medicalDisclaimer'] as String,
    );
  }

  final List<String> stripPrefixes;
  final List<String> stripDeterminers;
  final List<String> stripSuffixes;
  final int maxCandidates;
  final int maxStripPasses;
  final Set<String> contentStopwords;
  final Set<String> coreStopwords;
  final List<({String category, List<String> phrases})> crisisCategories;
  final CrisisInterstitial crisisInterstitial;
  final List<String> ambiguousPatterns;
  final DualPath dualPath;
  final List<String> softTierPatterns;
  final String softTierLine;
  final List<String> medicalSubjects;
  final int medicalMinWeight;
  final String medicalDisclaimer;

  final RegExp _apostrophes;
  final RegExp _prefixRe;
  final RegExp _determinerRe;
  final RegExp _suffixRe;
  final List<({String category, List<RegExp> regexes})> _crisisCompiled;
  final List<RegExp> _ambiguousCompiled;
  final List<RegExp> _softTierCompiled;

  static final _punctuation = RegExp(r'[^\w\s-]');
  static final _whitespace = RegExp(r'\s+');

  // ── 1. normalisation ─────────────────────────────────────────────────────

  String normaliseQuery(String? raw) {
    if (raw == null || raw.isEmpty) return '';
    return raw
        // JavaScript lowercases "İ" (U+0130) to "i" + a combining dot, per
        // Unicode SpecialCasing; Dart's toLowerCase gives a bare "i". Every
        // code point was compared (9 Oct 2026) and this is the ONLY lowercase
        // difference that changes a normalised query — all others produce
        // characters the next step turns into spaces on both sides.
        .replaceAll('İ', 'i̇')
        .toLowerCase()
        .replaceAll(_apostrophes, '') // remove, never substitute
        .replaceAll(_punctuation, ' ') // punctuation to space
        .replaceAll(_whitespace, ' ') // collapse whitespace
        .trim();
  }

  // ── 2. stripping and the candidate cascade ───────────────────────────────

  static String _escapeForRegex(String s) =>
      s.replaceAllMapped(RegExp(r'[.*+?^${}()|[\]\\]'), (m) => '\\${m[0]}');

  /// JavaScript's Array.prototype.sort is stable; Dart's List.sort is not.
  /// Ties keep their original order, exactly as on the website.
  static List<String> _stableSortedByLength(
    List<String> items, {
    required bool descending,
  }) {
    final indexed = [for (var i = 0; i < items.length; i++) (i, items[i])];
    indexed.sort((a, b) {
      final byLength = descending
          ? b.$2.length - a.$2.length
          : a.$2.length - b.$2.length;
      return byLength != 0 ? byLength : a.$1 - b.$1;
    });
    return [for (final e in indexed) e.$2];
  }

  static RegExp _buildStripRegex(List<String> patterns, {required bool start}) {
    final ordered = _stableSortedByLength(
      patterns,
      descending: true,
    ).map(_escapeForRegex).join('|');
    return start
        ? RegExp('^(?:$ordered)\\b\\s*')
        : RegExp('\\s*\\b(?:$ordered)\$');
  }

  String stripOnce(String s) {
    var out = s.replaceFirst(_prefixRe, '').trim();
    if (out.isEmpty) return s;
    out = out.replaceFirst(_suffixRe, '').trim();
    return out.isEmpty ? s : out;
  }

  String stripAll(String s) {
    var prev = s;
    var out = s;
    for (var i = 0; i < maxStripPasses; i++) {
      out = stripOnce(prev);
      final withoutDeterminer = out.replaceFirst(_determinerRe, '').trim();
      if (withoutDeterminer.isNotEmpty) out = withoutDeterminer;
      if (out == prev) break;
      prev = out;
    }
    return out.isEmpty ? s : out;
  }

  List<String> buildLookupCandidates(String normalised) {
    final out = <String>[];
    void push(String? s) {
      final v = (s ?? '').trim();
      if (v.isNotEmpty && !out.contains(v)) out.add(v);
    }

    push(normalised); // 1. exactly as typed

    // 2. every matching prefix, shortest first (retains the most words)
    final matching = _stableSortedByLength([
      for (final p in stripPrefixes)
        if (RegExp('^${_escapeForRegex(p)}\\b').hasMatch(normalised)) p,
    ], descending: false);
    for (final p in matching) {
      final rest = normalised.substring(p.length).trim();
      push(rest);
      push(rest.replaceFirst(_determinerRe, '').trim());
      push(rest.replaceFirst(_suffixRe, '').trim());
      if (out.length >= maxCandidates) break;
    }

    // 3. determiner / suffix variants of the raw query
    push(normalised.replaceFirst(_determinerRe, '').trim());
    push(normalised.replaceFirst(_suffixRe, '').trim());

    // 4. fully stripped, as a last resort
    push(stripAll(normalised));

    return out.length > maxCandidates ? out.sublist(0, maxCandidates) : out;
  }

  // ── 2b. content-token containment ────────────────────────────────────────

  List<String> contentTokens(String? s, {bool relaxed = false}) {
    final stop = relaxed ? coreStopwords : contentStopwords;
    return [
      for (final w in (s ?? '').split(' '))
        if (w.isNotEmpty && !stop.contains(w)) w,
    ];
  }

  String? bestContainedEmotion(
    String normalised,
    List<String> vocabulary, {
    bool relaxed = false,
  }) {
    final queryWords = contentTokens(normalised, relaxed: relaxed).toSet();
    if (queryWords.isEmpty) return null;

    String? best;
    var bestCount = 0;
    for (final emotion in vocabulary) {
      final words = contentTokens(emotion, relaxed: relaxed);
      if (words.isEmpty) continue;
      if (!words.every(queryWords.contains)) continue;
      if (best == null ||
          words.length > bestCount ||
          (words.length == bestCount && emotion.length > best.length)) {
        best = emotion;
        bestCount = words.length;
      }
    }
    return best;
  }

  // ── 3–7. crisis, dual path, soft tier, medical ───────────────────────────

  static RegExp _phraseRegex(String phrase) =>
      RegExp('(?:^|\\b)${_escapeForRegex(phrase)}(?:\\b|\$)');

  /// The crisis category this matches, or null. First category wins.
  String? checkCrisis(String normalised) {
    for (final c in _crisisCompiled) {
      if (c.regexes.any((re) => re.hasMatch(normalised))) return c.category;
    }
    return null;
  }

  bool checkAmbiguous(String normalised) =>
      _ambiguousCompiled.any((re) => re.hasMatch(normalised));

  bool checkSoftTier(String normalised) =>
      _softTierCompiled.any((re) => re.hasMatch(normalised));

  bool needsMedicalDisclaimer(List<MappingRow> rows) => rows.any(
    (r) =>
        medicalSubjects.contains(r.subjectSlug) && r.weight >= medicalMinWeight,
  );

  List<String> medicalDisclaimerSubjects(List<MappingRow> rows) => [
    for (final r in rows)
      if (medicalSubjects.contains(r.subjectSlug) &&
          r.weight >= medicalMinWeight)
        r.subjectSlug,
  ];

  // ── 8. the required flow, in the required order ──────────────────────────

  Future<EmotionSearchResult> resolve(
    String? rawQuery,
    EmotionLookup lookup, {
    String? dualPathAnswer,
    VocabularyLookup? vocabularyLookup,
  }) async {
    final normalised = normaliseQuery(rawQuery);
    if (normalised.isEmpty) return const EmotionSearchResult._(type: 'empty');

    // 1 — crisis intercept. Before the lookup. Always.
    final crisis = checkCrisis(normalised);
    if (crisis != null) {
      return EmotionSearchResult._(type: 'crisis', category: crisis);
    }

    // 2 — dual path, unless the user has already answered it
    final answered = dualPathAnswer != null && dualPathAnswer.isNotEmpty;
    if (!answered && checkAmbiguous(normalised)) {
      return const EmotionSearchResult._(type: 'dual_path');
    }
    if (dualPathAnswer == 'distressing') {
      return const EmotionSearchResult._(
        type: 'crisis',
        category: 'acute_crisis',
      );
    }

    // 3 — mapping lookup via the candidate cascade
    final candidates = buildLookupCandidates(normalised);
    var rows = <MappingRow>[];
    String? matched;
    for (final candidate in candidates) {
      rows = await lookup(candidate);
      if (rows.isNotEmpty) {
        matched = candidate;
        break;
      }
    }

    // 3b — content-token containment, only once every exact candidate missed
    String? containedVia;
    if (rows.isEmpty && vocabularyLookup != null) {
      final attempts = <({List<String> words, bool relaxed})>[];
      final strict = contentTokens(normalised);
      if (strict.isNotEmpty) {
        attempts.add((words: strict, relaxed: false));
      } else {
        final loose = contentTokens(normalised, relaxed: true);
        if (loose.isNotEmpty) attempts.add((words: loose, relaxed: true));
      }
      for (final attempt in attempts) {
        final vocabulary = await vocabularyLookup(attempt.words);
        final hit = bestContainedEmotion(
          normalised,
          vocabulary,
          relaxed: attempt.relaxed,
        );
        if (hit == null) continue;
        final containedRows = await lookup(hit);
        if (containedRows.isNotEmpty) {
          rows = containedRows;
          matched = hit;
          containedVia = hit;
          break;
        }
      }
    }

    if (rows.isEmpty) {
      return EmotionSearchResult._(
        type: 'no_results',
        normalised: normalised,
        triedCandidates: candidates,
        softTier: checkSoftTier(normalised) ? softTierLine : null,
      );
    }

    // 4 — soft tier and disclaimer decorate the results; they never replace them
    return EmotionSearchResult._(
      type: 'results',
      matchedEmotion: matched,
      via: containedVia != null ? 'containment' : 'cascade',
      rows: rows,
      softTier: checkSoftTier(normalised) ? softTierLine : null,
      medicalDisclaimer: needsMedicalDisclaimer(rows)
          ? medicalDisclaimer
          : null,
      medicalDisclaimerSubjects: medicalDisclaimerSubjects(rows),
    );
  }
}

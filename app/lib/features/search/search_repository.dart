import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/safety/emotion_safety.dart';

/// The universal search's results — healers, books, videos and subjects whose
/// names match what was typed.
class UniversalResults {
  const UniversalResults({
    this.healers = const [],
    this.books = const [],
    this.videos = const [],
    this.subjects = const [],
  });

  static const empty = UniversalResults();

  final List<Map<String, dynamic>> healers;
  final List<Map<String, dynamic>> books;
  final List<Map<String, dynamic>> videos;
  final List<Map<String, dynamic>> subjects;

  bool get isEmpty =>
      healers.isEmpty && books.isEmpty && videos.isEmpty && subjects.isEmpty;
}

/// The search's database reads — exactly the website's (EmotionSearch.js).
/// READ-ONLY. An interface so tests can count calls: a crisis phrase must
/// cause none.
abstract class SearchRepository {
  /// lookupExactEmotion: one indexed equality hit, weight-descending.
  Future<List<MappingRow>> exactEmotion(String emotion);

  /// lookupEmotionVocabulary: stored emotions sharing a word with the query.
  Future<List<String>> vocabulary(List<String> words);

  /// The forward-substring fallback: stored emotions that contain the whole
  /// query as a word or phrase.
  Future<List<MappingRow>> forwardSubstring(String normalised);

  /// The universal search on the trimmed text.
  Future<UniversalResults> universal(String term);
}

class SupabaseSearchRepository implements SearchRepository {
  SupabaseSearchRepository(this._db);

  final SupabaseClient _db;

  static List<MappingRow> _rows(List<Map<String, dynamic>> data) => [
    for (final r in data)
      MappingRow(r['subject_slug'] as String, (r['weight'] as num).toInt()),
  ];

  @override
  Future<List<MappingRow>> exactEmotion(String emotion) async => _rows(
    await _db
        .from('emotion_mappings')
        .select('subject_slug, weight')
        .eq('emotion', emotion)
        .order('weight', ascending: false),
  );

  static const _vocabTokenLimit = 8;
  static const _vocabRowLimit = 400;
  static final _safeToken = RegExp(r'^[a-z0-9-]+$');

  @override
  Future<List<String>> vocabulary(List<String> words) async {
    final safe = words
        .where(_safeToken.hasMatch)
        .take(_vocabTokenLimit)
        .toList();
    if (safe.isEmpty) return const [];
    final data = await _db
        .from('emotion_mappings')
        .select('emotion')
        .or(safe.map((w) => 'emotion.ilike.%$w%').join(','))
        .limit(_vocabRowLimit);
    return {for (final r in data) r['emotion'] as String}.toList();
  }

  @override
  Future<List<MappingRow>> forwardSubstring(String normalised) async {
    final data = await _db
        .from('emotion_mappings')
        .select('emotion, subject_slug, weight')
        .ilike('emotion', '%$normalised%')
        .order('weight', ascending: false)
        .limit(60);
    final bounded = wholeWordPattern(normalised);
    return _rows([
      for (final r in data)
        if (bounded.hasMatch(r['emotion'] as String)) r,
    ]);
  }

  @override
  Future<UniversalResults> universal(String term) async {
    final like = '%$term%';
    final results = await Future.wait([
      _db
          .from('healers')
          .select('id, name, healer_slug, tier, image_urls')
          .ilike('name', like)
          .limit(4),
      _db
          .from('books')
          .select('id, title, slug, mock_cover_url')
          .ilike('title', like)
          .limit(4),
      _db
          .from('videos')
          .select('id, title, slug, platform_url')
          .ilike('title', like)
          .limit(3),
      _db
          .from('subjects')
          .select('id, name, slug')
          .ilike('name', like)
          .limit(3),
    ]);
    return UniversalResults(
      healers: results[0],
      books: results[1],
      videos: results[2],
      subjects: results[3],
    );
  }
}

/// EmotionSearch.js → wholeWordRegex(): the phrase as a whole word or phrase,
/// bounded by a space, a hyphen, or either end — case-insensitive.
RegExp wholeWordPattern(String phrase) {
  final escaped = phrase.replaceAllMapped(
    RegExp(r'[.*+?^${}()|[\]\\]'),
    (m) => '\\${m[0]}',
  );
  return RegExp('(?:^|[\\s-])$escaped(?:[\\s-]|\$)', caseSensitive: false);
}

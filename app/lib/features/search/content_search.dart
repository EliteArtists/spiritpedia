import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/safety/emotion_safety.dart';
import '../../data/models.dart';
import 'search_repository.dart';

/// The search's second engine: plain search by name and title, beside the
/// feelings engine (the emotion mapping). It only ever runs after the crisis
/// gates have passed — the controller sees to that.

/// Where a search box is: Discover searches everything; Videos and Books
/// search only their own type.
enum SearchScope {
  all,
  videos,
  books;

  /// The kinds this box shows.
  List<ResultKind> get kinds => switch (this) {
    SearchScope.all => ResultKind.values,
    SearchScope.videos => const [ResultKind.videos],
    SearchScope.books => const [ResultKind.books],
  };

  static SearchScope fromName(String? name) =>
      values.where((s) => s.name == name).firstOrNull ?? SearchScope.all;
}

/// The groups results come in, in the order they are shown. Channels and
/// apps are never mixed in with teachers.
enum ResultKind {
  teachers('Teachers'),
  channels('Channels & Apps'),
  videos('Videos'),
  books('Books'),
  subjects('Subjects'),
  courses('Courses & Programmes'),
  retreats('Retreats & Live Events'),
  downloads('Downloads & Audio'),
  memberships('Memberships'),
  freeResources('Free Resources');

  const ResultKind(this.label);

  final String label;
}

/// Plain-search results by kind. Values are the app's models: [Healer],
/// [Video], [Book], [Subject], [Offering], [FreeResource].
class ContentResults {
  const ContentResults([this.byKind = const {}]);

  static const empty = ContentResults();

  final Map<ResultKind, List<Object>> byKind;

  List<T> of<T>(ResultKind kind) => [...?byKind[kind]?.whereType<T>()];

  bool get isEmpty => byKind.values.every((l) => l.isEmpty);

  Iterable<ResultKind> get kinds =>
      ResultKind.values.where((k) => byKind[k]?.isNotEmpty ?? false);
}

/// Videos and books in the subjects a feeling maps to — what the feelings
/// engine finds on the Videos and Books tabs, and what Suggests chooses from.
class FeelingMatches {
  const FeelingMatches({this.videos = const [], this.books = const []});

  static const empty = FeelingMatches();

  final List<Video> videos;
  final List<Book> books;

  bool get isEmpty => videos.isEmpty && books.isEmpty;
}

/// The plain engine's reads. READ-ONLY, anon key, public tables.
abstract class ContentSearch {
  /// Name and title matches for [term], [perKind] at most of each kind, only
  /// the kinds [scope] shows.
  Future<ContentResults> search(
    String term, {
    required SearchScope scope,
    required int perKind,
  });

  /// "See all": more of one kind.
  Future<List<Object>> more(String term, ResultKind kind);

  /// Videos and books in [subjects] — the feeling's strongest subjects.
  Future<FeelingMatches> forSubjects(
    List<String> subjects, {
    required SearchScope scope,
  });
}

/// The words of a plain search: lower case, letters and digits, without the
/// little words ("I feel", "the") that would stop a title matching.
List<String> searchWords(String term) {
  const little = {
    'i', 'im', 'feel', 'feeling', 'a', 'an', 'the', 'and', 'or', 'of', 'to', //
    'in', 'on', 'for', 'my', 'me', 'is', 'am', 'are', 'so', 'very', 'with',
  };
  final words = [
    for (final w in term.toLowerCase().split(RegExp(r'[^a-z0-9]+')))
      if (w.isNotEmpty && !little.contains(w)) w,
  ];
  // Five words is plenty to pin a title down.
  return words.take(5).toList();
}

class SupabaseContentSearch implements ContentSearch {
  SupabaseContentSearch(this._db);

  final SupabaseClient _db;

  static const _healerColumns =
      'id, name, healer_slug, tier, entity_type, image_urls, subject_slugs';
  static const _videoColumns =
      'id, title, slug, platform_url, healer_slug, subject_slugs';
  // No shop links: Suggests chooses by relevance, and never sees them.
  static const _bookColumns =
      'id, title, slug, author, mock_cover_url, healer_slug, subject_slugs';
  static const _offeringColumns =
      'id, title, slug, image_url, price, product_type, healer_id, '
      'start_date, end_date, subject_slugs';
  static const _resourceColumns =
      'id, title, slug, image_url, resource_type, healer_id, subject_slugs';

  String get _liveWindow {
    final today = DateTime.now().toIso8601String().substring(0, 10);
    return 'end_date.is.null,end_date.gte.$today';
  }

  /// Every word somewhere in [column] — so "september astrology forecast"
  /// finds "September Astrology Forecast 2026" — or the whole term when it
  /// has no words of its own.
  PostgrestFilterBuilder<T> _matching<T>(
    PostgrestFilterBuilder<T> q,
    String column,
    String term,
  ) {
    final words = searchWords(term);
    if (words.isEmpty) return q.ilike(column, '%${term.trim()}%');
    for (final w in words) {
      q = q.ilike(column, '%$w%');
    }
    return q;
  }

  Future<List<Object>> _healers(String term, int limit) async => [
    for (final r in await _matching(
      _db.from('healers').select(_healerColumns),
      'name',
      term,
    ).order('name').limit(limit))
      Healer.fromJson(r),
  ];

  Future<List<Object>> _videos(String term, int limit) async => [
    for (final r in await _matching(
      _db.from('videos').select(_videoColumns),
      'title',
      term,
    ).order('id', ascending: false).limit(limit))
      Video.fromJson(r),
  ];

  Future<List<Object>> _books(String term, int limit) async => [
    for (final r in await _matching(
      _db.from('books').select(_bookColumns),
      'title',
      term,
    ).order('created_at', ascending: false).limit(limit))
      Book.fromJson(r),
  ];

  Future<List<Object>> _subjects(String term, int limit) async => [
    for (final r in await _matching(
      _db.from('subjects').select('slug, name'),
      'name',
      term,
    ).order('name').limit(limit))
      Subject.fromJson(r),
  ];

  Future<List<Object>> _offerings(String term, int limit) async => [
    for (final r in await _matching(
      _db
          .from('courses')
          .select(_offeringColumns)
          .eq('is_active', true)
          .or(_liveWindow),
      'title',
      term,
    ).order('created_at', ascending: false).limit(limit))
      Offering.fromJson(r),
  ];

  Future<List<Object>> _resources(String term, int limit) async => [
    for (final r in await _matching(
      _db
          .from('free_resources')
          .select(_resourceColumns)
          .eq('is_active', true)
          .or(_liveWindow),
      'title',
      term,
    ).order('created_at', ascending: false).limit(limit))
      FreeResource.fromJson(r),
  ];

  @override
  Future<ContentResults> search(
    String term, {
    required SearchScope scope,
    required int perKind,
  }) async {
    final kinds = scope.kinds.toSet();
    bool any(Iterable<ResultKind> ks) => ks.any(kinds.contains);
    Future<List<Object>> none() async => const [];

    // Fetch a wider pool than is shown and keep the best matches: matching
    // every word is loose ("power now" also finds "…Know…Powers…"), and
    // the newest are not always the best. Healers and offerings are split
    // into several groups, so fetch more of those.
    final pool = perKind < 12 ? 12 : perKind;
    final results = await Future.wait([
      any([ResultKind.teachers, ResultKind.channels])
          ? _healers(term, pool * 2)
          : none(),
      kinds.contains(ResultKind.videos) ? _videos(term, pool) : none(),
      kinds.contains(ResultKind.books) ? _books(term, pool) : none(),
      kinds.contains(ResultKind.subjects) ? _subjects(term, pool) : none(),
      any(_offeringKinds) ? _offerings(term, pool * 3) : none(),
      kinds.contains(ResultKind.freeResources)
          ? _resources(term, pool)
          : none(),
    ]).then((lists) => [for (final l in lists) byTitleMatch(l, term)]);
    return groupResults(
      healers: results[0].cast(),
      videos: results[1].cast(),
      books: results[2].cast(),
      subjects: results[3].cast(),
      offerings: results[4].cast(),
      resources: results[5].cast(),
      perKind: perKind,
      kinds: kinds,
    );
  }

  static const _moreLimit = 60;

  @override
  Future<List<Object>> more(String term, ResultKind kind) async {
    final grouped = await switch (kind) {
      ResultKind.teachers || ResultKind.channels => _healers(
        term,
        _moreLimit * 2,
      ).then((h) => groupResults(healers: h.cast(), perKind: _moreLimit)),
      ResultKind.videos => _videos(
        term,
        _moreLimit,
      ).then((v) => groupResults(videos: v.cast(), perKind: _moreLimit)),
      ResultKind.books => _books(
        term,
        _moreLimit,
      ).then((b) => groupResults(books: b.cast(), perKind: _moreLimit)),
      ResultKind.subjects => _subjects(
        term,
        _moreLimit,
      ).then((s) => groupResults(subjects: s.cast(), perKind: _moreLimit)),
      ResultKind.freeResources => _resources(
        term,
        _moreLimit,
      ).then((r) => groupResults(resources: r.cast(), perKind: _moreLimit)),
      _ => _offerings(
        term,
        _moreLimit * 3,
      ).then((o) => groupResults(offerings: o.cast(), perKind: _moreLimit)),
    };
    return grouped.byKind[kind] ?? const [];
  }

  @override
  Future<FeelingMatches> forSubjects(
    List<String> subjects, {
    required SearchScope scope,
  }) async {
    if (subjects.isEmpty) return FeelingMatches.empty;
    final kinds = scope.kinds;
    final results = await Future.wait([
      kinds.contains(ResultKind.videos)
          ? _db
                .from('videos')
                .select(_videoColumns)
                .overlaps('subject_slugs', subjects)
                .order('id', ascending: false)
                .limit(40)
          : Future.value(const <Map<String, dynamic>>[]),
      kinds.contains(ResultKind.books)
          ? _db
                .from('books')
                .select(_bookColumns)
                .overlaps('subject_slugs', subjects)
                .order('created_at', ascending: false)
                .limit(40)
          : Future.value(const <Map<String, dynamic>>[]),
    ]);
    return FeelingMatches(
      videos: [for (final r in results[0]) Video.fromJson(r)],
      books: [for (final r in results[1]) Book.fromJson(r)],
    );
  }
}

const _offeringKinds = [
  ResultKind.courses,
  ResultKind.retreats,
  ResultKind.downloads,
  ResultKind.memberships,
];

/// Sorts raw matches into their groups: teachers apart from channels and
/// apps, offerings by product type (an unset type is a course, as on the
/// website). Pure, so it can be tested.
ContentResults groupResults({
  List<Healer> healers = const [],
  List<Video> videos = const [],
  List<Book> books = const [],
  List<Subject> subjects = const [],
  List<Offering> offerings = const [],
  List<FreeResource> resources = const [],
  required int perKind,
  Set<ResultKind>? kinds,
}) {
  List<Object> cap(Iterable<Object> items) => items.take(perKind).toList();
  final all = <ResultKind, List<Object>>{
    ResultKind.teachers: cap(healers.where((h) => !h.isPlatform)),
    ResultKind.channels: cap(healers.where((h) => h.isPlatform)),
    ResultKind.videos: cap(videos),
    ResultKind.books: cap(books),
    ResultKind.subjects: cap(subjects),
    ResultKind.courses: cap(
      offerings.where((o) => o.productType == null || o.kind == 'course'),
    ),
    ResultKind.retreats: cap(offerings.where((o) => o.kind == 'retreat')),
    ResultKind.downloads: cap(offerings.where((o) => o.kind == 'download')),
    ResultKind.memberships: cap(offerings.where((o) => o.kind == 'membership')),
    ResultKind.freeResources: cap(resources),
  };
  return ContentResults({
    for (final e in all.entries)
      if ((kinds == null || kinds.contains(e.key)) && e.value.isNotEmpty)
        e.key: e.value,
  });
}

/// For a [SearchRepository] that is not also a [ContentSearch] (the tests'
/// counting repositories): the older universal search, read as plain-search
/// results. Every match counts as a teacher — it carries no entity type.
class UniversalContentSearch implements ContentSearch {
  UniversalContentSearch(this._repository);

  final SearchRepository _repository;

  @override
  Future<ContentResults> search(
    String term, {
    required SearchScope scope,
    required int perKind,
  }) async {
    final u = await _repository.universal(term);
    return groupResults(
      healers: [for (final h in u.healers) Healer.fromJson(h)],
      books: [for (final b in u.books) Book.fromJson(b)],
      videos: [for (final v in u.videos) Video.fromJson(v)],
      subjects: [for (final s in u.subjects) Subject.fromJson(s)],
      perKind: perKind,
      kinds: scope.kinds.toSet(),
    );
  }

  @override
  Future<List<Object>> more(String term, ResultKind kind) async =>
      (await search(term, scope: SearchScope.all, perKind: 60)).byKind[kind] ??
      const [];

  @override
  Future<FeelingMatches> forSubjects(
    List<String> subjects, {
    required SearchScope scope,
  }) async => FeelingMatches.empty;
}

/// [items] with the best title matches first ([relevance] on the title
/// alone); equal matches keep their order. Pure, so it can be tested.
List<Object> byTitleMatch(List<Object> items, String term) {
  String title(Object o) => switch (o) {
    Healer h => h.name,
    Video v => v.title,
    Book b => b.title,
    Subject s => s.name,
    Offering o => o.title,
    FreeResource r => r.title,
    _ => '',
  };
  final scored =
      [
        for (final (i, item) in items.indexed)
          (
            item,
            relevance(title: title(item), subjectSlugs: const [], term: term),
            i,
          ),
      ]..sort((a, b) {
        final by = b.$2.compareTo(a.$2);
        return by != 0 ? by : a.$3.compareTo(b.$3);
      });
  return [for (final (item, _, _) in scored) item];
}

// ── Spiritpedia Suggests ─────────────────────────────────────────────────────

/// One video and one book, chosen by relevance alone: how well the title
/// matches what was typed, then how strongly it fits the feeling's subjects.
/// Nothing else — no shop links, prices, ranking scores or partner data are
/// even read (see the columns above).
class Suggestions {
  const Suggestions({this.video, this.book});

  static const none = Suggestions();

  final Video? video;
  final Book? book;

  bool get isEmpty => video == null && book == null;
}

/// How relevant an item is: its title against [term], and its subjects
/// against the feeling's [rows]. Pure, so it can be tested.
double relevance({
  required String title,
  required List<String> subjectSlugs,
  required String term,
  List<MappingRow> rows = const [],
}) {
  final t = title.toLowerCase();
  final q = term.trim().toLowerCase();
  final words = searchWords(term);
  var score = 0.0;
  if (q.isNotEmpty && t == q) {
    score += 1000;
  } else if (q.isNotEmpty && t.contains(q)) {
    score += 600;
  }
  if (words.isNotEmpty) {
    final hits = words.where(t.contains).length;
    score += 300 * hits / words.length;
  }
  // The feeling: the mapping's weight for each subject the item carries.
  for (final r in rows) {
    if (subjectSlugs.contains(r.subjectSlug)) score += r.weight;
  }
  return score;
}

/// The best video and book among [videos] and [books]; ties go to the earlier
/// (newer) one. Nothing with no relevance at all is suggested.
Suggestions suggest({
  required String term,
  required List<MappingRow> rows,
  required List<Video> videos,
  required List<Book> books,
}) {
  T? best<T>(
    List<T> items,
    String Function(T) title,
    List<String> Function(T) subjects,
  ) {
    T? top;
    var topScore = 0.0;
    for (final item in items) {
      final s = relevance(
        title: title(item),
        subjectSlugs: subjects(item),
        term: term,
        rows: rows,
      );
      if (s > topScore) {
        top = item;
        topScore = s;
      }
    }
    return top;
  }

  return Suggestions(
    video: best<Video>(videos, (v) => v.title, (v) => v.subjectSlugs),
    book: best<Book>(books, (b) => b.title, (b) => b.subjectSlugs),
  );
}

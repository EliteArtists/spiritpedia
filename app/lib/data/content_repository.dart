import 'dart:math';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'models.dart';

/// Everything the explore screens read. READ-ONLY: the anon key can read every
/// content table and write none (migration 0007).
///
/// An interface so widget tests can supply fixed content without a network.
abstract class ContentRepository {
  Future<List<Subject>> subjects();
  Future<List<Healer>> healers();
  Future<List<Publisher>> publishers();

  /// Home → Explore More. [subject] null = View All.
  Future<List<Book>> books({String? subject});
  Future<List<FreeResource>> featuredFreeResources({String? subject});
  Future<List<Offering>> liveOfferings({String? subject});

  /// Subject page.
  Future<List<Healer>> healersForSubject(String subject);
  Future<List<FreeResource>> freeResourcesForSubject(String subject);

  /// Videos.
  Future<List<Video>> newestVideos({int limit = 24});
  Future<List<Video>> videoPool({List<String>? subjects, int poolSize = 60});
  Future<List<Video>> mixedVideos({int poolSize = 60});
  Future<List<Video>> videosForSubject(String subject);

  /// Detail pages. null = no such row (the page shows "not found").
  Future<Book?> book(String slug);
  Future<Video?> video(String slug);
  Future<Offering?> offering(String slug);
  Future<FreeResource?> freeResource(String slug);

  /// A teacher's page: their books and videos (by the text healer_slug), and
  /// their live offerings and free resources (by the bigint healer_id).
  Future<List<Book>> booksByHealers(List<String> healerSlugs);
  Future<List<Video>> videosByHealer(String healerSlug);
  Future<List<Offering>> liveOfferingsForHealer(int healerId);
  Future<List<FreeResource>> liveFreeResourcesForHealer(int healerId);

  /// A publisher's linked authors (healer ids), from publisher_healers.
  Future<List<int>> publisherAuthorIds(String publisherId);

  /// My Library: the saved rows, by slug.
  Future<List<Book>> booksBySlugs(List<String> slugs);
  Future<List<Video>> videosBySlugs(List<String> slugs);
  Future<List<Offering>> offeringsBySlugs(List<String> slugs);
  Future<List<FreeResource>> freeResourcesBySlugs(List<String> slugs);
}

class SupabaseContentRepository implements ContentRepository {
  SupabaseContentRepository(this._db, {Random? random})
    : _random = random ?? Random();

  final SupabaseClient _db;
  final Random _random;

  /// PostgREST caps every response at 1,000 rows WITHOUT saying so. Anything
  /// that can exceed it is paged — and ordered by something unique as the
  /// final tie-break, because the bulk import gave thousands of rows the same
  /// created_at and ties resolve differently per query. (README → "The five
  /// things that will bite you first".)
  static const _page = 1000;

  Future<List<Map<String, dynamic>>> _all(
    PostgrestTransformBuilder<PostgrestList> Function() ordered,
  ) async {
    final rows = <Map<String, dynamic>>[];
    for (var from = 0; ; from += _page) {
      final batch = await ordered().range(from, from + _page - 1);
      rows.addAll(batch);
      if (batch.length < _page) break;
    }
    return rows;
  }

  /// Courses and free resources surface only while live: active, and either
  /// evergreen (no end_date) or not yet past it. Recomputed per request.
  String get _liveWindow {
    final today = DateTime.now().toIso8601String().substring(0, 10);
    return 'end_date.is.null,end_date.gte.$today';
  }

  @override
  Future<List<Subject>> subjects() async {
    final rows = await _db.from('subjects').select('slug, name').order('name');
    return [for (final r in rows) Subject.fromJson(r)];
  }

  @override
  Future<List<Healer>> healers() async {
    final rows = await _all(() => _db.from('healers').select().order('id'));
    return [for (final r in rows) Healer.fromJson(r)];
  }

  @override
  Future<List<Publisher>> publishers() async {
    // The embedded aggregate counts each publisher's authors in one round trip.
    final rows = await _db
        .from('publishers')
        .select('*, publisher_healers(count)')
        .order('name');
    return [for (final r in rows) Publisher.fromJson(r)];
  }

  PostgrestFilterBuilder<PostgrestList> _withSubject(
    PostgrestFilterBuilder<PostgrestList> q,
    String? subject,
  ) => subject == null ? q : q.contains('subject_slugs', [subject]);

  @override
  Future<List<Book>> books({String? subject}) async {
    final rows = await _all(
      () => _withSubject(
        _db.from('books').select(),
        subject,
      ).order('created_at', ascending: false).order('id', ascending: false),
    );
    return [for (final r in rows) Book.fromJson(r)];
  }

  @override
  Future<List<FreeResource>> featuredFreeResources({String? subject}) async {
    final rows = await _all(
      () => _withSubject(
        _db
            .from('free_resources')
            .select()
            .eq('is_featured', true)
            .eq('is_active', true)
            .or(_liveWindow),
        subject,
      ).order('created_at', ascending: false).order('id', ascending: false),
    );
    return [for (final r in rows) FreeResource.fromJson(r)];
  }

  @override
  Future<List<Offering>> liveOfferings({String? subject}) async {
    final rows = await _all(
      () => _withSubject(
        _db.from('courses').select().eq('is_active', true).or(_liveWindow),
        subject,
      ).order('created_at', ascending: false).order('id', ascending: false),
    );
    return [for (final r in rows) Offering.fromJson(r)];
  }

  @override
  Future<List<Healer>> healersForSubject(String subject) async {
    final rows = await _all(
      () => _db
          .from('healers')
          .select()
          .contains('subject_slugs', [subject])
          .order('id'),
    );
    return [for (final r in rows) Healer.fromJson(r)];
  }

  @override
  Future<List<FreeResource>> freeResourcesForSubject(String subject) async {
    final rows = await _all(
      () => _db
          .from('free_resources')
          .select()
          .contains('subject_slugs', [subject])
          .eq('is_active', true)
          .or(_liveWindow)
          .order('created_at', ascending: false)
          .order('id', ascending: false),
    );
    return [for (final r in rows) FreeResource.fromJson(r)];
  }

  static const _videoColumns =
      'id, title, slug, platform_url, healer_slug, subject_slugs';

  @override
  Future<List<Video>> newestVideos({int limit = 24}) async {
    final rows = await _db
        .from('videos')
        .select(_videoColumns)
        .order('id', ascending: false)
        .limit(limit);
    return [for (final r in rows) Video.fromJson(r)];
  }

  /// A random window of [poolSize] videos across [subjects] (any of them), so
  /// each visit shows a different slice — the website's pillar shelves.
  @override
  Future<List<Video>> videoPool({
    List<String>? subjects,
    int poolSize = 60,
  }) async {
    PostgrestFilterBuilder<T> scoped<T>(PostgrestFilterBuilder<T> q) =>
        subjects == null ? q : q.overlaps('subject_slugs', subjects);

    final total = await scoped(_db.from('videos').count());
    final span = max(0, total - poolSize);
    final offset = span > 0 ? _random.nextInt(span) : 0;
    final rows = await scoped(_db.from('videos').select(_videoColumns))
        .order('id', ascending: false)
        .range(offset, offset + poolSize - 1);
    return [for (final r in rows) Video.fromJson(r)];
  }

  /// "Watch & Learn — a little of everything": a random window of the whole
  /// catalogue (the website uses an offset below 1,000).
  @override
  Future<List<Video>> mixedVideos({int poolSize = 60}) async {
    final offset = _random.nextInt(1000);
    final rows = await _db
        .from('videos')
        .select(_videoColumns)
        .order('id')
        .range(offset, offset + poolSize - 1);
    return [for (final r in rows) Video.fromJson(r)];
  }

  @override
  Future<List<Video>> videosForSubject(String subject) async {
    final rows = await _all(
      () => _db
          .from('videos')
          .select(_videoColumns)
          .contains('subject_slugs', [subject])
          .order('id', ascending: false),
    );
    return [for (final r in rows) Video.fromJson(r)];
  }

  Future<Map<String, dynamic>?> _one(String table, String slug) =>
      _db.from(table).select().eq('slug', slug).maybeSingle();

  @override
  Future<Book?> book(String slug) async {
    final r = await _one('books', slug);
    return r == null ? null : Book.fromJson(r);
  }

  @override
  Future<Video?> video(String slug) async {
    final r = await _one('videos', slug);
    return r == null ? null : Video.fromJson(r);
  }

  @override
  Future<Offering?> offering(String slug) async {
    final r = await _one('courses', slug);
    return r == null ? null : Offering.fromJson(r);
  }

  @override
  Future<FreeResource?> freeResource(String slug) async {
    final r = await _one('free_resources', slug);
    return r == null ? null : FreeResource.fromJson(r);
  }

  @override
  Future<List<Book>> booksByHealers(List<String> healerSlugs) async {
    if (healerSlugs.isEmpty) return const [];
    final rows = await _all(
      () => _db
          .from('books')
          .select()
          .inFilter('healer_slug', healerSlugs)
          .order('created_at', ascending: false)
          .order('id', ascending: false),
    );
    return [for (final r in rows) Book.fromJson(r)];
  }

  @override
  Future<List<Video>> videosByHealer(String healerSlug) async {
    final rows = await _all(
      () => _db
          .from('videos')
          .select(_videoColumns)
          .eq('healer_slug', healerSlug)
          .order('id', ascending: false),
    );
    return [for (final r in rows) Video.fromJson(r)];
  }

  @override
  Future<List<Offering>> liveOfferingsForHealer(int healerId) async {
    final rows = await _db
        .from('courses')
        .select()
        .eq('healer_id', healerId)
        .eq('is_active', true)
        .or(_liveWindow)
        .order('created_at', ascending: false);
    return [for (final r in rows) Offering.fromJson(r)];
  }

  @override
  Future<List<FreeResource>> liveFreeResourcesForHealer(int healerId) async {
    final rows = await _db
        .from('free_resources')
        .select()
        .eq('healer_id', healerId)
        .eq('is_active', true)
        .or(_liveWindow)
        .order('created_at', ascending: false);
    return [for (final r in rows) FreeResource.fromJson(r)];
  }

  @override
  Future<List<int>> publisherAuthorIds(String publisherId) async {
    final rows = await _db
        .from('publisher_healers')
        .select('healer_id')
        .eq('publisher_id', publisherId);
    return [for (final r in rows) (r['healer_id'] as num).toInt()];
  }

  Future<List<Map<String, dynamic>>> _bySlugs(
    String table,
    List<String> slugs, {
    String columns = '*',
  }) async => slugs.isEmpty
      ? const []
      : await _db.from(table).select(columns).inFilter('slug', slugs);

  @override
  Future<List<Book>> booksBySlugs(List<String> slugs) async => [
    for (final r in await _bySlugs('books', slugs)) Book.fromJson(r),
  ];

  @override
  Future<List<Video>> videosBySlugs(List<String> slugs) async => [
    for (final r in await _bySlugs('videos', slugs, columns: _videoColumns))
      Video.fromJson(r),
  ];

  @override
  Future<List<Offering>> offeringsBySlugs(List<String> slugs) async => [
    for (final r in await _bySlugs('courses', slugs)) Offering.fromJson(r),
  ];

  @override
  Future<List<FreeResource>> freeResourcesBySlugs(List<String> slugs) async => [
    for (final r in await _bySlugs('free_resources', slugs))
      FreeResource.fromJson(r),
  ];
}

/// Healer names by id and by slug, for cards whose rows only carry a key.
class HealerDirectory {
  HealerDirectory(List<Healer> healers)
    : _byId = {for (final h in healers) h.id: h},
      _bySlug = {
        for (final h in healers)
          if (h.slug.isNotEmpty) h.slug: h,
      };

  final Map<int, Healer> _byId;
  final Map<String, Healer> _bySlug;

  Healer? byId(int? id) => id == null ? null : _byId[id];
  Healer? bySlug(String? slug) => slug == null ? null : _bySlug[slug];

  /// Video shelves for one subject, grouped per teacher — the website's
  /// filtered view (VideoShelves.jsx → loadFiltered), capped per teacher.
  List<({Healer healer, List<Video> videos, int total})> videosByTeacher(
    List<Video> videos, {
    int minVideos = 3,
    int perShelf = 12,
  }) {
    final groups = <String, List<Video>>{};
    for (final v in videos) {
      final slug = v.healerSlug;
      if (slug == null) continue;
      (groups[slug] ??= []).add(v);
    }
    final out =
        [
          for (final e in groups.entries)
            if (e.value.length >= minVideos && bySlug(e.key) != null)
              (
                healer: bySlug(e.key)!,
                videos: e.value.take(perShelf).toList(),
                total: e.value.length,
              ),
        ]..sort((a, b) {
          final byCount = b.total - a.total;
          return byCount != 0
              ? byCount
              : a.healer.name.compareTo(b.healer.name);
        });
    return out;
  }
}

import 'package:spiritpedia/data/content_repository.dart';
import 'package:spiritpedia/data/models.dart';

/// Fixed content for widget tests — no network.
class FakeContentRepository implements ContentRepository {
  FakeContentRepository({this.fail = false});

  final bool fail;

  static Healer healer(
    int id,
    String slug,
    String name,
    String? tier, {
    String? entity,
    List<String> subjects = const ['meditation'],
    int? born,
    int? died,
  }) => Healer(
    id: id,
    slug: slug,
    name: name,
    tier: tier,
    entityType: entity,
    subjectSlugs: subjects,
    imageUrls: const [],
    bio: '$name teaches presence.',
    birthYear: born,
    deathYear: died,
  );

  final List<Healer> allHealers = [
    healer(
      1,
      'eckhart-tolle',
      'Eckhart Tolle',
      'superhero',
      subjects: ['meditation', 'consciousness'],
    ),
    healer(2, 'wim-hof', 'Wim Hof', 'superhero', subjects: ['breathwork']),
    healer(3, 'rising-one', 'Rising One', 'luminary'),
    healer(4, 'local-one', 'Local One', 'local_hero', subjects: ['breathwork']),
    healer(5, 'no-tier', 'No Tier Yet', null),
    healer(
      6,
      'alan-watts',
      'Alan Watts',
      'ascended_master',
      born: 1915,
      died: 1973,
    ),
    healer(7, 'a-channel', 'A Channel', 'luminary', entity: 'channel'),
  ];

  static Video makeVideo(
    int id,
    String healer, {
    List<String> subjects = const ['meditation'],
  }) => Video(
    id: id,
    slug: 'video-$id',
    title: 'Video $id by $healer',
    platformUrl: 'https://www.youtube.com/watch?v=abcdefghij$id'.substring(
      0,
      43,
    ),
    healerSlug: healer,
    subjectSlugs: subjects,
  );

  /// Eight videos by one teacher and three by another — the cap must thin it.
  late final List<Video> allVideos = [
    for (var i = 1; i <= 8; i++) makeVideo(i, 'eckhart-tolle'),
    for (var i = 9; i <= 11; i++)
      makeVideo(i, 'wim-hof', subjects: ['breathwork', 'meditation']),
  ];

  void _check() {
    if (fail) throw Exception('offline');
  }

  @override
  Future<List<Subject>> subjects() async => const [
    Subject(slug: 'breathwork', name: 'Breathwork'),
    Subject(slug: 'meditation', name: 'Meditation'),
    Subject(slug: 'consciousness', name: 'Consciousness'),
  ];

  @override
  Future<List<Healer>> healers() async {
    _check();
    return allHealers;
  }

  @override
  Future<List<Publisher>> publishers() async => const [
    Publisher(
      id: 'p1',
      slug: 'hay-house',
      name: 'Hay House',
      authorCount: 18,
      subjectSlugs: ['meditation'],
    ),
  ];

  @override
  Future<List<Book>> books({String? subject}) async => const [
    Book(
      id: 1,
      slug: 'the-power-of-now',
      title: 'The Power of Now',
      subjectSlugs: ['meditation'],
    ),
  ];

  @override
  Future<List<FreeResource>> featuredFreeResources({String? subject}) async =>
      const [];

  @override
  Future<List<Offering>> liveOfferings({String? subject}) async => const [
    Offering(id: 'o1', slug: 'breath-course', title: 'Breath Course'),
    Offering(
      id: 'o2',
      slug: 'bali-retreat',
      title: 'Bali Retreat',
      productType: 'retreat',
    ),
  ];

  @override
  Future<List<Healer>> healersForSubject(String subject) async => [
    for (final h in allHealers)
      if (h.subjectSlugs.contains(subject)) h,
  ];

  @override
  Future<List<FreeResource>> freeResourcesForSubject(String subject) async =>
      const [];

  @override
  Future<List<Video>> newestVideos({int limit = 24}) async =>
      allVideos.reversed.take(limit).toList();

  @override
  Future<List<Video>> videoPool({
    List<String>? subjects,
    int poolSize = 60,
  }) async => [
    for (final v in allVideos)
      if (subjects == null || v.subjectSlugs.any(subjects.contains)) v,
  ];

  @override
  Future<List<Video>> mixedVideos({int poolSize = 60}) async => allVideos;

  @override
  Future<List<Video>> videosForSubject(String subject) async => [
    for (final v in allVideos)
      if (v.subjectSlugs.contains(subject)) v,
  ];

  static const amazonBook = Book(
    id: 1,
    slug: 'the-power-of-now',
    title: 'The Power of Now',
    description: 'A guide to spiritual enlightenment.',
    amazonUrl: 'https://www.amazon.com/Power-Now/dp/1577314808?ref_=x',
    goodreadsUrl: 'https://www.goodreads.com/book/show/6708',
    healerSlug: 'eckhart-tolle',
    subjectSlugs: ['meditation'],
  );

  static const course = Offering(
    id: 'o1',
    slug: 'breath-course',
    title: 'Breath Course',
    description: 'Ten weeks of breath.',
    url: 'https://example.com/course',
    price: '£99',
    healerId: 2,
    subjectSlugs: ['breathwork'],
  );

  static const resource = FreeResource(
    id: 'r1',
    slug: 'free-meditation',
    title: 'Free Meditation',
    url: 'https://example.com/free',
    healerId: 1,
  );

  @override
  Future<Book?> book(String slug) async =>
      slug == amazonBook.slug ? amazonBook : null;

  @override
  Future<Video?> video(String slug) async =>
      allVideos.where((v) => v.slug == slug).firstOrNull;

  @override
  Future<Offering?> offering(String slug) async =>
      slug == course.slug ? course : null;

  @override
  Future<FreeResource?> freeResource(String slug) async =>
      slug == resource.slug ? resource : null;

  @override
  Future<List<Book>> booksByHealers(List<String> healerSlugs) async => [
    if (healerSlugs.contains('eckhart-tolle')) amazonBook,
  ];

  @override
  Future<List<Video>> videosByHealer(String healerSlug) async => [
    for (final v in allVideos)
      if (v.healerSlug == healerSlug) v,
  ];

  @override
  Future<List<Offering>> liveOfferingsForHealer(int healerId) async => [
    if (healerId == course.healerId) course,
  ];

  @override
  Future<List<FreeResource>> liveFreeResourcesForHealer(int healerId) async => [
    if (healerId == resource.healerId) resource,
  ];

  @override
  Future<List<int>> publisherAuthorIds(String publisherId) async => [1];

  @override
  Future<List<Book>> booksBySlugs(List<String> slugs) async => [
    if (slugs.contains(amazonBook.slug)) amazonBook,
  ];

  @override
  Future<List<Video>> videosBySlugs(List<String> slugs) async => [
    for (final v in allVideos)
      if (slugs.contains(v.slug)) v,
  ];

  @override
  Future<List<Offering>> offeringsBySlugs(List<String> slugs) async => [
    if (slugs.contains(course.slug)) course,
  ];

  @override
  Future<List<FreeResource>> freeResourcesBySlugs(List<String> slugs) async => [
    if (slugs.contains(resource.slug)) resource,
  ];
}

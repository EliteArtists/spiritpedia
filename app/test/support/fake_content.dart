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
    int? place,
    String? availability,
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
    placeId: place,
    availabilityType: availability,
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
    // In person in London only; online from Manchester.
    healer(
      4,
      'local-one',
      'Local One',
      'local_hero',
      subjects: ['breathwork'],
      place: 2643743,
      availability: 'Local Only (In-Person)',
    ),
    healer(
      5,
      'no-tier',
      'No Tier Yet',
      null,
      place: 2643123,
      availability: 'Local & Online Sessions',
    ),
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

  /// Overridable: Explore More's free resources, and offerings beyond the
  /// two every test has.
  List<FreeResource> featured = const [];
  List<Offering> moreOfferings = const [];

  @override
  Future<List<FreeResource>> featuredFreeResources({String? subject}) async =>
      featured;

  @override
  Future<List<Offering>> liveOfferings({String? subject}) async => [
    const Offering(id: 'o1', slug: 'breath-course', title: 'Breath Course'),
    const Offering(
      id: 'o2',
      slug: 'bali-retreat',
      title: 'Bali Retreat',
      productType: 'retreat',
    ),
    ...moreOfferings,
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

  /// Retreats with dates: one to come, one that has ended.
  static const upcomingRetreat = Offering(
    id: 'o9',
    slug: 'lake-retreat',
    title: 'Lake Retreat',
    url: 'https://example.com/lake',
    productType: 'retreat',
    healerId: 2,
    startDate: '2099-09-18',
    endDate: '2099-09-20',
  );
  static const pastRetreat = Offering(
    id: 'o8',
    slug: 'old-retreat',
    title: 'Old Retreat',
    url: 'https://example.com/old',
    productType: 'retreat',
    healerId: 2,
    startDate: '2020-07-23',
    endDate: '2020-08-02',
  );

  @override
  Future<Offering?> offering(String slug) async => [
    course,
    upcomingRetreat,
    pastRetreat,
  ].where((o) => o.slug == slug).firstOrNull;

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

  /// The towns the fakes know.
  static const london = Place(
    id: 2643743,
    name: 'London',
    region: 'England',
    country: 'United Kingdom',
    lat: 51.5085,
    lng: -0.1257,
  );
  static const croydon = Place(
    id: 2652053,
    name: 'Croydon',
    region: 'England',
    country: 'United Kingdom',
    lat: 51.3816,
    lng: -0.0981,
  );
  static const manchester = Place(
    id: 2643123,
    name: 'Manchester',
    region: 'England',
    country: 'United Kingdom',
    lat: 53.4809,
    lng: -2.2374,
  );
  List<Place> places = const [london, croydon, manchester];

  @override
  Future<List<Place>> placesByIds(List<int> ids) async => [
    for (final p in places)
      if (ids.contains(p.id)) p,
  ];

  @override
  Future<List<Place>> searchPlaces(String query) async => [
    for (final p in places)
      if (query.trim().length >= 2 &&
          p.name.toLowerCase().startsWith(query.trim().toLowerCase()))
        p,
  ];

  /// What "Use my location" finds.
  Place? nearest = london;

  @override
  Future<Place?> nearestPlace(double lat, double lng) async => nearest;

  /// Overridable: each teacher's content subjects, by slug.
  Map<String, List<List<String>>> teacherContent = const {};

  @override
  Future<Map<String, List<List<String>>>> teacherContentSubjects() async =>
      teacherContent;

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

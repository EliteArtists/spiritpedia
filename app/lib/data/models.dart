// The content tables, as the app reads them. Field names follow the database
// (README → "Database Structure"); only what the app displays is parsed.
//
// Two different keys point at a healer, and they are not interchangeable:
// videos and books carry a text `healer_slug`; courses and free resources carry
// a bigint `healer_id`.

import '../core/format/dates.dart';

List<String> _strings(Object? v) => v is List
    ? [
        for (final s in v)
          if (s is String && s.isNotEmpty) s,
      ]
    : const [];

String? _text(Object? v) {
  if (v is! String) return null;
  final t = v.trim();
  // 'NULL' is a legacy sentinel some rows carry instead of a real null.
  return t.isEmpty || t == 'NULL' ? null : t;
}

class Subject {
  const Subject({required this.slug, required this.name});

  factory Subject.fromJson(Map<String, dynamic> j) => Subject(
    slug: j['slug'] as String,
    name: (j['name'] as String?) ?? j['slug'] as String,
  );

  final String slug;
  final String name;
}

class Healer {
  const Healer({
    required this.id,
    required this.slug,
    required this.name,
    this.tier,
    this.entityType,
    this.bio,
    this.imageUrls = const [],
    this.subjectSlugs = const [],
    this.birthYear,
    this.deathYear,
    this.availabilityType,
    this.country,
    this.city,
    this.bookingUrl,
    this.contactEmail,
    this.contactPhone,
    this.websiteUrl,
    this.youtubeUrl,
    this.instagramUrl,
    this.facebookUrl,
    this.twitterUrl,
    this.tiktokUrl,
    this.placeId,
    this.official = false,
  });

  factory Healer.fromJson(Map<String, dynamic> j) => Healer(
    id: (j['id'] as num).toInt(),
    slug: (j['healer_slug'] as String?) ?? '',
    name: (j['name'] as String?) ?? '',
    tier: j['tier'] as String?,
    entityType: j['entity_type'] as String?,
    bio: _text(j['bio']),
    imageUrls: _strings(j['image_urls']),
    subjectSlugs: _strings(j['subject_slugs']),
    birthYear: (j['birth_year'] as num?)?.toInt(),
    deathYear: (j['death_year'] as num?)?.toInt(),
    availabilityType: _text(j['availability_type']),
    country: _text(j['country']),
    city: _text(j['city']),
    bookingUrl: _text(j['booking_url']),
    contactEmail: _text(j['contact_email']),
    contactPhone: _text(j['contact_phone']),
    websiteUrl: _text(j['website_url']),
    youtubeUrl: _text(j['youtube_url']),
    instagramUrl: _text(j['instagram_url']),
    facebookUrl: _text(j['facebook_url']),
    twitterUrl: _text(j['twitter_url']),
    tiktokUrl: _text(j['tiktok_url']),
    placeId: (j['place_id'] as num?)?.toInt(),
    official: j['official'] == true,
  );

  final int id;
  final String slug;
  final String name;
  final String? tier;
  final String? entityType;
  final String? bio;
  final List<String> imageUrls;
  final List<String> subjectSlugs;
  final int? birthYear;
  final int? deathYear;
  final String? availabilityType;
  final String? country;
  final String? city;
  final String? bookingUrl;
  final String? contactEmail;
  final String? contactPhone;
  final String? websiteUrl;
  final String? youtubeUrl;
  final String? instagramUrl;
  final String? facebookUrl;
  final String? twitterUrl;
  final String? tiktokUrl;

  /// Their town (public.places, migration 0019), from city and country.
  final int? placeId;

  /// Spiritpedia's own profile (healers.official, migration 0020): the
  /// Official badge, first among the channels.
  final bool official;

  /// Channels, apps and organisations get their own shelf; NULL is an
  /// individual. The website's rule too (web/utils/listings.js).
  bool get isPlatform =>
      entityType == 'channel' ||
      entityType == 'app' ||
      entityType == 'organisation';

  /// What a platform is, in a word: "App", "Organisation" or "Channel".
  String get platformLabel => switch (entityType) {
    'app' => 'App',
    'organisation' => 'Organisation',
    _ => 'Channel',
  };

  bool get isAscendedMaster => tier == 'ascended_master';

  /// Offers sessions online — the website's own test (healer profile:
  /// availability_type.includes('Online')).
  bool get offersOnline =>
      availabilityType?.toLowerCase().contains('online') ?? false;
}

/// A town (public.places, migration 0019): the only kind of location
/// Spiritpedia keeps — a member's area, a practitioner's town. Its
/// coordinates are the town centre's, never anyone's own.
class Place {
  const Place({
    required this.id,
    required this.name,
    required this.country,
    this.region,
    this.lat = 0,
    this.lng = 0,
  });

  factory Place.fromJson(Map<String, dynamic> j) => Place(
    id: (j['id'] as num).toInt(),
    name: (j['name'] as String?) ?? '',
    region: _text(j['region']),
    country: (j['country'] as String?) ?? '',
    lat: (j['lat'] as num?)?.toDouble() ?? 0,
    lng: (j['lng'] as num?)?.toDouble() ?? 0,
  );

  Map<String, Object?> toJson() => {
    'id': id,
    'name': name,
    'region': region,
    'country': country,
    'lat': lat,
    'lng': lng,
  };

  final int id;
  final String name;
  final String? region;
  final String country;
  final double lat;
  final double lng;

  /// "London, United Kingdom".
  String get label => '$name, $country';

  /// "London, England, United Kingdom" — to tell towns of one name apart.
  String get fullLabel =>
      [name, if (region != null && region != name) region!, country].join(', ');
}

class Book {
  const Book({
    required this.id,
    required this.slug,
    required this.title,
    this.author,
    this.description,
    this.coverUrl,
    this.amazonUrl,
    this.goodreadsUrl,
    this.worldOfBooksUrl,
    this.healerSlug,
    this.subjectSlugs = const [],
  });

  factory Book.fromJson(Map<String, dynamic> j) => Book(
    id: (j['id'] as num).toInt(),
    slug: (j['slug'] as String?) ?? '',
    title: (j['title'] as String?) ?? '',
    author: _text(j['author']),
    description: _text(j['description']),
    coverUrl: _text(j['mock_cover_url']),
    amazonUrl: _text(j['amazon_url']),
    goodreadsUrl: _text(j['goodreads_url']),
    worldOfBooksUrl: _text(j['worldofbooks_url']),
    healerSlug: _text(j['healer_slug']),
    subjectSlugs: _strings(j['subject_slugs']),
  );

  final int id;
  final String slug;
  final String title;
  final String? author;
  final String? description;
  final String? coverUrl;
  final String? amazonUrl;
  final String? goodreadsUrl;
  final String? worldOfBooksUrl;
  final String? healerSlug;
  final List<String> subjectSlugs;
}

class Video {
  const Video({
    required this.id,
    required this.slug,
    required this.title,
    this.platformUrl,
    this.healerSlug,
    this.subjectSlugs = const [],
  });

  factory Video.fromJson(Map<String, dynamic> j) => Video(
    id: (j['id'] as num).toInt(),
    slug: (j['slug'] as String?) ?? '',
    title: (j['title'] as String?) ?? '',
    platformUrl: _text(j['platform_url']),
    healerSlug: _text(j['healer_slug']),
    subjectSlugs: _strings(j['subject_slugs']),
  );

  final int id;
  final String slug;
  final String title;
  final String? platformUrl;
  final String? healerSlug;
  final List<String> subjectSlugs;

  /// The YouTube id, exactly as the website's video page parses it — null for
  /// anything that is not a YouTube link (no embed, link out instead).
  String? get youtubeId => youtubeIdFrom(platformUrl);

  /// Thumbnails are derived, not stored — the same URL the website's cards use.
  String? get thumbnailUrl {
    final id = youtubeId;
    return id == null ? null : 'https://img.youtube.com/vi/$id/mqdefault.jpg';
  }
}

final _youtubeId = RegExp(r'(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})');

/// web/app/videos/[slug]/page.js → getYouTubeId().
String? youtubeIdFrom(String? url) =>
    url == null ? null : _youtubeId.firstMatch(url)?.group(1);

/// A row of `courses` — every paid offering, split by product_type.
class Offering {
  const Offering({
    required this.id,
    required this.slug,
    required this.title,
    this.description,
    this.url,
    this.price,
    this.imageUrl,
    this.productType,
    this.healerId,
    this.startDate,
    this.endDate,
    this.subjectSlugs = const [],
  });

  factory Offering.fromJson(Map<String, dynamic> j) => Offering(
    id: '${j['id']}',
    slug: (j['slug'] as String?) ?? '',
    title: (j['title'] as String?) ?? '',
    description: _text(j['description']),
    url: _text(j['course_url']),
    price: _text(j['price']),
    imageUrl: _text(j['image_url']),
    productType: _text(j['product_type']),
    healerId: (j['healer_id'] as num?)?.toInt(),
    startDate: _text(j['start_date']),
    endDate: _text(j['end_date']),
    subjectSlugs: _strings(j['subject_slugs']),
  );

  final String id; // a UUID
  final String slug;
  final String title;
  final String? description;
  final String? url;
  final String? price;
  final String? imageUrl;
  final String? productType;
  final int? healerId;
  final String? startDate;
  final String? endDate;
  final List<String> subjectSlugs;

  /// An unset product_type is a course, so legacy rows still surface.
  String get kind => productType ?? 'course';

  DateTime? get starts => parseDay(startDate);
  DateTime? get ends => parseDay(endDate);

  /// Dates are shown for retreats, and for any other offering that has a
  /// start date (a course or membership beginning on a day). An end date alone
  /// on a course is its listing's expiry, not an event, so it is not shown.
  bool get showsDates => starts != null || (kind == 'retreat' && ends != null);

  DatePhase get phase =>
      showsDates ? datePhase(starts, ends) : DatePhase.undated;

  /// "18–20 Sep 2026" — or null when this offering shows no dates.
  String? get when => showsDates ? dateRange(starts, ends) : null;

  /// The line on a card: the dates, "On now · until 11 Oct 2026" once it has
  /// begun, or "Ended · …" (lists hide those; a saved one can still show).
  String? get whenLine {
    final range = when;
    if (range == null) return null;
    return switch (phase) {
      DatePhase.onNow =>
        ends == today()
            ? 'On now · ends today'
            : 'On now · until ${shortDate(ends!)}',
      DatePhase.ended => 'Ended · $range',
      _ => range,
    };
  }

  /// The website's card call-to-action (OfferingCard.js → OfferingCta).
  String get ctaLabel => switch (productType) {
    'download' => 'Get Download',
    'membership' => 'Join Now →',
    'retreat' => 'Book Place →',
    _ => 'Enrol Now →',
  };
}

class FreeResource {
  const FreeResource({
    required this.id,
    required this.slug,
    required this.title,
    this.description,
    this.url,
    this.imageUrl,
    this.resourceType,
    this.healerId,
    this.subjectSlugs = const [],
  });

  factory FreeResource.fromJson(Map<String, dynamic> j) => FreeResource(
    id: '${j['id']}',
    slug: (j['slug'] as String?) ?? '',
    title: (j['title'] as String?) ?? '',
    description: _text(j['description']),
    url: _text(j['resource_url']),
    imageUrl: _text(j['image_url']),
    resourceType: _text(j['resource_type']),
    healerId: (j['healer_id'] as num?)?.toInt(),
    subjectSlugs: _strings(j['subject_slugs']),
  );

  final String id; // a UUID
  final String slug;
  final String title;
  final String? description;
  final String? url;
  final String? imageUrl;
  final String? resourceType;
  final int? healerId;
  final List<String> subjectSlugs;

  /// The website's badge text (FreeResourceCard.js → formatType).
  String get typeLabel =>
      resourceType == null ? 'Free' : resourceType!.replaceAll('_', ' ');
}

class Publisher {
  const Publisher({
    required this.id,
    required this.slug,
    required this.name,
    this.description,
    this.websiteUrl,
    this.logoUrl,
    this.foundedYear,
    this.subjectSlugs = const [],
    this.authorCount = 0,
  });

  factory Publisher.fromJson(Map<String, dynamic> j) {
    // `publisher_healers(count)` arrives as [{count: N}].
    final counts = j['publisher_healers'];
    final count = counts is List && counts.isNotEmpty
        ? (counts.first as Map)['count']
        : 0;
    return Publisher(
      id: '${j['id']}',
      slug: (j['slug'] as String?) ?? '',
      name: (j['name'] as String?) ?? '',
      description: _text(j['description']),
      websiteUrl: _text(j['website_url']),
      logoUrl: _text(j['logo_url']),
      foundedYear: (j['founded_year'] as num?)?.toInt(),
      subjectSlugs: _strings(j['subject_slugs']),
      authorCount: (count as num?)?.toInt() ?? 0,
    );
  }

  final String id;
  final String slug;
  final String name;
  final String? description;
  final String? websiteUrl;
  final String? logoUrl;
  final int? foundedYear;
  final List<String> subjectSlugs;
  final int authorCount;
}

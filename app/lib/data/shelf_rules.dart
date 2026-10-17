// The website's shelf rules, as pure functions so they can be tested. Each one
// names the web file it mirrors; change both together.

import 'dart:math' as math;

import 'models.dart';

/// The five pillars and their subjects, in the website's order
/// (web/components/SubjectPills.js → SUBJECT_TAXONOMY).
const subjectPillars = <String, List<String>>{
  'Emotional Healing': [
    'shadow-work',
    'self-healing',
    'eft-tapping',
    'breathwork',
    'reiki',
    'energy-medicine',
    'conscious-relationships',
    'quantum-touch',
  ],
  'Consciousness': [
    'consciousness',
    'conscious-science',
    'spiritual-awakening',
    'non-duality',
    'meditation',
    'mindfulness',
    'astrology',
    'spirituality',
  ],
  'Manifestation & Creation': [
    'manifestation',
    'law-of-attraction',
    'soul-purpose',
    'human-design',
    'life-coaching',
  ],
  'Mystical & Spiritual Exploration': [
    'akashic-records',
    'mediumship-spirits',
    'death-the-afterlife',
    'dreamwork',
    'mysticism',
    'shamanism',
  ],
  'Body & Energy': [
    'tai-chi',
    'qi-gong',
    'yoga',
    'ayurveda',
    'sound-healing',
    'plant-medicine',
    'homeopathy',
  ],
};

/// The Videos tab's pillar shelves, in the website's order
/// (web/utils/videoShelves.js → VIDEO_PILLARS).
const videoPillarOrder = [
  'Consciousness',
  'Emotional Healing',
  'Manifestation & Creation',
  'Body & Energy',
  'Mystical & Spiritual Exploration',
];

/// Which pillar a subject belongs to, if any.
String? pillarOf(String? subjectSlug) {
  if (subjectSlug == null) return null;
  for (final entry in subjectPillars.entries) {
    if (entry.value.contains(subjectSlug)) return entry.key;
  }
  return null;
}

const defaultAvatar = 'https://placehold.co/400x400?text=Spiritpedia';

/// web/components/HomePageContent.js → pickPortrait(). The same healer shows the
/// same photo for the same subject filter, and the "View All" state still
/// varies across healers because the healer's slug is part of the seed.
String pickPortrait(List<String> imageUrls, String? subjectSlug, String seed) {
  if (imageUrls.isEmpty) return defaultAvatar;
  final key = '${subjectSlug ?? ''}$seed';
  var sum = 0;
  for (final unit in key.codeUnits) {
    sum += unit;
  }
  return imageUrls[sum % imageUrls.length];
}

/// The billboard's portrait — the first non-empty one (HeroBillboard.js).
String? billboardPortrait(Healer h) =>
    h.imageUrls.isEmpty ? null : h.imageUrls.first;

bool _isPremium(Healer h) =>
    h.tier == 'superhero' ||
    h.tier == 'ascended_master' ||
    h.tier == 'luminary';

/// The home page's healer shelves (HomePageContent.js).
class HealerShelves {
  HealerShelves(List<Healer> healers)
    : superheroes = [
        for (final h in healers)
          if (!h.isPlatform && h.tier == 'superhero') h,
      ],
      luminaries = [
        for (final h in healers)
          if (!h.isPlatform && h.tier == 'luminary') h,
      ],
      ascendedMasters = [
        for (final h in healers)
          if (!h.isPlatform && h.tier == 'ascended_master') h,
      ],
      // SAFE FALLBACK: anything not a premium tier — NULL included — shows here,
      // so no practitioner silently vanishes. Channels, apps and organisations
      // are left out: they have their own shelf (as on the website).
      localHeroes = [
        for (final h in healers)
          if (!h.isPlatform && !_isPremium(h)) h,
      ],
      // Spiritpedia Official first, the rest in the order they came.
      platforms = [
        for (final h in healers)
          if (h.isPlatform && h.official) h,
        for (final h in healers)
          if (h.isPlatform && !h.official) h,
      ];

  final List<Healer> superheroes;
  final List<Healer> luminaries;
  final List<Healer> ascendedMasters;
  final List<Healer> localHeroes;
  final List<Healer> platforms;

  /// Three Superheroes, then one Ascended Master, repeating; whichever runs
  /// out first, the rest of the other follows so nobody is dropped.
  List<Healer> get billboard {
    final out = <Healer>[];
    var s = 0;
    var a = 0;
    while (s < superheroes.length || a < ascendedMasters.length) {
      for (var k = 0; k < 3 && s < superheroes.length; k++) {
        out.add(superheroes[s++]);
      }
      if (a < ascendedMasters.length) out.add(ascendedMasters[a++]);
    }
    return out;
  }
}

/// Narrow any collection to the active subject (null = View All).
List<T> bySubject<T>(
  List<T> rows,
  String? subjectSlug,
  List<String> Function(T) slugsOf,
) => subjectSlug == null
    ? rows
    : [
        for (final r in rows)
          if (slugsOf(r).contains(subjectSlug)) r,
      ];

/// web/utils/lifespan.js → formatLifespan().
String? formatLifespan(Healer h) {
  if (h.birthYear == null) return null;
  return h.deathYear != null
      ? '${h.birthYear} — ${h.deathYear}'
      : 'b. ${h.birthYear}';
}

/// HeroBillboard.js → truncateBio(): 120 characters, cut at a word.
String truncateBio(String? bio, {int max = 120}) {
  if (bio == null || bio.isEmpty) return '';
  if (bio.length <= max) return bio;
  final cut = bio.substring(0, max);
  final lastSpace = cut.lastIndexOf(' ');
  return '${(lastSpace > 0 ? cut.substring(0, lastSpace) : cut).trimRight()}…';
}

/// Offerings split by product_type, as the website's shelves do.
({
  List<Offering> courses,
  List<Offering> retreats,
  List<Offering> downloads,
  List<Offering> memberships,
})
splitOfferings(List<Offering> offerings) => (
  courses: [
    for (final o in offerings)
      if (o.productType == null || o.productType == 'course') o,
  ],
  retreats: soonestFirst([
    for (final o in offerings)
      if (o.productType == 'retreat') o,
  ]),
  downloads: [
    for (final o in offerings)
      if (o.productType == 'download') o,
  ],
  memberships: [
    for (final o in offerings)
      if (o.productType == 'membership') o,
  ],
);

/// Retreats by when they happen: the soonest first (one on now counts from
/// its start), then any without dates in the order they came. Stable, so
/// retreats on the same day keep the website's order.
List<Offering> soonestFirst(List<Offering> retreats) {
  final indexed = [...retreats.indexed];
  indexed.sort((a, b) {
    final x = a.$2.starts ?? a.$2.ends;
    final y = b.$2.starts ?? b.$2.ends;
    if (x == null || y == null) {
      if (x != y) return x == null ? 1 : -1;
      return a.$1.compareTo(b.$1);
    }
    final c = x.compareTo(y);
    return c != 0 ? c : a.$1.compareTo(b.$1);
  });
  return [for (final (_, o) in indexed) o];
}

/// Videos per shelf, and the most any one teacher may have in it.
const videoShelfSize = 20;
const maxVideosPerTeacher = 2;

/// The app's video-shelf rule: walk the pool in order and keep a video only
/// while its teacher has fewer than [perTeacher] in the shelf, so one prolific
/// channel cannot fill a row. Videos with no teacher count as their own.
List<Video> capPerTeacher(
  List<Video> pool, {
  int size = videoShelfSize,
  int perTeacher = maxVideosPerTeacher,
}) {
  final counts = <String, int>{};
  final out = <Video>[];
  for (final v in pool) {
    if (out.length >= size) break;
    final key = v.healerSlug ?? 'video:${v.id}';
    final n = counts[key] ?? 0;
    if (n >= perTeacher) continue;
    counts[key] = n + 1;
    out.add(v);
  }
  return out;
}

/// The Books tab's version of [capPerTeacher]: at most [perAuthor] books by
/// one author in a shelf — the teacher's slug when the book has one, the
/// stored author otherwise.
List<Book> capPerAuthor(
  List<Book> pool, {
  int size = videoShelfSize,
  int perAuthor = maxVideosPerTeacher,
}) {
  final counts = <String, int>{};
  final out = <Book>[];
  for (final b in pool) {
    if (out.length >= size) break;
    final key = b.healerSlug ?? b.author?.toLowerCase() ?? 'book:${b.id}';
    final n = counts[key] ?? 0;
    if (n >= perAuthor) continue;
    counts[key] = n + 1;
    out.add(b);
  }
  return out;
}

/// Every [step]th item, then the next offset, and so on — a stable mix of a
/// newest-first list, so the mixed shelf is not just the newest again.
List<T> spreadOut<T>(List<T> items, {int step = 7}) => [
  for (var offset = 0; offset < step; offset++)
    for (var i = offset; i < items.length; i += step) items[i],
];

/// How much of a book or video is about [pillar]: the share of its subjects
/// that belong to it. Most items carry several subjects across pillars, so a
/// pillar shelf leads with what is mostly about that pillar.
double pillarFit(List<String> subjectSlugs, String pillar) {
  if (subjectSlugs.isEmpty) return 0;
  final inPillar = subjectPillars[pillar] ?? const [];
  return subjectSlugs.where(inPillar.contains).length / subjectSlugs.length;
}

/// The items of [pool] about [pillar] (any of its subjects), best fit first
/// and otherwise in [pool]'s order, leaving out any in [shown].
List<T> pillarCandidates<T>(
  List<T> pool,
  String pillar, {
  required List<String> Function(T) subjects,
  required Object Function(T) id,
  Set<Object> shown = const {},
}) {
  final scored = <(T, double, int)>[
    for (final (i, item) in pool.indexed)
      if (!shown.contains(id(item)))
        if (pillarFit(subjects(item), pillar) case final fit when fit > 0)
          (item, fit, i),
  ];
  scored.sort((a, b) {
    final byFit = b.$2.compareTo(a.$2);
    return byFit != 0 ? byFit : a.$3.compareTo(b.$3);
  });
  return [for (final (item, _, _) in scored) item];
}

// ── Tailoring (docs/personalisation.md) ─────────────────────────────────────
// "More of" ranks in three levels; "Never show" hides. Change the doc with
// these.

/// The subjects sharing a pillar with any of [chosen], [chosen] left out:
/// level 2 of the ranking.
Set<String> pillarMates(Set<String> chosen) => {
  for (final slugs in subjectPillars.values)
    if (slugs.any(chosen.contains))
      for (final s in slugs)
        if (!chosen.contains(s)) s,
};

/// Where an item ranks for someone who chose [chosen]: 0 if it carries a
/// chosen subject, 1 if it carries another subject of the same pillar
/// ([mates], from [pillarMates]), 2 otherwise.
int interestLevel(
  List<String> subjects,
  Set<String> chosen, [
  Set<String>? mates,
]) {
  if (subjects.any(chosen.contains)) return 0;
  if (subjects.any((mates ?? pillarMates(chosen)).contains)) return 1;
  return 2;
}

/// The "More of" ranking: [chosen] subjects first (those carrying more of
/// them first), then the rest of their pillars, then everything else — each
/// level in [items]' own order. Nothing is removed. No choice, no change.
List<T> byInterest<T>(
  List<T> items,
  Set<String> chosen,
  List<String> Function(T) subjects,
) {
  if (chosen.isEmpty) return items;
  final mates = pillarMates(chosen);
  final scored = [
    for (final (i, item) in items.indexed)
      (
        item,
        interestLevel(subjects(item), chosen, mates),
        subjects(item).where(chosen.contains).length,
        i,
      ),
  ];
  scored.sort((a, b) {
    if (a.$2 != b.$2) return a.$2.compareTo(b.$2);
    if (a.$3 != b.$3) return b.$3.compareTo(a.$3);
    return a.$4.compareTo(b.$4);
  });
  return [for (final (item, _, _, _) in scored) item];
}

/// Discover's "For You": levels 1 and 2 of [byInterest], at most [size].
List<T> forYou<T>(
  List<T> items,
  Set<String> chosen,
  List<String> Function(T) subjects, {
  int size = videoShelfSize,
}) {
  if (chosen.isEmpty) return const [];
  final mates = pillarMates(chosen);
  return byInterest(
    [
      for (final item in items)
        if (interestLevel(subjects(item), chosen, mates) < 2) item,
    ],
    chosen,
    subjects,
  ).take(size).toList();
}

/// "Never show", for an item (video, book, course, retreat, download,
/// membership, free resource): hidden if ANY of its subjects is hidden —
/// unless it also carries a [moreOf] subject: "More of" beats "Never show".
bool isHiddenItem(
  List<String> subjects,
  Set<String> hidden, [
  Set<String> moreOf = const {},
]) =>
    hidden.isNotEmpty &&
    subjects.any(hidden.contains) &&
    !subjects.any(moreOf.contains);

/// "Never show", for a teacher, channel or publisher, by their subjects:
/// hidden only if EVERY subject they cover is hidden. No subjects, never
/// hidden. (A teacher whose content is all hidden goes too: [Hiding].)
bool isHiddenTeacher(List<String> subjects, Set<String> hidden) =>
    hidden.isNotEmpty && subjects.isNotEmpty && subjects.every(hidden.contains);

/// The teachers and channels whose content — videos, books, courses,
/// retreats, downloads, memberships and free resources — is ALL hidden for
/// someone, by the item rule: [content] is each teacher's items' subjects,
/// by teacher slug. A teacher with no content is not in it.
Set<String> teachersWithAllContentHidden(
  Map<String, List<List<String>>> content,
  Set<String> hidden, [
  Set<String> moreOf = const {},
]) => hidden.isEmpty
    ? const {}
    : {
        for (final MapEntry(key: slug, value: items) in content.entries)
          if (items.isNotEmpty &&
              items.every((s) => isHiddenItem(s, hidden, moreOf)))
            slug,
      };

/// Everything "Never show" hides for one person (docs/personalisation.md).
class Hiding {
  const Hiding({
    this.subjects = const {},
    this.moreOf = const {},
    this.emptyTeachers = const {},
  });

  static const none = Hiding();

  /// Never show.
  final Set<String> subjects;

  /// More of: an item carrying one of these is shown whatever else it has.
  final Set<String> moreOf;

  /// Teacher slugs whose every piece of content is hidden
  /// ([teachersWithAllContentHidden]): no empty profiles.
  final Set<String> emptyTeachers;

  bool get isEmpty => subjects.isEmpty;

  /// As if [slug] were not hidden — a hidden subject's page, after "Show
  /// anyway". Teachers then follow the subject rule only.
  Hiding showing(String slug) =>
      Hiding(subjects: {...subjects}..remove(slug), moreOf: moreOf);

  bool item(List<String> subjects) =>
      isHiddenItem(subjects, this.subjects, moreOf);

  bool teacher(Healer h) =>
      isHiddenTeacher(h.subjectSlugs, subjects) ||
      (subjects.isNotEmpty && emptyTeachers.contains(h.slug));

  /// Whether [o] is hidden: teachers and publishers by the teacher rule,
  /// everything else by the item rule.
  bool call(Object o) => switch (o) {
    Healer h => teacher(h),
    Publisher p => isHiddenTeacher(p.subjectSlugs, subjects),
    _ => item(subjectsOf(o)),
  };

  /// [items] without the hidden ones, by the item rule.
  List<T> items<T>(List<T> items, List<String> Function(T) subjectsOf) =>
      isEmpty
      ? items
      : [
          for (final i in items)
            if (!item(subjectsOf(i))) i,
        ];

  /// [items] without the hidden ones, each by its own rule.
  List<T> visible<T extends Object>(List<T> items) => isEmpty
      ? items
      : [
          for (final i in items)
            if (!call(i)) i,
        ];
}

/// Any content model's subjects (the app's models all carry them).
List<String> subjectsOf(Object item) => switch (item) {
  Healer h => h.subjectSlugs,
  Video v => v.subjectSlugs,
  Book b => b.subjectSlugs,
  Offering o => o.subjectSlugs,
  FreeResource r => r.subjectSlugs,
  Publisher p => p.subjectSlugs,
  Subject s => [s.slug],
  _ => const [],
};

/// [pillars] (default: the pill row's order) with those holding a chosen
/// subject first, most chosen subjects first; the rest keep their order.
/// A pillar whose every subject is in [hidden] is left out.
List<String> pillarsByInterest(
  Set<String> chosen, [
  List<String>? pillars,
  Set<String> hidden = const {},
]) {
  final order = [
    for (final p in pillars ?? subjectPillars.keys.toList())
      if (!(subjectPillars[p] ?? const <String>[]).every(hidden.contains)) p,
  ];
  if (chosen.isEmpty) return order;
  int hits(String p) =>
      (subjectPillars[p] ?? const []).where(chosen.contains).length;
  final indexed = [...order.indexed];
  indexed.sort((a, b) {
    final c = hits(b.$2).compareTo(hits(a.$2));
    return c != 0 ? c : a.$1.compareTo(b.$1);
  });
  return [for (final (_, p) in indexed) p];
}

// ── Your area (Practitioners Near You) ──────────────────────────────────────

/// How far "near" reaches for in-person sessions.
const nearRadiusKm = 50.0;

/// Kilometres between two towns' centres (the haversine formula).
double distanceKm(Place a, Place b) {
  const r = 6371.0;
  double rad(double d) => d * math.pi / 180;
  final dLat = rad(b.lat - a.lat);
  final dLng = rad(b.lng - a.lng);
  final h =
      math.pow(math.sin(dLat / 2), 2) +
      math.cos(rad(a.lat)) *
          math.cos(rad(b.lat)) *
          math.pow(math.sin(dLng / 2), 2);
  return 2 * r * math.asin(math.min(1, math.sqrt(h)));
}

/// Practitioners Near You for someone in [area]: those within
/// [nearRadiusKm] who see people in person, nearest first; then everyone
/// who offers sessions online, from anywhere, in [practitioners]' order.
/// Local-only practitioners elsewhere are left out. [places] are the
/// practitioners' towns, by id. No area: [practitioners] as they are.
({List<Healer> near, List<Healer> online}) nearYou(
  List<Healer> practitioners,
  Place? area,
  Map<int, Place> places,
) {
  if (area == null) return (near: practitioners, online: const []);
  final near = <(Healer, double, int)>[];
  for (final (i, h) in practitioners.indexed) {
    final town = places[h.placeId];
    if (town == null) continue;
    final km = distanceKm(area, town);
    if (km <= nearRadiusKm) near.add((h, km, i));
  }
  near.sort((a, b) {
    final c = a.$2.compareTo(b.$2);
    return c != 0 ? c : a.$3.compareTo(b.$3);
  });
  final nearOnes = [for (final (h, _, _) in near) h];
  final shown = {for (final h in nearOnes) h.id};
  return (
    near: nearOnes,
    online: [
      for (final h in practitioners)
        if (h.offersOnline && !shown.contains(h.id)) h,
    ],
  );
}

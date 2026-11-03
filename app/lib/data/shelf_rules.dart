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

/// The home page's healer shelves (HomePageContent.js). [links] are the
/// hub_teachers rows, for the organisations' order.
class HealerShelves {
  HealerShelves(List<Healer> healers, {List<HubLink> links = const []})
    : this._(
        healers,
        // Schools have their own shelf, so they leave Explore These Channels;
        // organisations leave it too once there are enough of them.
        splitOrganisations(
          officialFirst([
            for (final h in healers)
              if (h.isPlatform && !h.isSchool) h,
          ]),
          links,
        ),
      );

  HealerShelves._(
    List<Healer> healers,
    ({List<Healer> organisations, List<Healer> platforms}) split,
  ) : superheroes = [
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
      // so no practitioner silently vanishes. Channels, apps, organisations
      // and schools are left out: they have their own shelves (as on the
      // website).
      localHeroes = [
        for (final h in healers)
          if (!h.isPlatform && !_isPremium(h)) h,
      ],
      // Spiritpedia Official first, the rest in the order they came.
      platforms = split.platforms,
      organisations = split.organisations,
      schools = [
        for (final h in healers)
          if (h.isSchool) h,
      ];

  final List<Healer> superheroes;
  final List<Healer> luminaries;
  final List<Healer> ascendedMasters;
  final List<Healer> localHeroes;
  final List<Healer> platforms;

  /// Retreat Centres & Platforms: empty below [organisationShelfMinimum]
  /// ([splitOrganisations]).
  final List<Healer> organisations;

  /// Schools & Academies (migration 0029).
  final List<Healer> schools;

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

// ── Hubs: schools and organisations (README §17.11) ─────────────────────────
// web/utils/listings.js and web/app/healers/[slug]/page.js.

/// Spiritpedia Official first, everything else in the order it came.
List<Healer> officialFirst(List<Healer> healers) => [
  for (final h in healers)
    if (h.official) h,
  for (final h in healers)
    if (!h.official) h,
];

/// "8 teachers", counted from the hub_teachers rows for one hub.
int teacherCount(Healer hub, List<HubLink> links) =>
    links.where((l) => l.hubId == hub.id).length;

/// Organisations get their own shelf on Discover, Retreat Centres &
/// Platforms, once there are this many; below it they stay in Explore These
/// Channels, so the shelf is never a one-card row (README job #13).
const organisationShelfMinimum = 5;

const _hubTierRank = {'superhero': 0, 'ascended_master': 1, 'luminary': 2};

/// Takes Explore These Channels' list (channels, apps, organisations) and
/// moves the organisations onto their own shelf when there are enough of
/// them: Spiritpedia Official first, then by tier, then most teachers. Below
/// the minimum nothing moves.
({List<Healer> organisations, List<Healer> platforms}) splitOrganisations(
  List<Healer> platforms,
  List<HubLink> links,
) {
  final orgs = [
    for (final h in platforms)
      if (h.entityType == 'organisation') h,
  ];
  if (orgs.length < organisationShelfMinimum) {
    return (organisations: const <Healer>[], platforms: platforms);
  }
  int rank(Healer h) => _hubTierRank[h.tier] ?? 3;
  final scored = [
    for (final (i, h) in orgs.indexed) (h, i, teacherCount(h, links)),
  ];
  scored.sort((a, b) {
    final official = (b.$1.official ? 1 : 0) - (a.$1.official ? 1 : 0);
    if (official != 0) return official;
    final tier = rank(a.$1) - rank(b.$1);
    if (tier != 0) return tier;
    final teachers = b.$3 - a.$3;
    return teachers != 0 ? teachers : a.$2 - b.$2;
  });
  return (
    organisations: [for (final (h, _, _) in scored) h],
    platforms: [
      for (final h in platforms)
        if (h.entityType != 'organisation') h,
    ],
  );
}

/// The words before a hub's name on a teacher's page: "Founder of White
/// Tiger Qigong", "Teaches at White Tiger Qigong" (a school), "Teaches on The
/// Shift Network" (an organisation).
String hubLinkPrefix(String role, Healer hub) {
  if (role == 'founder') return 'Founder of';
  return hub.entityType == 'organisation' ? 'Teaches on' : 'Teaches at';
}

const _teacherTierRank = {
  'superhero': 0,
  'ascended_master': 1,
  'luminary': 2,
  'local_hero': 3,
};

/// Our Teachers on a hub's page: the founder first, then by tier, then by
/// name.
List<Healer> ourTeachers(List<({String role, Healer teacher})> links) {
  final sorted = [...links]
    ..sort((a, b) {
      final founder =
          (a.role == 'founder' ? 0 : 1) - (b.role == 'founder' ? 0 : 1);
      if (founder != 0) return founder;
      final tier =
          (_teacherTierRank[a.teacher.tier] ?? 4) -
          (_teacherTierRank[b.teacher.tier] ?? 4);
      return tier != 0 ? tier : a.teacher.name.compareTo(b.teacher.name);
    });
  return [for (final l in sorted) l.teacher];
}

/// A teacher's line under their name, as the pieces before each linked hub:
/// "Founder of A, teaches at B and C, teaches on D". Founders first, then
/// schools, then organisations, otherwise in the order they came; the words
/// show again only when they change.
List<({String lead, Healer hub})> hubLine(
  List<({String role, Healer hub})> links,
) {
  int rank(({String role, Healer hub}) l) => l.role == 'founder'
      ? 0
      : l.hub.entityType == 'organisation'
      ? 2
      : 1;
  final indexed = [...links.indexed]
    ..sort((a, b) {
      final c = rank(a.$2) - rank(b.$2);
      return c != 0 ? c : a.$1 - b.$1;
    });
  final sorted = [for (final (_, l) in indexed) l];
  return [
    for (final (i, l) in sorted.indexed)
      (
        lead: [
          if (i > 0) i == sorted.length - 1 ? ' and ' : ', ',
          if (i == 0)
            '${hubLinkPrefix(l.role, l.hub)} '
          else if (hubLinkPrefix(l.role, l.hub) !=
              hubLinkPrefix(sorted[i - 1].role, sorted[i - 1].hub))
            '${hubLinkPrefix(l.role, l.hub).toLowerCase()} ',
        ].join(),
        hub: l.hub,
      ),
  ];
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
// Ranking has four levels: "More of", then the subjects Spiritpedia has
// learned (only for someone who turned learning on), then the rest of the More
// of pillars, then everything else. "Never show" hides. Change the doc with
// these.

/// How learning reads its scores (migration 0021): each halves every 30 days
/// from when it was stored. A subject counts as learned from [learnedMinimum]
/// (a save, say, or a few opens), and at most [learnedTop] of them, highest
/// first. More of and Never show subjects are left out: More of already ranks
/// first, and learning never brings back what someone hid.
const learnedHalfLifeDays = 30.0;
const learnedMinimum = 3.0;
const learnedTop = 5;

double fadedScore(double score, DateTime updatedAt, DateTime now) {
  final days = now.difference(updatedAt).inSeconds / 86400;
  return days <= 0 ? score : score * math.pow(0.5, days / learnedHalfLifeDays);
}

Map<String, double> learnedSubjects(
  Iterable<({String subject, double score, DateTime updatedAt})> rows, {
  required DateTime now,
  Set<String> chosen = const {},
  Set<String> hidden = const {},
}) {
  final scored = [
    for (final r in rows)
      if (!chosen.contains(r.subject) && !hidden.contains(r.subject))
        (r.subject, fadedScore(r.score, r.updatedAt, now)),
  ]..removeWhere((e) => e.$2 < learnedMinimum);
  scored.sort((a, b) => b.$2.compareTo(a.$2));
  return {for (final (s, v) in scored.take(learnedTop)) s: v};
}

/// The subjects sharing a pillar with any of [chosen], [chosen] left out:
/// level 2 of the ranking.
Set<String> pillarMates(Set<String> chosen) => {
  for (final slugs in subjectPillars.values)
    if (slugs.any(chosen.contains))
      for (final s in slugs)
        if (!chosen.contains(s)) s,
};

/// Where an item ranks: 0 if it carries a [chosen] (More of) subject, 1 if
/// it carries a [learned] one, 2 if another subject of a More of pillar
/// ([mates], from [pillarMates]), 3 otherwise.
int interestLevel(
  List<String> subjects,
  Set<String> chosen, [
  Set<String>? mates,
  Map<String, double> learned = const {},
]) {
  if (subjects.any(chosen.contains)) return 0;
  if (subjects.any(learned.containsKey)) return 1;
  if (subjects.any((mates ?? pillarMates(chosen)).contains)) return 2;
  return 3;
}

double _learnedWeight(List<String> subjects, Map<String, double> learned) =>
    subjects.fold(0, (sum, s) => sum + (learned[s] ?? 0));

/// The ranking: [chosen] subjects first (those carrying more of them first),
/// then [learned] subjects (the most explored first), then the rest of the
/// More of pillars, then everything else — otherwise in [items]' own order.
/// Nothing is removed. No choice and nothing learned, no change.
List<T> byInterest<T>(
  List<T> items,
  Set<String> chosen,
  List<String> Function(T) subjects, {
  Map<String, double> learned = const {},
}) {
  if (chosen.isEmpty && learned.isEmpty) return items;
  final mates = pillarMates(chosen);
  final scored = [
    for (final (i, item) in items.indexed)
      (
        item,
        interestLevel(subjects(item), chosen, mates, learned),
        subjects(item).where(chosen.contains).length,
        _learnedWeight(subjects(item), learned),
        i,
      ),
  ];
  scored.sort((a, b) {
    if (a.$2 != b.$2) return a.$2.compareTo(b.$2);
    if (a.$3 != b.$3) return b.$3.compareTo(a.$3);
    if (a.$4 != b.$4) return b.$4.compareTo(a.$4);
    return a.$5.compareTo(b.$5);
  });
  return [for (final (item, _, _, _, _) in scored) item];
}

// ── For You (the pill) ──────────────────────────────────────────────────────
// A whole page of someone's More of subjects, on Discover, Videos and Books.
// Never thin: a shelf short of its own subjects is topped up from closely
// related ones — what Spiritpedia has learned they explore, then the rest of
// their pillars — and one still nearly empty is left out.

/// How many a For You shelf is topped up to.
const forYouFill = 10;

/// The fewest a For You shelf shows; fewer, and it is left out.
const forYouShelfMinimum = 3;

/// The fewest subjects For You is built from (its subject shelves).
const forYouSubjectMinimum = 3;

/// The subjects For You is built from: their own [chosen], in the pill row's
/// pillar order; if fewer than [minimum], topped up with closely related
/// ones — [learned] first (most explored first), then the rest of their
/// pillars. Never a [hidden] one. Nothing chosen, nothing.
List<String> forYouSubjects(
  Set<String> chosen, {
  Set<String> hidden = const {},
  Map<String, double> learned = const {},
  int minimum = forYouSubjectMinimum,
}) {
  if (chosen.isEmpty) return const [];
  final inPillars = {for (final slugs in subjectPillars.values) ...slugs};
  final own = [
    for (final slugs in subjectPillars.values)
      for (final s in slugs)
        if (chosen.contains(s) && !hidden.contains(s)) s,
    for (final s in [...chosen]..sort())
      if (!inPillars.contains(s) && !hidden.contains(s)) s,
  ];
  if (own.length >= minimum) return own;
  final byWeight = learned.entries.toList()
    ..sort((a, b) => b.value.compareTo(a.value));
  final mates = pillarMates(chosen);
  final related = <String>{
    for (final e in byWeight) e.key,
    for (final p in pillarsByInterest(chosen))
      for (final s in subjectPillars[p]!)
        if (mates.contains(s)) s,
  }..removeWhere((s) => chosen.contains(s) || hidden.contains(s));
  return [...own, ...related.take(minimum - own.length)];
}

/// A For You shelf: the [items] carrying one of the [chosen] subjects, those
/// carrying more of them first ([byInterest]); short of [fill], topped up
/// with items about a related subject (learned, then the rest of their
/// pillars). Fewer than [minimum] in all: none — no thin shelf.
List<T> forYouShelf<T>(
  List<T> items,
  Set<String> chosen,
  List<String> Function(T) subjects, {
  Map<String, double> learned = const {},
  int fill = forYouFill,
  int minimum = forYouShelfMinimum,
}) {
  if (chosen.isEmpty) return const [];
  final mates = pillarMates(chosen);
  final ranked = byInterest(
    [
      for (final item in items)
        if (interestLevel(subjects(item), chosen, mates, learned) < 3) item,
    ],
    chosen,
    subjects,
    learned: learned,
  );
  final own = ranked
      .where((i) => interestLevel(subjects(i), chosen, mates, learned) == 0)
      .length;
  final shelf = ranked.take(own >= fill ? own : fill).toList();
  return shelf.length < minimum ? const [] : shelf;
}

/// For You's Publishing Houses: those publishing in their subjects (topped
/// up like any For You shelf, but shown however few), then new presses with
/// no authors yet — they have no subjects to match, and still show.
List<Publisher> forYouPublishers(
  List<Publisher> publishers,
  Set<String> chosen,
  Map<String, double> learned,
) {
  final matched = forYouShelf(
    publishers,
    chosen,
    (p) => p.subjectSlugs,
    learned: learned,
    minimum: 1,
  );
  return [
    ...matched,
    for (final p in publishers)
      if (p.authorCount == 0 && !matched.contains(p)) p,
  ];
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
/// subject first, most chosen subjects first; then those holding a [learned]
/// one, most explored first; the rest keep their order. A pillar whose every
/// subject is in [hidden] is left out.
List<String> pillarsByInterest(
  Set<String> chosen, [
  List<String>? pillars,
  Set<String> hidden = const {},
  Map<String, double> learned = const {},
]) {
  final order = [
    for (final p in pillars ?? subjectPillars.keys.toList())
      if (!(subjectPillars[p] ?? const <String>[]).every(hidden.contains)) p,
  ];
  if (chosen.isEmpty && learned.isEmpty) return order;
  int hits(String p) =>
      (subjectPillars[p] ?? const []).where(chosen.contains).length;
  double explored(String p) =>
      _learnedWeight(subjectPillars[p] ?? const [], learned);
  final indexed = [...order.indexed];
  indexed.sort((a, b) {
    final c = hits(b.$2).compareTo(hits(a.$2));
    if (c != 0) return c;
    final l = explored(b.$2).compareTo(explored(a.$2));
    return l != 0 ? l : a.$1.compareTo(b.$1);
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

/// How many "Closest to you" shows when nobody is within [nearRadiusKm].
const closestCount = 10;

// Countries whose people think in miles; everyone else gets kilometres. Read
// from the area's own country, never the phone's locale.
const _mileCountries = {
  'United Kingdom',
  'United States',
  'Liberia',
  'Myanmar',
};

/// "320 km away", "1,240 km away", "200 miles away": whole numbers, in the
/// unit of the area's [country]. The website's distanceLabel (utils/area.js).
String distanceLabel(double km, String country) {
  final miles = _mileCountries.contains(country);
  final n = math.max(1, (miles ? km / 1.609344 : km).round());
  final digits = n.toString().replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ',',
  );
  return '$digits ${miles ? (n == 1 ? 'mile' : 'miles') : 'km'} away';
}

/// "Closest to you", for when nobody is within [nearRadiusKm] of [area]: the
/// [count] practitioners nearest it, town centre to town centre, nearest
/// first, each with its distance in km. Practitioners with no town can't be
/// placed, so they are left out. Empty when nobody has a town. The website's
/// closestTo (utils/area.js) — change both together.
List<({Healer healer, double km})> closestTo(
  List<Healer> practitioners,
  Place? area,
  Map<int, Place> places, {
  int count = closestCount,
}) {
  if (area == null) return const [];
  final found = <(Healer, double, int)>[];
  for (final (i, h) in practitioners.indexed) {
    final town = places[h.placeId];
    if (town != null) found.add((h, distanceKm(area, town), i));
  }
  found.sort((a, b) {
    final c = a.$2.compareTo(b.$2);
    return c != 0 ? c : a.$3.compareTo(b.$3);
  });
  return [for (final (h, km, _) in found.take(count)) (healer: h, km: km)];
}

// The website's shelf rules, as pure functions so they can be tested. Each one
// names the web file it mirrors; change both together.

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
      // so no practitioner silently vanishes. (Platforms are not excluded,
      // matching the website.)
      localHeroes = [
        for (final h in healers)
          if (!_isPremium(h)) h,
      ],
      platforms = [
        for (final h in healers)
          if (h.isPlatform) h,
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
({List<Offering> courses, List<Offering> retreats, List<Offering> downloads})
splitOfferings(List<Offering> offerings) => (
  courses: [
    for (final o in offerings)
      if (o.productType == null || o.productType == 'course') o,
  ],
  retreats: [
    for (final o in offerings)
      if (o.productType == 'retreat') o,
  ],
  downloads: [
    for (final o in offerings)
      if (o.productType == 'download') o,
  ],
);

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

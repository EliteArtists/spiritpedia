import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/supabase_providers.dart';
import '../features/interests/interests.dart';
import 'content_repository.dart';
import 'models.dart';
import 'shelf_rules.dart';

/// The one place screens get content from. Overridden in widget tests.
final contentRepositoryProvider = Provider<ContentRepository>(
  (ref) => SupabaseContentRepository(ref.watch(supabaseProvider)),
);

final subjectsProvider = FutureProvider<List<Subject>>(
  (ref) => ref.watch(contentRepositoryProvider).subjects(),
);

final healersProvider = FutureProvider<List<Healer>>(
  (ref) => ref.watch(contentRepositoryProvider).healers(),
);

final healerDirectoryProvider = FutureProvider<HealerDirectory>(
  (ref) async => HealerDirectory(await ref.watch(healersProvider.future)),
);

final publishersProvider = FutureProvider<List<Publisher>>(
  (ref) => ref.watch(contentRepositoryProvider).publishers(),
);

// ── Never show (docs/personalisation.md) ─────────────────────────────────────

/// Each teacher's content subjects, by slug — fetched only once something is
/// hidden, for the "no empty profiles" rule.
final _teacherContentProvider = FutureProvider<Map<String, List<List<String>>>>(
  (ref) => ref.watch(contentRepositoryProvider).teacherContentSubjects(),
);

/// Everything Never show hides for this person. Teachers whose content is
/// all hidden join in once their content has loaded (a moment, at most).
final hidingProvider = Provider<Hiding>((ref) {
  final hidden = ref.watch(hiddenSubjectsProvider);
  if (hidden.isEmpty) return Hiding.none;
  final moreOf = ref.watch(interestSubjectsProvider);
  final content = ref.watch(_teacherContentProvider).value;
  return Hiding(
    subjects: hidden,
    moreOf: moreOf,
    emptyTeachers: content == null
        ? const {}
        : teachersWithAllContentHidden(content, hidden, moreOf),
  );
});

/// The subject filter (null = View All), one for Discover, Videos and Books
/// together — as on the website, where the tabs share the page's ?subject=.
/// Switching tabs and tapping the star keep it; only Clear (or View All)
/// changes it back.
class SubjectFilter extends Notifier<String?> {
  @override
  String? build() => null;

  void select(String? slug) => state = slug;
}

final subjectFilterProvider = NotifierProvider<SubjectFilter, String?>(
  SubjectFilter.new,
);

/// The display name of a subject slug, once subjects have loaded.
String subjectName(List<Subject>? subjects, String slug) {
  for (final s in subjects ?? const <Subject>[]) {
    if (s.slug == slug) return s.name;
  }
  return slug.replaceAll('-', ' ');
}

// ── Explore More ─────────────────────────────────────────────────────────────

/// The on-demand sections, in the website's order (ExploreMore.jsx), then
/// Memberships. The website's "Books & Literature" is left out: the app has a
/// Books tab of its own.
enum ExploreSection {
  freeResources('Free Resources', 'No cost, no catch'),
  courses('Courses & Programmes', 'Go deeper'),
  retreats('Retreats & Live Events', 'In person'),
  downloads('Downloads & Audio', 'Take it with you'),
  // Not on the website's Explore More (yet): its 102 live memberships show
  // only on teachers' pages there.
  memberships('Memberships', 'Ongoing journey');

  const ExploreSection(this.label, this.subtitle);

  final String label;
  final String subtitle;
}

/// Which sections the visitor has opened, in the order they opened them.
/// Held in memory only, so every launch starts with them all closed.
class ExploreMoreOpened extends Notifier<List<ExploreSection>> {
  @override
  List<ExploreSection> build() => const [];

  void open(ExploreSection section) {
    if (!state.contains(section)) state = [...state, section];
  }

  /// All closed again — after Tailor Spiritpedia is saved.
  void closeAll() => state = const [];
}

final exploreMoreOpenedProvider =
    NotifierProvider<ExploreMoreOpened, List<ExploreSection>>(
      ExploreMoreOpened.new,
    );

/// Live offerings for a subject, fetched once and split three ways — courses,
/// retreats and downloads all come from the same `courses` table.
final _liveOfferingsProvider = FutureProvider.family<List<Offering>, String?>(
  (ref, subject) =>
      ref.watch(contentRepositoryProvider).liveOfferings(subject: subject),
);

final exploreSectionProvider =
    FutureProvider.family<ExploreRows, (ExploreSection, String?)>((
      ref,
      key,
    ) async {
      final (section, subject) = key;
      final hiding = ref.watch(hidingProvider);
      final all = await _exploreSection(ref, section, subject);
      final shown = hiding.visible(all);
      return (items: shown, hiddenAll: shown.isEmpty && all.isNotEmpty);
    });

/// An Explore More section's items, and whether Never show emptied it.
typedef ExploreRows = ({List<Object> items, bool hiddenAll});

/// One Explore More section, before Never show is applied.
Future<List<Object>> _exploreSection(
  Ref ref,
  ExploreSection section,
  String? subject,
) async {
  final repo = ref.watch(contentRepositoryProvider);
  switch (section) {
    case ExploreSection.freeResources:
      return repo.featuredFreeResources(subject: subject);
    case ExploreSection.courses:
    case ExploreSection.retreats:
    case ExploreSection.downloads:
    case ExploreSection.memberships:
      final split = splitOfferings(
        await ref.watch(_liveOfferingsProvider(subject).future),
      );
      return switch (section) {
        ExploreSection.courses => split.courses,
        ExploreSection.retreats => split.retreats,
        ExploreSection.memberships => split.memberships,
        _ => split.downloads,
      };
  }
}

// ── For You ──────────────────────────────────────────────────────────────────

/// Which turn of the For You rotation Discover's View All is on. Moves on
/// each time someone lands there — a launch, switching to Discover, choosing
/// View All — and is remembered between launches, so the rotation carries on.
class ForYouTurn extends Notifier<int> {
  static const _key = 'for_you_turn';

  @override
  int build() {
    _restore();
    return 0;
  }

  Future<void> _restore() async {
    try {
      final saved = await SharedPreferencesAsync().getInt(_key) ?? -1;
      if (!ref.mounted) return;
      state = saved + 1 + state;
      await SharedPreferencesAsync().setInt(_key, state);
    } catch (_) {}
  }

  void landed() {
    state++;
    SharedPreferencesAsync().setInt(_key, state).catchError((_) {});
  }
}

final forYouTurnProvider = NotifierProvider<ForYouTurn, int>(ForYouTurn.new);

/// The content types For You rotates through, in order.
const forYouSections = [
  ExploreSection.freeResources,
  ExploreSection.courses,
  ExploreSection.downloads,
  ExploreSection.retreats,
  ExploreSection.memberships,
];

/// Discover's For You: one content type per turn, from their More of
/// subjects (level 1, then level 2 — docs/personalisation.md), hidden
/// subjects respected. A type with nothing relevant is skipped; retreats are
/// upcoming only, soonest first. Null when they chose nothing, or nothing
/// is relevant.
final forYouProvider =
    FutureProvider<({ExploreSection section, List<Object> items})?>((
      ref,
    ) async {
      final chosen = ref.watch(interestSubjectsProvider);
      if (chosen.isEmpty) return null;
      final turn = ref.watch(forYouTurnProvider);
      final available = <({ExploreSection section, List<Object> items})>[];
      for (final section in forYouSections) {
        var items = (await ref.watch(
          exploreSectionProvider((section, null)).future,
        )).items;
        if (section == ExploreSection.retreats) {
          final today = DateTime.now();
          final day = DateTime(today.year, today.month, today.day);
          items = [
            for (final o in items.cast<Offering>())
              if ((o.starts ?? o.ends) case final d? when !d.isBefore(day)) o,
          ];
        }
        final picked = forYou(items, chosen, subjectsOf);
        if (picked.isNotEmpty) available.add((section: section, items: picked));
      }
      if (available.isEmpty) return null;
      return available[turn % available.length];
    });

// ── Videos ───────────────────────────────────────────────────────────────────

class VideoShelf {
  const VideoShelf({
    required this.title,
    required this.subtitle,
    required this.videos,
    this.teacherSlug,
  });

  final String title;
  final String subtitle;
  final List<Video> videos;

  /// Set on a per-teacher shelf, so its title can link to the teacher.
  final String? teacherSlug;
}

/// The Videos tab's shelves. Every shelf holds at most two videos per teacher.
final videoShelvesProvider = FutureProvider.family<List<VideoShelf>, String?>((
  ref,
  subject,
) async {
  final repo = ref.watch(contentRepositoryProvider);
  final chosen = ref.watch(interestSubjectsProvider);
  final hiding = ref.watch(hidingProvider);
  final hidden = hiding.subjects;
  // Never show: no video with a hidden subject (and no More of one), on any
  // shelf.
  List<Video> visible(List<Video> pool) =>
      hiding.items(pool, (v) => v.subjectSlugs);

  if (subject == null) {
    // More of (docs/personalisation.md): their pillars come first, and each
    // shelf but New is ranked in three levels.
    final pillars = pillarsByInterest(chosen, videoPillarOrder, hidden);
    final results = [
      for (final pool in await Future.wait([
        repo.newestVideos(limit: 60),
        for (final pillar in pillars)
          repo.videoPool(subjects: subjectPillars[pillar]),
        repo.mixedVideos(),
      ]))
        visible(pool),
    ];
    List<Video> boost(List<Video> pool) =>
        byInterest(pool, chosen, (v) => v.subjectSlugs);
    // As with Books: no video on two shelves, and each pillar leads with the
    // videos most about it.
    final shown = <Object>{};
    List<Video> take(List<Video> pool) {
      final shelf = capPerTeacher([
        for (final v in pool)
          if (!shown.contains(v.id)) v,
      ]);
      shown.addAll(shelf.map((v) => v.id));
      return shelf;
    }

    return [
      VideoShelf(
        title: 'New to Spiritpedia',
        subtitle: 'Just added',
        videos: take(results.first),
      ),
      for (var i = 0; i < pillars.length; i++)
        VideoShelf(
          title: pillars[i],
          subtitle: 'Watch & learn',
          videos: take(
            boost(
              pillarCandidates(
                results[i + 1],
                pillars[i],
                subjects: (v) => v.subjectSlugs,
                id: (v) => v.id,
              ),
            ),
          ),
        ),
      VideoShelf(
        title: 'Watch & Learn',
        subtitle: 'A little of everything',
        videos: take(boost(results.last)),
      ),
    ].where((s) => s.videos.isNotEmpty).toList();
  }

  // One subject: the newest, two per teacher; then the next batch, likewise.
  final all = visible(await repo.videosForSubject(subject));
  final latest = capPerTeacher(all);
  final shown = {for (final v in latest) v.id};
  final more = capPerTeacher([
    for (final v in all)
      if (!shown.contains(v.id)) v,
  ]);
  final name = subjectName(await ref.watch(subjectsProvider.future), subject);
  return [
    VideoShelf(
      title: 'Latest in $name',
      subtitle: '${all.length} videos',
      videos: latest,
    ),
    if (more.isNotEmpty)
      VideoShelf(
        title: 'More in $name',
        subtitle: 'Keep watching',
        videos: more,
      ),
  ].where((s) => s.videos.isNotEmpty).toList();
});

// ── Books ────────────────────────────────────────────────────────────────────

class BookShelf {
  const BookShelf({
    required this.title,
    required this.subtitle,
    required this.books,
  });

  final String title;
  final String subtitle;
  final List<Book> books;
}

/// The Books tab's shelves, built like Videos: View All shows New, the five
/// pillars and a mixed shelf; a chosen subject shows its newest books, then
/// the next batch. Never more than two books by one author in a shelf.
final bookShelvesProvider = FutureProvider.family<List<BookShelf>, String?>((
  ref,
  subject,
) async {
  final repo = ref.watch(contentRepositoryProvider);
  final chosen = ref.watch(interestSubjectsProvider);
  final hiding = ref.watch(hidingProvider);
  final hidden = hiding.subjects;
  // Never show: no book with a hidden subject (and no More of one), on any
  // shelf. Newest first.
  final all = hiding.items(
    await repo.books(subject: subject),
    (b) => b.subjectSlugs,
  );

  if (subject == null) {
    // As on Videos: their pillars first, and each shelf but New ranked in
    // three levels.
    List<Book> boost(List<Book> pool) =>
        byInterest(pool, chosen, (b) => b.subjectSlugs);
    // Most books carry several subjects, so without care every shelf would
    // lead with the same newest books. No book appears on two shelves, and
    // each pillar leads with the books most about it.
    final shown = <Object>{};
    List<Book> take(List<Book> pool) {
      final shelf = capPerAuthor(pool);
      shown.addAll(shelf.map((b) => b.id));
      return shelf;
    }

    final shelves = [
      BookShelf(
        title: 'New to Spiritpedia',
        subtitle: 'Just added',
        books: take(all),
      ),
      for (final pillar in pillarsByInterest(chosen, videoPillarOrder, hidden))
        BookShelf(
          title: pillar,
          subtitle: 'Read & reflect',
          books: take(
            boost(
              pillarCandidates(
                all,
                pillar,
                subjects: (b) => b.subjectSlugs,
                id: (b) => b.id,
                shown: shown,
              ),
            ),
          ),
        ),
    ];
    return [
      ...shelves,
      BookShelf(
        title: 'From the Library',
        subtitle: 'A little of everything',
        books: take(
          boost(
            spreadOut([
              for (final b in all)
                if (!shown.contains(b.id)) b,
            ]),
          ),
        ),
      ),
    ].where((s) => s.books.isNotEmpty).toList();
  }

  final latest = capPerAuthor(all);
  final shown = {for (final b in latest) b.id};
  final more = capPerAuthor([
    for (final b in all)
      if (!shown.contains(b.id)) b,
  ]);
  final name = subjectName(await ref.watch(subjectsProvider.future), subject);
  return [
    BookShelf(
      title: 'Latest in $name',
      subtitle: '${all.length} books',
      books: latest,
    ),
    if (more.isNotEmpty)
      BookShelf(title: 'More in $name', subtitle: 'Keep reading', books: more),
  ].where((s) => s.books.isNotEmpty).toList();
});

// ── Subject page ─────────────────────────────────────────────────────────────

class SubjectContent {
  const SubjectContent({
    required this.healers,
    required this.freeResources,
    required this.books,
    required this.courses,
    required this.retreats,
    required this.downloads,
    required this.videos,
  });

  final List<Healer> healers;
  final List<FreeResource> freeResources;
  final List<Book> books;
  final List<Offering> courses;
  final List<Offering> retreats;
  final List<Offering> downloads;
  final List<Video> videos;

  bool get isEmpty =>
      healers.isEmpty &&
      freeResources.isEmpty &&
      books.isEmpty &&
      courses.isEmpty &&
      retreats.isEmpty &&
      downloads.isEmpty &&
      videos.isEmpty;
}

final subjectContentProvider = FutureProvider.family<SubjectContent, String>((
  ref,
  slug,
) async {
  final repo = ref.watch(contentRepositoryProvider);
  // Never show: everything carrying another hidden subject is left out. This
  // subject itself, if hidden, is the page's own business — it asks first
  // ("Show anyway?"), and then shows it.
  final hiding = ref.watch(hidingProvider).showing(slug);
  final results = await Future.wait<Object>([
    repo.healersForSubject(slug),
    repo.freeResourcesForSubject(slug),
    repo.books(subject: slug),
    repo.liveOfferings(subject: slug),
    repo.videosForSubject(slug),
  ]);
  List<T> visible<T extends Object>(List<T> items) => hiding.visible(items);
  final offerings = splitOfferings(visible(results[3] as List<Offering>));
  return SubjectContent(
    healers: visible(results[0] as List<Healer>),
    freeResources: visible(results[1] as List<FreeResource>),
    books: visible(results[2] as List<Book>),
    courses: offerings.courses,
    retreats: offerings.retreats,
    downloads: offerings.downloads,
    videos: visible(results[4] as List<Video>),
  );
});

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/supabase_providers.dart';
import '../features/interests/interests.dart';
import 'content_repository.dart';
import 'models.dart';
import 'shelf_rules.dart';
import '../features/learning/learning.dart';

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

/// Practitioners' towns, by id — only fetched once someone has an area.
final healerPlacesProvider = FutureProvider<Map<int, Place>>((ref) async {
  final healers = await ref.watch(healersProvider.future);
  final ids = {
    for (final h in healers)
      if (h.placeId != null) h.placeId!,
  }.toList();
  final places = await ref.watch(contentRepositoryProvider).placesByIds(ids);
  return {for (final p in places) p.id: p};
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

/// Whether the pills are on For You rather than View All — one for Discover,
/// Videos and Books together, like the subject filter. A one-subject look
/// ([subjectFilterProvider]) sits on top of either and leaves it as it was,
/// so Clear goes back to it.
///
/// Landing: on For You for anyone with More of subjects, on View All for
/// anyone without. Their first subjects (the welcome screen, Tailor, or an
/// account's arriving at sign-in) switch it on; clearing the last switches
/// it off.
class ForYouView extends Notifier<bool> {
  @override
  bool build() {
    ref.listen(
      interestsProvider.select((i) => i.subjects.isNotEmpty),
      (_, hasSubjects) => state = hasSubjects,
    );
    return ref.read(interestsProvider).subjects.isNotEmpty;
  }

  void show(bool forYou) => state = forYou;
}

final forYouViewProvider = NotifierProvider<ForYouView, bool>(ForYouView.new);

/// Whether For You is what the tabs show now: on For You, no one-subject
/// look on top, and subjects to show.
final forYouActiveProvider = Provider<bool>(
  (ref) =>
      ref.watch(subjectFilterProvider) == null &&
      ref.watch(forYouViewProvider) &&
      ref.watch(interestSubjectsProvider).isNotEmpty,
);

/// The subjects For You is built from: theirs, topped up with closely
/// related ones if they chose very few ([forYouSubjects]).
final forYouSubjectListProvider = Provider<List<String>>(
  (ref) => forYouSubjects(
    ref.watch(interestSubjectsProvider),
    hidden: ref.watch(hiddenSubjectsProvider),
    learned: ref.watch(learnedProvider),
  ),
);

/// For You's subjects beyond the ones it was built from — the rest of their
/// pillars and what they explore — for "More you might like".
Set<String> _forYouRelated(Ref ref, List<String> forYouSubjects) {
  final chosen = ref.read(interestSubjectsProvider);
  final hidden = ref.read(hiddenSubjectsProvider);
  return {...ref.read(learnedProvider).keys, ...pillarMates(chosen)}
    ..removeAll(forYouSubjects)
    ..removeAll(hidden);
}

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
  final learned = ref.watch(learnedProvider);
  final hiding = ref.watch(hidingProvider);
  final hidden = hiding.subjects;
  // Never show: no video with a hidden subject (and no More of one), on any
  // shelf.
  List<Video> visible(List<Video> pool) =>
      hiding.items(pool, (v) => v.subjectSlugs);

  if (subject == null) {
    // More of (docs/personalisation.md): their pillars come first, and each
    // shelf but New is ranked in three levels.
    final pillars = pillarsByInterest(
      chosen,
      videoPillarOrder,
      hidden,
      learned,
    );
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
        byInterest(pool, chosen, (v) => v.subjectSlugs, learned: learned);
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

/// The Videos tab on For You: what is new in their subjects, a shelf for
/// each of them (topped up with related subjects if they chose very few),
/// then "More you might like" from close by. No video on two shelves, two
/// per teacher, and no thin shelf.
final forYouVideoShelvesProvider = FutureProvider<List<VideoShelf>>((
  ref,
) async {
  final repo = ref.watch(contentRepositoryProvider);
  final subjects = ref.watch(forYouSubjectListProvider);
  if (subjects.isEmpty) return const [];
  final chosen = ref.watch(interestSubjectsProvider);
  final learned = ref.watch(learnedProvider);
  final hiding = ref.watch(hidingProvider);
  final related = _forYouRelated(ref, subjects);
  final results = await Future.wait([
    repo.videosForSubjects(subjects),
    if (related.isNotEmpty) repo.videoPool(subjects: related.toList()),
  ]);
  final names = await ref.watch(subjectsProvider.future);
  List<Video> visible(List<Video> pool) =>
      hiding.items(pool, (v) => v.subjectSlugs);
  final mine = visible(results.first);
  final nearby = results.length > 1 ? visible(results[1]) : const <Video>[];

  final shown = <Object>{};
  List<Video> take(List<Video> pool) {
    final shelf = capPerTeacher([
      for (final v in pool)
        if (!shown.contains(v.id)) v,
    ]);
    if (shelf.length < forYouShelfMinimum) return const [];
    shown.addAll(shelf.map((v) => v.id));
    return shelf;
  }

  return [
    // Theirs only: a topped-up subject has its own shelf, marked as such.
    VideoShelf(
      title: 'New in your subjects',
      subtitle: 'Just added',
      videos: take([
        for (final v in mine)
          if (v.subjectSlugs.any(chosen.contains)) v,
      ]),
    ),
    for (final s in subjects)
      VideoShelf(
        title: subjectName(names, s),
        subtitle: chosen.contains(s) ? 'Watch & learn' : 'Close to yours',
        videos: take([
          for (final v in mine)
            if (v.subjectSlugs.contains(s)) v,
        ]),
      ),
    VideoShelf(
      title: 'More you might like',
      subtitle: 'Close to your subjects',
      videos: take(
        byInterest(nearby, chosen, (v) => v.subjectSlugs, learned: learned),
      ),
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
  final learned = ref.watch(learnedProvider);
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
        byInterest(pool, chosen, (b) => b.subjectSlugs, learned: learned);
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
      for (final pillar in pillarsByInterest(
        chosen,
        videoPillarOrder,
        hidden,
        learned,
      ))
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

/// The Books tab on For You, built like Videos': new in their subjects, a
/// shelf for each, then "More you might like". (Publishing Houses leads the
/// tab in every view: the screen adds it.)
final forYouBookShelvesProvider = FutureProvider<List<BookShelf>>((ref) async {
  final repo = ref.watch(contentRepositoryProvider);
  final subjects = ref.watch(forYouSubjectListProvider);
  if (subjects.isEmpty) return const [];
  final chosen = ref.watch(interestSubjectsProvider);
  final learned = ref.watch(learnedProvider);
  final hiding = ref.watch(hidingProvider);
  final related = _forYouRelated(ref, subjects);
  final all = hiding.items(await repo.books(), (b) => b.subjectSlugs);
  final names = await ref.watch(subjectsProvider.future);
  final mine = [
    for (final b in all)
      if (b.subjectSlugs.any(subjects.contains)) b,
  ];
  final nearby = [
    for (final b in all)
      if (!b.subjectSlugs.any(subjects.contains) &&
          b.subjectSlugs.any(related.contains))
        b,
  ];

  final shown = <Object>{};
  List<Book> take(List<Book> pool) {
    final shelf = capPerAuthor([
      for (final b in pool)
        if (!shown.contains(b.id)) b,
    ]);
    if (shelf.length < forYouShelfMinimum) return const [];
    shown.addAll(shelf.map((b) => b.id));
    return shelf;
  }

  return [
    // Theirs only, as on Videos.
    BookShelf(
      title: 'New in your subjects',
      subtitle: 'Just added',
      books: take([
        for (final b in mine)
          if (b.subjectSlugs.any(chosen.contains)) b,
      ]),
    ),
    for (final s in subjects)
      BookShelf(
        title: subjectName(names, s),
        subtitle: chosen.contains(s) ? 'Read & reflect' : 'Close to yours',
        books: take([
          for (final b in mine)
            if (b.subjectSlugs.contains(s)) b,
        ]),
      ),
    BookShelf(
      title: 'More you might like',
      subtitle: 'Close to your subjects',
      books: take(
        byInterest(nearby, chosen, (b) => b.subjectSlugs, learned: learned),
      ),
    ),
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

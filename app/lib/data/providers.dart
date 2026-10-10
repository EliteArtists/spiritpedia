import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/supabase_providers.dart';
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

/// A subject filter (null = View All). Home, Videos and Books each keep their own,
/// as the website's tabs share a URL but the app's tabs are separate screens.
class SubjectFilter extends Notifier<String?> {
  @override
  String? build() => null;

  void select(String? slug) => state = slug;
}

final homeSubjectProvider = NotifierProvider<SubjectFilter, String?>(
  SubjectFilter.new,
);
final videosSubjectProvider = NotifierProvider<SubjectFilter, String?>(
  SubjectFilter.new,
);
final booksSubjectProvider = NotifierProvider<SubjectFilter, String?>(
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

/// The five on-demand sections, in the website's order (ExploreMore.jsx).
enum ExploreSection {
  freeResources('Free Resources', 'No cost, no catch'),
  books('Books & Literature', 'The curated archive'),
  courses('Courses & Programmes', 'Go deeper'),
  retreats('Retreats & Live Events', 'In person'),
  downloads('Downloads & Audio', 'Take it with you');

  const ExploreSection(this.label, this.subtitle);

  final String label;
  final String subtitle;
}

/// Which sections the visitor has opened, in the order they opened them.
class ExploreMoreOpened extends Notifier<List<ExploreSection>> {
  @override
  List<ExploreSection> build() => const [];

  void open(ExploreSection section) {
    if (!state.contains(section)) state = [...state, section];
  }
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
    FutureProvider.family<List<Object>, (ExploreSection, String?)>((
      ref,
      key,
    ) async {
      final (section, subject) = key;
      final repo = ref.watch(contentRepositoryProvider);
      switch (section) {
        case ExploreSection.books:
          return repo.books(subject: subject);
        case ExploreSection.freeResources:
          return repo.featuredFreeResources(subject: subject);
        case ExploreSection.courses:
        case ExploreSection.retreats:
        case ExploreSection.downloads:
          final split = splitOfferings(
            await ref.watch(_liveOfferingsProvider(subject).future),
          );
          return switch (section) {
            ExploreSection.courses => split.courses,
            ExploreSection.retreats => split.retreats,
            _ => split.downloads,
          };
      }
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

  if (subject == null) {
    final results = await Future.wait([
      repo.newestVideos(limit: 60),
      for (final pillar in videoPillarOrder)
        repo.videoPool(subjects: subjectPillars[pillar]),
      repo.mixedVideos(),
    ]);
    return [
      VideoShelf(
        title: 'New to Spiritpedia',
        subtitle: 'Just added',
        videos: capPerTeacher(results.first),
      ),
      for (var i = 0; i < videoPillarOrder.length; i++)
        VideoShelf(
          title: videoPillarOrder[i],
          subtitle: 'Watch & learn',
          videos: capPerTeacher(results[i + 1]),
        ),
      VideoShelf(
        title: 'Watch & Learn',
        subtitle: 'A little of everything',
        videos: capPerTeacher(results.last),
      ),
    ].where((s) => s.videos.isNotEmpty).toList();
  }

  // One subject: the newest, two per teacher; then the next batch, likewise.
  final all = await repo.videosForSubject(subject);
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
  final all = await repo.books(subject: subject); // newest first

  if (subject == null) {
    return [
      BookShelf(
        title: 'New to Spiritpedia',
        subtitle: 'Just added',
        books: capPerAuthor(all),
      ),
      for (final pillar in videoPillarOrder)
        BookShelf(
          title: pillar,
          subtitle: 'Read & reflect',
          books: capPerAuthor([
            for (final b in all)
              if (b.subjectSlugs.any(subjectPillars[pillar]!.contains)) b,
          ]),
        ),
      BookShelf(
        title: 'From the Library',
        subtitle: 'A little of everything',
        books: capPerAuthor(spreadOut(all)),
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
  final results = await Future.wait<Object>([
    repo.healersForSubject(slug),
    repo.freeResourcesForSubject(slug),
    repo.books(subject: slug),
    repo.liveOfferings(subject: slug),
    repo.videosForSubject(slug),
  ]);
  final offerings = splitOfferings(results[3] as List<Offering>);
  return SubjectContent(
    healers: results[0] as List<Healer>,
    freeResources: results[1] as List<FreeResource>,
    books: results[2] as List<Book>,
    courses: offerings.courses,
    retreats: offerings.retreats,
    downloads: offerings.downloads,
    videos: results[4] as List<Video>,
  );
});

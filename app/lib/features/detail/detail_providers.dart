import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models.dart';
import '../../data/providers.dart';

/// A teacher's page: the healer comes from the already-loaded directory; the
/// rest is fetched for this page only.
class TeacherContent {
  const TeacherContent({
    required this.healer,
    required this.videos,
    required this.books,
    required this.offerings,
    required this.freeResources,
  });

  final Healer healer;
  final List<Video> videos;
  final List<Book> books;
  final List<Offering> offerings;
  final List<FreeResource> freeResources;
}

final teacherProvider = FutureProvider.family<TeacherContent?, String>((
  ref,
  slug,
) async {
  final healer = (await ref.watch(healerDirectoryProvider.future)).bySlug(slug);
  if (healer == null) return null;
  final repo = ref.watch(contentRepositoryProvider);
  final (videos, books, offerings, freeResources) = await (
    repo.videosByHealer(slug),
    repo.booksByHealers([slug]),
    repo.liveOfferingsForHealer(healer.id),
    repo.liveFreeResourcesForHealer(healer.id),
  ).wait;
  return TeacherContent(
    healer: healer,
    videos: videos,
    books: books,
    offerings: offerings,
    freeResources: freeResources,
  );
});

final bookProvider = FutureProvider.family<Book?, String>(
  (ref, slug) => ref.watch(contentRepositoryProvider).book(slug),
);

final videoProvider = FutureProvider.family<Video?, String>(
  (ref, slug) => ref.watch(contentRepositoryProvider).video(slug),
);

final offeringProvider = FutureProvider.family<Offering?, String>(
  (ref, slug) => ref.watch(contentRepositoryProvider).offering(slug),
);

final freeResourceProvider = FutureProvider.family<FreeResource?, String>(
  (ref, slug) => ref.watch(contentRepositoryProvider).freeResource(slug),
);

/// A publisher's page: its authors (best tier first, then by name — the
/// website's order) and one shelf of books per author who has any.
class PublisherContent {
  const PublisherContent({
    required this.publisher,
    required this.authors,
    required this.shelves,
  });

  final Publisher publisher;
  final List<Healer> authors;
  final List<({Healer author, List<Book> books})> shelves;
}

const _tierOrder = {
  'superhero': 0,
  'ascended_master': 1,
  'luminary': 2,
  'local_hero': 3,
};

int _tierRank(String? tier) => _tierOrder[tier] ?? 4;

final publisherProvider = FutureProvider.family<PublisherContent?, String>((
  ref,
  slug,
) async {
  final publisher = (await ref.watch(publishersProvider.future))
      .where((p) => p.slug == slug)
      .firstOrNull;
  if (publisher == null) return null;
  final repo = ref.watch(contentRepositoryProvider);
  final directory = await ref.watch(healerDirectoryProvider.future);
  final authors = [
    for (final id in await repo.publisherAuthorIds(publisher.id))
      ?directory.byId(id),
  ];
  final books = await repo.booksByHealers([
    for (final a in authors)
      if (a.slug.isNotEmpty) a.slug,
  ]);
  final shelves =
      [
        for (final a in authors)
          (
            author: a,
            books: [
              for (final b in books)
                if (b.healerSlug == a.slug) b,
            ],
          ),
      ].where((s) => s.books.isNotEmpty).toList()..sort((a, b) {
        final byTier = _tierRank(a.author.tier) - _tierRank(b.author.tier);
        return byTier != 0 ? byTier : a.author.name.compareTo(b.author.name);
      });
  return PublisherContent(
    publisher: publisher,
    authors: authors,
    shelves: shelves,
  );
});

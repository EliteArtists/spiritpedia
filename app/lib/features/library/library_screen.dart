import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/widgets/cards.dart';
import '../../shared/widgets/shelf.dart';
import '../../theme/colors.dart';
import 'saved_items.dart';

/// What is saved, as rows, in the order it was saved (newest first). A saved
/// slug whose row has since gone is simply not shown.
class LibraryContent {
  const LibraryContent({
    this.healers = const [],
    this.books = const [],
    this.readBooks = const [],
    this.videos = const [],
    this.offerings = const [],
    this.freeResources = const [],
    this.publishers = const [],
  });

  final List<Healer> healers;
  final List<Book> books;
  final List<Book> readBooks;
  final List<Video> videos;
  final List<Offering> offerings;
  final List<FreeResource> freeResources;
  final List<Publisher> publishers;

  bool get isEmpty =>
      healers.isEmpty &&
      books.isEmpty &&
      readBooks.isEmpty &&
      videos.isEmpty &&
      offerings.isEmpty &&
      freeResources.isEmpty &&
      publishers.isEmpty;
}

List<T> _inOrder<T>(
  List<String> slugs,
  Iterable<T> rows,
  String Function(T) slugOf,
) {
  final bySlug = {for (final r in rows) slugOf(r): r};
  return [for (final s in slugs) ?bySlug[s]];
}

final libraryProvider = FutureProvider<LibraryContent>((ref) async {
  final saved = ref.watch(savedItemsProvider);
  List<String> of(SavedKind k) => saved[k] ?? const [];
  if (SavedKind.values.every((k) => of(k).isEmpty)) {
    return const LibraryContent();
  }

  final repo = ref.watch(contentRepositoryProvider);
  final bookSlugs = {
    ...of(SavedKind.books),
    ...of(SavedKind.readBooks),
  }.toList();
  final (healers, publishers, books, videos, offerings, resources) = await (
    of(SavedKind.healers).isEmpty
        ? Future.value(const <Healer>[])
        : ref.watch(healersProvider.future),
    of(SavedKind.publishers).isEmpty
        ? Future.value(const <Publisher>[])
        : ref.watch(publishersProvider.future),
    repo.booksBySlugs(bookSlugs),
    repo.videosBySlugs(of(SavedKind.videos)),
    repo.offeringsBySlugs(of(SavedKind.offerings)),
    repo.freeResourcesBySlugs(of(SavedKind.freeResources)),
  ).wait;
  return LibraryContent(
    healers: _inOrder(of(SavedKind.healers), healers, (h) => h.slug),
    books: _inOrder(of(SavedKind.books), books, (b) => b.slug),
    readBooks: _inOrder(of(SavedKind.readBooks), books, (b) => b.slug),
    videos: _inOrder(of(SavedKind.videos), videos, (v) => v.slug),
    offerings: _inOrder(of(SavedKind.offerings), offerings, (o) => o.slug),
    freeResources: _inOrder(
      of(SavedKind.freeResources),
      resources,
      (r) => r.slug,
    ),
    publishers: _inOrder(of(SavedKind.publishers), publishers, (p) => p.slug),
  );
});

/// My Library — what this device has saved. Signing in to keep it across
/// devices comes in Phase 2.
class LibraryScreen extends ConsumerWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final library = ref.watch(libraryProvider);
    final directory = ref.watch(healerDirectoryProvider).value;
    final content = library.value;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 18, 20, 4),
                child: Text(
                  'My Library',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
                ),
              ),
            ),
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: Text(
                  'Saved on this device.',
                  style: TextStyle(fontSize: 13.5, color: SpColors.textFaint),
                ),
              ),
            ),
            if (content == null && library.isLoading)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: CircularProgressIndicator(color: SpColors.link),
                ),
              )
            else if (content == null)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: FilledButton(
                    onPressed: () => ref.invalidate(libraryProvider),
                    child: const Text('Try again'),
                  ),
                ),
              )
            else if (content.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.favorite_border,
                        size: 40,
                        color: SpColors.textFaint,
                      ),
                      SizedBox(height: 14),
                      Text(
                        'Nothing saved yet.',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Tap the heart on a teacher, book, video or offering to keep it here.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: SpColors.textMuted,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              SliverList.list(
                children: [
                  Shelf(
                    title: 'Teachers',
                    itemCount: content.healers.length,
                    itemWidth: 172,
                    height: 240,
                    itemBuilder: (_, i) =>
                        HealerCard(healer: content.healers[i]),
                  ),
                  Shelf(
                    title: 'Want to Read',
                    itemCount: content.books.length,
                    itemWidth: 140,
                    height: 262,
                    itemBuilder: (_, i) => BookCard(book: content.books[i]),
                  ),
                  Shelf(
                    title: 'Read',
                    itemCount: content.readBooks.length,
                    itemWidth: 140,
                    height: 262,
                    itemBuilder: (_, i) => BookCard(book: content.readBooks[i]),
                  ),
                  Shelf(
                    title: 'Videos',
                    itemCount: content.videos.length,
                    itemWidth: 250,
                    height: 232,
                    itemBuilder: (_, i) => VideoCard(
                      video: content.videos[i],
                      healerName: directory
                          ?.bySlug(content.videos[i].healerSlug)
                          ?.name,
                    ),
                  ),
                  Shelf(
                    title: 'Courses & Offerings',
                    itemCount: content.offerings.length,
                    itemWidth: 250,
                    height: 300,
                    itemBuilder: (_, i) => OfferingCard(
                      offering: content.offerings[i],
                      healerName: directory
                          ?.byId(content.offerings[i].healerId)
                          ?.name,
                    ),
                  ),
                  Shelf(
                    title: 'Free Resources',
                    itemCount: content.freeResources.length,
                    itemWidth: 250,
                    height: 300,
                    itemBuilder: (_, i) => FreeResourceCard(
                      resource: content.freeResources[i],
                      healerName: directory
                          ?.byId(content.freeResources[i].healerId)
                          ?.name,
                    ),
                  ),
                  Shelf(
                    title: 'Publishing Houses',
                    itemCount: content.publishers.length,
                    itemWidth: 200,
                    height: 230,
                    itemBuilder: (_, i) =>
                        PublisherCard(publisher: content.publishers[i]),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

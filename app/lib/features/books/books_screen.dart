import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../shared/widgets/cards.dart';
import '../../shared/widgets/shelf.dart';
import '../../theme/colors.dart';
import '../star/star_page.dart';

/// Books — built like Videos: shelves by pillar, never more than two books by
/// one author in a shelf. View All shows New, the five pillars and a mixed
/// shelf; a chosen subject shows its newest books, then the next batch.
class BooksScreen extends ConsumerWidget {
  const BooksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subject = ref.watch(booksSubjectProvider);
    final shelves = ref.watch(bookShelvesProvider(subject));

    return StarPage(
      filter: booksSubjectProvider,
      onRefresh: () async {
        ref.invalidate(bookShelvesProvider(subject));
        await ref.read(bookShelvesProvider(subject).future);
      },
      slivers: shelves.when(
        loading: () => [
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(48),
              child: Center(
                child: CircularProgressIndicator(color: SpColors.link),
              ),
            ),
          ),
        ],
        error: (_, _) => [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  const Text(
                    'Books could not be loaded.',
                    style: TextStyle(color: SpColors.textMuted),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () =>
                        ref.invalidate(bookShelvesProvider(subject)),
                    child: const Text('Try again'),
                  ),
                ],
              ),
            ),
          ),
        ],
        data: (list) => list.isEmpty
            ? [
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: Text(
                      'No books for this subject yet.',
                      style: TextStyle(color: SpColors.textMuted),
                    ),
                  ),
                ),
              ]
            : [
                for (final shelf in list)
                  SliverToBoxAdapter(
                    child: Shelf(
                      title: shelf.title,
                      subtitle: shelf.subtitle,
                      itemCount: shelf.books.length,
                      itemWidth: 140,
                      height: 262,
                      itemBuilder: (_, i) => BookCard(book: shelf.books[i]),
                    ),
                  ),
              ],
      ),
    );
  }
}

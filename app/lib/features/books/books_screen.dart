import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../data/shelf_rules.dart';
import '../../shared/widgets/cards.dart';
import '../../shared/widgets/shelf.dart';
import '../../theme/colors.dart';
import '../interests/hidden_empty.dart';
import '../interests/interests.dart';
import '../learning/learning.dart';
import '../star/star_page.dart';

/// Books — built like Videos: shelves by pillar, never more than two books by
/// one author in a shelf. View All shows New, the five pillars and a mixed
/// shelf; a chosen subject shows its newest books, then the next batch; For
/// You, their subjects. Publishing Houses leads the tab in every view.
class BooksScreen extends ConsumerWidget {
  const BooksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subject = ref.watch(subjectFilterProvider);
    final forYou = ref.watch(forYouActiveProvider);
    final source = forYou
        ? forYouBookShelvesProvider
        : bookShelvesProvider(subject);
    final shelves = ref.watch(source);
    final hiding = !ref.watch(hidingProvider).isEmpty;
    final publishers = _publishers(ref, subject, forYou);

    return StarPage(
      filter: subjectFilterProvider,
      tabPath: '/books',
      onRefresh: () async {
        ref.invalidate(source);
        ref.invalidate(publishersProvider);
        await ref.read(source.future);
      },
      slivers: [
        SliverToBoxAdapter(
          child: Shelf(
            key: const ValueKey('books-publishers'),
            title: 'Publishing Houses',
            subtitle: 'Publishers',
            itemCount: publishers.length,
            itemWidth: 200,
            height: 230,
            itemBuilder: (_, i) => PublisherCard(publisher: publishers[i]),
          ),
        ),
        ...shelves.when(
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
                      onPressed: () => ref.invalidate(source),
                      child: const Text('Try again'),
                    ),
                  ],
                ),
              ),
            ),
          ],
          data: (list) => list.isEmpty
              ? [
                  if (hiding)
                    const SliverToBoxAdapter(child: HiddenEmptyState())
                  else
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
      ],
    );
  }

  /// Publishing Houses for the view: everyone's on View All (new presses
  /// with no authors yet included), a subject's under a subject, and on For
  /// You theirs and the new presses. Never show applies.
  static List<Publisher> _publishers(
    WidgetRef ref,
    String? subject,
    bool forYou,
  ) {
    final all = ref
        .watch(hidingProvider)
        .visible(ref.watch(publishersProvider).value ?? const <Publisher>[]);
    if (forYou) {
      return forYouPublishers(
        all,
        ref.watch(interestSubjectsProvider),
        ref.watch(learnedProvider),
      );
    }
    return bySubject(all, subject, (p) => p.subjectSlugs);
  }
}

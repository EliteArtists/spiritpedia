import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/data/models.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/data/shelf_rules.dart';
import 'package:spiritpedia/features/interests/interests.dart';

import '../support/fake_content.dart';

/// Like the live catalogue: most books carry several subjects across pillars,
/// the newest ones especially.
class _ManyBooks extends FakeContentRepository {
  @override
  Future<List<Book>> books({String? subject}) async {
    const tags = [
      ['self-healing', 'spirituality', 'consciousness', 'manifestation'],
      ['meditation'],
      ['shadow-work', 'self-healing'],
      ['manifestation', 'law-of-attraction', 'spirituality'],
      ['yoga', 'ayurveda', 'self-healing'],
      ['mysticism', 'shamanism'],
      ['non-duality', 'consciousness'],
    ];
    final all = [
      for (var i = 0; i < 280; i++)
        Book(
          id: 1000 - i, // newest first
          slug: 'book-$i',
          title: 'Book $i',
          author: 'Author ${i % 90}',
          subjectSlugs: tags[i % tags.length],
        ),
    ];
    return [
      for (final b in all)
        if (subject == null || b.subjectSlugs.contains(subject)) b,
    ];
  }
}

void main() {
  test(
    'View All: no book on two shelves, each pillar about its pillar',
    () async {
      final container = ProviderContainer(
        overrides: [contentRepositoryProvider.overrideWithValue(_ManyBooks())],
      );
      addTearDown(container.dispose);
      final shelves = await container.read(bookShelvesProvider(null).future);

      expect(shelves.first.title, 'New to Spiritpedia');
      expect(shelves.length, 7);
      final seen = <int>{};
      for (final shelf in shelves) {
        expect(shelf.books, isNotEmpty, reason: shelf.title);
        for (final b in shelf.books) {
          expect(
            seen.add(b.id),
            isTrue,
            reason: '${b.title} on ${shelf.title}',
          );
        }
        if (subjectPillars.containsKey(shelf.title)) {
          for (final b in shelf.books) {
            expect(pillarFit(b.subjectSlugs, shelf.title), greaterThan(0));
          }
          // It leads with the books most about it.
          final fits = [
            for (final b in shelf.books) pillarFit(b.subjectSlugs, shelf.title),
          ];
          expect(fits.first, fits.reduce((a, b) => a > b ? a : b));
        }
      }
    },
  );

  test('a subject: every book on its shelves has that subject', () async {
    final container = ProviderContainer(
      overrides: [contentRepositoryProvider.overrideWithValue(_ManyBooks())],
    );
    addTearDown(container.dispose);
    final shelves = await container.read(bookShelvesProvider('yoga').future);
    expect(shelves, isNotEmpty);
    for (final b in shelves.expand((s) => s.books)) {
      expect(b.subjectSlugs, contains('yoga'));
    }
  });

  test('pillarFit is the share of subjects in the pillar', () {
    expect(pillarFit(['yoga', 'ayurveda'], 'Body & Energy'), 1.0);
    expect(pillarFit(['yoga', 'meditation'], 'Body & Energy'), 0.5);
    expect(pillarFit(const [], 'Body & Energy'), 0);
  });

  test('chosen interests: their pillar first, their books leading — New '
      'stays newest', () async {
    final container = ProviderContainer(
      overrides: [
        contentRepositoryProvider.overrideWithValue(_ManyBooks()),
        interestsStoreProvider.overrideWithValue(
          MemoryInterestsStore(
            const Interests(subjects: ['yoga'], chosen: true),
          ),
        ),
      ],
    );
    addTearDown(container.dispose);
    container.read(interestsProvider);
    await Future<void>.delayed(Duration.zero);
    final unchosen = ProviderContainer(
      overrides: [contentRepositoryProvider.overrideWithValue(_ManyBooks())],
    );
    addTearDown(unchosen.dispose);
    final plain = await unchosen.read(bookShelvesProvider(null).future);
    final shelves = await container.read(bookShelvesProvider(null).future);

    expect(shelves.first.title, 'New to Spiritpedia');
    expect(
      [for (final b in shelves.first.books) b.id],
      [for (final b in plain.first.books) b.id],
    );
    expect(shelves[1].title, 'Body & Energy');
    expect(shelves[1].books.first.subjectSlugs, contains('yoga'));
    // Every pillar is still there: shaped, never narrowed.
    expect(shelves.length, plain.length);
  });
}

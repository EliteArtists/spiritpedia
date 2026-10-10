import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/core/links/share.dart';
import 'package:spiritpedia/core/retry.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/features/detail/book_screen.dart';
import 'package:spiritpedia/features/detail/offering_screen.dart';
import 'package:spiritpedia/features/detail/publisher_screen.dart';
import 'package:spiritpedia/features/detail/teacher_screen.dart';
import 'package:spiritpedia/features/detail/video_screen.dart';
import 'package:spiritpedia/features/library/library_screen.dart';
import 'package:spiritpedia/features/library/saved_items.dart';
import 'package:spiritpedia/features/star/star_layer.dart';
import 'package:spiritpedia/theme/theme.dart';
import 'package:spiritpedia/features/account/account_providers.dart';

import '../../support/fake_account.dart';
import '../../support/fake_content.dart';

const _tags = {'AMAZON_TAG_US': 'us-tag-20'};

void main() {
  setUp(() {
    final view = TestWidgetsFlutterBinding.ensureInitialized()
        .platformDispatcher
        .views
        .first;
    view.physicalSize = const Size(1290, 9000);
    view.devicePixelRatio = 3;
  });
  tearDown(
    () => TestWidgetsFlutterBinding.ensureInitialized()
        .platformDispatcher
        .views
        .first
        .resetPhysicalSize(),
  );

  final shared = <Uri>[];
  setUp(shared.clear);

  Future<MemorySavedStore> pump(
    WidgetTester tester,
    Widget screen, {
    MemorySavedStore? store,
  }) async {
    final saved = store ?? MemorySavedStore();
    await tester.pumpWidget(
      ProviderScope(
        retry: spiritpediaRetry,
        overrides: [
          accountServiceProvider.overrideWithValue(FakeAccountService()),
          contentRepositoryProvider.overrideWithValue(FakeContentRepository()),
          savedStoreProvider.overrideWithValue(saved),
          shareLauncherProvider.overrideWithValue(
            (link, title, origin) async => shared.add(link),
          ),
          videoPlayerBuilderProvider.overrideWithValue(
            (id, title) => Text('player:$id', key: const ValueKey('player')),
          ),
        ],
        child: MaterialApp(theme: buildSpiritpediaTheme(), home: screen),
      ),
    );
    await tester.pumpAndSettle();
    return saved;
  }

  group('book', () {
    testWidgets(
      'the Amazon disclosure sits at the bottom of the purchase section',
      (tester) async {
        await pump(
          tester,
          const BookScreen(slug: 'the-power-of-now', amazonTags: _tags),
        );

        expect(find.text('The Power of Now'), findsOneWidget);
        expect(find.text('By Eckhart Tolle'), findsOneWidget);
        final amazon = find.text('Buy on Amazon');
        final goodreads = find.text('View on Goodreads');
        final disclosure = find.byKey(const ValueKey('amazon-disclosure'));
        expect(amazon, findsOneWidget);
        expect(disclosure, findsOneWidget);
        // Below every button — not directly under Amazon's.
        expect(
          tester.getTopLeft(goodreads).dy,
          greaterThan(tester.getTopLeft(amazon).dy),
        );
        expect(
          tester.getTopLeft(disclosure).dy,
          greaterThan(tester.getBottomLeft(goodreads).dy),
        );
      },
    );

    testWidgets('no tag, no disclosure — the link is still clean', (
      tester,
    ) async {
      await pump(
        tester,
        const BookScreen(slug: 'the-power-of-now', amazonTags: {}),
      );
      expect(find.text('Buy on Amazon'), findsOneWidget);
      expect(find.byKey(const ValueKey('amazon-disclosure')), findsNothing);
    });

    testWidgets('Want to Read saves on the device, and My Library shows it', (
      tester,
    ) async {
      final store = await pump(
        tester,
        const BookScreen(slug: 'the-power-of-now', amazonTags: _tags),
      );
      await tester.tap(find.text('+ Want to Read'));
      await tester.pumpAndSettle();
      expect(find.text('✓ On Your List'), findsOneWidget);
      expect(store.data[SavedKind.books], ['the-power-of-now']);

      await pump(tester, const LibraryScreen(), store: store);
      expect(find.text('Want to Read'), findsOneWidget);
      expect(find.text('The Power of Now'), findsOneWidget);
    });

    testWidgets('an unknown slug says so', (tester) async {
      await pump(tester, const BookScreen(slug: 'nope'));
      expect(
        find.text('This book is no longer on Spiritpedia.'),
        findsOneWidget,
      );
    });
  });

  testWidgets('teacher: name, badge, bio and their shelves', (tester) async {
    await pump(tester, const TeacherScreen(slug: 'eckhart-tolle'));
    expect(find.text('Eckhart Tolle'), findsWidgets);
    expect(find.text('SUPERHERO'), findsOneWidget);
    expect(find.text('Eckhart Tolle teaches presence.'), findsOneWidget);
    expect(find.text('Videos'), findsOneWidget);
    expect(find.text('Books & Literature'), findsOneWidget);
    expect(find.text('Free Resources'), findsOneWidget);
    // No contact details on file → no contact card.
    expect(find.textContaining('Book with'), findsNothing);
  });

  testWidgets('the heart saves a teacher; tapping again removes it', (
    tester,
  ) async {
    final store = await pump(
      tester,
      const TeacherScreen(slug: 'eckhart-tolle'),
    );
    // The page's own heart, in the app bar (the cards below have theirs).
    Finder heart(String tooltip) => find.descendant(
      of: find.byType(AppBar),
      matching: find.byTooltip(tooltip),
    );
    await tester.tap(heart('Save to My Library'));
    await tester.pumpAndSettle();
    expect(store.data[SavedKind.healers], ['eckhart-tolle']);
    await tester.tap(heart('Remove from My Library'));
    await tester.pumpAndSettle();
    expect(store.data[SavedKind.healers], isEmpty);
  });

  testWidgets('video: the privacy-enhanced player and a way out to YouTube', (
    tester,
  ) async {
    await pump(tester, const VideoScreen(slug: 'video-1'));
    expect(find.byKey(const ValueKey('player')), findsOneWidget);
    expect(find.text('Watch on YouTube'), findsOneWidget);
    expect(find.text('By Eckhart Tolle'), findsOneWidget);
  });

  testWidgets('offering: type badge, price and the call to action', (
    tester,
  ) async {
    await pump(tester, const OfferingScreen(slug: 'breath-course'));
    expect(find.text('COURSE'), findsOneWidget);
    expect(find.text('£99'), findsOneWidget);
    expect(find.text('Enrol Now →'), findsOneWidget);
    expect(find.text('By Wim Hof'), findsOneWidget);
  });

  testWidgets('free resource: badge and Get It Free', (tester) async {
    await pump(tester, const FreeResourceScreen(slug: 'free-meditation'));
    expect(find.text('FREE RESOURCE'), findsOneWidget);
    expect(find.text('Get It Free →'), findsOneWidget);
  });

  testWidgets('publisher: authors, then a shelf of titles per author', (
    tester,
  ) async {
    await pump(tester, const PublisherScreen(slug: 'hay-house'));
    expect(find.text('Hay House'), findsOneWidget);
    expect(find.text('Our Authors'), findsOneWidget);
    expect(find.text('Published Titles'), findsOneWidget);
    expect(find.text('The Power of Now'), findsOneWidget);
  });

  testWidgets('an empty library explains how to fill it', (tester) async {
    await pump(tester, const LibraryScreen());
    expect(find.text('Nothing saved yet.'), findsOneWidget);
  });

  testWidgets('every detail page shares its own spiritpedia.co link', (
    tester,
  ) async {
    const site = 'https://www.spiritpedia.co';
    for (final (screen, path) in <(Widget, String)>[
      (const BookScreen(slug: 'the-power-of-now'), '/books/the-power-of-now'),
      (const VideoScreen(slug: 'video-1'), '/videos/video-1'),
      (const TeacherScreen(slug: 'eckhart-tolle'), '/healers/eckhart-tolle'),
      (const PublisherScreen(slug: 'hay-house'), '/publishers/hay-house'),
      (const OfferingScreen(slug: 'breath-course'), '/offerings/breath-course'),
      (
        const FreeResourceScreen(slug: 'free-meditation'),
        '/free-resources/free-meditation',
      ),
    ]) {
      await pump(tester, screen);
      await tester.tap(find.byTooltip('Share'));
      await tester.pump();
      expect(shared.last, Uri.parse('$site$path'), reason: path);
    }
    expect(shared, hasLength(6));
  });

  testWidgets('detail pages float the star, labelled Home', (tester) async {
    await pump(tester, const BookScreen(slug: 'the-power-of-now'));
    expect(find.byType(FloatingHomeStar), findsOneWidget);
    expect(find.bySemanticsLabel('Home'), findsOneWidget);
  });
}

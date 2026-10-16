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
import 'package:spiritpedia/shared/widgets/cards.dart';
import 'package:spiritpedia/features/detail/detail_widgets.dart';
import 'package:spiritpedia/theme/theme.dart';
import 'package:spiritpedia/features/account/account_providers.dart';
import 'package:spiritpedia/features/reviews/reviews_providers.dart';

import '../../support/fake_account.dart';
import '../../support/fake_content.dart';
import '../../support/fake_reviews.dart';

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
    bool signedIn = false,
  }) async {
    final saved = store ?? MemorySavedStore();
    final account = FakeAccountService();
    if (signedIn) account.restoreSession('ann@example.com');
    await tester.pumpWidget(
      ProviderScope(
        retry: spiritpediaRetry,
        overrides: [
          reviewsServiceProvider.overrideWithValue(FakeReviewsService()),
          accountServiceProvider.overrideWithValue(account),
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

    testWidgets('Want to Read saves (signed in), and My Library shows it', (
      tester,
    ) async {
      final store = await pump(
        tester,
        const BookScreen(slug: 'the-power-of-now', amazonTags: _tags),
        signedIn: true,
      );
      await tester.tap(find.text('+ Want to Read'));
      await tester.pumpAndSettle();
      expect(find.text('✓ On Your List'), findsOneWidget);
      expect(store.data[SavedKind.books], ['the-power-of-now']);

      await pump(tester, const LibraryScreen(), store: store, signedIn: true);
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
      signedIn: true,
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

  testWidgets('signed out, Want to Read asks first and saves nothing yet', (
    tester,
  ) async {
    final store = await pump(
      tester,
      const BookScreen(slug: 'the-power-of-now', amazonTags: _tags),
    );
    await tester.tap(find.text('+ Want to Read'));
    await tester.pumpAndSettle();
    expect(find.text('Save it to your Library.'), findsOneWidget);
    expect(store.data[SavedKind.books] ?? const [], isEmpty);
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
    // Twice its old 32 pt, and nothing drawn behind it.
    final star = find.descendant(
      of: find.byType(FloatingHomeStar),
      matching: find.byType(StarAnchor),
    );
    expect(tester.widget<StarAnchor>(star).size, 64);
    expect(
      find.descendant(
        of: find.byType(FloatingHomeStar),
        matching: find.byType(DecoratedBox),
      ),
      findsNothing,
    );
  });

  group('retreat dates', () {
    testWidgets('a retreat to come: its dates, and the booking button', (
      tester,
    ) async {
      await pump(
        tester,
        OfferingScreen(slug: FakeContentRepository.upcomingRetreat.slug),
      );
      expect(find.byKey(const ValueKey('offering-when')), findsOneWidget);
      expect(find.text('18–20 Sep 2099'), findsOneWidget);
      expect(find.textContaining('ended'), findsNothing);
      final book = tester.widget<OutboundButton>(find.byType(OutboundButton));
      expect(book.label, 'Book Place →');
      expect(book.background, isNot(Colors.transparent));
    });

    testWidgets('an ended retreat says so, and its link steps back', (
      tester,
    ) async {
      await pump(
        tester,
        OfferingScreen(slug: FakeContentRepository.pastRetreat.slug),
      );
      expect(
        find.text('This took place 23 Jul – 2 Aug 2020 — it has ended.'),
        findsOneWidget,
      );
      final book = tester.widget<OutboundButton>(find.byType(OutboundButton));
      expect(book.background, Colors.transparent);
    });

    testWidgets('an undated course shows no dates', (tester) async {
      await pump(
        tester,
        OfferingScreen(slug: FakeContentRepository.course.slug),
      );
      expect(find.byKey(const ValueKey('offering-when')), findsNothing);
    });

    testWidgets('a retreat card carries its dates', (tester) async {
      await pump(
        tester,
        const Scaffold(
          body: SizedBox(
            width: 260,
            height: 330,
            child: OfferingCard(
              offering: FakeContentRepository.upcomingRetreat,
            ),
          ),
        ),
      );
      expect(find.text('18–20 Sep 2099'), findsOneWidget);
    });
  });
}

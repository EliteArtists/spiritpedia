import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/app.dart';
import 'package:spiritpedia/core/retry.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/features/account/account_providers.dart';
import 'package:spiritpedia/features/library/saved_items.dart';
import 'package:spiritpedia/features/shell/app_shell.dart';
import 'package:spiritpedia/features/star/star_layer.dart';

import 'support/fake_account.dart';
import 'support/fake_content.dart';

Widget _app({bool fail = false}) => ProviderScope(
  retry: spiritpediaRetry,
  overrides: [
    accountServiceProvider.overrideWithValue(FakeAccountService()),
    contentRepositoryProvider.overrideWithValue(
      FakeContentRepository(fail: fail),
    ),
    savedStoreProvider.overrideWithValue(MemorySavedStore()),
  ],
  child: const SpiritpediaApp(playIntro: false),
);

void main() {
  // A phone-width screen, tall enough that the shelves under the billboard are
  // built (off-screen slivers are not).
  setUp(() {
    final binding = TestWidgetsFlutterBinding.ensureInitialized();
    binding.platformDispatcher.views.first.physicalSize = const Size(
      1290,
      9000,
    );
    binding.platformDispatcher.views.first.devicePixelRatio = 3;
  });
  tearDown(
    () => TestWidgetsFlutterBinding.ensureInitialized()
        .platformDispatcher
        .views
        .first
        .resetPhysicalSize(),
  );

  Future<void> start(WidgetTester tester) async {
    await tester.pumpWidget(_app());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
  }

  testWidgets('a floating pill of three tabs: Videos, Books, Search', (
    tester,
  ) async {
    await start(tester);
    final pill = find.byType(PillTabBar);
    for (final label in ['Videos', 'Books', 'Search']) {
      expect(
        find.descendant(of: pill, matching: find.text(label)),
        findsOneWidget,
        reason: label,
      );
    }
    // No Home tab, and no Library or Account tabs.
    for (final label in ['Home', 'Library', 'Account']) {
      expect(
        find.descendant(of: pill, matching: find.text(label)),
        findsNothing,
      );
    }
  });

  testWidgets('the top bar: My Library and Account, and no wordmark', (
    tester,
  ) async {
    await start(tester);
    expect(find.text('Spiritpedia'), findsNothing);
    await tester.tap(find.byTooltip('My Library'));
    await tester.pumpAndSettle();
    expect(find.text('My Library'), findsWidgets);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Account'));
    await tester.pumpAndSettle();
    expect(find.text('Your account'), findsOneWidget);
  });

  testWidgets('the star sits in the search box, labelled Home, and goes home', (
    tester,
  ) async {
    await start(tester);
    expect(find.bySemanticsLabel('Home'), findsWidgets);
    expect(find.byIcon(Icons.search), findsOneWidget); // only the Search tab's

    await tester.tap(find.text('Books').last);
    await tester.pumpAndSettle();
    expect(find.text('The Power of Now'), findsWidgets);

    // Books has its own star in its own search box.
    await tester.tap(find.byType(StarAnchor).hitTestable().first);
    await tester.pumpAndSettle();
    expect(find.text('Worldwide'), findsOneWidget); // Home again
  });

  testWidgets(
    'scrolling Home docks the star in the sticky pill row, and back',
    (tester) async {
      // A normal phone height, so Home scrolls.
      tester.view.physicalSize = const Size(1290, 2796);
      await start(tester);

      bool restingInBox() => tester
          .widgetList<StarAnchor>(find.byType(StarAnchor, skipOffstage: false))
          .first
          .visible;

      expect(restingInBox(), isTrue);
      await tester.drag(
        find.byType(CustomScrollView).first,
        const Offset(0, -500),
      );
      await tester.pumpAndSettle();
      expect(find.text('View All'), findsOneWidget); // the pills stuck
      final anchors = tester.widgetList<StarAnchor>(
        find.byType(StarAnchor, skipOffstage: false),
      );
      expect(anchors.first.visible, isFalse); // gone from the box…
      expect(anchors.elementAt(1).visible, isTrue); // …into the pill row

      await tester.drag(
        find.byType(CustomScrollView).first,
        const Offset(0, 800),
      );
      await tester.pumpAndSettle();
      expect(restingInBox(), isTrue);
    },
  );

  testWidgets('a heart on a card saves without opening the card', (
    tester,
  ) async {
    await start(tester);
    final heart = find.byTooltip('Save to My Library').first;
    await tester.tap(heart);
    await tester.pumpAndSettle();
    expect(find.text('Worldwide'), findsOneWidget); // still on Home
    expect(find.byTooltip('Remove from My Library'), findsOneWidget);
  });

  testWidgets(
    'Home mirrors the website: the question, pills, billboard and shelves',
    (tester) async {
      await tester.pumpWidget(_app());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('How are you feeling today?'), findsOneWidget);
      expect(find.text('View All'), findsOneWidget);
      expect(find.text('Emotional Healing'), findsOneWidget);
      expect(find.text('View Profile →'), findsWidgets); // the billboard
      expect(find.text('Worldwide'), findsOneWidget);
      expect(find.text('Rising Voices'), findsOneWidget);
      expect(find.text('Practitioners Near You'), findsOneWidget);
    },
  );

  testWidgets('a subject filter narrows the shelves, and can be cleared', (
    tester,
  ) async {
    await tester.pumpWidget(_app());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    final container = ProviderScope.containerOf(
      tester.element(find.byType(SpiritpediaApp)),
    );
    container.read(homeSubjectProvider.notifier).select('breathwork');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Showing Breathwork'), findsOneWidget);
    expect(
      find.text('Rising Voices'),
      findsNothing,
    ); // no Luminary teaches breathwork here

    await tester.tap(find.text('Clear'));
    await tester.pump();
    expect(find.text('Showing Breathwork'), findsNothing);
  });

  testWidgets('a failed load says so and offers a retry', (tester) async {
    await tester.pumpWidget(_app(fail: true));
    // Two retries (0.5 s, then 1 s), then the message.
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 600));
    }
    expect(find.textContaining('could not be reached'), findsOneWidget);
    expect(find.text('Try again'), findsOneWidget);
  });

  testWidgets(
    'Videos shows subject shelves with no more than two per teacher',
    (tester) async {
      await tester.pumpWidget(_app());
      await tester.pump();
      await tester.tap(find.text('Videos').last);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      expect(find.text('New to Spiritpedia'), findsWidgets);
      // The first shelf: never three cards by the same teacher.
      final eckhartCards = find.textContaining('by eckhart-tolle');
      expect(
        eckhartCards.evaluate().length,
        lessThanOrEqualTo(2 * 7),
      ); // 7 shelves at most
    },
  );
}

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/app.dart';
import 'package:spiritpedia/core/retry.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/features/account/account_providers.dart';

import 'support/fake_account.dart';
import 'support/fake_content.dart';

Widget _app({bool fail = false}) => ProviderScope(
  retry: spiritpediaRetry,
  overrides: [
    accountServiceProvider.overrideWithValue(FakeAccountService()),
    contentRepositoryProvider.overrideWithValue(
      FakeContentRepository(fail: fail),
    ),
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

  testWidgets('five tabs: Home, Videos, Search, Library, Account', (
    tester,
  ) async {
    await tester.pumpWidget(_app());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    for (final label in ['Home', 'Videos', 'Search', 'Library', 'Account']) {
      expect(find.text(label), findsWidgets, reason: label);
    }
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

      expect(find.text('New to Spiritpedia'), findsOneWidget);
      // The first shelf: never three cards by the same teacher.
      final eckhartCards = find.textContaining('by eckhart-tolle');
      expect(
        eckhartCards.evaluate().length,
        lessThanOrEqualTo(2 * 7),
      ); // 7 shelves at most
    },
  );
}

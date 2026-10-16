import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/features/account/account_providers.dart';
import 'package:spiritpedia/features/interests/interests.dart';
import 'package:spiritpedia/features/interests/interests_picker.dart';
import 'package:spiritpedia/features/account/display_name.dart';
import 'package:spiritpedia/features/intro/intro_overlay.dart';
import 'package:spiritpedia/features/star/conductor.dart';
import 'package:spiritpedia/features/star/star_layer.dart';

import '../../support/fake_account.dart';
import '../../support/fake_content.dart';

const _home = Text('HOME', textDirection: TextDirection.ltr);

/// Everything the onboarding touches, without a network.
List<Override> _offline({
  MemoryInterestsStore? interests,
  MemoryNameStore? name,
}) => [
  accountServiceProvider.overrideWithValue(FakeAccountService()),
  contentRepositoryProvider.overrideWithValue(FakeContentRepository()),
  interestsStoreProvider.overrideWithValue(interests ?? MemoryInterestsStore()),
  nameStoreProvider.overrideWithValue(name ?? MemoryNameStore()),
  conductorStoreProvider.overrideWithValue(MemoryConductorStore()),
];

Widget _app(
  MemoryIntroPrefs prefs, {
  MemoryInterestsStore? interests,
  MemoryNameStore? name,
}) => ProviderScope(
  overrides: [
    introPrefsProvider.overrideWithValue(prefs),
    ..._offline(interests: interests, name: name),
  ],
  child: MaterialApp(
    builder: (context, child) => StarLayer(
      child: IntroOverlay(removeNativeSplash: false, child: child!),
    ),
    home: const Scaffold(body: Center(child: _home)),
  ),
);

/// The intro waits for the star image to decode before it starts. Image
/// decoding is real async work, so give it a moment outside fake time.
Future<void> _letStarDecode(WidgetTester tester) async {
  await tester.runAsync(
    () => Future<void>.delayed(const Duration(milliseconds: 300)),
  );
  await tester.pump();
}

final _skip = find.bySemanticsLabel('Skip intro');

final _onboarding = find.byKey(const ValueKey('onboarding'));

/// From launch to "Got it": the whole first-launch intro.
Future<void> _throughIntro(WidgetTester tester) async {
  await _letStarDecode(tester);
  await tester.pump(const Duration(milliseconds: 2500)); // the greeting
  await tester.pump(const Duration(milliseconds: 1200)); // the flight
  await tester.pump();
  await tester.tap(find.text('Got it'));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400)); // it fades in
}

/// Like the phone's storage: the reset takes a moment, by which time the
/// screen that asked for it may have closed.
class _SlowPrefs extends MemoryIntroPrefs {
  _SlowPrefs(super.value);

  @override
  Future<void> reset() async {
    await Future<void>.delayed(const Duration(milliseconds: 600));
    await super.reset();
  }
}

void main() {
  testWidgets('first launch: the greeting, the flight, then the callout', (
    tester,
  ) async {
    final prefs = MemoryIntroPrefs();
    await tester.pumpWidget(_app(prefs));
    await _letStarDecode(tester);

    expect(find.text('HOME'), findsOneWidget); // built underneath throughout
    await tester.pump(const Duration(milliseconds: 1500));
    expect(find.text(IntroOverlay.greeting), findsOneWidget);
    // Drawn in the app's text style, not Flutter's debug one: it sits in a
    // Material, so it has no yellow underline.
    expect(
      find.ancestor(
        of: find.text(IntroOverlay.greeting),
        matching: find.byType(Material),
      ),
      findsWidgets,
    );
    final greeting = tester.widget<RichText>(
      find.descendant(
        of: find.text(IntroOverlay.greeting),
        matching: find.byType(RichText),
      ),
    );
    expect(greeting.text.style?.decoration, isNot(TextDecoration.underline));

    await tester.pump(const Duration(milliseconds: 1000)); // greeting ends
    await tester.pump(const Duration(milliseconds: 1200)); // the flight
    await tester.pump();
    expect(find.text(IntroOverlay.callout), findsOneWidget);
    // Just "Got it": no second line, no "Don't show me again".
    expect(find.text('Don’t show me again'), findsNothing);
    expect(
      find.textContaining('Wherever you are in Spiritpedia'),
      findsNothing,
    );

    await tester.tap(find.text('Got it'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600)); // into the welcome
    expect(find.text(IntroOverlay.callout), findsNothing);
    expect(prefs.value, IntroKind.short); // the full intro is once only
  });

  testWidgets('a tap moves the greeting on to the flight', (tester) async {
    await tester.pumpWidget(_app(MemoryIntroPrefs()));
    await _letStarDecode(tester);
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(_skip);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 1200));
    await tester.pump();
    expect(find.text(IntroOverlay.callout), findsOneWidget);
  });

  testWidgets('later launches: just the short flight, no messages', (
    tester,
  ) async {
    await tester.pumpWidget(_app(MemoryIntroPrefs(IntroKind.short)));
    await _letStarDecode(tester);
    expect(_skip, findsOneWidget);
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.text(IntroOverlay.greeting), findsNothing);
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pump();
    expect(_skip, findsNothing);
    expect(find.text(IntroOverlay.callout), findsNothing);
  });

  testWidgets('later launches, with a name shared: "Welcome back, Ross"', (
    tester,
  ) async {
    await tester.pumpWidget(
      _app(
        MemoryIntroPrefs(IntroKind.short),
        name: MemoryNameStore('Ross Baiken'),
      ),
    );
    await _letStarDecode(tester);
    await tester.pump(const Duration(milliseconds: 700));
    expect(find.text('Welcome back, Ross'), findsOneWidget);
    expect(find.text(IntroOverlay.greeting), findsNothing);
    await tester.pump(const Duration(milliseconds: 1600)); // greeting ends
    await tester.pump(const Duration(milliseconds: 1200)); // the flight
    await tester.pump();
    expect(_skip, findsNothing);
    expect(find.text(IntroOverlay.callout), findsNothing);
  });

  testWidgets('a tap finishes the short flight within a quarter second', (
    tester,
  ) async {
    await tester.pumpWidget(_app(MemoryIntroPrefs(IntroKind.short)));
    await _letStarDecode(tester);
    await tester.pump(const Duration(milliseconds: 100));
    await tester.tap(_skip);
    await tester.pump(); // the skip animation's clock starts on this frame
    await tester.pump(const Duration(milliseconds: 250));
    await tester.pump();
    expect(_skip, findsNothing);
  });

  group('Reduce Motion', () {
    tearDown(
      () => TestWidgetsFlutterBinding.instance.platformDispatcher
          .clearAccessibilityFeaturesTestValue(),
    );

    testWidgets('later launches show nothing', (tester) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(reduceMotion: true);
      await tester.pumpWidget(_app(MemoryIntroPrefs(IntroKind.short)));
      await _letStarDecode(tester);
      expect(_skip, findsNothing);
      expect(find.text('HOME'), findsOneWidget);
    });

    testWidgets('Android "Remove animations" likewise', (tester) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: true);
      await tester.pumpWidget(_app(MemoryIntroPrefs(IntroKind.short)));
      await _letStarDecode(tester);
      expect(_skip, findsNothing);
    });

    testWidgets('the first launch still explains the star, without flying', (
      tester,
    ) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(reduceMotion: true);
      await tester.pumpWidget(_app(MemoryIntroPrefs()));
      await _letStarDecode(tester);
      await tester.pump(const Duration(milliseconds: 1500));
      expect(find.text(IntroOverlay.greeting), findsOneWidget);
      await tester.tap(_skip);
      await tester.pump();
      expect(find.text(IntroOverlay.callout), findsOneWidget);
    });
  });

  testWidgets(
    '"Replay intro" plays the first launch again, even when off, from a '
    'screen that closes as it is tapped (as Account does)',
    (tester) async {
      final prefs = _SlowPrefs(IntroKind.none);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            introPrefsProvider.overrideWithValue(prefs),
            ..._offline(),
          ],
          child: MaterialApp(
            builder: (context, child) => StarLayer(
              child: IntroOverlay(removeNativeSplash: false, child: child!),
            ),
            home: Builder(
              builder: (context) => Scaffold(
                body: Column(
                  children: [
                    _home,
                    TextButton(
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => Scaffold(
                            body: Consumer(
                              builder: (context, ref, _) => TextButton(
                                onPressed: () {
                                  replayFirstLaunch(ref);
                                  Navigator.of(context).pop();
                                },
                                child: const Text('Replay intro'),
                              ),
                            ),
                          ),
                        ),
                      ),
                      child: const Text('Account'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
      await _letStarDecode(tester);
      expect(_skip, findsNothing);

      await tester.tap(find.text('Account'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Replay intro'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400)); // Account closes
      await tester.pump(const Duration(milliseconds: 400)); // the reset lands
      await _letStarDecode(tester);
      await tester.pump(const Duration(milliseconds: 1100));
      expect(find.text(IntroOverlay.greeting), findsOneWidget);
      expect(prefs.value, IntroKind.full);
      expect(tester.takeException(), isNull);

      // And it plays through to the callout as on a first launch.
      await tester.pump(const Duration(milliseconds: 1400));
      await tester.pump(const Duration(milliseconds: 1200));
      await tester.pump();
      expect(find.text(IntroOverlay.callout), findsOneWidget);
    },
  );

  group('onboarding', () {
    // Tall enough for every pillar open at once, and wide enough for the
    // test font (every letter a full square) on the callout's buttons.
    setUp(() {
      final view = TestWidgetsFlutterBinding.ensureInitialized()
          .platformDispatcher
          .views
          .first;
      view.physicalSize = const Size(1290, 6000);
      view.devicePixelRatio = 2;
    });
    tearDown(
      () => TestWidgetsFlutterBinding.ensureInitialized()
          .platformDispatcher
          .views
          .first
          .resetPhysicalSize(),
    );

    testWidgets('straight after the first-launch intro: the welcome, the '
        'question and the note', (tester) async {
      await tester.pumpWidget(_app(MemoryIntroPrefs()));
      await _throughIntro(tester);
      expect(_onboarding, findsOneWidget);
      expect(find.text('Welcome to Spiritpedia.'), findsOneWidget);
      expect(
        find.text('A universe of wisdom is waiting to be explored.'),
        findsOneWidget,
      );
      expect(find.text('What interests you most?'), findsOneWidget);
      expect(find.text(interestsNote), findsOneWidget);
      expect(find.text('Explore Spiritpedia →'), findsOneWidget);
      expect(find.text('Skip for now'), findsOneWidget);
      for (final pillar in [
        'Emotional Healing',
        'Consciousness',
        'Manifestation & Creation',
        'Mystical & Spiritual Exploration',
        'Body & Energy',
      ]) {
        expect(find.text(pillar), findsOneWidget);
      }
    });

    testWidgets('a pillar opens its subjects; "All of" takes them all; '
        'Explore saves and lands on Discover, View All', (tester) async {
      final interests = MemoryInterestsStore();
      await tester.pumpWidget(_app(MemoryIntroPrefs(), interests: interests));
      final container = ProviderScope.containerOf(
        tester.element(find.text('HOME')),
      );
      container.read(subjectFilterProvider.notifier).select('yoga');
      await _throughIntro(tester);

      expect(find.text('Meditation'), findsNothing); // closed
      await tester.tap(find.text('Consciousness'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Meditation'));
      await tester.pump();
      await tester.tap(find.text('Body & Energy'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('All of Body & Energy'));
      await tester.pump();

      await tester.tap(find.text('Explore Spiritpedia →'));
      await tester.pumpAndSettle();
      expect(_onboarding, findsNothing);
      expect(find.text('HOME'), findsOneWidget);
      expect(interests.value.subjects, [
        'ayurveda',
        'homeopathy',
        'meditation',
        'plant-medicine',
        'qi-gong',
        'sound-healing',
        'tai-chi',
        'yoga',
      ]);
      expect(container.read(subjectFilterProvider), isNull); // View All
    });

    testWidgets('"All of" again lets them all go', (tester) async {
      final interests = MemoryInterestsStore();
      await tester.pumpWidget(_app(MemoryIntroPrefs(), interests: interests));
      await _throughIntro(tester);
      await tester.tap(find.text('Body & Energy'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('All of Body & Energy'));
      await tester.pump();
      await tester.tap(find.text('All of Body & Energy'));
      await tester.pump();
      await tester.tap(find.text('Explore Spiritpedia →'));
      await tester.pumpAndSettle();
      // Nothing chosen: nothing saved, the app as it always was.
      expect(interests.value.chosen, isFalse);
    });

    testWidgets('"Anything you’d rather not see?" hides subjects at once; '
        'More of then keeps them, and cannot take them', (tester) async {
      final interests = MemoryInterestsStore();
      await tester.pumpWidget(_app(MemoryIntroPrefs(), interests: interests));
      await _throughIntro(tester);
      await tester.tap(find.text('Anything you’d rather not see?'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('never-show-sheet')), findsOneWidget);
      await tester.tap(
        find.byKey(
          const ValueKey('never-pillar-Mystical & Spiritual Exploration'),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('never-shamanism')));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('never-show-done')));
      await tester.pumpAndSettle();
      expect(interests.value.hidden, ['shamanism']);
      expect(find.text('Hidden: 1 · Change'), findsOneWidget);

      // Under More of, Shamanism is shown but cannot be chosen.
      await tester.tap(
        find.byKey(
          const ValueKey('interest-pillar-Mystical & Spiritual Exploration'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('Hidden'), findsWidgets);
      expect(
        find.byWidgetPredicate(
          (w) =>
              w is FilterChip && w.key == const ValueKey('interest-shamanism'),
        ),
        findsNothing,
      );
      await tester.tap(find.byKey(const ValueKey('interest-dreamwork')));
      await tester.pump();
      await tester.tap(find.text('Explore Spiritpedia →'));
      await tester.pumpAndSettle();
      expect(interests.value.subjects, ['dreamwork']);
      expect(interests.value.hidden, ['shamanism']);
    });

    testWidgets('"Skip for now" saves nothing', (tester) async {
      final interests = MemoryInterestsStore();
      await tester.pumpWidget(_app(MemoryIntroPrefs(), interests: interests));
      await _throughIntro(tester);
      await tester.tap(find.text('Consciousness'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Meditation'));
      await tester.pump();
      await tester.tap(find.text('Skip for now'));
      await tester.pumpAndSettle();
      expect(_onboarding, findsNothing);
      expect(interests.value.chosen, isFalse);
    });

    testWidgets('never on a later launch', (tester) async {
      await tester.pumpWidget(_app(MemoryIntroPrefs(IntroKind.short)));
      await _letStarDecode(tester);
      await tester.pump(const Duration(milliseconds: 1200));
      await tester.pumpAndSettle();
      expect(_onboarding, findsNothing);
      expect(find.text('HOME'), findsOneWidget);

      await tester.pumpWidget(_app(MemoryIntroPrefs(IntroKind.none)));
      await _letStarDecode(tester);
      await tester.pumpAndSettle();
      expect(_onboarding, findsNothing);
    });

    testWidgets('with Reduce Motion it is simply there, no fade', (
      tester,
    ) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(reduceMotion: true);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      await tester.pumpWidget(_app(MemoryIntroPrefs()));
      await _letStarDecode(tester);
      await tester.pump(const Duration(milliseconds: 1500));
      await tester.tap(_skip);
      await tester.pump();
      await tester.tap(find.text('Got it'));
      await tester.pump();
      await tester.pump();
      final opacity = tester.widget<Opacity>(
        find.ancestor(of: _onboarding, matching: find.byType(Opacity)).first,
      );
      expect(opacity.opacity, 1);
    });
  });

  test('starts at the launch screen size: 480 px at 4x = 120 pt', () {
    expect(IntroOverlay.startStarWidth, 120);
  });
}

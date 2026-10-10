import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/features/intro/intro_overlay.dart';
import 'package:spiritpedia/features/star/star_layer.dart';

const _home = Text('HOME', textDirection: TextDirection.ltr);

Widget _app(MemoryIntroPrefs prefs) => ProviderScope(
  overrides: [introPrefsProvider.overrideWithValue(prefs)],
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

    await tester.pump(const Duration(milliseconds: 1000)); // greeting ends
    await tester.pump(const Duration(milliseconds: 1200)); // the flight
    await tester.pump();
    expect(find.text(IntroOverlay.callout), findsOneWidget);
    expect(find.text('Don’t show me again'), findsOneWidget);

    await tester.tap(find.text('Got it'));
    await tester.pump();
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

  testWidgets('"Don’t show me again" switches the intro off entirely', (
    tester,
  ) async {
    final prefs = MemoryIntroPrefs();
    await tester.pumpWidget(_app(prefs));
    await _letStarDecode(tester);
    await tester.tap(_skip);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 1200));
    await tester.pump();
    await tester.tap(find.text('Don’t show me again'));
    await tester.pump();
    expect(prefs.value, IntroKind.none);

    // The next launch: straight onto Home.
    await tester.pumpWidget(const SizedBox());
    await tester.pumpWidget(_app(prefs));
    await _letStarDecode(tester);
    expect(_skip, findsNothing);
    expect(find.text(IntroOverlay.greeting), findsNothing);
    expect(find.text('HOME'), findsOneWidget);
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

  test('starts at the launch screen size: 480 px at 4x = 120 pt', () {
    expect(IntroOverlay.startStarWidth, 120);
  });
}

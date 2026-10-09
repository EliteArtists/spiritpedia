import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/features/intro/intro_overlay.dart';

const _home = Text('HOME', textDirection: TextDirection.ltr);

Widget _app() => const MaterialApp(
      home: IntroOverlay(removeNativeSplash: false, child: Scaffold(body: Center(child: _home))),
    );

/// The intro waits for the star image to decode before it starts. Image
/// decoding is real async work, so give it a moment outside fake time.
Future<void> _letStarDecode(WidgetTester tester) async {
  await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 300)));
  await tester.pump();
}

void main() {
  testWidgets('plays over the home screen, then gets out of the way', (tester) async {
    await tester.pumpWidget(_app());
    await _letStarDecode(tester);

    expect(find.bySemanticsLabel('Skip intro'), findsOneWidget);
    expect(find.text('HOME'), findsOneWidget); // built underneath from the start

    await tester.pump(const Duration(milliseconds: 800)); // mid-flight
    expect(find.bySemanticsLabel('Skip intro'), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 900)); // past 1.6 s
    await tester.pump();
    expect(find.bySemanticsLabel('Skip intro'), findsNothing);
    expect(find.text('HOME'), findsOneWidget);
  });

  testWidgets('a tap skips it within a quarter of a second', (tester) async {
    await tester.pumpWidget(_app());
    await _letStarDecode(tester);
    await tester.pump(const Duration(milliseconds: 100));

    await tester.tap(find.bySemanticsLabel('Skip intro'));
    await tester.pump(); // the skip animation's clock starts on this frame
    await tester.pump(const Duration(milliseconds: 250));
    await tester.pump();
    expect(find.bySemanticsLabel('Skip intro'), findsNothing);
  });

  testWidgets('does not play at all with Reduce Motion', (tester) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(reduceMotion: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);

    await tester.pumpWidget(_app());
    await tester.pump();
    expect(find.bySemanticsLabel('Skip intro'), findsNothing);
    expect(find.text('HOME'), findsOneWidget);
  });

  testWidgets('does not play with Android "Remove animations"', (tester) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);

    await tester.pumpWidget(_app());
    await tester.pump();
    expect(find.bySemanticsLabel('Skip intro'), findsNothing);
  });

  test('starts at the launch screen size: 480 px at 4x = 120 pt', () {
    expect(IntroOverlay.startStarWidth, 120);
  });
}

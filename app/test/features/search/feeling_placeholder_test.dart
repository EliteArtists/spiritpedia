import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/features/search/feeling_placeholder.dart';

Duration ms(int n) => Duration(milliseconds: n);

Widget _box() => const ProviderScope(
  child: MaterialApp(
    home: Scaffold(body: Center(child: FeelingTypewriter())),
  ),
);

String _shown(WidgetTester tester) =>
    tester.widget<RichText>(find.byType(RichText).first).text.toPlainText();

void main() {
  group('the website\'s typewriter, worked out from the clock', () {
    test('a second\'s pause, then "I feel lost" typed at 80 ms a letter', () {
      expect(typewriterAt(ms(999)).text, '');
      expect(typewriterAt(ms(1000 + 80 * 3)).text, 'I f');
      expect(typewriterAt(ms(1000 + 80 * 11)).text, 'I feel lost');
    });

    test('held for two seconds with the cursor, then deleted without it', () {
      final typed = 1000 + 80 * 11;
      expect(typewriterAt(ms(typed + 1990)).text, 'I feel lost');
      final deleting = typewriterAt(ms(typed + 2000 + 40 * 4 + 1));
      expect(deleting.text, 'I feel ');
      expect(deleting.cursor, isFalse);
    });

    test('then the next phrase, through the list and round again', () {
      final first = 80 * 11 + 2000 + 40 * 11 + 400;
      expect(typewriterAt(ms(1000 + first + 80 * 6)).text, 'I feel');
      expect(typewriterAt(ms(1000 + first + 80 * 15)).text, 'I feel grateful');
      final all = feelingPhrases.fold(0, (t, p) => t + p.length * 120 + 2400);
      expect(typewriterAt(ms(1000 + all + 80 * 11)).text, 'I feel lost');
    });

    test('the same phrases as the website', () {
      expect(feelingPhrases, hasLength(10));
      expect(feelingPhrases.first, 'I feel lost');
      expect(feelingPhrases.last, 'I feel peaceful');
    });
  });

  testWidgets('types in the box, and reads as the question', (tester) async {
    await tester.pumpWidget(_box());
    await tester.pump(ms(1000 + 80 * 6 + 10));
    expect(_shown(tester), startsWith('I feel'));
    expect(find.bySemanticsLabel(feelingQuestion), findsOneWidget);
    await tester.pumpWidget(const SizedBox()); // stops the ticker
  });

  testWidgets('with Reduce Motion it is just the question', (tester) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(reduceMotion: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
    await tester.pumpWidget(_box());
    await tester.pump(ms(3000));
    expect(find.text(feelingQuestion), findsOneWidget);
    expect(tester.hasRunningAnimations, isFalse);
  });
}

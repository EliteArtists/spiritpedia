import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/app.dart';
import 'package:spiritpedia/core/supabase_providers.dart';

void main() {
  testWidgets('the shell shows four tabs and switches between them', (tester) async {
    await tester.pumpWidget(ProviderScope(
      // No network in tests: stand in for the live read-only connection check.
      overrides: [subjectCountProvider.overrideWith((ref) async => 42)],
      child: const SpiritpediaApp(playIntro: false),
    ));
    await tester.pumpAndSettle();

    for (final label in ['Explore', 'Search', 'My Library', 'Account']) {
      expect(find.text(label), findsWidgets, reason: label);
    }
    expect(find.text('Connected · 42 subjects'), findsOneWidget);

    await tester.tap(find.text('Search'));
    await tester.pumpAndSettle();
    expect(find.textContaining('crisis safeguard'), findsOneWidget);

    await tester.tap(find.text('Account'));
    await tester.pumpAndSettle();
    expect(find.textContaining('emailed code'), findsOneWidget);
  });

  testWidgets('a failed connection says so, rather than "Connecting…"', (tester) async {
    await tester.pumpWidget(ProviderScope(
      overrides: [
        subjectCountProvider.overrideWith((ref) async => throw Exception('offline')),
      ],
      child: const SpiritpediaApp(playIntro: false),
    ));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.textContaining('Could not reach Spiritpedia'), findsOneWidget);
    expect(find.text('Connecting…'), findsNothing);
  });
}

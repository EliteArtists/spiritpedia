import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/shared/widgets/tier_badge.dart';
import 'package:spiritpedia/theme/colors.dart';

Widget _wrap(Widget child) => MaterialApp(
  home: Scaffold(body: Center(child: child)),
);

void main() {
  testWidgets('each known tier shows its website label', (tester) async {
    const expected = {
      'superhero': 'SUPERHERO',
      'luminary': 'LUMINARY',
      'local_hero': 'LOCAL HERO',
      'ascended_master': 'ASCENDED MASTER',
    };
    for (final entry in expected.entries) {
      await tester.pumpWidget(_wrap(TierBadge(tier: entry.key)));
      expect(find.text(entry.value), findsOneWidget, reason: entry.key);
    }
  });

  testWidgets(
    'an unknown or missing tier is a neutral grey "Teacher", never another tier',
    (tester) async {
      for (final value in [null, '', 'ancient_teacher']) {
        await tester.pumpWidget(_wrap(TierBadge(tier: value)));
        expect(find.text('TEACHER'), findsOneWidget, reason: '$value');
        final box = tester.widget<DecoratedBox>(
          find.byType(DecoratedBox).first,
        );
        expect(
          (box.decoration as BoxDecoration).color,
          SpTierColors.unknownBackground,
        );
      }
    },
  );

  test('Tier.fromDb maps every database value and nothing else', () {
    expect(Tier.fromDb('superhero'), Tier.superhero);
    expect(Tier.fromDb('local_hero'), Tier.localHero);
    expect(Tier.fromDb('ascended_master'), Tier.ascendedMaster);
    expect(Tier.fromDb('Superhero'), isNull); // stored lower-case; no guessing
    expect(Tier.fromDb(null), isNull);
  });
}

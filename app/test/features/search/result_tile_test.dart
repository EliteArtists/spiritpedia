import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/features/search/search_screen.dart';

import '../../support/fake_content.dart';

void main() {
  Future<void> pumpTile(WidgetTester tester, Object item) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          contentRepositoryProvider.overrideWithValue(FakeContentRepository()),
        ],
        child: MaterialApp(home: Scaffold(body: ResultTile(item: item))),
      ),
    );
    await tester.pump();
  }

  testWidgets('Spiritpedia\'s own listing reads "Official", with no symbol', (
    tester,
  ) async {
    await pumpTile(
      tester,
      FakeContentRepository.healer(
        8,
        'spiritpedia',
        'Spiritpedia',
        'local_hero',
        entity: 'channel',
        official: true,
      ),
    );
    expect(find.text('Official'), findsOneWidget);
    expect(find.textContaining('✦'), findsNothing);
  });

  testWidgets('anyone else reads what they are and their tier', (
    tester,
  ) async {
    await pumpTile(
      tester,
      FakeContentRepository.healer(1, 'jane-doe', 'Jane Doe', 'superhero'),
    );
    expect(find.text('Teacher · Superhero'), findsOneWidget);
    expect(find.text('Official'), findsNothing);
  });
}

// The app's emotional search: the crisis gate sends nothing, the dual path
// asks first, and the rest behaves like the website's EmotionSearch.js.

import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/core/safety/emotion_safety.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/features/search/emotion_search_controller.dart';
import 'package:spiritpedia/features/search/search_repository.dart';
import 'package:spiritpedia/features/search/search_screen.dart';
import 'package:spiritpedia/theme/theme.dart';

import '../../support/fake_content.dart';

final _json = File('../web/shared/emotion-safety.json').readAsStringSync();
final _safety = EmotionSafety.parse(_json);

/// Counts every request. A crisis phrase must leave every count at zero.
class CountingSearchRepository implements SearchRepository {
  CountingSearchRepository({this.universalResults = UniversalResults.empty});

  final UniversalResults universalResults;
  final calls = <String>[];

  static const _mappings = {
    'anxious': [MappingRow('meditation', 9), MappingRow('breathwork', 7)],
    'sick': [MappingRow('quantum-healing', 6), MappingRow('meditation', 4)],
    'hopeless': [MappingRow('emotional-healing', 8)],
  };

  @override
  Future<List<MappingRow>> exactEmotion(String emotion) async {
    calls.add('exact:$emotion');
    return [...?_mappings[emotion]];
  }

  @override
  Future<List<String>> vocabulary(List<String> words) async {
    calls.add('vocabulary:${words.join(' ')}');
    return _mappings.keys.where(words.contains).toList();
  }

  @override
  Future<List<MappingRow>> forwardSubstring(String normalised) async {
    calls.add('forward:$normalised');
    return const [];
  }

  @override
  Future<UniversalResults> universal(String term) async {
    calls.add('universal:$term');
    return universalResults;
  }
}

void main() {
  const settle = Duration(milliseconds: 350);

  group('controller', () {
    late CountingSearchRepository repo;
    late EmotionSearchController search;

    setUp(() {
      repo = CountingSearchRepository();
      search = EmotionSearchController(safety: _safety, repository: repo);
    });
    tearDown(() => search.dispose());

    test(
      'every crisis phrase shows the crisis screen and sends nothing',
      () async {
        final phrases = [
          for (final p in (jsonDecode(_json)['crisisPatterns'] as List))
            for (final phrase in (p as Map)['phrases'] as List)
              phrase as String,
        ];
        expect(phrases.length, greaterThan(100));
        for (final phrase in phrases) {
          for (final typed in [
            phrase,
            'I feel $phrase',
            phrase.toUpperCase(),
          ]) {
            search.onChanged(typed);
            expect(search.view, SearchView.crisis, reason: typed);
          }
        }
        await Future<void>.delayed(settle);
        search.submit();
        await Future<void>.delayed(settle);
        expect(repo.calls, isEmpty);
      },
    );

    test('a crisis phrase cancels a search already waiting to go', () async {
      search.onChanged('anxious');
      expect(search.view, SearchView.loading);
      search.onChanged('anxious and I want to die');
      expect(search.view, SearchView.crisis);
      await Future<void>.delayed(settle);
      expect(repo.calls, isEmpty);
    });

    test('ambiguous words ask first; nothing is sent until answered', () async {
      search.onChanged('hearing voices');
      expect(search.view, SearchView.dualPath);
      await Future<void>.delayed(settle);
      expect(await search.submit(), isNull);
      expect(repo.calls, isEmpty);

      search.answerDualPath('distressing');
      expect(search.view, SearchView.crisis);
      await Future<void>.delayed(settle);
      expect(repo.calls, isEmpty);
    });

    test(
      '"exploring" searches, and falls back to that option\'s subjects',
      () async {
        search.onChanged('hearing voices');
        search.answerDualPath('exploring');
        expect(search.view, SearchView.loading);
        await Future<void>.delayed(settle);
        expect(search.view, SearchView.results);
        final option = _safety.dualPath.options.firstWhere(
          (o) => o.key == 'exploring',
        );
        expect(
          search.subjects.map((r) => r.subjectSlug),
          option.subjects.take(6),
        );
      },
    );

    test(
      'results: distinct subjects, strongest first, after the debounce',
      () async {
        search.onChanged('anxious');
        expect(repo.calls, isEmpty); // debounced
        await Future<void>.delayed(settle);
        expect(search.view, SearchView.results);
        expect(search.subjects.map((r) => r.subjectSlug), [
          'meditation',
          'breathwork',
        ]);
        expect(search.medicalDisclaimer, isNull);
        expect(await search.submit(), 'meditation');
      },
    );

    test(
      'medical subjects bring the disclaimer; despair brings the soft line',
      () async {
        search.onChanged('sick');
        await Future<void>.delayed(settle);
        expect(search.medicalDisclaimer, _safety.medicalDisclaimer);

        search.onChanged('hopeless');
        await Future<void>.delayed(settle);
        expect(search.view, SearchView.results);
        expect(search.softTier, _safety.softTierLine);
      },
    );

    test('nothing found: the gentle dead end', () async {
      search.onChanged('zzqx');
      await Future<void>.delayed(settle);
      expect(search.view, SearchView.noMatch);
    });

    test('reset returns to idle', () async {
      search.onChanged('I want to die');
      search.reset();
      expect(search.view, SearchView.idle);
      expect(search.text, '');
    });
  });

  group('screen', () {
    Future<CountingSearchRepository> pumpSearch(
      WidgetTester tester, {
      UniversalResults universal = UniversalResults.empty,
    }) async {
      final repo = CountingSearchRepository(universalResults: universal);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            emotionSafetyProvider.overrideWithValue(AsyncData(_safety)),
            searchRepositoryProvider.overrideWithValue(repo),
            contentRepositoryProvider.overrideWithValue(
              FakeContentRepository(),
            ),
          ],
          child: MaterialApp(
            theme: buildSpiritpediaTheme(),
            home: const SearchScreen(),
          ),
        ),
      );
      await tester.pump();
      return repo;
    }

    testWidgets('crisis screen first, with its way to help and its way back', (
      tester,
    ) async {
      final repo = await pumpSearch(tester);
      await tester.enterText(find.byType(TextField), 'I want to die');
      await tester.pump(settle);
      await tester.pumpAndSettle();

      final c = _safety.crisisInterstitial;
      expect(find.text(c.heading), findsOneWidget);
      expect(find.text(c.primaryLabel), findsOneWidget);
      expect(find.text(c.secondaryLabel), findsOneWidget);
      expect(repo.calls, isEmpty);

      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pump(settle);
      expect(repo.calls, isEmpty);

      await tester.tap(find.text(c.secondaryLabel));
      await tester.pumpAndSettle();
      expect(find.text(c.heading), findsNothing);
      expect(
        find.text('Tell us how you feel, in your own words.'),
        findsOneWidget,
      );
    });

    testWidgets('dual path: two options, the same weight', (tester) async {
      await pumpSearch(tester);
      await tester.enterText(find.byType(TextField), 'hearing voices');
      await tester.pumpAndSettle();
      expect(find.text(_safety.dualPath.heading), findsOneWidget);
      final sizes = [
        for (final o in _safety.dualPath.options)
          tester
              .getSize(
                find
                    .ancestor(
                      of: find.text(o.label),
                      matching: find.byType(Material),
                    )
                    .first,
              )
              .width,
      ];
      expect(sizes.toSet(), hasLength(1));
    });

    testWidgets('results with the disclaimer beneath them', (tester) async {
      await pumpSearch(tester);
      await tester.enterText(find.byType(TextField), 'sick');
      await tester.pump(settle);
      await tester.pumpAndSettle();
      expect(find.text('Quantum Healing'), findsOneWidget);
      final disclaimer = find.text(_safety.medicalDisclaimer);
      expect(disclaimer, findsOneWidget);
      expect(
        tester.getTopLeft(disclaimer).dy,
        greaterThan(tester.getTopLeft(find.text('Quantum Healing')).dy),
      );
    });

    testWidgets('universal results when no feeling matches', (tester) async {
      await pumpSearch(
        tester,
        universal: const UniversalResults(
          healers: [
            {
              'id': 1,
              'name': 'Eckhart Tolle',
              'healer_slug': 'eckhart-tolle',
              'tier': 'superhero',
              'image_urls': [],
            },
          ],
        ),
      );
      await tester.enterText(find.byType(TextField), 'eckhart');
      await tester.pump(settle);
      await tester.pumpAndSettle();
      expect(find.text('HEALERS'), findsOneWidget);
      expect(find.text('Eckhart Tolle'), findsOneWidget);
    });

    testWidgets('the dead end offers words and subjects', (tester) async {
      await pumpSearch(tester);
      await tester.enterText(find.byType(TextField), 'zzqx');
      await tester.pump(settle);
      await tester.pumpAndSettle();
      expect(
        find.text("We haven't found a match for that yet."),
        findsOneWidget,
      );
      await tester.tap(find.text('overwhelmed'));
      await tester.pump();
      expect(find.text('overwhelmed'), findsWidgets); // now in the field
    });
  });
}

import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:spiritpedia/core/safety/emotion_safety.dart';
import 'package:spiritpedia/data/models.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/data/shelf_rules.dart';
import 'package:spiritpedia/features/account/account_providers.dart';
import 'package:spiritpedia/features/search/content_search.dart';
import 'package:spiritpedia/features/search/emotion_search_controller.dart';
import 'package:spiritpedia/features/search/feeling_placeholder.dart';
import 'package:spiritpedia/features/search/search_repository.dart';
import 'package:spiritpedia/features/search/search_screen.dart';
import 'package:spiritpedia/features/star/twinkle.dart';
import 'package:spiritpedia/shared/widgets/tier_badge.dart';
import 'package:spiritpedia/theme/theme.dart';

import '../../support/fake_account.dart';
import '../../support/fake_content.dart';

final _json = File('../web/shared/emotion-safety.json').readAsStringSync();
final _safety = EmotionSafety.parse(_json);
const _settle = Duration(milliseconds: 350);

/// The feelings engine: "astrology" and "anxious" are feelings here.
class _Feelings implements SearchRepository {
  final calls = <String>[];

  static const _mappings = {
    'astrology': [MappingRow('astrology', 8)],
    'anxious': [MappingRow('meditation', 9), MappingRow('breathwork', 7)],
  };

  @override
  Future<List<MappingRow>> exactEmotion(String emotion) async {
    calls.add('exact:$emotion');
    return [...?_mappings[emotion]];
  }

  @override
  Future<List<String>> vocabulary(List<String> words) async {
    calls.add('vocabulary');
    return _mappings.keys.where(words.contains).toList();
  }

  @override
  Future<List<MappingRow>> forwardSubstring(String normalised) async {
    calls.add('forward');
    return const [];
  }

  @override
  Future<UniversalResults> universal(String term) async {
    calls.add('universal');
    return UniversalResults.empty;
  }
}

const _forecast = Video(
  id: 9,
  slug: 'september-astrology-forecast-2026',
  title: 'September Astrology Forecast 2026',
  subjectSlugs: ['astrology'],
);
const _calmVideo = Video(
  id: 3,
  slug: 'calm',
  title: 'Calm Breath',
  subjectSlugs: ['meditation', 'breathwork'],
);
const _otherVideo = Video(
  id: 4,
  slug: 'other',
  title: 'Something Else',
  subjectSlugs: ['breathwork'],
);
const _calmBook = Book(
  id: 5,
  slug: 'calm-book',
  title: 'The Calm Book',
  subjectSlugs: ['meditation'],
);

/// The plain engine: counts every read, finds the forecast by its title.
class _Plain implements ContentSearch {
  final calls = <String>[];
  final scopes = <SearchScope>[];
  Map<String, int> saves = const {};

  @override
  Future<Map<String, int>> saveCounts(String type, List<String> slugs) async {
    calls.add('saves:$type');
    return {
      for (final slug in slugs)
        if (saves[slug] != null) slug: saves[slug]!,
    };
  }

  @override
  Future<ContentResults> search(
    String term, {
    required SearchScope scope,
    required int perKind,
  }) async {
    calls.add('search:$term');
    scopes.add(scope);
    final hits = term.toLowerCase().contains('forecast');
    return groupResults(
      // A full group of three, so "See all" shows.
      videos: hits ? const [_forecast, _calmVideo, _otherVideo] : const [],
      healers: term.contains('tolle')
          ? const [
              Healer(id: 1, slug: 'eckhart-tolle', name: 'Eckhart Tolle'),
              Healer(
                id: 2,
                slug: 'tolle-tv',
                name: 'Tolle TV',
                entityType: 'channel',
              ),
            ]
          : const [],
      perKind: perKind,
      kinds: scope.kinds.toSet(),
    );
  }

  @override
  Future<List<Object>> more(String term, ResultKind kind) async {
    calls.add('more:$kind');
    return [_forecast, _calmVideo];
  }

  @override
  Future<Map<ResultKind, int>> counts(
    String term,
    Iterable<ResultKind> kinds,
  ) async {
    calls.add('counts:$term');
    const found = {
      ResultKind.books: 6,
      ResultKind.courses: 2,
      ResultKind.freeResources: 1,
    };
    return {for (final k in kinds) k: ?found[k]};
  }

  @override
  Future<FeelingMatches> forSubjects(
    List<String> subjects, {
    required SearchScope scope,
  }) async {
    calls.add('forSubjects:${subjects.join(',')}');
    return FeelingMatches(
      videos: scope.kinds.contains(ResultKind.videos)
          ? const [_otherVideo, _calmVideo]
          : const [],
      books: scope.kinds.contains(ResultKind.books)
          ? const [_calmBook]
          : const [],
    );
  }
}

void main() {
  group('the crisis intercept stays first in every search box', () {
    final phrases = [
      for (final p in (jsonDecode(_json)['crisisPatterns'] as List))
        for (final phrase in (p as Map)['phrases'] as List) phrase as String,
    ];

    for (final scope in SearchScope.values) {
      test('${scope.name}: every crisis phrase, and nothing sent by either '
          'engine', () async {
        final feelings = _Feelings();
        final plain = _Plain();
        final search = EmotionSearchController(
          safety: _safety,
          repository: feelings,
          plain: plain,
          scope: scope,
        );
        addTearDown(search.dispose);
        for (final phrase in phrases) {
          for (final typed in [phrase, 'I feel $phrase']) {
            search.onChanged(typed);
            expect(search.view, SearchView.crisis, reason: typed);
          }
        }
        await Future<void>.delayed(_settle);
        await search.submit();
        expect(await search.more(ResultKind.videos), isEmpty);
        expect(feelings.calls, isEmpty);
        expect(plain.calls, isEmpty);

        // A crisis phrase typed onto a search about to go cancels it.
        search.onChanged('september astrology forecast');
        search.onChanged('september astrology forecast i want to die');
        expect(search.view, SearchView.crisis);
        await Future<void>.delayed(_settle);
        expect(plain.calls, isEmpty);

        // The dual path asks first, in every box.
        search.onChanged('hearing voices');
        expect(search.view, SearchView.dualPath);
        await Future<void>.delayed(_settle);
        expect(plain.calls, isEmpty);
        expect(feelings.calls, isEmpty);
      });
    }
  });

  group('two engines, one box', () {
    test('a title match shows even when a word is also a feeling', () async {
      final plain = _Plain();
      final search = EmotionSearchController(
        safety: _safety,
        repository: _Feelings(),
        plain: plain,
      );
      addTearDown(search.dispose);
      search.onChanged('September Astrology Forecast 2026');
      await Future<void>.delayed(_settle);

      expect(search.view, SearchView.results);
      expect(search.subjects.map((r) => r.subjectSlug), ['astrology']);
      expect(search.content.of<Video>(ResultKind.videos).first, _forecast);
      expect(search.titlesFirst, isTrue); // the title leads the feeling
      expect(search.suggestions.video, _forecast);
    });

    test('a feeling leads when nothing is called it', () async {
      final search = EmotionSearchController(
        safety: _safety,
        repository: _Feelings(),
        plain: _Plain(),
      );
      addTearDown(search.dispose);
      search.onChanged('anxious');
      await Future<void>.delayed(_settle);
      expect(search.titlesFirst, isFalse);
      // Suggests: the video and the book that best fit the feeling.
      expect(search.suggestions.video, _calmVideo);
      expect(search.suggestions.book, _calmBook);
    });

    test('teachers and channels come back apart', () async {
      final search = EmotionSearchController(
        safety: _safety,
        repository: _Feelings(),
        plain: _Plain(),
      );
      addTearDown(search.dispose);
      search.onChanged('tolle');
      await Future<void>.delayed(_settle);
      expect(
        search.content.of<Healer>(ResultKind.teachers).map((h) => h.name),
        ['Eckhart Tolle'],
      );
      expect(
        search.content.of<Healer>(ResultKind.channels).map((h) => h.name),
        ['Tolle TV'],
      );
    });

    test(
      'the Videos box searches only videos; the Books box only books',
      () async {
        for (final (scope, kind) in [
          (SearchScope.videos, ResultKind.videos),
          (SearchScope.books, ResultKind.books),
        ]) {
          final plain = _Plain();
          final search = EmotionSearchController(
            safety: _safety,
            repository: _Feelings(),
            plain: plain,
            scope: scope,
          );
          addTearDown(search.dispose);
          search.onChanged('anxious');
          await Future<void>.delayed(_settle);
          expect(plain.scopes, [scope]);
          expect(
            search.content.kinds.every((k) => k == kind || k.isProfile),
            isTrue,
          );
          // The feeling finds that kind only.
          if (scope == SearchScope.videos) {
            expect(search.feelings.books, isEmpty);
            expect(search.suggestions.book, isNull);
            expect(search.suggestions.video, _calmVideo);
          } else {
            expect(search.feelings.videos, isEmpty);
            expect(search.suggestions.video, isNull);
            expect(search.suggestions.book, _calmBook);
          }
        }
      },
    );

    test('Videos: teachers and channels by name too, and what else the '
        'words find', () async {
      final plain = _Plain();
      final search = EmotionSearchController(
        safety: _safety,
        repository: _Feelings(),
        plain: plain,
        scope: SearchScope.videos,
      );
      addTearDown(search.dispose);
      search.onChanged('tolle');
      await Future<void>.delayed(_settle);
      expect(search.content.of<Healer>(ResultKind.teachers), hasLength(1));
      expect(search.content.of<Healer>(ResultKind.channels), hasLength(1));
      expect(search.alsoFound, {
        ResultKind.books: 6,
        ResultKind.courses: 2,
        ResultKind.freeResources: 1,
      });
    });

    test(
      'Discover counts nothing extra: it already shows everything',
      () async {
        final plain = _Plain();
        final search = EmotionSearchController(
          safety: _safety,
          repository: _Feelings(),
          plain: plain,
        );
        addTearDown(search.dispose);
        search.onChanged('tolle');
        await Future<void>.delayed(_settle);
        expect(search.alsoFound, isEmpty);
        expect(plain.calls.where((c) => c.startsWith('counts')), isEmpty);
      },
    );

    test('"See all" asks for more of that kind, for the shown text', () async {
      final plain = _Plain();
      final search = EmotionSearchController(
        safety: _safety,
        repository: _Feelings(),
        plain: plain,
      );
      addTearDown(search.dispose);
      search.onChanged('september astrology forecast');
      await Future<void>.delayed(_settle);
      expect(await search.more(ResultKind.videos), hasLength(2));
      expect(plain.calls.last, 'more:${ResultKind.videos}');
    });
  });

  group('the rules', () {
    test('groups: channels and apps apart, offerings by type', () {
      final r = groupResults(
        healers: const [
          Healer(id: 1, slug: 'a', name: 'A'),
          Healer(id: 2, slug: 'b', name: 'B', entityType: 'channel'),
          Healer(id: 3, slug: 'c', name: 'C', entityType: 'app'),
          Healer(id: 4, slug: 'd', name: 'D', entityType: 'individual'),
        ],
        offerings: const [
          Offering(id: '1', slug: '1', title: '1'),
          Offering(id: '2', slug: '2', title: '2', productType: 'retreat'),
          Offering(id: '3', slug: '3', title: '3', productType: 'download'),
          Offering(id: '4', slug: '4', title: '4', productType: 'membership'),
        ],
        perKind: 3,
      );
      expect(r.of<Healer>(ResultKind.teachers).map((h) => h.slug), ['a', 'd']);
      expect(r.of<Healer>(ResultKind.channels).map((h) => h.slug), ['b', 'c']);
      expect(r.of<Offering>(ResultKind.courses).single.id, '1');
      expect(r.of<Offering>(ResultKind.retreats).single.id, '2');
      expect(r.of<Offering>(ResultKind.downloads).single.id, '3');
      expect(r.of<Offering>(ResultKind.memberships).single.id, '4');
    });

    test('Suggests: saves break a tie, but never beat a title match', () {
      const a = Book(id: 1, slug: 'a', title: 'Calm', subjectSlugs: ['x']);
      const b = Book(id: 2, slug: 'b', title: 'Calm', subjectSlugs: ['x']);
      expect(
        suggest(
          term: 'calm',
          rows: const [],
          videos: const [],
          books: const [a, b],
          bookSaves: const {'b': 3},
        ).book,
        b,
      );
      // The cap: a thousand saves are worth no more than ten.
      expect(saveBonus(1000), saveBonus(10));
      expect(saveBonus(10), lessThan(600));
      const titled = Book(id: 3, slug: 'c', title: 'Calm Mind');
      const fitting = Book(
        id: 4,
        slug: 'd',
        title: 'Rest',
        subjectSlugs: ['x'],
      );
      expect(
        suggest(
          term: 'calm mind',
          rows: const [MappingRow('x', 9)],
          videos: const [],
          books: const [fitting, titled],
          bookSaves: const {'d': 1000},
        ).book,
        titled,
      );
      // And saves never make an irrelevant item a suggestion.
      const unrelated = Video(id: 5, slug: 'v', title: 'Gardening');
      expect(
        suggest(
          term: 'calm',
          rows: const [],
          videos: const [unrelated],
          books: const [],
          videoSaves: const {'v': 1000},
        ).video,
        isNull,
      );
    });

    test('Suggests is relevance only: a shop link changes nothing', () {
      const plain = Book(id: 1, slug: 'a', title: 'Calm', subjectSlugs: ['x']);
      const withShop = Book(
        id: 2,
        slug: 'b',
        title: 'Calm',
        subjectSlugs: ['x'],
        amazonUrl: 'https://amazon.example/b',
      );
      for (final order in [
        [plain, withShop],
        [withShop, plain],
      ]) {
        final s = suggest(
          term: 'calm',
          rows: const [],
          videos: const [],
          books: order,
        );
        expect(s.book, order.first, reason: 'a tie keeps the first');
      }
    });

    test('Suggests: a title match beats a subject fit; nothing irrelevant', () {
      const titled = Book(id: 1, slug: 'a', title: 'Astrology for Life');
      const fitting = Book(
        id: 2,
        slug: 'b',
        title: 'Stars',
        subjectSlugs: ['astrology'],
      );
      expect(
        suggest(
          term: 'astrology for life',
          rows: const [MappingRow('astrology', 9)],
          videos: const [],
          books: const [fitting, titled],
        ).book,
        titled,
      );
      expect(
        suggest(
          term: 'zz',
          rows: const [],
          videos: const [],
          books: const [fitting],
        ).book,
        isNull,
      );
    });

    test('each group leads with its best title match', () {
      const loose = Book(
        id: 1,
        slug: 'dogs',
        title:
            'Dogs That Know When Their Owners Are Coming Home & Other Powers',
      );
      const exact = Book(id: 2, slug: 'now', title: 'The Power of Now');
      expect(byTitleMatch(const [loose, exact], 'power of now'), [
        exact,
        loose,
      ]);
    });

    test('search words drop "I feel" and the little words', () {
      expect(searchWords('I feel lost in the dark'), ['lost', 'dark']);
      expect(searchWords('September Astrology Forecast 2026'), [
        'september',
        'astrology',
        'forecast',
        '2026',
      ]);
    });

    test('"Practitioners Near You" has no channels or apps', () {
      final shelves = HealerShelves(const [
        Healer(id: 1, slug: 'local', name: 'Local', tier: 'local_hero'),
        Healer(
          id: 2,
          slug: 'chan',
          name: 'Chan',
          tier: 'local_hero',
          entityType: 'channel',
        ),
      ]);
      expect(shelves.localHeroes.map((h) => h.slug), ['local']);
      expect(shelves.platforms.map((h) => h.slug), ['chan']);
    });
  });

  testWidgets('a channel wears "Channel", never a teacher\'s tier', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Column(
          children: [
            HealerBadge(tier: 'superhero', entityType: 'channel'),
            HealerBadge(tier: 'superhero', entityType: 'app'),
            HealerBadge(tier: 'superhero'),
          ],
        ),
      ),
    );
    expect(find.text('CHANNEL'), findsOneWidget);
    expect(find.text('APP'), findsOneWidget);
    expect(find.text('SUPERHERO'), findsOneWidget);
  });

  group('the screen', () {
    Future<_Plain> pump(
      WidgetTester tester, {
      SearchScope scope = SearchScope.all,
    }) async {
      final plain = _Plain();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            typewriterRunsProvider.overrideWithValue(false),
            emotionSafetyProvider.overrideWithValue(AsyncData(_safety)),
            searchRepositoryProvider.overrideWithValue(_Feelings()),
            contentSearchProvider.overrideWithValue(plain),
            accountServiceProvider.overrideWithValue(FakeAccountService()),
            contentRepositoryProvider.overrideWithValue(
              FakeContentRepository(),
            ),
          ],
          child: MaterialApp(
            theme: buildSpiritpediaTheme(),
            home: SearchScreen(scope: scope),
          ),
        ),
      );
      await tester.pump();
      return plain;
    }

    testWidgets('the star twinkles while results load', (tester) async {
      await pump(tester);
      await tester.enterText(find.byType(TextField), 'anxious');
      await tester.pump();
      expect(find.byType(TwinklingStar), findsWidgets);
      await tester.pump(_settle);
      await tester.pumpAndSettle();
      expect(find.byType(TwinklingStar), findsNothing);
    });

    testWidgets('with Reduce Motion the thinking star is a still glow', (
      tester,
    ) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(reduceMotion: true);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      await tester.pumpWidget(
        const MaterialApp(
          home: Center(child: SizedBox(width: 56, child: TwinklingStar())),
        ),
      );
      await tester.pump(const Duration(seconds: 1));
      expect(tester.hasRunningAnimations, isFalse);
    });

    testWidgets('Suggests, the title match, and "See all"', (tester) async {
      await pump(tester);
      await tester.enterText(
        find.byType(TextField),
        'September Astrology Forecast 2026',
      );
      await tester.pump(_settle);
      await tester.pumpAndSettle();

      expect(find.text('Spiritpedia Suggests'), findsOneWidget);
      expect(find.text('VIDEOS'), findsOneWidget);
      expect(find.text('FOR HOW YOU FEEL'), findsOneWidget);
      // The title's group sits above the feeling's.
      expect(
        tester.getTopLeft(find.text('VIDEOS')).dy,
        lessThan(tester.getTopLeft(find.text('FOR HOW YOU FEEL')).dy),
      );

      await tester.tap(find.text('See all'));
      await tester.pumpAndSettle();
      expect(find.text('Videos'), findsOneWidget); // the full list's title
      expect(find.text('Calm Breath'), findsOneWidget);
      await tester.tap(find.byTooltip('All results'));
      await tester.pumpAndSettle();
      expect(find.text('Spiritpedia Suggests'), findsOneWidget);
    });

    Widget app(Widget home, _Plain plain, _Feelings feelings) => ProviderScope(
      overrides: [
        typewriterRunsProvider.overrideWithValue(false),
        emotionSafetyProvider.overrideWithValue(AsyncData(_safety)),
        searchRepositoryProvider.overrideWithValue(feelings),
        contentSearchProvider.overrideWithValue(plain),
        accountServiceProvider.overrideWithValue(FakeAccountService()),
        contentRepositoryProvider.overrideWithValue(FakeContentRepository()),
      ],
      child: MaterialApp.router(
        theme: buildSpiritpediaTheme(),
        routerConfig: GoRouter(
          routes: [
            GoRoute(path: '/', builder: (_, _) => home),
            GoRoute(
              path: '/feel',
              builder: (_, state) => SearchScreen(
                standalone: true,
                initialQuery: state.extra as String?,
              ),
            ),
          ],
        ),
      ),
    );

    testWidgets('Videos: profile cards first, then "Also found … Search '
        'everywhere", which opens Discover\'s search for the same words', (
      tester,
    ) async {
      final plain = _Plain();
      await tester.pumpWidget(
        app(const SearchScreen(scope: SearchScope.videos), plain, _Feelings()),
      );
      await tester.pump();
      await tester.enterText(find.byType(TextField), 'tolle');
      await tester.pump(_settle);
      await tester.pumpAndSettle();

      expect(find.text('TEACHERS & CHANNELS'), findsOneWidget);
      expect(find.text('Eckhart Tolle'), findsOneWidget);
      expect(find.text('Tolle TV'), findsOneWidget);
      expect(
        find.textContaining(
          'Also found: 6 books, 2 courses, 1 free resource · ',
        ),
        findsOneWidget,
      );

      await tester.tap(find.textContaining('Search everywhere'));
      await tester.pumpAndSettle();
      await tester.pump(_settle);
      await tester.pumpAndSettle();
      expect(plain.scopes, [SearchScope.videos, SearchScope.all]);
      expect(plain.calls.where((c) => c == 'search:tolle'), hasLength(2));
    });

    testWidgets('words handed to the search still meet the crisis intercept '
        'first', (tester) async {
      final plain = _Plain();
      final feelings = _Feelings();
      await tester.pumpWidget(
        app(
          const SearchScreen(standalone: true, initialQuery: 'I want to die'),
          plain,
          feelings,
        ),
      );
      await tester.pump();
      await tester.pump(_settle);
      await tester.pumpAndSettle();
      expect(find.text(_safety.crisisInterstitial.heading), findsOneWidget);
      expect(plain.calls, isEmpty);
      expect(feelings.calls, isEmpty);
    });

    testWidgets('the crisis panel comes first in the Videos box too', (
      tester,
    ) async {
      final plain = await pump(tester, scope: SearchScope.videos);
      await tester.enterText(find.byType(TextField), 'I want to die');
      await tester.pump(_settle);
      await tester.pumpAndSettle();
      expect(find.text(_safety.crisisInterstitial.heading), findsOneWidget);
      expect(plain.calls, isEmpty);
    });
  });

  group('Never show (docs/personalisation.md)', () {
    EmotionSearchController hiding(Set<String> hidden, _Plain plain) {
      final search = EmotionSearchController(
        safety: _safety,
        repository: _Feelings(),
        plain: plain,
        hidden: () => Hiding(subjects: hidden),
      );
      addTearDown(search.dispose);
      return search;
    }

    test('found by name: held back, "Show anyway" shows them for this '
        'search only', () async {
      final search = hiding({'astrology'}, _Plain());
      search.onChanged('September Astrology Forecast 2026');
      await Future<void>.delayed(_settle);

      expect(search.view, SearchView.results);
      final videos = search.content.of<Video>(ResultKind.videos);
      expect(videos, isNot(contains(_forecast)));
      expect(videos, contains(_calmVideo)); // not hidden
      expect(search.heldBack.of<Video>(ResultKind.videos), [_forecast]);
      // The hidden subject is not offered as a feeling's subject either,
      // and never suggested.
      expect(search.subjects, isEmpty);
      expect(search.suggestions.video, isNot(_forecast));

      search.showHidden();
      expect(search.heldBack.isEmpty, isTrue);
      expect(search.content.of<Video>(ResultKind.videos), contains(_forecast));
      expect(await search.more(ResultKind.videos), contains(_forecast));

      // A new search starts hidden again.
      search.onChanged('September Astrology Forecast');
      await Future<void>.delayed(_settle);
      expect(search.heldBack.of<Video>(ResultKind.videos), [_forecast]);
      expect(await search.more(ResultKind.videos), isNot(contains(_forecast)));
    });

    test('only hidden matches: still results, with the note', () async {
      final search = hiding({'astrology', 'breathwork'}, _Plain());
      search.onChanged('forecast');
      await Future<void>.delayed(_settle);
      expect(search.view, SearchView.results);
      expect(search.content.isEmpty, isTrue);
      expect(search.heldBack.isEmpty, isFalse);
    });

    test('a feeling leaves hidden things out quietly — no note', () async {
      final search = EmotionSearchController(
        safety: _safety,
        repository: _Feelings(),
        plain: _Plain(),
        scope: SearchScope.videos,
        hidden: () => const Hiding(subjects: {'breathwork'}),
      );
      addTearDown(search.dispose);
      search.onChanged('anxious');
      await Future<void>.delayed(_settle);
      // Both feeling videos carry Breathwork.
      expect(search.feelings.videos, isEmpty);
      expect(search.heldBack.isEmpty, isTrue);
      expect(search.subjects.map((r) => r.subjectSlug), ['meditation']);
    });

    test('the crisis intercept is untouched by it', () async {
      final plain = _Plain();
      final search = hiding({'meditation', 'breathwork'}, plain);
      search.onChanged('I want to die');
      expect(search.view, SearchView.crisis);
      await Future<void>.delayed(_settle);
      expect(plain.calls, isEmpty);
    });
  });
}

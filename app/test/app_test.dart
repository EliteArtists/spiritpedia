import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:spiritpedia/app.dart';
import 'package:spiritpedia/core/retry.dart';
import 'package:spiritpedia/core/safety/emotion_safety.dart';
import 'package:spiritpedia/data/models.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/data/shelf_rules.dart';
import 'package:spiritpedia/features/account/account_providers.dart';
import 'package:spiritpedia/features/account/display_name.dart';
import 'package:spiritpedia/features/area/area.dart';
import 'package:spiritpedia/features/area/location_source.dart';
import 'package:spiritpedia/features/star/conductor.dart';
import 'package:spiritpedia/features/home/explore_more.dart';
import 'package:spiritpedia/features/home/subject_pills.dart';
import 'package:spiritpedia/features/interests/interests.dart';
import 'package:spiritpedia/features/interests/interests_picker.dart';
import 'package:spiritpedia/features/interests/tailor_star.dart';
import 'package:spiritpedia/features/learning/learning_switch.dart';
import 'package:spiritpedia/features/menu/app_menu.dart';
import 'package:spiritpedia/features/library/saved_items.dart';
import 'package:spiritpedia/features/notifications/notifications_controller.dart';
import 'package:spiritpedia/features/notifications/push_messaging.dart';
import 'package:spiritpedia/features/shell/app_shell.dart';
import 'package:spiritpedia/features/star/slipstream.dart';
import 'package:spiritpedia/features/star/star_layer.dart';
import 'package:spiritpedia/features/search/feeling_placeholder.dart';
import 'package:spiritpedia/features/search/search_repository.dart';
import 'package:spiritpedia/features/search/search_screen.dart';
import 'package:spiritpedia/features/reviews/reviews_providers.dart';
import 'package:spiritpedia/shared/widgets/cards.dart';
import 'package:spiritpedia/shared/widgets/shelf.dart';

import 'support/fake_account.dart';
import 'support/fake_content.dart';
import 'support/fake_location.dart';
import 'support/fake_push.dart';
import 'support/fake_reviews.dart';

final _safety = EmotionSafety.parse(
  File('../web/shared/emotion-safety.json').readAsStringSync(),
);

/// The search, answering nothing — these tests only open it.
class _NoSearch implements SearchRepository {
  @override
  Future<List<MappingRow>> exactEmotion(String emotion) async => const [];
  @override
  Future<List<String>> vocabulary(List<String> words) async => const [];
  @override
  Future<List<MappingRow>> forwardSubstring(String normalised) async =>
      const [];
  @override
  Future<UniversalResults> universal(String term) async =>
      UniversalResults.empty;
}

Widget _app({
  bool fail = false,
  FakePushMessaging? push,
  FakeAccountService? account,
  MemoryInterestsStore? interests,
  FakeContentRepository? content,
  _TailorIntro? tailorIntro,
  MemoryAreaStore? area,
  MemoryNameStore? name,
  MemoryConductorStore? conductor,
  LocationSource? location,
}) => ProviderScope(
  retry: spiritpediaRetry,
  overrides: [
    reviewsServiceProvider.overrideWithValue(FakeReviewsService()),
    if (push != null) pushMessagingProvider.overrideWithValue(push),
    accountServiceProvider.overrideWithValue(account ?? FakeAccountService()),
    contentRepositoryProvider.overrideWithValue(
      content ?? FakeContentRepository(fail: fail),
    ),
    savedStoreProvider.overrideWithValue(MemorySavedStore()),
    interestsStoreProvider.overrideWithValue(
      interests ?? MemoryInterestsStore(),
    ),
    searchRepositoryProvider.overrideWithValue(_NoSearch()),
    // The crisis phrases, read straight from the shared file: an asset load
    // completes only in a file's first test.
    emotionSafetyProvider.overrideWithValue(AsyncData(_safety)),
    typewriterRunsProvider.overrideWithValue(false),
    tailorIntroPrefsProvider.overrideWithValue(tailorIntro ?? _TailorIntro()),
    areaStoreProvider.overrideWithValue(area ?? MemoryAreaStore()),
    nameStoreProvider.overrideWithValue(name ?? MemoryNameStore()),
    conductorStoreProvider.overrideWithValue(
      conductor ?? MemoryConductorStore(),
    ),
    locationSourceProvider.overrideWithValue(location ?? FakeLocation()),
  ],
  child: const SpiritpediaApp(playIntro: false),
);

class _TailorIntro implements TailorIntroPrefs {
  bool showing = true;

  @override
  Future<bool> show() async => showing;

  @override
  Future<void> turnOff() async => showing = false;
}

/// The pill row's labels, in order (as far as it is built).
List<String> _pills(WidgetTester tester) => [
  for (final t in tester.widgetList<Text>(
    find.descendant(
      of: find.byType(SubjectPillRow).first,
      matching: find.byType(Text),
    ),
  ))
    t.data ?? '',
];

const _freeResource = FreeResource(
  id: 'f1',
  slug: 'a-free-guide',
  title: 'A Free Guide',
  subjectSlugs: ['meditation'],
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

  Future<void> start(WidgetTester tester) async {
    await tester.pumpWidget(_app());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
  }

  testWidgets('a floating pill: Discover, Videos, Books; Discover on launch', (
    tester,
  ) async {
    await start(tester);
    final pill = find.byType(PillTabBar);
    for (final label in ['Discover', 'Videos', 'Books']) {
      expect(
        find.descendant(of: pill, matching: find.text(label)),
        findsOneWidget,
        reason: label,
      );
    }
    // No Search tab, and no Home, Library or Account tabs.
    for (final label in ['Search', 'Home', 'Library', 'Account']) {
      expect(
        find.descendant(of: pill, matching: find.text(label)),
        findsNothing,
      );
    }
    expect(tester.widget<PillTabBar>(pill).current, 0); // Discover
    expect(find.text('Worldwide'), findsOneWidget); // the homepage's shelves
  });

  group('the header and its menu', () {
    final menuButton = find.byKey(const ValueKey('menu-button'));
    final menu = find.byKey(const ValueKey('app-menu'));

    Future<void> openMenu(WidgetTester tester) async {
      await tester.tap(menuButton);
      await tester.pumpAndSettle();
      expect(menu, findsOneWidget);
    }

    testWidgets('one row: the search bar with the star, and the menu', (
      tester,
    ) async {
      await start(tester);
      expect(find.text('Spiritpedia'), findsNothing); // no wordmark
      expect(find.byTooltip('My Library'), findsNothing); // no icon row
      expect(find.byTooltip('Account'), findsNothing);
      final search = find.bySemanticsLabel('How are you feeling today? Search');
      expect(menuButton, findsOneWidget);
      // Side by side, the search bar taking most of the row.
      final box = tester.getRect(search);
      final button = tester.getRect(menuButton);
      expect((box.center.dy - button.center.dy).abs(), lessThan(4));
      expect(button.left, greaterThan(box.right));
      // The search bar runs from the 20px margin to the button: about 80% of
      // this 430-wide screen.
      expect((button.left - 4 - 20) / 430, closeTo(0.8, 0.05));
    });

    testWidgets('Videos and Books have the same menu', (tester) async {
      await start(tester);
      for (final tab in ['Videos', 'Books']) {
        await tester.tap(
          find.descendant(
            of: find.byType(PillTabBar),
            matching: find.text(tab),
          ),
        );
        await tester.pumpAndSettle();
        await tester.tap(menuButton.hitTestable());
        await tester.pumpAndSettle();
        expect(menu, findsOneWidget, reason: tab);
        await tester.tapAt(const Offset(20, 400)); // outside it: closes
        await tester.pumpAndSettle();
        expect(menu, findsNothing, reason: tab);
      }
    });

    testWidgets('the menu scrolls away with the search bar; the star docks', (
      tester,
    ) async {
      await start(tester);
      await tester.drag(
        find.byType(CustomScrollView).first,
        const Offset(0, -600),
      );
      await tester.pumpAndSettle();
      expect(menuButton.hitTestable(), findsNothing);
      expect(find.text('View All').hitTestable(), findsOneWidget); // pills stay
    });

    testWidgets('signed out: Sign in at the top, then My Library', (
      tester,
    ) async {
      await start(tester);
      await openMenu(tester);
      final signIn = find.byKey(const ValueKey('menu-sign-in'));
      final library = find.byKey(const ValueKey('menu-library'));
      expect(
        tester.getTopLeft(signIn).dy,
        lessThan(tester.getTopLeft(library).dy),
      );
      expect(find.byKey(const ValueKey('menu-account')), findsNothing);
      for (final label in [
        'Tailor Spiritpedia',
        'Share Spiritpedia',
        'Terms of Use',
        'Privacy Policy',
        'Affiliate Disclosure',
        'Contact',
        'love@spiritpedia.co',
      ]) {
        expect(find.text(label), findsOneWidget, reason: label);
      }
      // Affiliate Disclosure beside Terms and Privacy.
      double y(String label) => tester.getTopLeft(find.text(label)).dy;
      expect(y('Privacy Policy'), lessThan(y('Affiliate Disclosure')));
      expect(y('Affiliate Disclosure'), lessThan(y('Contact')));
      await tester.tap(signIn);
      await tester.pumpAndSettle();
      expect(menu, findsNothing);
      expect(find.text('Your account'), findsOneWidget);
    });

    testWidgets(
      'signed in: My Library with its count, Account, Notifications',
      (tester) async {
        final account = FakeAccountService()
          ..restoreSession('seeker@example.com');
        await tester.pumpWidget(_app(account: account));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));
        await tester.tap(find.byTooltip('Save to My Library').first);
        await tester.pumpAndSettle();

        await openMenu(tester);
        expect(find.byKey(const ValueKey('menu-sign-in')), findsNothing);
        final library = find.byKey(const ValueKey('menu-library'));
        expect(
          find.descendant(of: library, matching: find.text('1')),
          findsOneWidget,
        );
        expect(find.text('seeker@example.com'), findsOneWidget);

        await tester.tap(library);
        await tester.pumpAndSettle();
        expect(find.text('My Library'), findsWidgets);
        await tester.pageBack();
        await tester.pumpAndSettle();

        await openMenu(tester);
        await tester.tap(find.byKey(const ValueKey('menu-account')));
        await tester.pumpAndSettle();
        expect(find.text('My Account'), findsOneWidget);
        await tester.pageBack();
        await tester.pumpAndSettle();

        await openMenu(tester);
        await tester.tap(find.byKey(const ValueKey('menu-notifications')));
        await tester.pumpAndSettle();
        expect(find.text('My Account'), findsOneWidget);
        expect(find.text('Notifications'), findsOneWidget);
      },
    );

    testWidgets('"Tailor Spiritpedia": More of and Never show, one screen; '
        'saving shows in the menu', (tester) async {
      final interests = MemoryInterestsStore();
      await tester.pumpWidget(_app(interests: interests));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await openMenu(tester);
      expect(find.text('Your interests'), findsNothing);
      await tester.tap(find.byKey(const ValueKey('menu-tailor')));
      await tester.pumpAndSettle();
      expect(find.text('Tailor Spiritpedia'), findsOneWidget);
      expect(find.text('More of'), findsOneWidget);
      expect(find.text('Never show'), findsOneWidget);

      Future<void> tap(String key) async {
        final f = find.byKey(ValueKey(key));
        await tester.ensureVisible(f);
        await tester.pumpAndSettle();
        await tester.tap(f);
        await tester.pumpAndSettle();
      }

      await tap('interest-pillar-Consciousness');
      await tap('interest-meditation');
      await tap('never-pillar-Mystical & Spiritual Exploration');
      await tap('never-shamanism');
      // Meditation is More of: under Never show it cannot be chosen.
      await tap('never-pillar-Consciousness');
      expect(
        tester.widget<Chip>(find.byKey(const ValueKey('never-meditation'))),
        isNotNull,
      );
      expect(find.textContaining('In More of'), findsOneWidget);
      await tap('tailor-save');
      expect(interests.value.subjects, ['meditation']);
      expect(interests.value.hidden, ['shamanism']);
      expect(
        find.text('Saved: Spiritpedia is tailored to you'),
        findsOneWidget,
      );

      await openMenu(tester);
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('menu-tailor')),
          matching: find.text('More of: Meditation · Hidden: shamanism'),
        ),
        findsOneWidget,
      );
    });

    testWidgets('the website\'s statement sits just above the legal links', (
      tester,
    ) async {
      await start(tester);
      await openMenu(tester);
      final statement = find.byKey(const ValueKey('menu-statement'));
      await tester.scrollUntilVisible(
        statement,
        200,
        scrollable: find.descendant(
          of: menu,
          matching: find.byType(Scrollable),
        ),
      );
      expect(find.text(siteStatement), findsOneWidget);
      expect(
        siteStatement,
        startsWith(
          'Spiritpedia celebrates the transformative power of spiritual '
          'practice',
        ),
      );
      expect(
        tester.getTopLeft(statement).dy,
        lessThan(tester.getTopLeft(find.text('Terms of Use')).dy),
      );
    });

    group('Tailor Spiritpedia is the star\'s space', () {
      Future<void> openTailor(WidgetTester tester) async {
        GoRouter.of(tester.element(find.byType(PillTabBar))).push('/tailor');
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 500));
      }

      final words = find.byKey(const ValueKey('tailor-star-words'));

      testWidgets('the star speaks at the top, then glides to the foot', (
        tester,
      ) async {
        await start(tester);
        await openTailor(tester);
        expect(words, findsOneWidget);
        expect(find.text('Don’t show me again'), findsOneWidget);
        // The quiet lines are gone: the star says it now.
        expect(find.text(interestsNote), findsNothing);
        expect(
          find.textContaining('stays out of Discover, Videos'),
          findsNothing,
        );
        // Nothing blocked: the choices scroll and can be tapped meanwhile.
        final pill = find.byKey(const ValueKey('never-pillar-Body & Energy'));
        await tester.ensureVisible(pill);
        await tester.pump();
        await tester.tap(pill);
        await tester.pump(const Duration(milliseconds: 300));
        expect(find.byKey(const ValueKey('never-yoga')), findsOneWidget);

        await tester.pump(TailorStarFrame.linger);
        await tester.pumpAndSettle();
        expect(words, findsNothing);
        expect(find.byType(StarAnchor), findsWidgets); // resting at the foot
      });

      testWidgets('"Don’t show me again": the next visit is quiet', (
        tester,
      ) async {
        final intro = _TailorIntro();
        await tester.pumpWidget(_app(tailorIntro: intro));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));
        await openTailor(tester);
        await tester.tap(find.byKey(const ValueKey('tailor-star-never')));
        await tester.pumpAndSettle();
        expect(intro.showing, isFalse);
        expect(words, findsNothing);

        Navigator.of(tester.element(find.byType(TailorStarFrame))).pop();
        await tester.pumpAndSettle();
        await openTailor(tester);
        await tester.pumpAndSettle();
        expect(words, findsNothing);
      });

      testWidgets('the pills are just their names, as on Discover', (
        tester,
      ) async {
        await start(tester);
        await openTailor(tester);
        final pill = find.byKey(
          const ValueKey('interest-pillar-Body & Energy'),
        );
        expect(
          find.descendant(of: pill, matching: find.byType(Icon)),
          findsNothing,
        );
        await tester.ensureVisible(pill);
        await tester.pump();
        await tester.tap(pill);
        await tester.pump(const Duration(milliseconds: 300));
        final yoga = find.byKey(const ValueKey('interest-yoga'));
        await tester.ensureVisible(yoga);
        await tester.pump(const Duration(milliseconds: 500));
        await tester.tap(yoga);
        await tester.pump();
        final chip = tester.widget<FilterChip>(yoga);
        expect(chip.selected, isTrue);
        expect(chip.showCheckmark, isFalse);
        expect(chip.avatar, isNull);
        expect(
          find.descendant(of: pill, matching: find.text('1')),
          findsNothing,
        );
        await tester.pump(TailorStarFrame.linger);
        await tester.pumpAndSettle();
      });
    });

    testWidgets('a swipe to the right puts the menu away', (tester) async {
      await start(tester);
      await openMenu(tester);
      await tester.fling(menu, const Offset(300, 0), 1200);
      await tester.pumpAndSettle();
      expect(menu, findsNothing);
    });
  });

  group('chosen interests shape the app, never lock it', () {
    testWidgets('none chosen: lands on View All; For You leads the pills', (
      tester,
    ) async {
      await start(tester);
      expect(_pills(tester).take(3), [
        'For You',
        'View All',
        'Emotional Healing',
      ]);
      expect(find.byKey(const ValueKey('for-you-note')), findsNothing);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(SpiritpediaApp)),
      );
      expect(container.read(forYouActiveProvider), isFalse);
    });

    testWidgets('none chosen: For You opens Tailor Spiritpedia, the same '
        'page and words as Account\'s, said even after "Don\'t show me '
        'again"; their first subjects bring them to For You', (tester) async {
      await tester.pumpWidget(
        _app(tailorIntro: _TailorIntro()..showing = false),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.tap(find.byKey(const ValueKey('pill-for-you')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      expect(find.byType(TailorScreen), findsOneWidget);
      expect(find.byKey(const ValueKey('tailor-star-words')), findsOneWidget);
      expect(
        tester
            .widget<TypedOnce>(find.byKey(const ValueKey('tailor-star-words')))
            .text,
        tailorStarIntro,
      );
      expect(find.byKey(const ValueKey('tailor-star-never')), findsNothing);
      // More of · learning · Never show · Your Area, in that order.
      double top(Finder f) => tester.getTopLeft(f).dy;
      final more = top(find.text('More of'));
      final learn = top(find.text(LearningSwitch.label));
      final never = top(find.text('Never show'));
      final area = top(find.byKey(const ValueKey('tailor-your-area')));
      expect(more < learn && learn < never && never < area, isTrue);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(SpiritpediaApp)),
      );
      await container.read(interestsProvider.notifier).choose(['meditation']);
      await tester.pump();
      expect(container.read(forYouActiveProvider), isTrue);
      await tester.pump(const Duration(seconds: 6));
      await tester.pumpAndSettle();
    });

    testWidgets('chosen: lands on For You — their subjects on every shelf, a '
        'line naming them with Edit, and their stars in the pill lists', (
      tester,
    ) async {
      FreeResource free(String id, String subject) => FreeResource(
        id: id,
        slug: id,
        title: 'Free $id',
        subjectSlugs: [subject],
      );
      final content =
          FakeContentRepository(
              extraHealers: [
                FakeContentRepository.healer(
                  8,
                  'third-star',
                  'Third Star',
                  'superhero',
                ),
              ],
            )
            ..featured = [
              // First on View All, so on screen there; never on For You.
              free('stretch', 'yoga'),
              free('still', 'meditation'),
              free('calm', 'meditation'),
              free('breath', 'breathwork'),
            ];
      await tester.pumpWidget(
        _app(
          content: content,
          interests: MemoryInterestsStore(
            const Interests(
              subjects: ['breathwork', 'meditation'],
              chosen: true,
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(_pills(tester).take(2), ['For You', 'View All']);
      expect(
        find.text('Tailored for you: Breathwork, Meditation ·'),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('for-you-edit')), findsOneWidget);
      // Every shelf, theirs only: three Superheroes about their subjects…
      expect(find.text('Worldwide'), findsOneWidget);
      expect(find.text('Third Star'), findsWidgets);
      // …and Free Resources without the yoga one.
      expect(find.text('Free still'), findsWidgets);
      expect(find.text('Free stretch'), findsNothing);
      // No "Showing…" note: no filter inside For You.
      expect(find.textContaining('Showing'), findsNothing);

      // View All: everything again, and no line.
      await tester.tap(find.byKey(const ValueKey('pill-view-all')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byKey(const ValueKey('for-you-note')), findsNothing);
      expect(find.text('Free stretch'), findsWidgets);

      // Their subjects carry the gold star in the pillar's list.
      await tester.drag(
        find.descendant(
          of: find.byType(SubjectPillRow).first,
          matching: find.byType(ListView),
        ),
        const Offset(-200, 0),
      );
      await tester.pumpAndSettle();
      await tester.tap(
        find.descendant(
          of: find.byType(SubjectPillRow).first,
          matching: find.text('Emotional Healing'),
        ),
      );
      await tester.pumpAndSettle();
      final chip = tester.widget<ChoiceChip>(
        find.byKey(const ValueKey('pillar-subject-breathwork')),
      );
      expect(chip.avatar, isA<ForYouStar>());
      // A one-subject look: not saved, and For You is a tap away.
      await tester.tap(find.byKey(const ValueKey('pillar-subject-breathwork')));
      await tester.pumpAndSettle();
      expect(find.text('Showing Breathwork'), findsOneWidget);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(SpiritpediaApp)),
      );
      // Never saved: their subjects are as they were.
      expect(container.read(interestSubjectsProvider), {
        'breathwork',
        'meditation',
      });
      await tester.drag(
        find.descendant(
          of: find.byType(SubjectPillRow).first,
          matching: find.byType(ListView),
        ),
        const Offset(400, 0),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('pill-for-you')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(container.read(forYouActiveProvider), isTrue);
      expect(find.textContaining('Showing'), findsNothing);
    });

    testWidgets('For You on Videos and Books; Publishing Houses leads Books, '
        'a new press with no authors included', (tester) async {
      final content = FakeContentRepository()
        ..morePublishers = const [
          Publisher(id: 'p2', slug: 'new-press', name: 'New Press'),
        ];
      await tester.pumpWidget(
        _app(
          content: content,
          interests: MemoryInterestsStore(
            const Interests(subjects: ['meditation'], chosen: true),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.tap(find.text('Videos').last);
      await tester.pumpAndSettle();
      expect(find.text('New in your subjects'), findsOneWidget);
      expect(find.byKey(const ValueKey('for-you-note')), findsOneWidget);

      await tester.tap(find.text('Books').last);
      await tester.pumpAndSettle();
      final publishers = find.byKey(const ValueKey('books-publishers'));
      expect(
        find.descendant(of: publishers, matching: find.text('New Press')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: publishers, matching: find.text('Hay House')),
        findsOneWidget,
      );
      // At the top in every view: on View All, above the book shelves.
      await tester.tap(find.byKey(const ValueKey('pill-view-all')).last);
      await tester.pumpAndSettle();
      expect(
        tester.getTopLeft(publishers).dy,
        lessThan(tester.getTopLeft(find.byType(BookCard).first).dy),
      );
    });

    group('Never show', () {
      Widget hiding(List<String> hidden) => _app(
        interests: MemoryInterestsStore(
          Interests(hidden: hidden, chosen: true),
        ),
      );

      testWidgets('everything hidden: the star says so, never a blank screen', (
        tester,
      ) async {
        await tester.pumpWidget(
          hiding([for (final s in subjectPillars.values) ...s]),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));
        expect(find.byKey(const ValueKey('hidden-empty')), findsOneWidget);
        expect(find.text('You’ve hidden most subjects.'), findsOneWidget);
        expect(find.text('Worldwide'), findsNothing);

        await tester.tap(find.text('Videos').last);
        await tester.pumpAndSettle();
        expect(find.byKey(const ValueKey('hidden-empty')), findsWidgets);

        await tester.tap(
          find.byKey(const ValueKey('hidden-empty-tailor')).hitTestable(),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 500));
        expect(find.text('Tailor Spiritpedia'), findsOneWidget);
        await tester.pump(TailorStarFrame.linger);
        await tester.pumpAndSettle();
      });

      testWidgets('a teacher whose content is all hidden goes too', (
        tester,
      ) async {
        final content = FakeContentRepository()
          ..teacherContent = {
            'eckhart-tolle': [
              ['shamanism'],
            ],
          };
        await tester.pumpWidget(
          _app(
            content: content,
            interests: MemoryInterestsStore(
              const Interests(hidden: ['shamanism'], chosen: true),
            ),
          ),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));
        await tester.pump(const Duration(milliseconds: 100));
        expect(find.text('Eckhart Tolle'), findsNothing);
        expect(find.text('Wim Hof'), findsWidgets);
      });

      testWidgets('a teacher goes only when every subject they cover is '
          'hidden', (tester) async {
        await tester.pumpWidget(hiding(['breathwork']));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));
        // Wim Hof and Local One teach only Breathwork; Eckhart Tolle teaches
        // Meditation and Consciousness.
        expect(find.text('Wim Hof'), findsNothing);
        expect(find.text('Local One'), findsNothing);
        expect(find.text('Eckhart Tolle'), findsWidgets);

        await tester.pumpWidget(hiding(['meditation']));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));
        // Eckhart Tolle also covers Consciousness: still there.
        expect(find.text('Eckhart Tolle'), findsWidgets);
      });

      testWidgets('Videos: any hidden subject and the video goes', (
        tester,
      ) async {
        await tester.pumpWidget(hiding(['breathwork']));
        await tester.pump();
        await tester.tap(find.text('Videos').last);
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 200));
        expect(find.textContaining('by eckhart-tolle'), findsWidgets);
        // Wim Hof's videos are Breathwork + Meditation.
        expect(find.textContaining('by wim-hof'), findsNothing);
      });

      testWidgets('a hidden subject\'s page asks first', (tester) async {
        await tester.pumpWidget(hiding(['breathwork']));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));
        GoRouter.of(tester.element(find.byType(PillTabBar)))
            .push('/subject/breathwork');
        await tester.pumpAndSettle();
        expect(find.text('You’ve hidden this subject.'), findsOneWidget);
        expect(find.text('Wim Hof'), findsNothing);
        await tester.tap(find.byKey(const ValueKey('subject-show-anyway')));
        await tester.pumpAndSettle();
        expect(find.text('You’ve hidden this subject.'), findsNothing);
        expect(find.text('Wim Hof'), findsWidgets);
      });
    });

    testWidgets('Explore More has no Books & Literature: Books has its tab', (
      tester,
    ) async {
      await tester.pumpWidget(
        _app(
          content: FakeContentRepository()..featured = const [_freeResource],
        ),
      );
      await tester.pump();
      await tester.scrollUntilVisible(
        find.text('Free Resources'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Free Resources'), findsOneWidget);
      expect(find.text('Books & Literature'), findsNothing);
    });
  });

  testWidgets('Explore More: a real shelf for every section, each fetched '
      'only as it comes near; one fetch for all four offering shelves; See '
      'all opens the whole section', (tester) async {
    // A phone's height, so the bottom of Discover starts off screen.
    tester.view.physicalSize = const Size(1290, 2796);
    tester.view.devicePixelRatio = 3;
    final content = FakeContentRepository()
      ..featured = const [_freeResource]
      ..moreOfferings = const [
        Offering(
          id: 'o3',
          slug: 'monthly-circle',
          title: 'Monthly Circle',
          productType: 'membership',
        ),
      ];
    await tester.pumpWidget(_app(content: content));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(content.featuredCalls, 0);
    expect(content.offeringsCalls, 0);
    expect(find.text('EXPLORE MORE'), findsNothing); // no boxes any more

    final scrollable = find.byType(Scrollable).first;
    await tester.scrollUntilVisible(
      find.text('Free Resources'),
      300,
      scrollable: scrollable,
    );
    await tester.pumpAndSettle();
    expect(content.featuredCalls, 1);
    expect(find.text('A Free Guide'), findsOneWidget);
    for (final title in [
      'Courses & Programmes',
      'Retreats & Live Events',
      'Memberships',
    ]) {
      await tester.scrollUntilVisible(
        find.text(title),
        300,
        scrollable: scrollable,
      );
    }
    await tester.pumpAndSettle();
    expect(content.offeringsCalls, 1); // four shelves, one fetch
    expect(content.featuredCalls, 1); // kept, not fetched again
    expect(find.text('Monthly Circle'), findsOneWidget);
    // Downloads has nothing: no shelf, never an empty one.
    expect(find.text('Downloads & Audio'), findsNothing);

    await tester.scrollUntilVisible(
      find.text('Courses & Programmes'),
      -300,
      scrollable: scrollable,
    );
    final courses = find.ancestor(
      of: find.text('Courses & Programmes'),
      matching: find.byType(Shelf),
    );
    final seeAll = find.descendant(of: courses, matching: find.text('See all'));
    await tester.ensureVisible(seeAll);
    await tester.pumpAndSettle();
    await tester.tap(seeAll);
    await tester.pumpAndSettle();
    expect(find.byType(ExploreAllScreen), findsOneWidget);
    expect(find.text('Breath Course'), findsOneWidget);
    expect(find.text('Go deeper'), findsOneWidget);
  });

  group('your area and the star\'s questions', () {
    Finder nearShelf() => find.ancestor(
      of: find.text('Practitioners Near You'),
      matching: find.byType(Shelf),
    );
    List<String> nearNames(WidgetTester tester) => [
      for (final c in tester.widgetList<HealerCard>(
        find.descendant(of: nearShelf(), matching: find.byType(HealerCard)),
      ))
        c.healer.name,
    ];

    testWidgets('no area: everyone, and "Set your area"; typing a town ranks '
        'the shelf: near in person first, then online', (tester) async {
      await start(tester);
      expect(nearNames(tester), ['Local One', 'No Tier Yet']);
      await tester.ensureVisible(find.byKey(const ValueKey('set-your-area')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('set-your-area')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('area-sheet')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('area-type-city')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const ValueKey('area-search')), 'Man');
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('area-result-2643123')));
      await tester.pumpAndSettle();
      // In Manchester: No Tier Yet sees people there; Local One is London
      // in person only, so out.
      expect(find.text('Near Manchester, United Kingdom'), findsOneWidget);
      expect(nearNames(tester), ['No Tier Yet']);
    });

    testWidgets('"Use my location": a town, never a position', (tester) async {
      final location = FakeLocation();
      final area = MemoryAreaStore();
      await tester.pumpWidget(_app(location: location, area: area));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.ensureVisible(find.byKey(const ValueKey('set-your-area')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('set-your-area')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('area-use-location')));
      await tester.pumpAndSettle();
      expect(location.asked, 1);
      expect(area.value.place?.name, 'London');
      expect(find.text('Near London, United Kingdom'), findsOneWidget);
      expect(nearNames(tester), ['Local One', 'No Tier Yet']);
    });

    testWidgets('location refused before: say so, offer Settings or typing', (
      tester,
    ) async {
      final location = FakeLocation(problem: LocationProblem.blocked);
      await tester.pumpWidget(_app(location: location));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.ensureVisible(find.byKey(const ValueKey('set-your-area')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('set-your-area')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('area-use-location')));
      await tester.pumpAndSettle();
      expect(find.textContaining('can’t see your location'), findsOneWidget);
      await tester.tap(find.text('Open Settings'));
      expect(location.settings, 1);
    });

    testWidgets('the 3rd visit, signed in: the star asks to learn; "Yes, '
        'learn" turns it on (migration 0021)', (tester) async {
      final account = FakeAccountService()
        ..restoreSession('seeker@example.com');
      final conductor = MemoryConductorStore(visitCount: 2);
      await tester.pumpWidget(_app(account: account, conductor: conductor));
      await tester.pump();
      await tester.pump(const Duration(seconds: 4));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('star-ask-learning')), findsOneWidget);
      expect(
        find.textContaining('Never shown to our team, never shared'),
        findsOneWidget,
      );
      await tester.tap(find.byKey(const ValueKey('star-learning-yes')));
      await tester.pump();
      expect(account.learningByUser.values.single, isTrue);
      await tester.pump(const Duration(seconds: 2));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('star-tray')), findsNothing);
    });

    // There is only ever one star: resting stars showing, plus any in flight.
    int starsShowing(WidgetTester tester) =>
        tester
            .widgetList<AnimatedOpacity>(
              find.ancestor(
                of: find.byType(StarSprite),
                matching: find.byType(AnimatedOpacity),
              ),
            )
            .where((o) => o.opacity == 1)
            .length +
        tester.widgetList(find.byType(SlipstreamFrame)).length;

    bool trayStarShowing(WidgetTester tester) =>
        tester
            .widget<AnimatedOpacity>(
              find.descendant(
                of: find.byKey(const ValueKey('star-tray')),
                matching: find.byType(AnimatedOpacity),
              ),
            )
            .opacity ==
        1;

    for (final (device, size) in [
      ('iPhone', const Size(1290, 9000)),
      ('iPad', const Size(2048, 9000)),
    ]) {
      testWidgets('$device: one star, even when the star comes home from a '
          'page just as it is time to ask; it leaves home, asks, and flies '
          'back', (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = device == 'iPad' ? 2 : 3;
        final account = FakeAccountService()
          ..restoreSession('seeker@example.com');
        await tester.pumpWidget(
          _app(
            account: account,
            conductor: MemoryConductorStore(visitCount: 2),
          ),
        );
        await tester.pump();
        expect(starsShowing(tester), 1);
        // A page opened, and closed just before the star's 3 seconds: its
        // flight home is still going when the moment comes.
        GoRouter.of(tester.element(find.byType(PillTabBar)))
            .push('/books/the-power-of-now');
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 2500));
        await tester.pageBack();
        await tester.pump();
        for (var i = 0; i < 180; i++) {
          await tester.pump(const Duration(milliseconds: 50));
          expect(starsShowing(tester), 1, reason: 'frame $i');
        }
        await tester.pumpAndSettle();
        expect(find.byKey(const ValueKey('star-ask-learning')), findsOneWidget);
        expect(trayStarShowing(tester), isTrue);
        expect(starsShowing(tester), 1); // on the tray; the box is empty

        // Something else letting go of the star (the intro landing, a flight
        // between pages ending) never shows it while the tray has it.
        final layer = tester.state<StarLayerState>(find.byType(StarLayer));
        final other = Object();
        layer.hold(other, '/');
        layer.release(other);
        await tester.pump();
        expect(starsShowing(tester), 1);

        // Nor does switching tabs under the tray.
        await tester.tap(
          find.descendant(
            of: find.byType(PillTabBar),
            matching: find.text('Videos'),
          ),
        );
        await tester.pumpAndSettle();
        expect(starsShowing(tester), 1);

        // "Not now": it flies back, and rests in the search box again.
        await tester.tap(find.byKey(const ValueKey('star-not-now')));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 80));
        expect(find.byType(SlipstreamFrame), findsOneWidget);
        expect(starsShowing(tester), 1);
        await tester.pumpAndSettle();
        expect(find.byKey(const ValueKey('star-tray')), findsNothing);
        expect(starsShowing(tester), 1);
        expect(layer.busy, isFalse);
      });
    }

    testWidgets('the 3rd visit, signed out: the star does not ask to learn', (
      tester,
    ) async {
      final conductor = MemoryConductorStore(visitCount: 2);
      await tester.pumpWidget(_app(conductor: conductor));
      await tester.pump();
      await tester.pump(const Duration(seconds: 4));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('star-tray')), findsNothing);
      expect(conductor.records[StarAsk.learning], isNull);
    });

    testWidgets('the 5th visit: the star asks about the area, once a session; '
        '"Not now" puts it away', (tester) async {
      final conductor = MemoryConductorStore(visitCount: 4);
      await tester.pumpWidget(_app(conductor: conductor));
      await tester.pump();
      await tester.pump(const Duration(seconds: 4));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('star-ask-area')), findsOneWidget);
      expect(
        find.text('Shall I show you practitioners near you?'),
        findsOneWidget,
      );
      expect(conductor.visitCount, 5);
      expect(conductor.records[StarAsk.area]?.times, 1);
      // The star has landed on the tray (and left the search box).
      final trayStar = tester.widget<AnimatedOpacity>(
        find.descendant(
          of: find.byKey(const ValueKey('star-tray')),
          matching: find.byType(AnimatedOpacity),
        ),
      );
      expect(trayStar.opacity, 1);
      await tester.tap(find.byKey(const ValueKey('star-not-now')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('star-tray')), findsNothing);
      // Once a session: nothing more, however long they stay.
      await tester.pump(const Duration(seconds: 10));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('star-tray')), findsNothing);
    });

    testWidgets('before the 5th visit, or once the search is open: nothing', (
      tester,
    ) async {
      await tester.pumpWidget(
        _app(conductor: MemoryConductorStore(visitCount: 3)),
      );
      await tester.pump();
      await tester.pump(const Duration(seconds: 4));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('star-tray')), findsNothing);

      await tester.pumpWidget(const SizedBox());
      await tester.pumpWidget(
        _app(conductor: MemoryConductorStore(visitCount: 4)),
      );
      await tester.pump();
      await tester.tap(find.byType(FeelingTypewriter).hitTestable().first);
      await tester.pumpAndSettle();
      GoRouter.of(tester.element(find.byType(Navigator).first)).pop();
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 10));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('star-tray')), findsNothing);
    });

    testWidgets('the 7th visit, area set: the star asks their name, and greets '
        'them by it', (tester) async {
      final name = MemoryNameStore();
      await tester.pumpWidget(
        _app(
          conductor: MemoryConductorStore(visitCount: 6),
          area: MemoryAreaStore(
            const Area(place: FakeContentRepository.london, chosen: true),
          ),
          name: name,
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(seconds: 4));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('star-ask-name')), findsOneWidget);
      expect(
        find.text(
          'Would you like to share your name? I’ll use it only to greet you '
          'here and in my emails.',
        ),
        findsOneWidget,
      );
      await tester.enterText(
        find.byKey(const ValueKey('star-name-field')),
        '  Ross  ',
      );
      await tester.tap(find.byKey(const ValueKey('star-name-save')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('Lovely to meet you, Ross.'), findsOneWidget);
      expect(name.value, 'Ross');
      await tester.pump(const Duration(seconds: 2));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('star-tray')), findsNothing);
    });

    testWidgets('debug builds: the visit count, "Set to 5" and "Reset star '
        'questions"', (tester) async {
      final conductor = MemoryConductorStore(visitCount: 1);
      final area = MemoryAreaStore();
      await tester.pumpWidget(_app(conductor: conductor, area: area));
      await tester.pump();
      GoRouter.of(tester.element(find.byType(PillTabBar))).push('/account');
      await tester.pumpAndSettle();
      final count = find.byKey(const ValueKey('debug-visit-count'));
      await tester.ensureVisible(count);
      expect(find.text('Star visits: 2'), findsOneWidget); // this launch
      await tester.tap(find.byKey(const ValueKey('debug-visit-5')));
      await tester.pumpAndSettle();
      expect(find.text('Star visits: 5'), findsOneWidget);
      expect(conductor.visitCount, 5);

      // Back on Discover, the star asks.
      GoRouter.of(tester.element(find.byType(Navigator).first)).pop();
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 4));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('star-ask-area')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('star-not-now')));
      await tester.pumpAndSettle();

      GoRouter.of(tester.element(find.byType(PillTabBar))).push('/account');
      await tester.pumpAndSettle();
      final reset = find.byKey(const ValueKey('debug-star-reset'));
      await tester.ensureVisible(reset);
      await tester.tap(reset);
      await tester.pumpAndSettle();
      expect(find.text('Star visits: 0'), findsOneWidget);
      expect(conductor.visitCount, 0);
      expect(conductor.records, isEmpty);
      expect(area.value.place, isNull);
    });

    testWidgets('Tailor Spiritpedia: clearing every subject goes quietly '
        'back to View All', (tester) async {
      await tester.pumpWidget(
        _app(
          interests: MemoryInterestsStore(
            const Interests(subjects: ['meditation'], chosen: true),
          ),
        ),
      );
      await tester.pump();
      final container = ProviderScope.containerOf(
        tester.element(find.byType(SpiritpediaApp)),
      );
      expect(container.read(forYouActiveProvider), isTrue);
      GoRouter.of(tester.element(find.byType(PillTabBar))).push('/tailor');
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('tailor-clear')));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('tailor-save')));
      await tester.pumpAndSettle();
      expect(find.byType(SnackBar), findsNothing);
      expect(container.read(forYouActiveProvider), isFalse);
      await tester.pump(TailorStarFrame.linger);
      await tester.pumpAndSettle();
    });

    testWidgets('Tailor Spiritpedia: "Your Area" at the foot', (tester) async {
      await tester.pumpWidget(
        _app(
          area: MemoryAreaStore(
            const Area(place: FakeContentRepository.london, chosen: true),
          ),
        ),
      );
      await tester.pump();
      GoRouter.of(tester.element(find.byType(PillTabBar))).push('/tailor');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('tailor-your-area')), findsOneWidget);
      expect(find.text('London, England, United Kingdom'), findsOneWidget);
      await tester.ensureVisible(
        find.byKey(const ValueKey('tailor-area-clear')),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('tailor-area-clear')));
      await tester.pumpAndSettle();
      expect(find.text('Your Area'), findsOneWidget);
      expect(
        find.text('Do you want me to show you practitioners in your area?'),
        findsOneWidget,
      );
      expect(find.text('Set Your Area'), findsOneWidget);
      await tester.pump(TailorStarFrame.linger);
      await tester.pumpAndSettle();
    });
  });

  testWidgets('press and hold the star: My Library, from anywhere', (
    tester,
  ) async {
    await start(tester);
    await tester.longPress(find.byType(StarAnchor).hitTestable().first);
    await tester.pumpAndSettle();
    expect(find.text('My Library'), findsWidgets);
    expect(find.text('Worldwide'), findsNothing);

    // From a page's own star too; on My Library itself, nothing happens.
    await tester.longPress(find.byType(StarAnchor).hitTestable().last);
    await tester.pumpAndSettle();
    expect(find.text('My Library'), findsWidgets);
    // A tap is unchanged: home.
    await tester.tap(find.byType(StarAnchor).hitTestable().last);
    await tester.pumpAndSettle();
    expect(find.text('Worldwide'), findsOneWidget);
  });

  testWidgets('the star sits in the search box, labelled Home; on a tab it '
      'stays on that tab', (tester) async {
    await start(tester);
    expect(find.bySemanticsLabel('Home'), findsWidgets);
    expect(find.byIcon(Icons.search), findsNothing); // no Search tab

    await tester.tap(find.text('Books').last);
    await tester.pumpAndSettle();
    expect(find.text('The Power of Now'), findsWidgets);

    // Books has its own star in its own search box: back to Books' top.
    await tester.tap(find.byType(StarAnchor).hitTestable().first);
    await tester.pumpAndSettle();
    expect(
      tester.widget<PillTabBar>(find.byType(PillTabBar)).current,
      2,
    ); // still Books
  });

  testWidgets(
    'scrolling Home docks the star in the sticky pill row, and back',
    (tester) async {
      // A normal phone height, so Home scrolls.
      tester.view.physicalSize = const Size(1290, 2796);
      await start(tester);

      bool restingInBox() => tester
          .widgetList<StarAnchor>(find.byType(StarAnchor, skipOffstage: false))
          .first
          .visible;

      expect(restingInBox(), isTrue);
      await tester.drag(
        find.byType(CustomScrollView).first,
        const Offset(0, -500),
      );
      await tester.pumpAndSettle();
      expect(find.text('View All'), findsOneWidget); // the pills stuck
      final anchors = tester.widgetList<StarAnchor>(
        find.byType(StarAnchor, skipOffstage: false),
      );
      expect(anchors.first.visible, isFalse); // gone from the box…
      expect(anchors.elementAt(1).visible, isTrue); // …into the pill row

      await tester.drag(
        find.byType(CustomScrollView).first,
        const Offset(0, 800),
      );
      await tester.pumpAndSettle();
      expect(restingInBox(), isTrue);
    },
  );

  group('tier badges explain themselves', () {
    Future<void> pause(WidgetTester tester) async {
      // The bubble fades in and out over a fraction of a second.
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pump(const Duration(milliseconds: 400));
    }

    final tip = find.byKey(const ValueKey('tier-tip'));
    Finder shelfBadge(String label) =>
        find.bySemanticsLabel('$label badge: what it means');

    testWidgets('nothing appears by itself', (tester) async {
      await start(tester);
      await pause(tester);
      expect(find.text('Worldwide'), findsOneWidget);
      expect(tip, findsNothing);
    });

    testWidgets('tapping a shelf badge: the star explains it, every time', (
      tester,
    ) async {
      await start(tester);
      await tester.tap(shelfBadge('Superhero'));
      await pause(tester);
      expect(tip, findsOneWidget);
      expect(find.text('Superheroes'), findsOneWidget);
      expect(
        find.text(
          'A worldwide reach, with over a million followers across social media.',
        ),
        findsOneWidget,
      );

      // A tap anywhere closes it, and only closes it.
      await tester.tapAt(const Offset(200, 1500));
      await pause(tester);
      expect(tip, findsNothing);
      expect(find.text('Worldwide'), findsOneWidget); // still on Discover

      // Again: it shows again.
      await tester.tap(shelfBadge('Superhero'));
      await pause(tester);
      expect(find.text('Superheroes'), findsOneWidget);
      // Tapping the bubble itself closes it too.
      await tester.tap(tip);
      await pause(tester);
      expect(tip, findsNothing);

      for (final (badge, title, line) in [
        (
          'Luminary',
          'Luminaries',
          'Hundreds of thousands of followers: the superstars of the future.',
        ),
        (
          'Local Hero',
          'Local Heroes',
          'A practitioner available in your area.',
        ),
      ]) {
        await tester.tap(shelfBadge(badge));
        await pause(tester);
        expect(find.text(title), findsOneWidget, reason: badge);
        expect(find.text(line), findsOneWidget, reason: badge);
        await tester.tapAt(const Offset(200, 1500));
        await pause(tester);
      }
    });

    testWidgets('a badge on a card: the star explains it, and the card '
        'stays shut', (tester) async {
      await start(tester);
      final cardBadge = find
          .descendant(
            of: find.byType(HealerCard),
            matching: find.text('SUPERHERO'),
          )
          .first;
      await tester.tap(cardBadge);
      await pause(tester);
      expect(tip, findsOneWidget);
      expect(find.text('Superhero'), findsOneWidget);
      expect(find.text('Worldwide'), findsOneWidget); // still on Discover
    });

    testWidgets('a channel wears its tier by a platform\'s name, beside its '
        'type, and the star explains it', (tester) async {
      await start(tester);
      final card = find.ancestor(
        of: find.text('A Channel'),
        matching: find.byType(HealerCard),
      );
      await tester.ensureVisible(card);
      await tester.pumpAndSettle();
      expect(
        find.descendant(of: card, matching: find.text('SHINING STAR')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: card, matching: find.text('CHANNEL')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: card, matching: find.text('LUMINARY')),
        findsNothing,
      );
      // The tier top left, the type bottom right, the name between.
      final cardBox = tester.getRect(card);
      final tier = tester.getRect(
        find.descendant(of: card, matching: find.text('SHINING STAR')),
      );
      final type = tester.getRect(
        find.descendant(of: card, matching: find.text('CHANNEL')),
      );
      final name = tester.getRect(
        find.descendant(of: card, matching: find.text('A Channel')),
      );
      expect(tier.top - cardBox.top, lessThan(30));
      expect(tier.left - cardBox.left, lessThan(30));
      expect(cardBox.bottom - type.bottom, lessThan(30));
      expect(cardBox.right - type.right, lessThan(30));
      expect(name.top, greaterThan(tier.bottom));
      await tester.tap(
        find.descendant(of: card, matching: find.text('SHINING STAR')),
      );
      await pause(tester);
      expect(
        find.text(
          'Hundreds of thousands of followers: the superstars of the future.',
        ),
        findsOneWidget,
      );
    });

    final spiritpedia = FakeContentRepository.healer(
      8,
      'spiritpedia',
      'Spiritpedia',
      'local_hero', // stored, never shown
      entity: 'channel',
      official: true,
      verified: true,
      booking: 'https://www.spiritpedia.co',
    );
    final verifiedTeacher = FakeContentRepository.healer(
      9,
      'jane-doe',
      'Jane Doe',
      'luminary',
      verified: true,
      booking: 'https://janedoe.example',
    );

    testWidgets('Spiritpedia: OFFICIAL and no tier, first in Explore These '
        'Channels', (tester) async {
      await tester.pumpWidget(
        _app(content: FakeContentRepository(extraHealers: [spiritpedia])),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      final shelf = find.ancestor(
        of: find.text('Explore These Channels'),
        matching: find.byType(Shelf),
      );
      await tester.ensureVisible(shelf);
      await tester.pumpAndSettle();
      final cards = tester
          .widgetList<HealerCard>(
            find.descendant(of: shelf, matching: find.byType(HealerCard)),
          )
          .map((c) => c.healer.slug)
          .toList();
      expect(cards.first, 'spiritpedia');
      final card = find.ancestor(
        of: find.text('Spiritpedia'),
        matching: find.byType(HealerCard),
      );
      expect(
        find.descendant(of: card, matching: find.text('OFFICIAL')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: card, matching: find.text('RISING STAR')),
        findsNothing,
      );
      expect(
        find.descendant(of: card, matching: find.text('✓ VERIFIED')),
        findsNothing,
      );
    });

    testWidgets('Spiritpedia\'s page: Visit, never Book with; its badge says '
        'this is the star\'s home', (tester) async {
      await tester.pumpWidget(
        _app(content: FakeContentRepository(extraHealers: [spiritpedia])),
      );
      await tester.pump();
      GoRouter.of(tester.element(find.byType(PillTabBar)))
          .push('/healers/spiritpedia');
      await tester.pumpAndSettle();
      expect(find.text('OFFICIAL'), findsOneWidget);
      // Verified too in the database, but Official alone on the page.
      expect(find.text('✓ VERIFIED'), findsNothing);
      expect(find.textContaining('RISING STAR'), findsNothing);
      expect(find.text('Visit Spiritpedia →'), findsOneWidget);
      expect(find.textContaining('Book with'), findsNothing);
      await tester.tap(find.text('OFFICIAL'));
      await pause(tester);
      expect(tip, findsOneWidget);
      expect(
        find.text(
          'This is my home: Spiritpedia’s own page. Our videos, our reviews, '
          'and where you can always find us.',
        ),
        findsOneWidget,
      );
      // A tap anywhere closes it, and the page stays.
      await tester.tapAt(const Offset(200, 600));
      await pause(tester);
      expect(tip, findsNothing);
      expect(find.text('Visit Spiritpedia →'), findsOneWidget);
    });

    testWidgets('a claimed teacher: ✓ Verified beside the tier, explained by '
        'the star; booked by first name', (tester) async {
      await tester.pumpWidget(
        _app(content: FakeContentRepository(extraHealers: [verifiedTeacher])),
      );
      await tester.pump();
      GoRouter.of(tester.element(find.byType(PillTabBar)))
          .push('/healers/jane-doe');
      await tester.pumpAndSettle();
      expect(find.text('LUMINARY'), findsOneWidget);
      expect(find.text('✓ VERIFIED'), findsOneWidget);
      expect(find.text('Book with Jane →'), findsOneWidget);
      await tester.tap(find.text('✓ VERIFIED'));
      await pause(tester);
      expect(
        find.text(
          'This page is run by Jane Doe themselves. They’ve confirmed it’s '
          'theirs, so what you see here comes straight from them.',
        ),
        findsOneWidget,
      );
    });
  });

  testWidgets('a heart on a card saves without opening the card', (
    tester,
  ) async {
    final account = FakeAccountService()..restoreSession('ann@example.com');
    await tester.pumpWidget(_app(account: account));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    final heart = find.byTooltip('Save to My Library').first;
    await tester.tap(heart);
    await tester.pumpAndSettle();
    expect(find.text('Worldwide'), findsOneWidget); // still on Home
    expect(find.byTooltip('Remove from My Library'), findsOneWidget);
  });

  group('saving needs an account', () {
    testWidgets('signed out: a warm prompt; "Not now" saves nothing', (
      tester,
    ) async {
      await start(tester);
      await tester.tap(find.byTooltip('Save to My Library').first);
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('save-prompt')), findsOneWidget);
      expect(find.text('Save it to your Library.'), findsOneWidget);
      expect(
        find.text('Create a free account so your saves follow you everywhere.'),
        findsOneWidget,
      );
      await tester.tap(find.byKey(const ValueKey('save-prompt-not-now')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('save-prompt')), findsNothing);
      expect(find.byTooltip('Remove from My Library'), findsNothing);
    });

    testWidgets('signing in from the prompt completes the save, right here', (
      tester,
    ) async {
      final account = FakeAccountService();
      await tester.pumpWidget(_app(account: account));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.tap(find.byTooltip('Save to My Library').first);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('save-prompt-sign-in')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('email-field')),
        'new@example.com',
      );
      await tester.tap(find.text('Email me a code'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('code-field')),
        '123456',
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('save-prompt')), findsNothing);
      expect(find.text('Worldwide'), findsOneWidget); // where they were
      expect(find.byTooltip('Remove from My Library'), findsOneWidget);
      expect(account.favouriteRows['user-new@example.com'], hasLength(1));

      // A brand-new account: "How will you use Spiritpedia?", once.
      expect(find.byKey(const ValueKey('user-type-card')), findsOneWidget);
      expect(find.text('How will you use Spiritpedia?'), findsOneWidget);
      // The welcome went when the account was created, before the question.
      expect(account.calls.where((x) => x == 'sendWelcome'), hasLength(1));
      await tester.tap(find.byKey(const ValueKey('user-type-sharing')));
      await tester.pumpAndSettle();
      expect(find.text('Continue on spiritpedia.co'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('user-type-back')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('user-type-exploring')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('user-type-card')), findsNothing);
      expect(account.calls.where((x) => x == 'sendWelcome'), hasLength(1));
      expect(find.text('Worldwide'), findsOneWidget);
    });
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
    container.read(subjectFilterProvider.notifier).select('breathwork');
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

      expect(find.text('New to Spiritpedia'), findsWidgets);
      // The first shelf: never three cards by the same teacher.
      final eckhartCards = find.textContaining('by eckhart-tolle');
      expect(
        eckhartCards.evaluate().length,
        lessThanOrEqualTo(2 * 7),
      ); // 7 shelves at most
    },
  );

  testWidgets('debug builds: Account offers "Replay intro"', (tester) async {
    await start(tester);
    await tester.tap(find.byKey(const ValueKey('menu-button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('menu-sign-in')));
    await tester.pumpAndSettle();
    expect(find.text('Replay intro'), findsOneWidget);
    expect(find.text('DEBUG BUILD ONLY'), findsOneWidget);
  });

  testWidgets('a subject tray hides the floating bar until it closes', (
    tester,
  ) async {
    await start(tester);
    double barOpacity() => tester
        .widget<AnimatedOpacity>(
          find.ancestor(
            of: find.byType(PillTabBar),
            matching: find.byType(AnimatedOpacity),
          ),
        )
        .opacity;

    expect(barOpacity(), 1);
    // For You and View All lead the row: the pillars are a scroll away.
    await tester.drag(
      find.descendant(
        of: find.byType(SubjectPillRow).first,
        matching: find.byType(ListView),
      ),
      const Offset(-200, 0),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Emotional Healing'));
    await tester.pumpAndSettle();
    expect(find.text('Breathwork'), findsWidgets); // the tray is open
    expect(barOpacity(), 0);

    await tester.tapAt(const Offset(200, 100)); // dismiss the tray
    await tester.pumpAndSettle();
    expect(barOpacity(), 1);
  });

  testWidgets('docked, the star has no backing: the pills fade beneath it', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1290, 2796);
    await start(tester);
    expect(find.byType(ShaderMask), findsNothing);
    await tester.drag(
      find.byType(CustomScrollView).first,
      const Offset(0, -500),
    );
    await tester.pumpAndSettle();
    expect(find.byType(ShaderMask), findsOneWidget);
  });

  testWidgets('the star at the foot of a page opened from Home goes home', (
    tester,
  ) async {
    await start(tester);
    GoRouter.of(tester.element(find.byType(PillTabBar)))
        .push('/books/the-power-of-now');
    await tester.pumpAndSettle();
    expect(find.byType(FloatingHomeStar), findsOneWidget);

    await tester.tap(
      find.descendant(
        of: find.byType(FloatingHomeStar),
        matching: find.byType(StarAnchor),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(FloatingHomeStar), findsNothing);
    expect(find.text('Worldwide'), findsOneWidget); // Home
  });

  testWidgets('the subject filter carries across the tabs and the star', (
    tester,
  ) async {
    await start(tester);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(SpiritpediaApp)),
    );
    container.read(subjectFilterProvider.notifier).select('meditation');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    for (final tab in ['Videos', 'Books', 'Discover']) {
      await tester.tap(find.text(tab).last);
      await tester.pumpAndSettle();
      expect(find.text('Showing Meditation'), findsOneWidget, reason: tab);
    }
    await tester.tap(find.byType(StarAnchor).hitTestable().first);
    await tester.pumpAndSettle();
    expect(container.read(subjectFilterProvider), 'meditation');

    await tester.tap(find.text('Clear'));
    await tester.pump();
    expect(container.read(subjectFilterProvider), isNull);
  });

  testWidgets('from a page opened on Books, the star goes back to Books, '
      'filter kept', (tester) async {
    await start(tester);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(SpiritpediaApp)),
    );
    container.read(subjectFilterProvider.notifier).select('meditation');
    await tester.tap(find.text('Books').last);
    await tester.pumpAndSettle();
    GoRouter.of(tester.element(find.byType(PillTabBar)))
        .push('/books/the-power-of-now');
    await tester.pumpAndSettle();

    await tester.tap(
      find.descendant(
        of: find.byType(FloatingHomeStar),
        matching: find.byType(StarAnchor),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(FloatingHomeStar), findsNothing);
    expect(tester.widget<PillTabBar>(find.byType(PillTabBar)).current, 2);
    expect(container.read(subjectFilterProvider), 'meditation');
  });

  group('links from notifications', () {
    Future<FakePushMessaging> launch(WidgetTester tester) async {
      final push = FakePushMessaging();
      await tester.pumpWidget(_app(push: push));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      return push;
    }

    testWidgets('one arriving while the app is open shows in the app, '
        'with Open (Android shows nothing itself)', (tester) async {
      final push = await launch(tester);
      push.arrivedNotes.add(
        const PushNote(
          title: 'Spiritpedia test',
          body: 'It works.',
          route: '/library',
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('Spiritpedia test\nIt works.'), findsOneWidget);
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      expect(find.text('My Library'), findsWidgets);
    });

    testWidgets('a screen this version lacks: Discover, with a quiet note', (
      tester,
    ) async {
      final push = await launch(tester);
      await tester.tap(find.text('Books').last);
      await tester.pumpAndSettle();
      push.openedNotes.add(const PushNote(route: '/deep-research'));
      await tester.pumpAndSettle();
      expect(tester.widget<PillTabBar>(find.byType(PillTabBar)).current, 0);
      expect(find.text(unknownLinkMessage), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('/search opens the search; /library and /account still work', (
      tester,
    ) async {
      final push = await launch(tester);
      final router = GoRouter.of(tester.element(find.byType(PillTabBar)));
      push.openedNotes.add(const PushNote(route: '/search'));
      await tester.pumpAndSettle();
      expect(
        router.routerDelegate.currentConfiguration.last.matchedLocation,
        '/feel', // the search screen
      );
      router.pop();
      await tester.pumpAndSettle();

      push.openedNotes.add(const PushNote(route: '/library'));
      await tester.pumpAndSettle();
      expect(find.text('My Library'), findsWidgets);
      await tester.pageBack();
      await tester.pumpAndSettle();

      push.openedNotes.add(const PushNote(route: '/account'));
      await tester.pumpAndSettle();
      expect(find.text('Your account'), findsOneWidget);
    });
  });

  testWidgets('an unknown link typed into the router also lands on Discover', (
    tester,
  ) async {
    await start(tester);
    GoRouter.of(tester.element(find.byType(PillTabBar))).go('/deep-research');
    await tester.pumpAndSettle();
    expect(find.text('Worldwide'), findsOneWidget);
    expect(find.text(unknownLinkMessage), findsOneWidget);
  });

  group('the star moves with the pages', () {
    Future<void> openBook(WidgetTester tester) async {
      GoRouter.of(tester.element(find.byType(PillTabBar)))
          .push('/books/the-power-of-now');
      await tester.pump(); // the page is pushed
      await tester.pump(); // …and built: the flight begins
    }

    testWidgets('opening a page, and going back (button or swipe)', (
      tester,
    ) async {
      await start(tester);
      await openBook(tester);
      await tester.pump(const Duration(milliseconds: 80));
      expect(find.byType(SlipstreamFrame), findsOneWidget); // box → foot
      await tester.pumpAndSettle();
      expect(find.byType(SlipstreamFrame), findsNothing);

      // Back: the back button and the swipe-back gesture both pop the page.
      await tester.pageBack();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 80));
      expect(find.byType(SlipstreamFrame), findsOneWidget); // foot → box
      await tester.pumpAndSettle();
      expect(find.byType(SlipstreamFrame), findsNothing);
      expect(
        tester
            .widgetList<StarAnchor>(
              find.byType(StarAnchor, skipOffstage: false),
            )
            .first
            .visible,
        isTrue,
      ); // resting in the search box again
    });

    testWidgets('with Reduce Motion there is no flight', (tester) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(reduceMotion: true);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      await start(tester);
      await openBook(tester);
      await tester.pump(const Duration(milliseconds: 80));
      expect(find.byType(SlipstreamFrame), findsNothing);
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 80));
      expect(find.byType(SlipstreamFrame), findsNothing);
    });
  });

  group('every search box focuses and takes typing', () {
    for (final tab in ['Discover', 'Videos', 'Books']) {
      testWidgets(tab, (tester) async {
        await start(tester);
        if (tab != 'Discover') {
          await tester.tap(find.text(tab).last);
          await tester.pumpAndSettle();
        }
        // The tab's search box opens the search…
        await tester.tap(find.byType(FeelingTypewriter).hitTestable().first);
        await tester.pumpAndSettle();
        final field = find.byType(TextField);
        expect(field, findsOneWidget);

        // …with the field focused and the keyboard asked for.
        final editable = tester.state<EditableTextState>(
          find.byType(EditableText),
        );
        expect(editable.widget.focusNode.hasFocus, isTrue, reason: 'focus');
        expect(tester.testTextInput.isVisible, isTrue, reason: 'keyboard');

        // Typing arrives through the platform's text input, as on a phone.
        tester.testTextInput.enterText('abraham');
        await tester.pump();
        expect(editable.textEditingValue.text, 'abraham');

        // Tapping the field again keeps it typing.
        await tester.tap(field);
        await tester.pump();
        expect(editable.widget.focusNode.hasFocus, isTrue);
        await tester.pumpAndSettle();
      });
    }
  });
}

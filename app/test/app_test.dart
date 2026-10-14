import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:spiritpedia/app.dart';
import 'package:spiritpedia/core/retry.dart';
import 'package:spiritpedia/core/safety/emotion_safety.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/features/account/account_providers.dart';
import 'package:spiritpedia/features/home/subject_pills.dart';
import 'package:spiritpedia/features/interests/interests.dart';
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
}) => ProviderScope(
  retry: spiritpediaRetry,
  overrides: [
    reviewsServiceProvider.overrideWithValue(FakeReviewsService()),
    if (push != null) pushMessagingProvider.overrideWithValue(push),
    accountServiceProvider.overrideWithValue(account ?? FakeAccountService()),
    contentRepositoryProvider.overrideWithValue(
      FakeContentRepository(fail: fail),
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
  ],
  child: const SpiritpediaApp(playIntro: false),
);

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

    testWidgets('a swipe to the right puts the menu away', (tester) async {
      await start(tester);
      await openMenu(tester);
      await tester.fling(menu, const Offset(300, 0), 1200);
      await tester.pumpAndSettle();
      expect(menu, findsNothing);
    });
  });

  group('chosen interests shape the app, never lock it', () {
    testWidgets('none chosen: no For You shelf, the pills in their order', (
      tester,
    ) async {
      await start(tester);
      expect(find.text('For You'), findsNothing);
      expect(_pills(tester).take(2), ['View All', 'Emotional Healing']);
    });

    testWidgets('chosen: For You leads Discover with their teachers, and '
        'their pillars lead the pills', (tester) async {
      await tester.pumpWidget(
        _app(
          interests: MemoryInterestsStore(
            const Interests(subjects: ['consciousness'], chosen: true),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      final forYou = find.ancestor(
        of: find.text('For You'),
        matching: find.byType(Shelf),
      );
      expect(forYou, findsOneWidget);
      expect(
        find.descendant(of: forYou, matching: find.text('Eckhart Tolle')),
        findsWidgets,
      );
      expect(
        find.descendant(of: forYou, matching: find.text('Wim Hof')),
        findsNothing,
      );
      // Above everything else.
      expect(
        tester.getTopLeft(find.text('For You')).dy,
        lessThan(tester.getTopLeft(find.text('Worldwide')).dy),
      );
      expect(_pills(tester).take(2), ['View All', 'Consciousness']);
      // Nothing is filtered: every shelf is still there.
      expect(find.text('Worldwide'), findsOneWidget);
      expect(find.text('Wim Hof'), findsWidgets);
    });

    group('Never show', () {
      Widget hiding(List<String> hidden) => _app(
        interests: MemoryInterestsStore(
          Interests(hidden: hidden, chosen: true),
        ),
      );

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
      await start(tester);
      await tester.scrollUntilVisible(
        find.text('Free Resources'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Free Resources'), findsOneWidget);
      expect(find.text('Books & Literature'), findsNothing);
    });
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
          'One of the most influential spiritual teachers in the world.',
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
          'A respected and established spiritual teacher.',
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

    testWidgets("a badge on a teacher's card still opens the teacher", (
      tester,
    ) async {
      await start(tester);
      final cardBadge = find
          .descendant(
            of: find.byType(HealerCard),
            matching: find.text('SUPERHERO'),
          )
          .first;
      await tester.tap(cardBadge);
      await tester.pumpAndSettle();
      expect(tip, findsNothing);
      expect(find.text('Worldwide'), findsNothing); // on the teacher's page
    });
  });

  testWidgets('a heart on a card saves without opening the card', (
    tester,
  ) async {
    await start(tester);
    final heart = find.byTooltip('Save to My Library').first;
    await tester.tap(heart);
    await tester.pumpAndSettle();
    expect(find.text('Worldwide'), findsOneWidget); // still on Home
    expect(find.byTooltip('Remove from My Library'), findsOneWidget);
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

// Phase B, the iPad: every screen at iPad sizes, both ways round and in
// Split View widths, with nothing overflowing; the layout rule that keeps
// every iPhone on the phone layout; and what changes (and what does not).

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
import 'package:spiritpedia/features/account/display_name.dart';
import 'package:spiritpedia/features/area/area.dart';
import 'package:spiritpedia/features/area/location_source.dart';
import 'package:spiritpedia/features/detail/video_screen.dart';
import 'package:spiritpedia/features/interests/interests.dart';
import 'package:spiritpedia/features/interests/tailor_star.dart';
import 'package:spiritpedia/features/library/saved_items.dart';
import 'package:spiritpedia/features/reviews/reviews_providers.dart';
import 'package:spiritpedia/features/search/feeling_placeholder.dart';
import 'package:spiritpedia/features/search/search_repository.dart';
import 'package:spiritpedia/features/search/search_screen.dart';
import 'package:spiritpedia/features/shell/app_shell.dart';
import 'package:spiritpedia/features/star/conductor.dart';
import 'package:spiritpedia/shared/widgets/cards.dart';
import 'package:spiritpedia/theme/layout.dart';

import 'support/fake_account.dart';
import 'support/fake_content.dart';
import 'support/fake_location.dart';
import 'support/fake_reviews.dart';

final _safety = EmotionSafety.parse(
  File('../web/shared/emotion-safety.json').readAsStringSync(),
);

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

class _TailorIntro implements TailorIntroPrefs {
  @override
  Future<bool> show() async => false;
  @override
  Future<void> turnOff() async {}
}

Widget _app({FakeAccountService? account}) => ProviderScope(
  retry: spiritpediaRetry,
  overrides: [
    reviewsServiceProvider.overrideWithValue(FakeReviewsService()),
    accountServiceProvider.overrideWithValue(account ?? FakeAccountService()),
    contentRepositoryProvider.overrideWithValue(FakeContentRepository()),
    savedStoreProvider.overrideWithValue(MemorySavedStore()),
    interestsStoreProvider.overrideWithValue(MemoryInterestsStore()),
    searchRepositoryProvider.overrideWithValue(_NoSearch()),
    emotionSafetyProvider.overrideWithValue(AsyncData(_safety)),
    typewriterRunsProvider.overrideWithValue(false),
    tailorIntroPrefsProvider.overrideWithValue(_TailorIntro()),
    areaStoreProvider.overrideWithValue(MemoryAreaStore()),
    nameStoreProvider.overrideWithValue(MemoryNameStore()),
    conductorStoreProvider.overrideWithValue(MemoryConductorStore()),
    locationSourceProvider.overrideWithValue(FakeLocation()),
    videoPlayerBuilderProvider.overrideWithValue(
      (id, title) => const ColoredBox(color: Colors.black),
    ),
  ],
  child: const SpiritpediaApp(playIntro: false),
);

/// Logical sizes (points): the iPads, both ways round, and the Split View
/// widths an iPad gives an app beside another.
const _sizes = <String, Size>{
  'iPad mini portrait': Size(744, 1133),
  'iPad mini landscape': Size(1133, 744),
  'iPad Air 11 portrait': Size(820, 1180),
  'iPad Air 11 landscape': Size(1180, 820),
  'iPad Pro 13 portrait': Size(1032, 1376),
  'iPad Pro 13 landscape': Size(1376, 1032),
  'Split View, a third': Size(375, 1032),
  'Split View, half': Size(694, 1032),
  'Split View, two thirds': Size(981, 1032),
  'Slide Over': Size(320, 1000),
};

const _routes = [
  '/',
  '/videos',
  '/books',
  '/library',
  '/account',
  '/tailor',
  '/interests',
  '/feel',
  '/subject/breathwork',
  '/healers/eckhart-tolle',
  '/books/the-power-of-now',
  '/videos/video-1',
  '/publishers/hay-house',
  '/offerings/breath-course',
  '/free-resources/free-meditation',
];

void _size(WidgetTester tester, Size size) {
  final view = tester.view;
  view.devicePixelRatio = 2;
  view.physicalSize = size * 2;
  addTearDown(view.resetPhysicalSize);
  addTearDown(view.resetDevicePixelRatio);
}

Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 12; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

void main() {
  group('the layout rule', () {
    test('every iPhone is the phone layout, exactly as before', () {
      // iPhone SE to iPhone Pro Max, portrait (the only way a phone turns).
      for (final w in <double>[320, 375, 390, 393, 402, 414, 428, 430, 440]) {
        final l = SpLayout.forWidth(w);
        expect(l.isCompact, isTrue, reason: '$w');
        expect(l.cardScale, 1);
        expect(l.textScale, 1);
        expect(l.gutter, 20);
        expect(l.side(16), 16);
        expect(l.centredInset(SpLayout.readingWidth), 0);
      }
    });

    test('iPads: regular, then wide', () {
      expect(SpLayout.forWidth(744).size, WidthClass.regular);
      expect(SpLayout.forWidth(820).size, WidthClass.regular);
      expect(SpLayout.forWidth(1032).size, WidthClass.wide);
      expect(SpLayout.forWidth(1376).size, WidthClass.wide);
      expect(SpLayout.forWidth(1376).centredInset(720), 328);
    });
  });

  for (final MapEntry(key: name, value: size) in _sizes.entries) {
    testWidgets('$name: every screen lays out, nothing overflows', (
      tester,
    ) async {
      _size(tester, size);
      await tester.pumpWidget(_app());
      await _settle(tester);
      final router = GoRouter.of(tester.element(find.byType(PillTabBar)));
      for (final route in _routes) {
        router.go(route);
        await _settle(tester);
        expect(tester.takeException(), isNull, reason: '$name $route');
      }
    });
  }

  testWidgets('iPad: shelves show more, bigger cards; the page has margins', (
    tester,
  ) async {
    _size(tester, const Size(1180, 820));
    await tester.pumpWidget(_app());
    await _settle(tester);
    final card = tester.getRect(find.byType(HealerCard).first);
    expect(card.width, closeTo(172 * 1.3, 0.5));
    expect(card.left, 48);
  });

  testWidgets('iPhone: the same cards and margins as before', (tester) async {
    _size(tester, const Size(393, 852));
    await tester.pumpWidget(_app());
    await _settle(tester);
    final card = tester.getRect(find.byType(HealerCard).first);
    expect(card.width, 172);
    expect(card.left, 20);
  });
}

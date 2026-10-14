import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/core/retry.dart';
import 'package:spiritpedia/core/safety/emotion_safety.dart';
import 'package:spiritpedia/data/models.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/data/shelf_rules.dart';
import 'package:spiritpedia/features/account/account_providers.dart';
import 'package:spiritpedia/features/interests/interests.dart';
import 'package:spiritpedia/features/interests/interests_picker.dart';
import 'package:spiritpedia/features/library/saved_items.dart';
import 'package:spiritpedia/features/notifications/notifications_controller.dart';
import 'package:spiritpedia/features/reviews/reviews_providers.dart';
import 'package:spiritpedia/features/search/content_search.dart';

import '../../support/fake_account.dart';
import '../../support/fake_content.dart';
import '../../support/fake_push.dart';
import '../../support/fake_reviews.dart';

const _email = 'seeker@example.com';
const _userId = 'user-seeker@example.com';

typedef _Item = ({String id, List<String> subjects});

List<String> _subjects(_Item i) => i.subjects;

void main() {
  group('the ranking rules', () {
    const items = <_Item>[
      (id: 'a', subjects: ['yoga']),
      (id: 'b', subjects: ['meditation']),
      (id: 'c', subjects: ['meditation', 'shadow-work']),
      (id: 'd', subjects: []),
    ];

    test('no choice changes nothing', () {
      expect(interestFirst(items, const {}, _subjects), same(items));
      expect(forYou(items, const {}, _subjects), isEmpty);
      expect(pillarsByInterest(const {}), subjectPillars.keys.toList());
    });

    test('chosen subjects move ahead, more of them first; nothing removed', () {
      final ranked = interestFirst(items, {
        'meditation',
        'shadow-work',
      }, _subjects);
      expect([for (final i in ranked) i.id], ['c', 'b', 'a', 'd']);
    });

    test('For You holds only what carries a chosen subject', () {
      final shelf = forYou(items, {'meditation'}, _subjects);
      expect([for (final i in shelf) i.id], ['b', 'c']);
    });

    test('pillars holding chosen subjects lead the pill row', () {
      expect(pillarsByInterest({'yoga', 'reiki', 'breathwork'}), [
        'Emotional Healing', // reiki, breathwork
        'Body & Energy', // yoga
        'Consciousness',
        'Manifestation & Creation',
        'Mystical & Spiritual Exploration',
      ]);
      // In the Videos and Books order too.
      expect(
        pillarsByInterest({'yoga'}, videoPillarOrder).first,
        'Body & Energy',
      );
    });

    test('Suggests: an interest settles a close call, never beats a title', () {
      const calm = Video(
        id: 1,
        slug: 'calm',
        title: 'Calm',
        subjectSlugs: ['breathwork'],
      );
      const still = Video(
        id: 2,
        slug: 'still',
        title: 'Still',
        subjectSlugs: ['meditation'],
      );
      const rows = [MappingRow('breathwork', 10), MappingRow('meditation', 10)];
      // Level: the newer (first) wins.
      expect(
        suggest(
          term: 'anxious',
          rows: rows,
          videos: [calm, still],
          books: [],
        ).video,
        calm,
      );
      expect(
        suggest(
          term: 'anxious',
          rows: rows,
          videos: [calm, still],
          books: [],
          interests: {'meditation'},
        ).video,
        still,
      );
      // A title match still wins whatever was chosen.
      expect(
        suggest(
          term: 'calm',
          rows: rows,
          videos: [calm, still],
          books: [],
          interests: {'meditation'},
        ).video,
        calm,
      );
      expect(interestBonus(['a', 'b', 'c', 'd'], {'a', 'b', 'c', 'd'}), 60);
    });

    test('the summary for Account and the menu', () {
      expect(interestsSummary(const [], null), isNull);
      const subjects = [
        Subject(slug: 'yoga', name: 'Yoga'),
        Subject(slug: 'reiki', name: 'Reiki'),
      ];
      expect(interestsSummary(['yoga'], subjects), 'Yoga');
      expect(interestsSummary(['yoga', 'reiki'], subjects), 'Yoga and Reiki');
      expect(
        interestsSummary(['yoga', 'reiki', 'a', 'b'], subjects),
        'Yoga, Reiki and 2 more',
      );
    });
  });

  group('where the choice is kept', () {
    late FakeAccountService account;
    late MemoryInterestsStore phone;
    setUp(() {
      account = FakeAccountService();
      phone = MemoryInterestsStore();
    });

    ProviderContainer container() {
      final c = ProviderContainer(
        retry: spiritpediaRetry,
        overrides: [
          reviewsServiceProvider.overrideWithValue(FakeReviewsService()),
          accountServiceProvider.overrideWithValue(account),
          savedStoreProvider.overrideWithValue(MemorySavedStore()),
          interestsStoreProvider.overrideWithValue(phone),
          contentRepositoryProvider.overrideWithValue(FakeContentRepository()),
          pushMessagingProvider.overrideWithValue(FakePushMessaging()),
          pushDeviceStoreProvider.overrideWithValue(MemoryPushDeviceStore()),
          pushPlatformProvider.overrideWithValue('ios'),
        ],
      );
      addTearDown(c.dispose);
      c.read(accountProvider);
      c.read(interestsProvider);
      return c;
    }

    Future<void> settle() =>
        Future<void>.delayed(const Duration(milliseconds: 20));

    test('signed out: on the phone at once, nothing sent anywhere', () async {
      final c = container();
      await settle();
      await c.read(interestsProvider.notifier).choose([
        'yoga',
        'reiki',
        'yoga',
      ]);
      expect(phone.value.subjects, ['reiki', 'yoga']);
      expect(phone.value.chosen, isTrue);
      expect(c.read(interestSubjectsProvider), {'reiki', 'yoga'});
      expect(
        account.calls.where((c) => c.startsWith('saveInterests')),
        isEmpty,
      );
    });

    test('a launch while signed out keeps the choice', () async {
      phone.value = const Interests(subjects: ['yoga'], chosen: true);
      final c = container();
      await settle();
      expect(c.read(interestsProvider).subjects, ['yoga']);
      expect(phone.value.subjects, ['yoga']);
    });

    test(
      'chosen before signing in: attached to the account at sign-in',
      () async {
        phone.value = const Interests(subjects: ['yoga'], chosen: true);
        container();
        await settle();
        account.restoreSession(_email);
        await settle();
        expect(account.interestsByUser[_userId], ['yoga']);
      },
    );

    test('phone and account both chose: the account wins', () async {
      phone.value = const Interests(subjects: ['yoga'], chosen: true);
      account.interestsByUser[_userId] = ['meditation'];
      account.restoreSession(_email);
      final c = container();
      await settle();
      expect(c.read(interestsProvider).subjects, ['meditation']);
      expect(phone.value.subjects, ['meditation']);
      expect(account.interestsByUser[_userId], ['meditation']);
    });

    test('an account that chose nothing wins too', () async {
      phone.value = const Interests(subjects: ['yoga'], chosen: true);
      account.interestsByUser[_userId] = [];
      account.restoreSession(_email);
      final c = container();
      await settle();
      expect(c.read(interestsProvider).subjects, isEmpty);
      expect(c.read(interestsProvider).chosen, isTrue);
    });

    test('signed in: written through to the account', () async {
      account.restoreSession(_email);
      final c = container();
      await settle();
      await c.read(interestsProvider.notifier).choose(['soul-purpose']);
      expect(account.interestsByUser[_userId], ['soul-purpose']);
      // Clearing is a choice as well.
      await c.read(interestsProvider.notifier).choose([]);
      expect(account.interestsByUser[_userId], isEmpty);
    });

    test('offline: the phone keeps it and sends it next time, over the '
        "account's older choice", () async {
      account.interestsByUser[_userId] = ['meditation'];
      account.restoreSession(_email);
      final c = container();
      await settle();
      account.offline = true;
      await c.read(interestsProvider.notifier).choose(['yoga']);
      expect(phone.value.subjects, ['yoga']);
      expect(phone.pending, isTrue);

      account.offline = false;
      await c.read(interestsProvider.notifier).syncWithAccount(_userId);
      expect(account.interestsByUser[_userId], ['yoga']);
      expect(phone.pending, isFalse);
      expect(c.read(interestsProvider).subjects, ['yoga']);
    });

    test('sign-out: the phone forgets it; the account keeps it', () async {
      account.restoreSession(_email);
      final c = container();
      await settle();
      await c.read(interestsProvider.notifier).choose(['yoga']);
      await c.read(accountProvider.notifier).signOut();
      await settle();
      expect(phone.value.chosen, isFalse);
      expect(c.read(interestsProvider).subjects, isEmpty);
      expect(account.interestsByUser[_userId], ['yoga']);
    });

    test('account deletion: nothing stays on the phone', () async {
      account.restoreSession(_email);
      final c = container();
      await settle();
      await c.read(interestsProvider.notifier).choose(['yoga']);
      await c.read(accountProvider.notifier).deleteAccount();
      await settle();
      expect(phone.value.chosen, isFalse);
      expect(account.interestsByUser, isEmpty);
    });
  });
}

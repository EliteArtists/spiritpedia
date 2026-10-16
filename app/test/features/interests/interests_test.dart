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
  group('More of: three levels (docs/personalisation.md)', () {
    // Someone who chose only Reiki (Emotional Healing).
    const items = <_Item>[
      (id: 'yoga', subjects: ['yoga']),
      (id: 'energy', subjects: ['energy-medicine']),
      (id: 'none', subjects: []),
      (id: 'reiki', subjects: ['reiki']),
      (id: 'quantum', subjects: ['quantum-touch', 'astrology']),
      (id: 'reiki+', subjects: ['reiki', 'self-healing']),
    ];
    List<String> ids(List<_Item> l) => [for (final i in l) i.id];

    test('no choice changes nothing', () {
      expect(byInterest(items, const {}, _subjects), same(items));
      expect(forYou(items, const {}, _subjects), isEmpty);
      expect(pillarsByInterest(const {}), subjectPillars.keys.toList());
    });

    test('Reiki, then the rest of Emotional Healing, then everything else; '
        'each level in its own order, nothing removed', () {
      expect(ids(byInterest(items, {'reiki'}, _subjects)), [
        'reiki', // level 1, in order
        'reiki+',
        'energy', // level 2: Energy Medicine, Quantum Touch
        'quantum',
        'yoga', // level 3, in order
        'none',
      ]);
      expect(interestLevel(['reiki'], {'reiki'}), 0);
      expect(interestLevel(['self-healing'], {'reiki'}), 1);
      expect(interestLevel(['yoga'], {'reiki'}), 2);
      expect(pillarMates({'reiki'}), {
        'shadow-work',
        'self-healing',
        'eft-tapping',
        'breathwork',
        'energy-medicine',
        'conscious-relationships',
        'quantum-touch',
      });
    });

    test('in level 1, more chosen subjects first', () {
      expect(ids(byInterest(items, {'reiki', 'self-healing'}, _subjects)), [
        'reiki+',
        'reiki',
        'energy',
        'quantum',
        'yoga',
        'none',
      ]);
    });

    test('For You: levels 1 and 2 only', () {
      expect(ids(forYou(items, {'reiki'}, _subjects)), [
        'reiki',
        'reiki+',
        'energy',
        'quantum',
      ]);
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
      // Level 2 counts too, less than level 1.
      expect(
        suggest(
          term: 'anxious',
          rows: rows,
          videos: [calm, still],
          books: [],
          interests: {'mindfulness'}, // Meditation's pillar, Consciousness
        ).video,
        still,
      );
      expect(interestBonus(['reiki'], {'reiki'}), 20);
      expect(interestBonus(['self-healing'], {'reiki'}), 10);
      expect(interestBonus(['yoga'], {'reiki'}), 0);
      expect(
        interestBonus(
          ['reiki', 'breathwork', 'eft-tapping', 'self-healing'],
          {'reiki', 'breathwork', 'eft-tapping', 'self-healing'},
        ),
        60,
      );
    });

    test('Suggests never suggests a hidden item, however relevant', () {
      const calm = Video(
        id: 1,
        slug: 'calm',
        title: 'Calm',
        subjectSlugs: ['breathwork', 'shamanism'],
      );
      const still = Video(
        id: 2,
        slug: 'still',
        title: 'Still',
        subjectSlugs: ['meditation'],
      );
      const rows = [MappingRow('breathwork', 10), MappingRow('meditation', 1)];
      expect(
        suggest(
          term: 'calm',
          rows: rows,
          videos: [calm, still],
          books: [],
          hidden: {'shamanism'},
        ).video,
        still,
      );
    });

    test('the summaries for Account and the menu', () {
      const names = [
        Subject(slug: 'yoga', name: 'Yoga'),
        Subject(slug: 'shamanism', name: 'Shamanism'),
      ];
      expect(tailoringSummary(Interests.none, names), isNull);
      expect(
        tailoringSummary(
          const Interests(
            subjects: ['yoga'],
            hidden: ['shamanism'],
            chosen: true,
          ),
          names,
        ),
        'More of: Yoga · Hidden: Shamanism',
      );

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

  group('Never show: the rules (docs/personalisation.md)', () {
    test('an item goes if ANY of its subjects is hidden', () {
      expect(
        isHiddenItem(['death-the-afterlife', 'shamanism'], {'shamanism'}),
        isTrue,
      );
      expect(isHiddenItem(['death-the-afterlife'], {'shamanism'}), isFalse);
      expect(isHiddenItem(const [], {'shamanism'}), isFalse);
      expect(isHiddenItem(['shamanism'], const {}), isFalse);
    });

    test('a teacher goes only if EVERY subject they cover is hidden', () {
      expect(isHiddenTeacher(['shamanism'], {'shamanism'}), isTrue);
      expect(isHiddenTeacher(['shamanism', 'yoga'], {'shamanism'}), isFalse);
      expect(isHiddenTeacher(const [], {'shamanism'}), isFalse);
      final teacher = FakeContentRepository.healer(
        1,
        't',
        'T',
        'superhero',
        subjects: ['shamanism', 'yoga'],
      );
      expect(const Hiding(subjects: {'shamanism'})(teacher), isFalse);
      expect(const Hiding(subjects: {'shamanism', 'yoga'})(teacher), isTrue);
      const book = Book(
        id: 1,
        slug: 'b',
        title: 'B',
        subjectSlugs: ['shamanism', 'yoga'],
      );
      expect(const Hiding(subjects: {'shamanism'})(book), isTrue);
    });

    test('More of beats Never show: an item with a More of subject stays', () {
      expect(
        isHiddenItem(['reiki', 'shamanism'], {'shamanism'}, {'reiki'}),
        isFalse,
      );
      expect(
        isHiddenItem(['yoga', 'shamanism'], {'shamanism'}, {'reiki'}),
        isTrue,
      );
      const both = Book(
        id: 2,
        slug: 'b2',
        title: 'B2',
        subjectSlugs: ['reiki', 'shamanism'],
      );
      const hiding = Hiding(subjects: {'shamanism'}, moreOf: {'reiki'});
      expect(hiding(both), isFalse);
      expect(hiding.items([both], (b) => b.subjectSlugs), [both]);
    });

    test(
      'a teacher whose content is ALL hidden goes too: no empty profiles',
      () {
        final content = {
          'all-hidden': [
            ['shamanism'],
            ['shamanism', 'yoga'],
          ],
          'some-left': [
            ['shamanism'],
            ['yoga'],
          ],
          'saved-by-more-of': [
            ['shamanism', 'reiki'],
          ],
          'no-content': <List<String>>[],
        };
        expect(
          teachersWithAllContentHidden(content, {'shamanism'}, {'reiki'}),
          {'all-hidden'},
        );
        expect(teachersWithAllContentHidden(content, const {}), isEmpty);

        final teacher = FakeContentRepository.healer(
          3,
          'all-hidden',
          'A',
          'superhero',
          subjects: ['yoga', 'meditation'],
        );
        final hiding = Hiding(
          subjects: const {'shamanism'},
          emptyTeachers: teachersWithAllContentHidden(content, {'shamanism'}),
        );
        expect(hiding(teacher), isTrue);
        // On a hidden subject's page, after "Show anyway", the subject rule
        // only.
        expect(hiding.showing('shamanism')(teacher), isFalse);
      },
    );

    test('a pillar whose every subject is hidden leaves the pill row', () {
      final mystical = {...subjectPillars['Mystical & Spiritual Exploration']!};
      expect(
        pillarsByInterest(const {}, null, mystical),
        isNot(contains('Mystical & Spiritual Exploration')),
      );
      expect(
        pillarsByInterest(const {}, null, {'shamanism'}),
        contains('Mystical & Spiritual Exploration'),
      );
    });

    test('nothing is More of and Never show at once', () {
      final tidy = tidyInterests(['yoga', 'reiki'], ['reiki', 'shamanism']);
      expect(tidy.subjects, ['yoga']);
      expect(tidy.hidden, ['reiki', 'shamanism']);
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
        expect(account.interestsByUser[_userId]?.subjects, ['yoga']);
      },
    );

    test('phone and account both chose: the account wins', () async {
      phone.value = const Interests(subjects: ['yoga'], chosen: true);
      account.interestsByUser[_userId] = (subjects: ['meditation'], hidden: []);
      account.restoreSession(_email);
      final c = container();
      await settle();
      expect(c.read(interestsProvider).subjects, ['meditation']);
      expect(phone.value.subjects, ['meditation']);
      expect(account.interestsByUser[_userId]?.subjects, ['meditation']);
    });

    test('an account that chose nothing wins too', () async {
      phone.value = const Interests(subjects: ['yoga'], chosen: true);
      account.interestsByUser[_userId] = (subjects: [], hidden: []);
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
      expect(account.interestsByUser[_userId]?.subjects, ['soul-purpose']);
      // Clearing is a choice as well.
      await c.read(interestsProvider.notifier).choose([]);
      expect(account.interestsByUser[_userId]?.subjects, isEmpty);
    });

    test('offline: the phone keeps it and sends it next time, over the '
        "account's older choice", () async {
      account.interestsByUser[_userId] = (subjects: ['meditation'], hidden: []);
      account.restoreSession(_email);
      final c = container();
      await settle();
      account.offline = true;
      await c.read(interestsProvider.notifier).choose(['yoga']);
      expect(phone.value.subjects, ['yoga']);
      expect(phone.pending, isTrue);

      account.offline = false;
      await c.read(interestsProvider.notifier).syncWithAccount(_userId);
      expect(account.interestsByUser[_userId]?.subjects, ['yoga']);
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
      expect(account.interestsByUser[_userId]?.subjects, ['yoga']);
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

    test(
      'Never show: kept, synced and won by the account the same way',
      () async {
        phone.value = const Interests(hidden: ['shamanism'], chosen: true);
        container();
        await settle();
        account.restoreSession(_email);
        await settle();
        expect(account.interestsByUser[_userId]?.hidden, ['shamanism']);
      },
    );

    test("hiding keeps More of; choosing keeps what's hidden", () async {
      account.restoreSession(_email);
      final c = container();
      await settle();
      final tailoring = c.read(interestsProvider.notifier);
      await tailoring.choose(['yoga', 'reiki']);
      await tailoring.hide(['shamanism', 'reiki']);
      expect(phone.value.subjects, ['yoga']); // reiki gave way
      expect(phone.value.hidden, ['reiki', 'shamanism']);
      await tailoring.choose(['ayurveda']);
      expect(phone.value.hidden, ['reiki', 'shamanism']);
      expect(account.interestsByUser[_userId]?.subjects, ['ayurveda']);
      expect(account.interestsByUser[_userId]?.hidden, ['reiki', 'shamanism']);
      expect(c.read(hiddenSubjectsProvider), {'reiki', 'shamanism'});
    });

    test('the account wins with both lists', () async {
      phone.value = const Interests(
        subjects: ['yoga'],
        hidden: ['astrology'],
        chosen: true,
      );
      account.interestsByUser[_userId] = (
        subjects: ['meditation'],
        hidden: ['shamanism'],
      );
      account.restoreSession(_email);
      final c = container();
      await settle();
      expect(c.read(interestsProvider).hidden, ['shamanism']);
      expect(phone.value.hidden, ['shamanism']);
    });
  });
}

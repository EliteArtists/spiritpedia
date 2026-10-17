// Activity learning (migration 0021): the queue, the settled-search signal
// (never for a crisis search), the star's question and the switch.

import 'dart:convert';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/core/retry.dart';
import 'package:spiritpedia/core/safety/emotion_safety.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/features/account/display_name.dart';
import 'package:spiritpedia/features/area/area.dart';
import 'package:spiritpedia/features/library/saved_items.dart';
import 'package:spiritpedia/features/notifications/notifications_controller.dart';
import 'package:spiritpedia/features/reviews/reviews_providers.dart';
import 'package:spiritpedia/features/account/account_providers.dart';
import 'package:spiritpedia/features/learning/learning.dart';
import 'package:spiritpedia/features/search/emotion_search_controller.dart';
import 'package:spiritpedia/features/search/search_repository.dart';
import 'package:spiritpedia/features/star/conductor.dart';

import '../../support/fake_account.dart';
import '../../support/fake_content.dart';
import '../../support/fake_reviews.dart';

final _json = File('../web/shared/emotion-safety.json').readAsStringSync();
final _safety = EmotionSafety.parse(_json);

class _Sender implements ActivitySender {
  final batches = <List<Map<String, Object?>>>[];
  bool up = true;

  @override
  Future<bool> send(List<Map<String, Object?>> events) async {
    if (!up) return false;
    batches.add(events);
    return true;
  }
}

class _Feelings implements SearchRepository {
  @override
  Future<List<MappingRow>> exactEmotion(String emotion) async =>
      emotion == 'anxious'
      ? const [MappingRow('meditation', 9), MappingRow('breathwork', 7)]
      : const [];
  @override
  Future<List<String>> vocabulary(List<String> words) async =>
      words.contains('anxious') ? const ['anxious'] : const [];
  @override
  Future<List<MappingRow>> forwardSubstring(String normalised) async =>
      const [];
  @override
  Future<UniversalResults> universal(String term) async =>
      UniversalResults.empty;
}

void main() {
  group('the queue', () {
    late _Sender sender;
    late MemoryActivityQueueStore store;
    var now = DateTime.utc(2026, 10, 18, 12);
    ActivityLog log({int flushAt = 20}) => ActivityLog(
      sender,
      store,
      flushAt: flushAt,
      clock: () => now,
      observeLifecycle: false,
    );

    setUp(() {
      sender = _Sender();
      store = MemoryActivityQueueStore();
      now = DateTime.utc(2026, 10, 18, 12);
    });

    test('an item opened again within the session is one open', () async {
      final q = log()..open('video', 'v1')..open('video', 'v1');
      expect(q.pending, hasLength(1));
      now = now.add(const Duration(minutes: 31));
      q.open('video', 'v1');
      expect(q.pending, hasLength(2));
      q
        ..watch('v1')
        ..watch('v1');
      expect(q.pending.where((e) => e['kind'] == 'watch'), hasLength(1));
      q.dispose();
    });

    test('sent at 20 events, in one batch', () async {
      final q = log();
      for (var i = 0; i < 20; i++) {
        q.content('save', 'book', 'b$i');
      }
      await pumpEventQueue();
      expect(sender.batches, hasLength(1));
      expect(sender.batches.single, hasLength(20));
      expect(q.pending, isEmpty);
      q.dispose();
    });

    test('kept on the phone when it cannot go, and sent first next time',
        () async {
      sender.up = false;
      final q = log()..content('share', 'video', 'v1');
      await q.flush();
      expect(q.pending, hasLength(1));
      expect(store.value, hasLength(1));
      q.dispose();

      sender.up = true;
      final next = log()..subjects('pill', ['yoga']);
      await next.flush();
      expect(sender.batches.single.map((e) => e['kind']), ['share', 'pill']);
      expect(store.value, isEmpty);
      next.dispose();
    });

    test('a search sends its subjects, or — only with no results — its words',
        () async {
      final q = log()
        ..search(subjects: ['meditation', 'breathwork'])
        ..search(term: '  unicorn reiki ')
        ..search();
      expect(q.pending, [
        {'kind': 'search', 'subjects': ['meditation', 'breathwork']},
        {'kind': 'search', 'term': 'unicorn reiki', 'no_results': true},
      ]);
      q.dispose();
    });

    test('share links name what they share', () {
      expect(contentOfPath('/books/the-power-of-now'), (
        type: 'book',
        slug: 'the-power-of-now',
      ));
      expect(contentOfPath('/offerings/x')?.type, 'course');
      expect(contentOfPath('/free-resources/x')?.type, 'free_resource');
      expect(contentOfPath('/healers/x')?.type, 'healer');
      expect(contentOfPath('/'), isNull);
      expect(contentOfPath('/subject/reiki'), isNull);
    });
  });

  group('a settled search', () {
    const quick = Duration(milliseconds: 20);
    Future<List<({List<String> subjects, String? term})>> run(
      List<String> typed,
    ) async {
      final settled = <({List<String> subjects, String? term})>[];
      final search = EmotionSearchController(
        safety: _safety,
        repository: _Feelings(),
        debounce: quick,
        settleAfter: quick,
        onSettled: ({subjects = const [], term}) =>
            settled.add((subjects: subjects, term: term)),
      );
      for (final t in typed) {
        search.onChanged(t);
        await Future<void>.delayed(const Duration(milliseconds: 120));
      }
      search.dispose();
      return settled;
    }

    test('sends the subjects a feeling led to, never its words', () async {
      final s = await run(['anxious']);
      expect(s.single.subjects, ['meditation', 'breathwork']);
      expect(s.single.term, isNull);
    });

    test('sends the words only when nothing at all was found', () async {
      final s = await run(['zzqa unicorn']);
      expect(s.single.subjects, isEmpty);
      expect(s.single.term, 'zzqa unicorn');
    });

    test('typing on: only the search it settled on', () async {
      final search = <({List<String> subjects, String? term})>[];
      final c = EmotionSearchController(
        safety: _safety,
        repository: _Feelings(),
        debounce: const Duration(milliseconds: 10),
        settleAfter: const Duration(milliseconds: 200),
        onSettled: ({subjects = const [], term}) =>
            search.add((subjects: subjects, term: term)),
      );
      for (final t in ['an', 'anx', 'anxious']) {
        c.onChanged(t);
        await Future<void>.delayed(const Duration(milliseconds: 40));
      }
      await Future<void>.delayed(const Duration(milliseconds: 400));
      c.dispose();
      expect(search, hasLength(1));
      expect(search.single.subjects, ['meditation', 'breathwork']);
    });

    test('NEVER a crisis search, in any form', () async {
      final phrases = [
        for (final p in (jsonDecode(_json)['crisisPatterns'] as List))
          for (final phrase in (p as Map)['phrases'] as List) phrase as String,
      ];
      expect(phrases.length, greaterThan(10));
      // One search box, every phrase typed in turn, each given time to
      // settle: nothing is ever sent.
      final settled = <String>[];
      final search = EmotionSearchController(
        safety: _safety,
        repository: _Feelings(),
        debounce: const Duration(milliseconds: 2),
        settleAfter: const Duration(milliseconds: 2),
        onSettled: ({subjects = const [], term}) =>
            settled.add('${subjects.join(',')}|$term'),
      );
      for (final phrase in phrases) {
        for (final typed in [phrase, 'I feel $phrase']) {
          search.onChanged(typed);
          expect(search.view, SearchView.crisis, reason: typed);
          await Future<void>.delayed(const Duration(milliseconds: 8));
        }
      }
      search.dispose();
      expect(settled, isEmpty);
    });
  });

  group('the star asks to learn', () {
    final now = DateTime.utc(2026, 10, 18);
    const never = (times: 0, lastVisit: 0, lastAt: null);
    StarAsk? at(int visit, {bool mayLearn = true, bool area = false}) =>
        nextAsk(
          visit: visit,
          hasArea: area,
          hasName: false,
          records: const {},
          now: now,
          mayLearn: mayLearn,
        );

    test('from visit 3, signed in with learning off; before the area', () {
      expect(at(2), isNull);
      expect(at(3), StarAsk.learning);
      expect(at(5), StarAsk.learning);
      expect(at(5, mayLearn: false), StarAsk.area);
      expect(at(3, mayLearn: false), isNull);
      expect(mayAsk(StarAsk.learning, 3, never, now), isTrue);
    });

    test('put away once: once more, much later; then never', () {
      final once = (times: 1, lastVisit: 3, lastAt: now);
      expect(
        mayAsk(StarAsk.learning, 17, once, now.add(const Duration(days: 30))),
        isFalse,
      );
      expect(
        mayAsk(StarAsk.learning, 18, once, now.add(const Duration(days: 21))),
        isTrue,
      );
      final twice = (times: 2, lastVisit: 18, lastAt: now);
      expect(
        mayAsk(StarAsk.learning, 300, twice, now.add(const Duration(days: 900))),
        isFalse,
      );
    });
  });

  group('the switch', () {
    test('off until a signed-in member turns it on; off deletes what was '
        'learned; signed out it cannot be turned on', () async {
      final service = FakeAccountService();
      final container = ProviderContainer(
        retry: spiritpediaRetry,
        overrides: [
          reviewsServiceProvider.overrideWithValue(FakeReviewsService()),
          accountServiceProvider.overrideWithValue(service),
          savedStoreProvider.overrideWithValue(MemorySavedStore()),
          pushDeviceStoreProvider.overrideWithValue(MemoryPushDeviceStore()),
          contentRepositoryProvider.overrideWithValue(FakeContentRepository()),
          areaStoreProvider.overrideWithValue(MemoryAreaStore()),
          nameStoreProvider.overrideWithValue(MemoryNameStore()),
          activityQueueStoreProvider.overrideWithValue(
            MemoryActivityQueueStore(),
          ),
        ],
      );
      addTearDown(container.dispose);
      container.listen(learningProvider, (_, _) {});
      expect(container.read(learningProvider), isFalse);
      expect(await container.read(learningProvider.notifier).set(true), isFalse);

      container.listen(signedInUserIdProvider, (_, _) {});
      service.restoreSession('seeker@example.com');
      await pumpEventQueue();
      final id = container.read(signedInUserIdProvider)!;
      expect(container.read(learningProvider), isFalse);

      expect(await container.read(learningProvider.notifier).set(true), isTrue);
      expect(container.read(learningProvider), isTrue);
      expect(service.learningByUser[id], isTrue);

      service.affinityByUser[id] = [
        (subject: 'yoga', score: 6, updatedAt: DateTime.now()),
      ];
      container.invalidate(affinityProvider);
      await container.read(affinityProvider.future);
      expect(container.read(learnedProvider).keys, ['yoga']);

      expect(await container.read(learningProvider.notifier).set(false), isTrue);
      expect(service.affinityByUser[id], isNull);
      await container.read(affinityProvider.future);
      expect(container.read(learnedProvider), isEmpty);
    });
  });
}

import 'dart:async';

import 'package:fake_async/fake_async.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/features/notifications/push_presence.dart';

import '../../support/fake_account.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeAccountService account;
  late MemoryFirstVisitStore store;

  setUp(() {
    account = FakeAccountService();
    store = MemoryFirstVisitStore();
  });

  PushPresence presence({DateTime Function()? clock}) => PushPresence(
    account,
    store,
    clock: clock,
    observeLifecycle: false,
  );

  test('signed out: nothing is sent', () {
    fakeAsync((async) {
      final p = presence();
      async.elapse(const Duration(minutes: 5));
      expect(account.appOpens, isEmpty);
      expect(account.firstVisits, 0);
      p.dispose();
    });
  });

  test('an opening says when, with the offset from UTC; again only after '
      '30 minutes away', () {
    fakeAsync((async) {
      account.restoreSession('a@example.com');
      var now = DateTime(2026, 11, 3, 10);
      final p = presence(clock: () => now);
      async.flushMicrotasks();
      expect(account.appOpens, [now.timeZoneOffset.inMinutes]);
      now = now.add(const Duration(minutes: 10));
      p.didChangeAppLifecycleState(AppLifecycleState.resumed);
      async.flushMicrotasks();
      expect(account.appOpens, hasLength(1));
      now = now.add(const Duration(minutes: 31));
      p.didChangeAppLifecycleState(AppLifecycleState.resumed);
      async.flushMicrotasks();
      expect(account.appOpens, hasLength(2));
      p.dispose();
    });
  });

  test('three minutes in the app is a first real visit, told once', () {
    fakeAsync((async) {
      account.restoreSession('a@example.com');
      final p = presence();
      async.flushMicrotasks();
      async.elapse(const Duration(minutes: 2));
      expect(account.firstVisits, 0);
      async.elapse(const Duration(minutes: 1, seconds: 1));
      expect(account.firstVisits, 1);
      unawaited(p.realVisit());
      async.flushMicrotasks();
      expect(account.firstVisits, 1);
      p.dispose();
    });
  });

  test('the three minutes pause in the background', () {
    fakeAsync((async) {
      account.restoreSession('a@example.com');
      final p = presence(clock: () => DateTime(2026).add(async.elapsed));
      async.flushMicrotasks();
      async.elapse(const Duration(minutes: 2));
      p.didChangeAppLifecycleState(AppLifecycleState.paused);
      async.elapse(const Duration(minutes: 10));
      expect(account.firstVisits, 0);
      p.didChangeAppLifecycleState(AppLifecycleState.resumed);
      async.elapse(const Duration(seconds: 59));
      expect(account.firstVisits, 0);
      async.elapse(const Duration(seconds: 2));
      expect(account.firstVisits, 1);
      p.dispose();
    });
  });

  test('a save or a feeling search is a first real visit at once', () {
    fakeAsync((async) {
      account.restoreSession('a@example.com');
      final p = presence();
      async.flushMicrotasks();
      unawaited(p.realVisit());
      async.flushMicrotasks();
      expect(account.firstVisits, 1);
      p.dispose();
    });
  });
}

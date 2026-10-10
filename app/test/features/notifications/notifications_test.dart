import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/core/retry.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/features/account/account_providers.dart';
import 'package:spiritpedia/features/account/account_screen.dart';
import 'package:spiritpedia/features/account/account_service.dart';
import 'package:spiritpedia/features/library/saved_items.dart';
import 'package:spiritpedia/features/notifications/notifications_controller.dart';
import 'package:spiritpedia/features/notifications/push_messaging.dart';
import 'package:spiritpedia/theme/theme.dart';

import '../../support/fake_account.dart';
import '../../support/fake_content.dart';
import '../../support/fake_push.dart';

const _email = 'seeker@example.com';
const _userId = 'user-seeker@example.com';

void main() {
  setUp(() {
    final view = TestWidgetsFlutterBinding.ensureInitialized()
        .platformDispatcher
        .views
        .first;
    view.physicalSize = const Size(1290, 6000);
    view.devicePixelRatio = 3;
  });
  tearDown(
    () => TestWidgetsFlutterBinding.ensureInitialized()
        .platformDispatcher
        .views
        .first
        .resetPhysicalSize(),
  );

  late FakeAccountService account;
  late FakePushMessaging push;
  late MemoryPushDeviceStore device;
  setUp(() {
    account = FakeAccountService();
    push = FakePushMessaging();
    device = MemoryPushDeviceStore();
  });

  ProviderContainer container() {
    final c = ProviderContainer(
      retry: spiritpediaRetry,
      overrides: [
        accountServiceProvider.overrideWithValue(account),
        savedStoreProvider.overrideWithValue(MemorySavedStore()),
        contentRepositoryProvider.overrideWithValue(FakeContentRepository()),
        pushMessagingProvider.overrideWithValue(push),
        pushDeviceStoreProvider.overrideWithValue(device),
        pushPlatformProvider.overrideWithValue('ios'),
      ],
    );
    addTearDown(c.dispose);
    c.read(accountProvider);
    c.read(notificationsProvider);
    return c;
  }

  Future<void> settle() =>
      Future<void>.delayed(const Duration(milliseconds: 20));

  Future<ProviderContainer> pumpAccount(WidgetTester tester) async {
    final c = container();
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: c,
        child: MaterialApp(
          theme: buildSpiritpediaTheme(),
          home: const AccountScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return c;
  }

  testWidgets('signed out: no notifications section at all', (tester) async {
    await pumpAccount(tester);
    expect(find.text('Notifications'), findsNothing);
  });

  testWidgets(
    '"Not now" on the friendly screen leaves the system prompt unused',
    (tester) async {
      account.restoreSession(_email);
      await pumpAccount(tester);
      await tester.tap(find.text('Turn on notifications'));
      await tester.pumpAndSettle();
      expect(find.text('Would you like notifications?'), findsOneWidget);
      await tester.tap(find.text('Not now'));
      await tester.pumpAndSettle();
      expect(push.calls, isNot(contains('requestPermission')));
      expect(account.pushTokens, isEmpty);
      expect(find.text('Turn on notifications'), findsOneWidget);
    },
  );

  testWidgets(
    '"Yes": system prompt, token registered, choices saved, welcome asked for',
    (tester) async {
      account.restoreSession(_email);
      await pumpAccount(tester);
      await tester.tap(find.text('Turn on notifications'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Yes, notify me'));
      await tester.pumpAndSettle();

      expect(
        push.calls,
        containsAllInOrder(['requestPermission', 'autoInit:true']),
      );
      expect(account.pushTokens, {'token-1': _userId});
      expect(account.calls, contains('registerPushToken:ios'));
      expect(account.prefsByUser[_userId]?.general, isTrue);
      expect(account.welcomeCalls, 1);
      expect(device.value, isTrue);
      expect(find.text('General'), findsOneWidget);
      expect(find.text('IAM affirmations'), findsOneWidget);
      expect(find.text('Coming later'), findsOneWidget);
    },
  );

  testWidgets(
    'refused at the system prompt: nothing registered, Settings explained',
    (tester) async {
      push.answer = PushPermission.denied;
      account.restoreSession(_email);
      await pumpAccount(tester);
      await tester.tap(find.text('Turn on notifications'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Yes, notify me'));
      await tester.pumpAndSettle();
      expect(account.pushTokens, isEmpty);
      expect(account.welcomeCalls, 0);
      expect(push.calls, isNot(contains('autoInit:true')));
      expect(
        find.textContaining('switched off for Spiritpedia'),
        findsOneWidget,
      );
    },
  );

  test('General can be switched off and on', () async {
    account.restoreSession(_email);
    final c = container();
    await settle();
    await c.read(notificationsProvider.notifier).turnOn();
    await c.read(notificationsProvider.notifier).setGeneral(false);
    expect(account.prefsByUser[_userId]?.general, isFalse);
    expect(account.prefsByUser[_userId]?.iamAffirmations, isFalse);
    await c.read(notificationsProvider.notifier).setGeneral(true);
    expect(account.prefsByUser[_userId]?.general, isTrue);
  });

  test(
    'turning off removes the token from the account and from Firebase',
    () async {
      account.restoreSession(_email);
      final c = container();
      await settle();
      await c.read(notificationsProvider.notifier).turnOn();
      await c.read(notificationsProvider.notifier).turnOff();
      expect(account.pushTokens, isEmpty);
      expect(push.calls, containsAllInOrder(['deleteToken', 'autoInit:false']));
      expect(device.value, isFalse);
      expect(c.read(notificationsProvider).onThisPhone, isFalse);
    },
  );

  test(
    'sign-out removes the token while still signed in, then signs out',
    () async {
      account.restoreSession(_email);
      final c = container();
      await settle();
      await c.read(notificationsProvider.notifier).turnOn();
      await c.read(accountProvider.notifier).signOut();
      final i = account.calls.indexOf('removePushToken');
      expect(i, greaterThanOrEqualTo(0));
      expect(i, lessThan(account.calls.indexOf('signOut')));
      expect(account.pushTokens, isEmpty);
      // The next person on this phone is asked themselves.
      expect(device.value, isFalse);
    },
  );

  test(
    'account deletion clears the phone; the server already removed the token',
    () async {
      account.restoreSession(_email);
      final c = container();
      await settle();
      await c.read(notificationsProvider.notifier).turnOn();
      await c.read(accountProvider.notifier).deleteAccount();
      expect(account.calls, isNot(contains('removePushToken')));
      expect(push.calls, contains('deleteToken'));
      expect(device.value, isFalse);
    },
  );

  test('a rotated token is registered again', () async {
    account.restoreSession(_email);
    final c = container();
    await settle();
    await c.read(notificationsProvider.notifier).turnOn();
    push.refreshes.add('token-rotated');
    await settle();
    expect(account.pushTokens['token-rotated'], _userId);
  });

  test('on start: re-registers only if THIS phone said yes before', () async {
    push.current = PushPermission.granted;
    account.restoreSession(_email);
    container();
    await settle();
    expect(account.calls, isNot(contains('registerPushToken:ios')));

    device.value = true;
    container();
    await settle();
    expect(account.calls, contains('registerPushToken:ios'));
  });

  test(
    'the welcome is asked for on each turn-on; the server sends it once',
    () async {
      account.restoreSession(_email);
      final c = container();
      await settle();
      await c.read(notificationsProvider.notifier).turnOn();
      await c.read(notificationsProvider.notifier).turnOff();
      await c.read(notificationsProvider.notifier).turnOn();
      // The app may ask twice; notification_sends makes the server send once
      // (web/utils/push.test.mjs proves that side).
      expect(account.welcomeCalls, 2);
      expect(account.prefsByUser[_userId], isA<NotificationPrefs>());
    },
  );
}

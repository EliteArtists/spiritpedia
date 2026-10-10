import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/core/retry.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/features/account/account_providers.dart';
import 'package:spiritpedia/features/account/account_screen.dart';
import 'package:spiritpedia/features/account/account_service.dart';
import 'package:spiritpedia/features/library/saved_items.dart';
import 'package:spiritpedia/theme/theme.dart';

import '../../support/fake_account.dart';
import '../../support/fake_content.dart';

const _email = 'Seeker@Example.com';
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

  late FakeAccountService service;
  late MemorySavedStore store;
  setUp(() {
    service = FakeAccountService();
    store = MemorySavedStore();
  });

  ProviderContainer container() {
    final c = ProviderContainer(
      retry: spiritpediaRetry,
      overrides: [
        accountServiceProvider.overrideWithValue(service),
        savedStoreProvider.overrideWithValue(store),
        contentRepositoryProvider.overrideWithValue(FakeContentRepository()),
      ],
    );
    addTearDown(c.dispose);
    c.read(accountProvider); // start listening, as the app does
    c.read(savedItemsProvider);
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

  group('signing in', () {
    testWidgets('the email field carries no iOS AutoFill hint', (tester) async {
      // Regression guard: AutofillHints.email made iOS stop accepting typing
      // after the first character (see account_screen.dart).
      await pumpAccount(tester);
      final field = tester.widget<TextField>(
        find.byKey(const ValueKey('email-field')),
      );
      expect(field.autofillHints, anyOf(isNull, isEmpty));
      expect(field.keyboardType, TextInputType.emailAddress);
      expect(field.autocorrect, isFalse);
      expect(field.enableSuggestions, isFalse);
    });

    testWidgets('email, then the 6-digit code; a wrong code says so', (
      tester,
    ) async {
      await pumpAccount(tester);
      expect(find.text('Your account'), findsOneWidget);

      await tester.enterText(
        find.byKey(const ValueKey('email-field')),
        ' $_email ',
      );
      await tester.tap(find.text('Email me a code'));
      await tester.pumpAndSettle();
      expect(service.calls, contains('sendCode:seeker@example.com'));
      expect(
        find.textContaining(
          'Enter the 6-digit code we sent to seeker@example.com',
        ),
        findsOneWidget,
      );

      await tester.enterText(
        find.byKey(const ValueKey('code-field')),
        '999999',
      );
      await tester.pumpAndSettle();
      expect(
        find.text("That code didn't work. Please try again."),
        findsOneWidget,
      );
      expect(service.currentUser, isNull);

      // Filling the last digit submits.
      await tester.enterText(
        find.byKey(const ValueKey('code-field')),
        '123456',
      );
      await tester.pumpAndSettle();
      expect(find.text('My Account'), findsOneWidget);
      expect(find.text('seeker@example.com'), findsOneWidget);
      expect(find.text('Explorer'), findsOneWidget);
    });

    test('a new account gets a profile and ONE welcome; a returning one gets neither', () async {
      final c = container();
      await c.read(accountProvider.notifier).verifyCode(_email, '123456');
      await settle();
      expect(service.profiles[_userId]?.userType, 'explorer');
      expect(service.calls.where((x) => x == 'sendWelcome'), hasLength(1));

      await c.read(accountProvider.notifier).signOut();
      await c.read(accountProvider.notifier).verifyCode(_email, '123456');
      await settle();
      expect(service.calls.where((x) => x == 'sendWelcome'), hasLength(1));
    });

    test(
      'an existing practitioner profile is never reset to explorer',
      () async {
        service.profiles[_userId] = const AccountProfile(
          userType: 'practitioner',
          linkedHealerSlug: 'jane-doe',
        );
        final c = container();
        await c.read(accountProvider.notifier).verifyCode(_email, '123456');
        await settle();
        expect(service.profiles[_userId]?.userType, 'practitioner');
        expect(c.read(accountProvider).profile?.isPractitioner, isTrue);
        expect(service.calls, isNot(contains('sendWelcome')));
      },
    );
  });

  group('My Library sync', () {
    test(
      'signed out, a save stays on the phone and reaches no server',
      () async {
        final c = container();
        await settle();
        await c
            .read(savedItemsProvider.notifier)
            .toggle(SavedKind.books, 'brain-states');
        expect(store.data[SavedKind.books], ['brain-states']);
        expect(
          service.calls.where((x) => x.startsWith('addFavourites')),
          isEmpty,
        );
      },
    );

    test(
      'sign-in merges the phone\'s saves up and takes the account\'s down',
      () async {
        store.data[SavedKind.books] = ['brain-states'];
        store.data[SavedKind.readBooks] = ['a-new-earth'];
        // Saved on the website earlier.
        service.favouriteRows[_userId] = [
          (contentType: 'video', slug: 'a-talk'),
          (contentType: 'course', slug: 'breath-course'),
        ];
        final c = container();
        await settle();
        await c.read(accountProvider.notifier).verifyCode(_email, '123456');
        await settle();

        final saved = c.read(savedItemsProvider);
        expect(saved[SavedKind.books], ['brain-states']);
        expect(saved[SavedKind.readBooks], ['a-new-earth']);
        expect(saved[SavedKind.videos], ['a-talk']);
        expect(saved[SavedKind.offerings], ['breath-course']);
        expect(
          service.favouriteRows[_userId],
          containsAll([
            (contentType: 'book', slug: 'brain-states'),
            (contentType: 'book_read', slug: 'a-new-earth'),
          ]),
        );
      },
    );

    test('signed in, every tap is written through', () async {
      final c = container();
      await c.read(accountProvider.notifier).verifyCode(_email, '123456');
      await settle();
      await c
          .read(savedItemsProvider.notifier)
          .toggle(SavedKind.healers, 'eckhart-tolle');
      expect(
        service.favouriteRows[_userId],
        contains((contentType: 'healer', slug: 'eckhart-tolle')),
      );
      await c
          .read(savedItemsProvider.notifier)
          .toggle(SavedKind.healers, 'eckhart-tolle');
      expect(
        service.favouriteRows[_userId],
        isNot(contains((contentType: 'healer', slug: 'eckhart-tolle'))),
      );
    });

    test(
      'the merge happens once: an item removed elsewhere is not re-added',
      () async {
        final c = container();
        await c.read(accountProvider.notifier).verifyCode(_email, '123456');
        await settle();
        await c
            .read(savedItemsProvider.notifier)
            .toggle(SavedKind.books, 'brain-states');

        // Removed on the website while the phone still holds it…
        service.favouriteRows[_userId]!.clear();
        // …then the app starts again with the session restored.
        final again = container();
        service.restoreSession(_email);
        await settle();
        expect(again.read(savedItemsProvider)[SavedKind.books], isEmpty);
        expect(service.favouriteRows[_userId], isEmpty);
      },
    );

    test('offline at sign-in: the phone keeps its saves', () async {
      store.data[SavedKind.books] = ['brain-states'];
      service.offline = true;
      final c = container();
      await settle();
      await c.read(accountProvider.notifier).verifyCode(_email, '123456');
      await settle();
      expect(c.read(savedItemsProvider)[SavedKind.books], ['brain-states']);
      expect(await store.isMerged(_userId), isFalse);
    });

    test('sign-out clears the phone; the account keeps everything', () async {
      final c = container();
      await c.read(accountProvider.notifier).verifyCode(_email, '123456');
      await settle();
      await c
          .read(savedItemsProvider.notifier)
          .toggle(SavedKind.books, 'brain-states');
      await c.read(accountProvider.notifier).signOut();
      await settle();
      expect(c.read(accountProvider).signedIn, isFalse);
      expect(store.data[SavedKind.books], isEmpty);
      expect(service.favouriteRows[_userId], [
        (contentType: 'book', slug: 'brain-states'),
      ]);
    });
  });

  group('deleting the account', () {
    Future<void> openDelete(WidgetTester tester) async {
      await tester.scrollUntilVisible(find.text('Delete account').last, 200);
      await tester.tap(find.widgetWithText(OutlinedButton, 'Delete account'));
      await tester.pumpAndSettle();
    }

    testWidgets(
      'needs DELETE typed; then the account and the phone\'s saves go',
      (tester) async {
        service.restoreSession(_email);
        store.data[SavedKind.books] = ['brain-states'];
        await pumpAccount(tester);
        await openDelete(tester);

        final button = find.widgetWithText(FilledButton, 'Delete my account');
        expect(tester.widget<FilledButton>(button).onPressed, isNull);
        await tester.enterText(
          find.byKey(const ValueKey('confirm-delete')),
          'delete',
        );
        await tester.pump();
        expect(tester.widget<FilledButton>(button).onPressed, isNull);

        await tester.enterText(
          find.byKey(const ValueKey('confirm-delete')),
          'DELETE',
        );
        await tester.pump();
        await tester.tap(button);
        await tester.pumpAndSettle();

        expect(service.deletedUsers, contains(_userId));
        expect(store.data[SavedKind.books], isEmpty);
        expect(find.text('Your account'), findsOneWidget); // signed out
        expect(find.text('Your account has been deleted.'), findsOneWidget);
      },
    );

    testWidgets('if the server refuses, nothing on the phone changes', (
      tester,
    ) async {
      service.restoreSession(_email);
      service.failDelete = true;
      store.data[SavedKind.books] = ['brain-states'];
      await pumpAccount(tester);
      await openDelete(tester);
      await tester.enterText(
        find.byKey(const ValueKey('confirm-delete')),
        'DELETE',
      );
      await tester.pump();
      await tester.tap(find.widgetWithText(FilledButton, 'Delete my account'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Nothing was removed'), findsOneWidget);
      expect(find.text('My Account'), findsOneWidget);
      expect(store.data[SavedKind.books], ['brain-states']);
    });

    testWidgets('a practitioner with a listing is told it stays, unclaimed', (
      tester,
    ) async {
      service.profiles[_userId] = const AccountProfile(
        userType: 'practitioner',
        linkedHealerSlug: 'jane-doe',
      );
      service.restoreSession(_email);
      await pumpAccount(tester);
      expect(
        find.text('Your practitioner profile is managed on the website.'),
        findsOneWidget,
      );
      await openDelete(tester);
      expect(
        find.textContaining(
          'Your public teacher profile stays on Spiritpedia, unclaimed.',
        ),
        findsOneWidget,
      );
    });
  });
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/core/retry.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/features/account/account_providers.dart';
import 'package:spiritpedia/features/account/display_name.dart';
import 'package:spiritpedia/features/area/area.dart';
import 'package:spiritpedia/features/account/account_screen.dart';
import 'package:spiritpedia/features/account/account_service.dart';
import 'package:spiritpedia/features/library/saved_items.dart';
import 'package:spiritpedia/features/notifications/notifications_controller.dart';
import 'package:spiritpedia/theme/theme.dart';
import 'package:spiritpedia/features/reviews/reviews_providers.dart';

import '../../support/fake_account.dart';
import '../../support/fake_content.dart';
import '../../support/fake_reviews.dart';

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
  late MemoryAreaStore areaStore;
  late MemoryNameStore nameStore;
  setUp(() {
    service = FakeAccountService();
    areaStore = MemoryAreaStore();
    nameStore = MemoryNameStore();
    store = MemorySavedStore();
  });

  ProviderContainer container() {
    final c = ProviderContainer(
      retry: spiritpediaRetry,
      overrides: [
        reviewsServiceProvider.overrideWithValue(FakeReviewsService()),
        accountServiceProvider.overrideWithValue(service),
        savedStoreProvider.overrideWithValue(store),
        pushDeviceStoreProvider.overrideWithValue(MemoryPushDeviceStore()),
        contentRepositoryProvider.overrideWithValue(FakeContentRepository()),
        areaStoreProvider.overrideWithValue(areaStore),
        nameStoreProvider.overrideWithValue(nameStore),
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

    test('a new account gets ONE welcome at once, before it is asked; a '
        'returning one is asked nothing and gets none', () async {
      final c = container();
      await c.read(accountProvider.notifier).verifyCode(_email, '123456');
      await settle();
      expect(service.profiles[_userId]?.userType, 'explorer');
      // Sent when the account is created, not after the answer.
      expect(c.read(accountProvider).isNew, isTrue);
      expect(service.calls.where((x) => x == 'sendWelcome'), hasLength(1));
      await c.read(accountProvider.notifier).chooseExploring();
      expect(c.read(accountProvider).isNew, isFalse);
      expect(service.calls.where((x) => x == 'sendWelcome'), hasLength(1));

      await c.read(accountProvider.notifier).signOut();
      await c.read(accountProvider.notifier).verifyCode(_email, '123456');
      await settle();
      expect(c.read(accountProvider).isNew, isFalse);
      await c.read(accountProvider.notifier).chooseExploring(); // no-op
      expect(service.calls.where((x) => x == 'sendWelcome'), hasLength(1));
    });

    test(
      '"I share my work": noted for the website; the welcome already went',
      () async {
        final c = container();
        await c.read(accountProvider.notifier).verifyCode(_email, '123456');
        await settle();
        await c.read(accountProvider.notifier).chooseSharing();
        expect(c.read(accountProvider).isNew, isFalse);
        expect(
          service.calls,
          contains('practitionerIntent:seeker@example.com'),
        );
        expect(service.calls.where((x) => x == 'sendWelcome'), hasLength(1));
        // The app itself still says explorer until the website says otherwise.
        expect(service.profiles[_userId]?.userType, 'explorer');
      },
    );

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

  group('your area and your name follow the account', () {
    const london = FakeContentRepository.london;

    test('set signed out, attached at sign-in; the account keeps them; '
        'sign-out forgets them on the phone', () async {
      final c = container();
      await c.read(areaProvider.notifier).set(london);
      await c.read(displayNameProvider.notifier).set('Ross');
      expect(service.calls, isNot(contains('saveArea:${london.id}')));

      await c.read(accountProvider.notifier).verifyCode(_email, '123456');
      await settle();
      expect(service.areasByUser[_userId]?.place?.id, london.id);
      expect(service.profiles[_userId]?.fullName, 'Ross');

      await c.read(accountProvider.notifier).signOut();
      await settle();
      expect(c.read(areaProvider).place, isNull);
      expect(c.read(displayNameProvider), isNull);
      expect(areaStore.value.chosen, isFalse);
    });

    test("the account's area and name win at sign-in", () async {
      service.areasByUser[_userId] = (place: FakeContentRepository.manchester);
      service.profiles[_userId] = const AccountProfile(
        userType: 'explorer',
        fullName: 'Ross Baiken',
      );
      final c = container();
      await c.read(areaProvider.notifier).set(london);
      await c.read(displayNameProvider.notifier).set('Someone Else');
      await c.read(accountProvider.notifier).verifyCode(_email, '123456');
      await settle();
      expect(c.read(areaProvider).place?.name, 'Manchester');
      expect(c.read(displayNameProvider), 'Ross Baiken');
    });

    test('signed in, a change reaches the account at once', () async {
      final c = container();
      await c.read(accountProvider.notifier).verifyCode(_email, '123456');
      await settle();
      await c.read(areaProvider.notifier).set(london);
      await c.read(displayNameProvider.notifier).set('Ross');
      expect(service.areasByUser[_userId]?.place?.id, london.id);
      expect(service.profiles[_userId]?.fullName, 'Ross');
      await c.read(areaProvider.notifier).set(null);
      expect(service.areasByUser[_userId]?.place, isNull);
    });
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
      await tester.tap(find.byKey(const ValueKey('delete-account')));
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
        find.text(
          'Your listing is managed on the website: your profile, and adding, editing or removing what’s on it.',
        ),
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

  group('discovery emails', () {
    Finder card() => find.byKey(const ValueKey('account-discovery-emails'));
    Finder toggle() =>
        find.byKey(const ValueKey('account-discovery-emails-switch'));

    testWidgets('an explorer can turn them off and back on', (tester) async {
      service.restoreSession(_email);
      await pumpAccount(tester);
      await tester.scrollUntilVisible(toggle(), 200);
      expect(tester.widget<Switch>(toggle()).value, isTrue);
      await tester.tap(toggle());
      await tester.pumpAndSettle();
      expect(service.calls, contains('discoveryEmails:false'));
      expect(tester.widget<Switch>(toggle()).value, isFalse);
      expect(
        find.text('Off. You won’t receive any more discovery emails.'),
        findsOneWidget,
      );
      await tester.tap(toggle());
      await tester.pumpAndSettle();
      expect(service.calls, contains('discoveryEmails:true'));
      expect(tester.widget<Switch>(toggle()).value, isTrue);
    });

    testWidgets('if it does not save, the switch stays where it was', (
      tester,
    ) async {
      service.discoveryEmailsSaves = false;
      service.restoreSession(_email);
      await pumpAccount(tester);
      await tester.scrollUntilVisible(toggle(), 200);
      await tester.tap(toggle());
      await tester.pumpAndSettle();
      expect(tester.widget<Switch>(toggle()).value, isTrue);
      expect(find.text('That didn’t save. Please try again.'), findsOneWidget);
    });

    testWidgets('not shown to a practitioner', (
      tester,
    ) async {
      service.profiles[_userId] = const AccountProfile(
        userType: 'practitioner',
      );
      service.restoreSession(_email);
      await pumpAccount(tester);
      expect(card(), findsNothing);
    });

    testWidgets('not shown to a declined applicant either', (tester) async {
      service.profiles[_userId] = const AccountProfile(
        userType: 'explorer',
        verificationStatus: 'rejected',
      );
      service.restoreSession(_email);
      await pumpAccount(tester);
      expect(card(), findsNothing);
    });
  });

  group('the refreshed account', () {
    testWidgets('Delete account is a red button straight under Sign out', (
      tester,
    ) async {
      service.restoreSession(_email);
      await pumpAccount(tester);
      final signOut = find.widgetWithText(OutlinedButton, 'Sign out');
      final delete = find.byKey(const ValueKey('delete-account'));
      expect(
        tester.widget<FilledButton>(delete).style!.backgroundColor!.resolve({}),
        const Color(0xFFDC2626),
      );
      expect(
        tester.getTopLeft(delete).dy,
        greaterThan(tester.getTopLeft(signOut).dy),
      );
      // Nothing between them but the sign-out note: no heading of its own.
      expect(find.text('Delete account'), findsOneWidget);
      expect(
        tester.getTopLeft(delete).dy - tester.getBottomLeft(signOut).dy,
        lessThan(80),
      );
    });

    group('change email', () {
      Future<ProviderContainer> start(WidgetTester tester) async {
        service.restoreSession(_email);
        final c = await pumpAccount(tester);
        await tester.tap(find.byKey(const ValueKey('change-email')));
        await tester.pumpAndSettle();
        await tester.enterText(
          find.byKey(const ValueKey('new-email-field')),
          ' New@Example.com ',
        );
        await tester.tap(find.byKey(const ValueKey('change-email-go')));
        await tester.pumpAndSettle();
        return c;
      }

      testWidgets('two codes, then the account shows the new address', (
        tester,
      ) async {
        final c = await start(tester);
        expect(service.calls, contains('requestEmailChange:new@example.com'));
        expect(find.text('Code sent to new@example.com'), findsOneWidget);
        expect(find.text('Code sent to seeker@example.com'), findsOneWidget);

        await tester.enterText(
          find.byKey(const ValueKey('new-address-code')),
          FakeAccountService.newAddressCode,
        );
        await tester.enterText(
          find.byKey(const ValueKey('current-address-code')),
          FakeAccountService.currentAddressCode,
        );
        await tester.tap(find.byKey(const ValueKey('change-email-go')));
        await tester.pumpAndSettle();

        expect(c.read(accountProvider).user!.email, 'new@example.com');
        expect(c.read(accountProvider).user!.id, _userId); // same account
        expect(find.text('new@example.com'), findsOneWidget);
        expect(find.text('Your email is now new@example.com.'), findsOneWidget);
        expect(find.byKey(const ValueKey('change-email-form')), findsNothing);
      });

      testWidgets('a wrong second code keeps the first, and says which', (
        tester,
      ) async {
        final c = await start(tester);
        await tester.enterText(
          find.byKey(const ValueKey('new-address-code')),
          FakeAccountService.newAddressCode,
        );
        await tester.enterText(
          find.byKey(const ValueKey('current-address-code')),
          '999999',
        );
        await tester.tap(find.byKey(const ValueKey('change-email-go')));
        await tester.pumpAndSettle();
        expect(
          find.text(
            "The code sent to your current address didn't work. Please check it.",
          ),
          findsOneWidget,
        );
        expect(find.text('Confirmed'), findsOneWidget); // the new address's
        expect(c.read(accountProvider).user!.email, 'seeker@example.com');

        await tester.enterText(
          find.byKey(const ValueKey('current-address-code')),
          FakeAccountService.currentAddressCode,
        );
        await tester.tap(find.byKey(const ValueKey('change-email-go')));
        await tester.pumpAndSettle();
        expect(c.read(accountProvider).user!.email, 'new@example.com');
        // The accepted code was not sent again.
        expect(
          service.calls.where((c) => c == 'confirmEmailChange:new@example.com'),
          hasLength(1),
        );
      });

      testWidgets('an address already in use, or the same one, is refused', (
        tester,
      ) async {
        service.takenEmails.add('taken@example.com');
        service.restoreSession(_email);
        await pumpAccount(tester);
        await tester.tap(find.byKey(const ValueKey('change-email')));
        await tester.pumpAndSettle();
        final field = find.byKey(const ValueKey('new-email-field'));
        await tester.enterText(field, 'seeker@example.com');
        await tester.tap(find.byKey(const ValueKey('change-email-go')));
        await tester.pumpAndSettle();
        expect(find.text("That's already your email address."), findsOneWidget);
        await tester.enterText(field, 'taken@example.com');
        await tester.tap(find.byKey(const ValueKey('change-email-go')));
        await tester.pumpAndSettle();
        expect(
          find.text('That email address already belongs to another account.'),
          findsOneWidget,
        );
        expect(find.byKey(const ValueKey('new-address-code')), findsNothing);
      });
    });
  });
}

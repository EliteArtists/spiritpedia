// Reviews on content pages, as on the website, with reporting and blocking
// (App Store guideline 1.2).

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:spiritpedia/core/retry.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/features/account/account_providers.dart';
import 'package:spiritpedia/features/account/account_screen.dart';
import 'package:spiritpedia/features/detail/book_screen.dart';
import 'package:spiritpedia/features/detail/offering_screen.dart';
import 'package:spiritpedia/features/library/saved_items.dart';
import 'package:spiritpedia/features/reviews/reviews_providers.dart';
import 'package:spiritpedia/features/reviews/reviews_service.dart';
import 'package:spiritpedia/features/star/tier_tips.dart';
import 'package:spiritpedia/theme/theme.dart';

import '../../support/fake_account.dart';
import '../../support/fake_content.dart';
import '../../support/fake_reviews.dart';

const _email = 'seeker@example.com';
const _me = 'user-$_email';
final _book = bookReviews(FakeContentRepository.amazonBook.slug);

const _kind = Review(
  id: 1,
  rating: 5,
  body: 'Changed how I sit with things.',
  authorName: 'Ana',
);
const _rude = Review(id: 2, rating: 1, body: 'Rubbish.', authorName: 'Troll');

void main() {
  setUp(() {
    final view = TestWidgetsFlutterBinding.ensureInitialized()
        .platformDispatcher
        .views
        .first;
    view.physicalSize = const Size(1290, 9000);
    view.devicePixelRatio = 3;
  });
  tearDown(
    () => TestWidgetsFlutterBinding.ensureInitialized()
        .platformDispatcher
        .views
        .first
        .resetPhysicalSize(),
  );

  late FakeReviewsService reviews;
  late FakeAccountService account;

  setUp(() {
    reviews = FakeReviewsService()
      ..addApproved(_book, _rude, author: 'troll-id')
      ..addApproved(_book, _kind, author: 'ana-id');
    account = FakeAccountService();
  });

  Future<void> pumpBook(WidgetTester tester, {bool signedIn = false}) async {
    if (signedIn) {
      account.restoreSession(_email);
      reviews.signedInUser = _me;
    }
    final router = GoRouter(
      routes: [
        GoRoute(
          path: '/',
          builder: (_, _) =>
              BookScreen(slug: FakeContentRepository.amazonBook.slug),
        ),
        GoRoute(path: '/account', builder: (_, _) => const AccountScreen()),
      ],
    );
    await tester.pumpWidget(
      ProviderScope(
        retry: spiritpediaRetry,
        overrides: [
          reviewsServiceProvider.overrideWithValue(reviews),
          tierTipsPrefsProvider.overrideWithValue(MemoryTierTipsPrefs()),
          accountServiceProvider.overrideWithValue(account),
          contentRepositoryProvider.overrideWithValue(FakeContentRepository()),
          savedStoreProvider.overrideWithValue(MemorySavedStore()),
        ],
        child: MaterialApp.router(
          theme: buildSpiritpediaTheme(),
          routerConfig: router,
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> openMenu(WidgetTester tester, int reviewId) async {
    await tester.tap(find.byKey(ValueKey('review-menu-$reviewId')));
    await tester.pumpAndSettle();
  }

  testWidgets('approved reviews only: the summary, the list, the names', (
    tester,
  ) async {
    await pumpBook(tester);
    expect(find.text('3.0 · 2 reviews'), findsOneWidget); // under the title
    expect(find.text('Community Reviews'), findsOneWidget);
    expect(find.text('3.0 from 2 ratings'), findsOneWidget);
    expect(find.text('Changed how I sit with things.'), findsOneWidget);
    expect(find.text('Ana'), findsOneWidget);
    expect(find.text('Sign in to leave a review.'), findsOneWidget);
    expect(find.byKey(const ValueKey('write-review')), findsNothing);
  });

  testWidgets('nothing yet: be the first', (tester) async {
    reviews.approvedByItem.clear();
    await pumpBook(tester);
    expect(find.text('Be the first to review'), findsNWidgets(2));
    expect(find.text('0 ratings'), findsOneWidget);
  });

  testWidgets('a failed read is no reviews, never an error', (tester) async {
    reviews.failRead = true;
    await pumpBook(tester);
    expect(find.text('Community Reviews'), findsOneWidget);
    expect(find.text('0 ratings'), findsOneWidget);
    expect(find.text('This page could not be loaded.'), findsNothing);
  });

  testWidgets('signed out, "⋯" asks them to sign in first', (tester) async {
    await pumpBook(tester);
    await openMenu(tester, 2);
    expect(
      find.text('Sign in to report a review or block a reviewer.'),
      findsOneWidget,
    );
    await tester.tap(find.text('Report review'));
    await tester.pumpAndSettle();
    expect(find.text('Your account'), findsOneWidget); // the sign-in screen
    expect(reviews.calls.where((c) => c.startsWith('report')), isEmpty);
  });

  testWidgets(
    'writing: stars, name, words, the terms; then it awaits approval',
    (tester) async {
      reviews.profileNames[_me] = 'Sam Seeker';
      await pumpBook(tester, signedIn: true);
      await tester.tap(find.byKey(const ValueKey('write-review')));
      await tester.pumpAndSettle();

      expect(
        find.textContaining('By posting, you agree to our'),
        findsOneWidget,
      );
      expect(find.text('Terms of Use'), findsOneWidget);
      final submit = find.byKey(const ValueKey('submit-review'));
      expect(tester.widget<FilledButton>(submit).onPressed, isNull); // no stars
      expect(find.text('Sam Seeker'), findsOneWidget); // the profile name

      await tester.tap(find.byKey(const ValueKey('rate-4')));
      await tester.enterText(
        find.byKey(const ValueKey('review-body')),
        '  Gentle and clear.  ',
      );
      await tester.pump();
      await tester.tap(submit);
      await tester.pumpAndSettle();

      expect(reviews.calls, contains('save:book:the-power-of-now:4'));
      expect(reviews.calls, contains('notifyReceived:book:the-power-of-now'));
      final mine = reviews.mineByUser[(_me, _book)]!;
      expect(mine.body, 'Gentle and clear.');
      expect(mine.authorName, 'Sam Seeker');
      expect(
        find.text('Your review has been submitted and is awaiting approval.'),
        findsOneWidget,
      );
      // Theirs, with its badge, and not in the public count.
      expect(find.text('AWAITING APPROVAL'), findsOneWidget);
      expect(find.text('Gentle and clear.'), findsOneWidget);
      expect(find.text('3.0 · 2 reviews'), findsOneWidget);
      expect(find.text('Edit your review'), findsOneWidget);
    },
  );

  testWidgets('an approved review of your own has no "⋯"', (tester) async {
    reviews.mineByUser[(_me, _book)] = _kind;
    await pumpBook(tester, signedIn: true);
    expect(find.byKey(const ValueKey('review-menu-1')), findsNothing);
    expect(find.byKey(const ValueKey('review-menu-2')), findsOneWidget);
    expect(find.text('AWAITING APPROVAL'), findsNothing);
  });

  testWidgets('banned from posting: told so, no form', (tester) async {
    reviews.banned = true;
    await pumpBook(tester, signedIn: true);
    expect(
      find.text('Reviews are not available for this account.'),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('write-review')), findsNothing);
  });

  testWidgets('reporting: a reason, a note, sent once', (tester) async {
    await pumpBook(tester, signedIn: true);
    await openMenu(tester, 2);
    await tester.tap(find.text('Report review'));
    await tester.pumpAndSettle();

    final send = find.byKey(const ValueKey('send-report'));
    expect(tester.widget<FilledButton>(send).onPressed, isNull); // no reason
    await tester.tap(find.byKey(const ValueKey('reason-harassment')));
    await tester.enterText(
      find.byKey(const ValueKey('report-note')),
      'Aimed at the author',
    );
    await tester.pump();
    await tester.tap(send);
    await tester.pumpAndSettle();

    expect(reviews.reported, [
      (2, ReportReason.harassment, 'Aimed at the author'),
    ]);
    expect(
      find.text("Thank you. We'll look at this review within 24 hours."),
      findsOneWidget,
    );

    // Again: nothing new, and they are told.
    await openMenu(tester, 2);
    await tester.tap(find.text('Report review'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('reason-spam')));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('send-report')));
    await tester.pumpAndSettle();
    expect(reviews.reported, hasLength(1));
    expect(
      find.text("You've already reported this review. We're looking at it."),
      findsOneWidget,
    );
  });

  testWidgets('blocking hides the reviewer; My Account unblocks them', (
    tester,
  ) async {
    await pumpBook(tester, signedIn: true);
    await openMenu(tester, 2);
    await tester.tap(find.text('Block Troll'));
    await tester.pumpAndSettle();
    expect(find.text('Block Troll?'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('confirm-block')));
    await tester.pumpAndSettle();

    expect(reviews.calls, contains('block:2'));
    expect(find.text('Rubbish.'), findsNothing);
    expect(find.text('Changed how I sit with things.'), findsOneWidget);
    expect(find.text('Troll is blocked.'), findsOneWidget);
    expect(find.text('5.0 · 1 review'), findsOneWidget);

    // My Account lists them, and unblocking brings the review back.
    GoRouter.of(tester.element(find.byType(BookScreen))).push('/account');
    await tester.pumpAndSettle();
    expect(find.text('Blocked reviewers'), findsOneWidget);
    expect(find.text('Troll'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('unblock-troll-id')));
    await tester.pumpAndSettle();
    expect(find.text('Blocked reviewers'), findsNothing);
    GoRouter.of(tester.element(find.byType(AccountScreen))).pop();
    await tester.pumpAndSettle();
    expect(find.text('Rubbish.'), findsOneWidget);
  });

  testWidgets('cancelling the block changes nothing', (tester) async {
    await pumpBook(tester, signedIn: true);
    await openMenu(tester, 2);
    await tester.tap(find.text('Block Troll'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(reviews.calls.where((c) => c.startsWith('block')), isEmpty);
    expect(find.text('Rubbish.'), findsOneWidget);
  });

  testWidgets('offerings and free resources have reviews too', (tester) async {
    for (final screen in <Widget>[
      OfferingScreen(slug: FakeContentRepository.course.slug),
      FreeResourceScreen(slug: FakeContentRepository.resource.slug),
    ]) {
      await tester.pumpWidget(
        ProviderScope(
          key: UniqueKey(),
          retry: spiritpediaRetry,
          overrides: [
            reviewsServiceProvider.overrideWithValue(reviews),
            tierTipsPrefsProvider.overrideWithValue(MemoryTierTipsPrefs()),
            accountServiceProvider.overrideWithValue(account),
            contentRepositoryProvider.overrideWithValue(
              FakeContentRepository(),
            ),
            savedStoreProvider.overrideWithValue(MemorySavedStore()),
          ],
          child: MaterialApp(theme: buildSpiritpediaTheme(), home: screen),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Community Reviews'), findsOneWidget);
    }
    expect(reviews.calls, contains('approved:course:breath-course'));
    expect(reviews.calls, contains('approved:free_resource:free-meditation'));
  });
}

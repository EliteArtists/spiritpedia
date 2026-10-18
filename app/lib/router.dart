import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'features/account/account_screen.dart';
import 'features/books/books_screen.dart';
import 'features/detail/book_screen.dart';
import 'features/detail/offering_screen.dart';
import 'features/detail/publisher_screen.dart';
import 'features/detail/teacher_screen.dart';
import 'features/detail/video_screen.dart';
import 'data/providers.dart';
import 'features/home/explore_more.dart';
import 'features/home/home_screen.dart';
import 'features/interests/interests_picker.dart';
import 'features/library/library_screen.dart';
import 'features/search/content_search.dart';
import 'features/search/search_screen.dart';
import 'features/shell/app_shell.dart';
import 'features/subject/subject_screen.dart';
import 'features/videos/videos_screen.dart';

final _rootKey = GlobalKey<NavigatorState>();

/// All navigation. Detail paths mirror the website's (/healers/:slug,
/// /books/:slug, …), so a spiritpedia.co link can later open the same screen.
/// The tabs are Discover ('/', where the app opens — the website's homepage),
/// Videos and Books. Detail pages, My Library, Account and the full-screen
/// search open above the tab bar.
///
/// A link to a screen this version does not have opens Discover, and
/// [onUnknownLink] says so — never an error page.
GoRouter buildRouter({
  void Function(Uri)? onUnknownLink,
  List<NavigatorObserver> observers = const [],
}) => GoRouter(
  navigatorKey: _rootKey,
  initialLocation: '/',
  observers: observers,
  onException: (context, state, router) {
    router.go('/');
    onUnknownLink?.call(state.uri);
  },
  routes: [
    StatefulShellRoute.indexedStack(
      builder: (context, state, shell) => AppShell(navigationShell: shell),
      branches: [
        StatefulShellBranch(
          routes: [
            GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/videos',
              builder: (context, state) => const VideosScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/books',
              builder: (context, state) => const BooksScreen(),
            ),
          ],
        ),
      ],
    ),
    // My Library and Account open from the top bar, above the tab bar.
    GoRoute(
      parentNavigatorKey: _rootKey,
      path: '/library',
      builder: (context, state) => const LibraryScreen(),
    ),
    GoRoute(
      parentNavigatorKey: _rootKey,
      path: '/account',
      builder: (context, state) =>
          AccountScreen(show: state.uri.queryParameters['show']),
    ),
    GoRoute(
      parentNavigatorKey: _rootKey,
      path: '/tailor',
      builder: (context, state) => const TailorScreen(),
    ),
    // Build 11's name for it.
    GoRoute(
      parentNavigatorKey: _rootKey,
      path: '/interests',
      builder: (context, state) => const TailorScreen(),
    ),
    GoRoute(
      parentNavigatorKey: _rootKey,
      path: '/subject/:slug',
      builder: (context, state) =>
          SubjectScreen(slug: state.pathParameters['slug']!),
    ),
    GoRoute(
      parentNavigatorKey: _rootKey,
      path: '/feel',
      // ?in=videos or ?in=books: the Videos or Books box, which searches only
      // its own kind. Otherwise everything (Discover's box).
      // extra: words to search at once ("Search everywhere"), passed in
      // memory rather than in the location.
      builder: (context, state) => SearchScreen(
        standalone: true,
        scope: SearchScope.fromName(state.uri.queryParameters['in']),
        initialQuery: state.extra is String ? state.extra! as String : null,
      ),
    ),
    // There was a Search tab; links to it open the search.
    GoRoute(
      parentNavigatorKey: _rootKey,
      path: '/search',
      redirect: (context, state) => '/feel',
    ),
    // An Explore More section's See all (?subject= the one chosen on
    // Discover). An unknown section is Free Resources.
    GoRoute(
      parentNavigatorKey: _rootKey,
      path: '/explore/:section',
      builder: (context, state) => ExploreAllScreen(
        section:
            ExploreSection.values
                .where((s) => s.name == state.pathParameters['section'])
                .firstOrNull ??
            ExploreSection.freeResources,
        subject: state.uri.queryParameters['subject'],
      ),
    ),
    for (final (path, screen) in <(String, Widget Function(String))>[
      ('/healers/:slug', (slug) => TeacherScreen(slug: slug)),
      ('/books/:slug', (slug) => BookScreen(slug: slug)),
      ('/videos/:slug', (slug) => VideoScreen(slug: slug)),
      ('/publishers/:slug', (slug) => PublisherScreen(slug: slug)),
      ('/offerings/:slug', (slug) => OfferingScreen(slug: slug)),
      ('/free-resources/:slug', (slug) => FreeResourceScreen(slug: slug)),
    ])
      GoRoute(
        parentNavigatorKey: _rootKey,
        path: path,
        builder: (context, state) => screen(state.pathParameters['slug']!),
      ),
  ],
);

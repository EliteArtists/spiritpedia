import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'features/home/home_screen.dart';
import 'features/search/search_screen.dart';
import 'features/shell/app_shell.dart';
import 'features/subject/subject_screen.dart';
import 'features/videos/videos_screen.dart';
import 'shared/widgets/placeholder_screen.dart';

final _rootKey = GlobalKey<NavigatorState>();

/// All navigation. Detail paths mirror the website's (/healers/:slug,
/// /books/:slug, …), so a spiritpedia.co link can later open the same screen.
/// Detail pages and the full-screen search open above the tab bar.
GoRouter buildRouter() => GoRouter(
  navigatorKey: _rootKey,
  initialLocation: '/',
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
              path: '/search',
              builder: (context, state) => const SearchScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/library',
              builder: (context, state) => const PlaceholderScreen(
                title: 'My Library',
                icon: Icons.bookmark_border,
                comingIn:
                    'Saving teachers, books and videos arrives in Phase 1d.',
              ),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/account',
              builder: (context, state) => const PlaceholderScreen(
                title: 'Account',
                icon: Icons.person_outline,
                comingIn: 'Signing in with an emailed code arrives in Phase 2.',
              ),
            ),
          ],
        ),
      ],
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
      builder: (context, state) => const SearchScreen(standalone: true),
    ),
    for (final (path, label) in [
      ('/healers/:slug', 'Teacher'),
      ('/books/:slug', 'Book'),
      ('/videos/:slug', 'Video'),
      ('/publishers/:slug', 'Publisher'),
      ('/offerings/:slug', 'Offering'),
      ('/free-resources/:slug', 'Free resource'),
    ])
      GoRoute(
        parentNavigatorKey: _rootKey,
        path: path,
        builder: (context, state) => PlaceholderScreen(
          title: label,
          icon: Icons.auto_awesome_outlined,
          comingIn:
              '${state.pathParameters['slug']}\n\nDetail pages arrive in Phase 1d.',
        ),
      ),
  ],
);

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'features/home/home_screen.dart';
import 'features/shell/app_shell.dart';
import 'shared/widgets/placeholder_screen.dart';

/// All navigation. Paths deliberately mirror the website's (/healers/:slug,
/// /books/:slug, …) as they are added, so a spiritpedia.co link can later open
/// the same screen in the app.
GoRouter buildRouter() => GoRouter(
      initialLocation: '/',
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (context, state, shell) => AppShell(navigationShell: shell),
          branches: [
            StatefulShellBranch(routes: [
              GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
            ]),
            StatefulShellBranch(routes: [
              GoRoute(
                path: '/search',
                builder: (context, state) => const PlaceholderScreen(
                  title: 'Search',
                  icon: Icons.search,
                  comingIn: 'The emotional search — with its crisis safeguard — arrives in Phase 1c.',
                ),
              ),
            ]),
            StatefulShellBranch(routes: [
              GoRoute(
                path: '/library',
                builder: (context, state) => const PlaceholderScreen(
                  title: 'My Library',
                  icon: Icons.bookmark_border,
                  comingIn: 'Saving teachers, books and videos arrives in Phase 1d.',
                ),
              ),
            ]),
            StatefulShellBranch(routes: [
              GoRoute(
                path: '/account',
                builder: (context, state) => const PlaceholderScreen(
                  title: 'Account',
                  icon: Icons.person_outline,
                  comingIn: 'Signing in with an emailed code arrives in Phase 2.',
                ),
              ),
            ]),
          ],
        ),
      ],
    );

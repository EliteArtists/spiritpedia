import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'features/intro/intro_overlay.dart';
import 'features/notifications/notifications_controller.dart';
import 'features/notifications/push_messaging.dart';
import 'features/star/star_layer.dart';
import 'router.dart';
import 'theme/theme.dart';

class SpiritpediaApp extends ConsumerStatefulWidget {
  const SpiritpediaApp({super.key, this.playIntro = true});

  /// Off in widget tests, which test the intro on its own.
  final bool playIntro;

  @override
  ConsumerState<SpiritpediaApp> createState() => _SpiritpediaAppState();
}

/// What a link to a screen this version does not have shows, over Discover.
const unknownLinkMessage = 'This needs a newer version of Spiritpedia';

class _SpiritpediaAppState extends ConsumerState<SpiritpediaApp> {
  late final GoRouter _router = buildRouter(onUnknownLink: (_) => _unknown());
  final _messenger = GlobalKey<ScaffoldMessengerState>();
  final _subs = <StreamSubscription<PushNote>>[];

  @override
  void initState() {
    super.initState();
    final messaging = ref.read(pushMessagingProvider);
    _subs
      ..add(messaging.foreground.listen(_showBanner))
      ..add(messaging.opened.listen((note) => _open(note.route)));
    messaging.initialNote().then((note) => _open(note?.route));
  }

  @override
  void dispose() {
    for (final s in _subs) {
      s.cancel();
    }
    _router.dispose();
    super.dispose();
  }

  /// Only in-app paths from our own messages: "/library", "/books/slug". A
  /// tab is switched to rather than stacked; a screen this version does not
  /// know opens Discover with a quiet note.
  void _open(String? route) {
    if (route == null || !route.startsWith('/') || route.startsWith('//')) {
      return;
    }
    final uri = Uri.tryParse(route);
    if (uri == null || _router.configuration.findMatch(uri).isError) {
      _router.go('/');
      return _unknown();
    }
    tabPaths.contains(uri.path) ? _router.go(route) : _router.push(route);
  }

  void _unknown() {
    // After the frame: this can arrive while the router is mid-navigation.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _messenger.currentState
        ?..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text(unknownLinkMessage),
            duration: Duration(seconds: 4),
          ),
        );
    });
  }

  /// While the app is open: a quiet in-app banner, not a system notification.
  void _showBanner(PushNote note) {
    final text = [note.title, note.body].whereType<String>().join('\n');
    if (text.isEmpty) return;
    _messenger.currentState
      ?..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(text),
          duration: const Duration(seconds: 6),
          action: note.route == null
              ? null
              : SnackBarAction(
                  label: 'Open',
                  onPressed: () => _open(note.route),
                ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Spiritpedia',
      debugShowCheckedModeBanner: false,
      theme: buildSpiritpediaTheme(),
      themeMode: ThemeMode.dark,
      scaffoldMessengerKey: _messenger,
      routerConfig: _router,
      // The intro sits ABOVE the router, so the real home screen is built
      // underneath it and genuinely revealed — not navigated to afterwards.
      // The star layer sits above everything, so a star can fly from any
      // screen to any other.
      builder: (context, child) => StarLayer(
        child: widget.playIntro
            ? IntroOverlay(child: child ?? const SizedBox.shrink())
            : child ?? const SizedBox.shrink(),
      ),
    );
  }
}

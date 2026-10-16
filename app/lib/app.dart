import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'features/interests/tailor_star.dart';
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
  final _starLayer = GlobalKey<StarLayerState>();
  late final GoRouter _router = buildRouter(
    onUnknownLink: (_) => _unknown(),
    // The star moves with every page change, back and swipe-back included.
    observers: [StarFlightObserver(() => _starLayer.currentState)],
  );
  final _messenger = GlobalKey<ScaffoldMessengerState>();
  final _subs = <StreamSubscription<PushNote>>[];

  @override
  void initState() {
    super.initState();
    // Known before Tailor Spiritpedia is first opened (its star's place).
    ref.read(tailorIntroShowProvider);
    final messaging = ref.read(pushMessagingProvider);
    // A notification arriving while the app is open shows as the iPhone's
    // own banner (FirebasePushMessaging.showWhileOpen); tapped, it opens here.
    _subs.add(messaging.opened.listen((note) => _open(note.route)));
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
        key: _starLayer,
        child: widget.playIntro
            ? IntroOverlay(child: child ?? const SizedBox.shrink())
            : child ?? const SizedBox.shrink(),
      ),
    );
  }
}

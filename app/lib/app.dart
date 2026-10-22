import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'features/account/account_providers.dart';
import 'features/account/user_type_card.dart';
import 'features/interests/tailor_star.dart';
import 'features/intro/intro_overlay.dart';
import 'features/notifications/notifications_controller.dart';
import 'features/notifications/push_messaging.dart';
import 'features/star/star_layer.dart';
import 'router.dart';
import 'theme/colors.dart';
import 'theme/layout.dart';
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
    // Android shows nothing for an app in front — the welcome, sent the
    // moment notifications are turned on, went unseen — so it shows here.
    _subs.add(messaging.arrivedWhileOpen.listen(_showArrived));
    messaging.initialNote().then((note) => _open(note?.route));
    // DEBUG BUILDS ONLY: open on a screen, over Discover —
    //   flutter run --dart-define=START_ROUTE=/account
    // Compiled out of release builds (kDebugMode is a constant).
    if (kDebugMode && _startRoute.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _open(_startRoute));
    }
  }

  static const _startRoute = String.fromEnvironment('START_ROUTE');

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

  void _showArrived(PushNote note) {
    final text = [
      note.title,
      note.body,
    ].whereType<String>().where((t) => t.trim().isNotEmpty).join('\n');
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
                  textColor: SpColors.primary,
                  onPressed: () => _open(note.route),
                ),
        ),
      );
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
    // A brand-new account, however it signed in (Account, the save prompt):
    // "How will you use Spiritpedia?", once.
    ref.listen(accountProvider, (previous, next) {
      if (!next.isNew || (previous?.isNew ?? false)) return;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final navigator = _router.routerDelegate.navigatorKey.currentContext;
        if (navigator != null && navigator.mounted) {
          askHowTheyWillUseIt(navigator, ref);
        }
      });
    });
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
      builder: (context, child) => _LargerText(
        child: StarLayer(
          key: _starLayer,
          child: widget.playIntro
              ? IntroOverlay(child: child ?? const SizedBox.shrink())
              : child ?? const SizedBox.shrink(),
        ),
      ),
    );
  }
}

/// On an iPad's wider window, text a little larger (SpLayout.textScale), on
/// top of the person's own text size. A phone is untouched.
class _LargerText extends StatelessWidget {
  const _LargerText({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final layout = SpLayout.of(context);
    if (layout.isCompact) return child;
    final media = MediaQuery.of(context);
    return MediaQuery(
      data: media.copyWith(
        textScaler: _Scaled(media.textScaler, layout.textScale),
      ),
      child: child,
    );
  }
}

class _Scaled extends TextScaler {
  const _Scaled(this.base, this.factor);

  final TextScaler base;
  final double factor;

  @override
  double scale(double fontSize) => base.scale(fontSize) * factor;

  @override
  // ignore: deprecated_member_use
  double get textScaleFactor => base.textScaleFactor * factor;

  @override
  bool operator ==(Object other) =>
      other is _Scaled && other.base == base && other.factor == factor;

  @override
  int get hashCode => Object.hash(base, factor);
}

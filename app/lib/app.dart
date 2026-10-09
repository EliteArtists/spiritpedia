import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'features/intro/intro_overlay.dart';
import 'router.dart';
import 'theme/theme.dart';

class SpiritpediaApp extends StatefulWidget {
  const SpiritpediaApp({super.key, this.playIntro = true});

  /// Off in widget tests, which test the intro on its own.
  final bool playIntro;

  @override
  State<SpiritpediaApp> createState() => _SpiritpediaAppState();
}

class _SpiritpediaAppState extends State<SpiritpediaApp> {
  late final GoRouter _router = buildRouter();

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Spiritpedia',
      debugShowCheckedModeBanner: false,
      theme: buildSpiritpediaTheme(),
      themeMode: ThemeMode.dark,
      routerConfig: _router,
      // The intro sits ABOVE the router, so the real home screen is built
      // underneath it and genuinely revealed — not navigated to afterwards.
      builder: (context, child) => widget.playIntro
          ? IntroOverlay(child: child ?? const SizedBox.shrink())
          : child ?? const SizedBox.shrink(),
    );
  }
}

import 'dart:math' as math;
import 'dart:ui' show lerpDouble;

import 'package:flutter/material.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';

import '../../theme/colors.dart';

/// The opening animation, played on every cold start over the real home
/// screen, which is already built underneath and is revealed as the star
/// leaves.
///
///   0.00–0.25  the star — exactly where the static launch screen left it —
///              brightens and swells slightly
///   0.25–0.85  it shoots up and away to the top right along a curve, shrinking,
///              with a fading gold trail
///   0.45–0.95  the dark veil fades and the home screen settles from 106% to
///              100%, so it reads as being revealed rather than cut to
///
/// About 1.6 s. A tap anywhere finishes it in a fifth of a second. With iOS
/// Reduce Motion (or Android's Remove animations) it does not play at all.
class IntroOverlay extends StatefulWidget {
  const IntroOverlay({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 1600),
    this.removeNativeSplash = true,
  });

  /// The app underneath — the router's current screen.
  final Widget child;

  final Duration duration;

  /// Off in tests, where there is no native launch screen to hand over from.
  final bool removeNativeSplash;

  /// Must match the launch screen: a 480 px image shown at 4x → 120 pt, centred.
  static const double startStarWidth = 120;

  static const starAsset = AssetImage('assets/images/star.png');

  @override
  State<IntroOverlay> createState() => _IntroOverlayState();
}

class _IntroOverlayState extends State<IntroOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: widget.duration)
        ..addStatusListener((status) {
          if (status == AnimationStatus.completed && mounted) {
            setState(() => _done = true);
          }
        });

  bool _started = false;
  bool _done = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;

    final features =
        WidgetsBinding.instance.platformDispatcher.accessibilityFeatures;
    if (features.reduceMotion || features.disableAnimations) {
      // No motion at all: hand straight over to the home screen.
      _done = true;
      _removeNativeSplash();
      return;
    }

    // Decode the star before the launch screen goes away, so the first frame
    // of the intro is identical to the launch screen rather than blank.
    precacheImage(IntroOverlay.starAsset, context).whenComplete(() {
      if (!mounted) return;
      _removeNativeSplash();
      _controller.forward();
    });
  }

  void _removeNativeSplash() {
    if (widget.removeNativeSplash) FlutterNativeSplash.remove();
  }

  void _skip() {
    if (_done || _controller.value >= 1) return;
    _controller.animateTo(
      1,
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_done) return widget.child;

    return AnimatedBuilder(
      animation: _controller,
      child: widget.child,
      builder: (context, home) {
        final t = _controller.value;
        final reveal = const Interval(
          0.45,
          0.95,
          curve: Curves.easeInOut,
        ).transform(t);
        final homeScale = lerpDouble(
          1.06,
          1.0,
          Curves.easeOut.transform(reveal),
        )!;

        return Stack(
          fit: StackFit.expand,
          children: [
            Transform.scale(scale: homeScale, child: home),
            Positioned.fill(
              child: Semantics(
                button: true,
                label: 'Skip intro',
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: _skip,
                  child: _IntroFrame(t: t, veilOpacity: 1 - reveal),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

/// One frame of the intro at progress [t].
class _IntroFrame extends StatelessWidget {
  const _IntroFrame({required this.t, required this.veilOpacity});

  final double t;
  final double veilOpacity;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = constraints.biggest;
        final path = _ShootingPath(size);

        final glow = const Interval(
          0.0,
          0.25,
          curve: Curves.easeOut,
        ).transform(t);
        final shoot = const Interval(
          0.25,
          0.85,
          curve: Curves.easeInCubic,
        ).transform(t);
        final fade =
            1 - const Interval(0.72, 0.88, curve: Curves.easeIn).transform(t);

        final position = path.at(shoot);
        final width =
            IntroOverlay.startStarWidth *
            lerpDouble(1.0, 1.18, glow)! *
            lerpDouble(1.0, 0.28, shoot)!;
        final angle = 0.7 * shoot;

        return Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(
              color: SpColors.background.withValues(alpha: veilOpacity),
            ),
            if (shoot > 0)
              CustomPaint(
                painter: _TrailPainter(path: path, head: shoot, opacity: fade),
              ),
            Positioned(
              left: position.dx - width / 2,
              top: position.dy - width / 2,
              width: width,
              height: width,
              child: Opacity(
                opacity: fade,
                child: DecoratedBox(
                  // A soft halo that swells during the glow phase.
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: SpColors.gold.withValues(alpha: 0.45 * glow),
                        blurRadius: 40 * glow,
                        spreadRadius: 6 * glow,
                      ),
                    ],
                  ),
                  child: Transform.rotate(
                    angle: angle,
                    child: const Image(
                      image: IntroOverlay.starAsset,
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

/// The star's flight: a quadratic curve from the centre of the screen (where
/// the launch screen draws it) up and away past the top-right corner.
class _ShootingPath {
  _ShootingPath(Size size)
    : start = size.center(Offset.zero),
      control = Offset(size.width * 0.86, size.height * 0.46),
      end = Offset(size.width * 1.25, -size.height * 0.12);

  final Offset start;
  final Offset control;
  final Offset end;

  Offset at(double s) {
    final u = 1 - s;
    return start * (u * u) + control * (2 * u * s) + end * (s * s);
  }
}

/// The trail: the recent part of the flight, drawn as short segments that taper
/// and fade towards the tail.
class _TrailPainter extends CustomPainter {
  _TrailPainter({
    required this.path,
    required this.head,
    required this.opacity,
  });

  final _ShootingPath path;
  final double head;
  final double opacity;

  static const _length = 0.32; // fraction of the flight the trail covers
  static const _segments = 28;

  @override
  void paint(Canvas canvas, Size size) {
    if (opacity <= 0) return;
    final tail = math.max(0.0, head - _length);
    final paint = Paint()
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2.5);

    for (var i = 0; i < _segments; i++) {
      final a = tail + (head - tail) * i / _segments;
      final b = tail + (head - tail) * (i + 1) / _segments;
      final k = (i + 1) / _segments; // 0 at the tail → 1 at the star
      paint
        ..strokeWidth = 1 + 9 * k * k
        ..color = Color.lerp(
          SpColors.gold,
          Colors.white,
          k * 0.6,
        )!.withValues(alpha: opacity * k * 0.9);
      canvas.drawLine(path.at(a), path.at(b), paint);
    }
  }

  @override
  bool shouldRepaint(_TrailPainter old) =>
      old.head != head || old.opacity != opacity;
}

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme/colors.dart';

/// The star image every star in the app draws — the launch screen's star.
const starAsset = AssetImage('assets/images/star.png');

/// Reduce Motion (iOS) or Remove animations (Android): every star move becomes
/// an instant change of place.
bool reduceMotion(BuildContext context) {
  final features =
      WidgetsBinding.instance.platformDispatcher.accessibilityFeatures;
  return features.reduceMotion ||
      features.disableAnimations ||
      (MediaQuery.maybeDisableAnimationsOf(context) ?? false);
}

/// The "slipstream": the one curve every star flight follows. A quadratic
/// curve from [start] to [end] that always bows to one side — upwards, or to
/// the right when the flight is vertical — by at least [minBend] points, so
/// even a short hop reads as a swoop rather than a slide.
class SlipstreamPath {
  SlipstreamPath(
    this.start,
    this.end, {
    double bend = 0.32,
    double minBend = 46,
  }) : control = _control(start, end, bend, minBend);

  final Offset start;
  final Offset end;
  final Offset control;

  static Offset _control(Offset a, Offset b, double bend, double minBend) {
    final d = b - a;
    final length = d.distance;
    final mid = Offset.lerp(a, b, 0.5)!;
    if (length < 0.5) return mid + Offset(0, -minBend);
    var normal = Offset(-d.dy, d.dx) / length;
    // Bow upwards; a purely vertical flight bows to the right.
    if (normal.dy > 0 || (normal.dy == 0 && normal.dx < 0)) normal = -normal;
    return mid + normal * math.max(length * bend, minBend);
  }

  Offset at(double s) {
    final u = 1 - s;
    return start * (u * u) + control * (2 * u * s) + end * (s * s);
  }
}

/// One frame of a flight: where the star is, how big, how turned, and the trail
/// behind it. [progress] runs 0 → 1 along [path].
class SlipstreamFrame extends StatelessWidget {
  const SlipstreamFrame({
    super.key,
    required this.path,
    required this.progress,
    required this.fromSize,
    required this.toSize,
    this.glow = 0,
    this.opacity = 1,
  });

  final SlipstreamPath path;
  final double progress;
  final double fromSize;
  final double toSize;
  final double glow;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    final s = Curves.easeInOutCubic.transform(progress.clamp(0.0, 1.0));
    final position = path.at(s);
    final size = fromSize + (toSize - fromSize) * s;
    // The trail fades in as the star leaves and out as it lands.
    final trail = math.sin(math.pi * progress.clamp(0.0, 1.0)) * opacity;
    return Stack(
      fit: StackFit.expand,
      children: [
        if (trail > 0.01)
          CustomPaint(
            painter: SlipstreamTrailPainter(
              path: path,
              head: s,
              opacity: trail,
              scale: (((fromSize + toSize) / 2) / 60).clamp(0.45, 1.2),
            ),
          ),
        Positioned(
          left: position.dx - size / 2,
          top: position.dy - size / 2,
          width: size,
          height: size,
          // One full turn over the flight, so it always lands upright.
          child: Opacity(
            opacity: opacity,
            child: StarSprite(angle: 2 * math.pi * s, glow: glow),
          ),
        ),
      ],
    );
  }
}

/// The star image with an optional soft gold halo.
class StarSprite extends StatelessWidget {
  const StarSprite({super.key, this.angle = 0, this.glow = 0});

  final double angle;
  final double glow;

  @override
  Widget build(BuildContext context) {
    final image = Transform.rotate(
      angle: angle,
      child: const Image(image: starAsset, fit: BoxFit.contain),
    );
    if (glow <= 0) return image;
    return DecoratedBox(
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
      child: image,
    );
  }
}

/// The trail: the recent part of the flight, drawn as short segments that taper
/// and fade towards the tail.
class SlipstreamTrailPainter extends CustomPainter {
  SlipstreamTrailPainter({
    required this.path,
    required this.head,
    required this.opacity,
    this.scale = 1,
  });

  final SlipstreamPath path;
  final double head;
  final double opacity;
  final double scale;

  static const _length = 0.32; // fraction of the flight the trail covers
  static const _segments = 28;

  @override
  void paint(Canvas canvas, Size size) {
    if (opacity <= 0) return;
    final tail = math.max(0.0, head - _length);
    final paint = Paint()
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, 2.5 * scale);

    for (var i = 0; i < _segments; i++) {
      final a = tail + (head - tail) * i / _segments;
      final b = tail + (head - tail) * (i + 1) / _segments;
      final k = (i + 1) / _segments; // 0 at the tail → 1 at the star
      paint
        ..strokeWidth = (1 + 9 * k * k) * scale
        ..color = Color.lerp(
          SpColors.gold,
          Colors.white,
          k * 0.6,
        )!.withValues(alpha: opacity * k * 0.9);
      canvas.drawLine(path.at(a), path.at(b), paint);
    }
  }

  @override
  bool shouldRepaint(SlipstreamTrailPainter old) =>
      old.head != head || old.opacity != opacity || old.path != path;
}

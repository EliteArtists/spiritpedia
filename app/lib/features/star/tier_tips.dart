import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/badges.dart';
import '../../theme/colors.dart';
import 'star_layer.dart';

/// The star's tips: tap any badge — a shelf's SUPERHERO, LUMINARY or LOCAL
/// HERO, or the tier, ✓ Verified or ✦ OFFICIAL on a card, a page or a review —
/// and the star explains it (data/badges.dart, the website's words), every
/// time. The bubble hangs from wherever the star is resting: the search box,
/// the pill row, or the foot of a page. A tap anywhere closes it, and only
/// closes it.
class TierTip {
  const TierTip(this.title, this.line, this.accent);

  final String title;
  final String line;
  final Color accent;

  // A shelf's badge: the whole shelf, so plural.
  static const superhero = TierTip(
    'Superheroes',
    'One of the most influential spiritual teachers in the world.',
    _gold,
  );
  static const luminary = TierTip(
    'Luminaries',
    'A respected and established spiritual teacher.',
    _purple,
  );
  static const localHero = TierTip(
    'Local Heroes',
    'A practitioner available in your area.',
    _green,
  );

  static const official = TierTip('✦ Official', officialTip, Colors.white);

  static TierTip verified(String name) =>
      TierTip('✓ Verified', verifiedTip(name), _blue);

  /// One listing's badge (data/badges.dart → listingBadges).
  static TierTip? forBadge(ListingBadge badge) => switch (badge.kind) {
    BadgeKind.official => official,
    BadgeKind.verified => TierTip('✓ Verified', badge.tip ?? '', _blue),
    BadgeKind.tier when badge.tip != null => TierTip(
      badge.label,
      badge.tip!,
      switch (badge.tier) {
        'superhero' => _gold,
        'luminary' => _purple,
        _ => _green,
      },
    ),
    _ => null,
  };

  @override
  bool operator ==(Object other) =>
      other is TierTip && other.title == title && other.line == line;

  @override
  int get hashCode => Object.hash(title, line);
}

const _gold = Color(0xFFFEF08A);
const _purple = Color(0xFFA78BFA);
const _green = Color(0xFF34D399);
const _blue = Color(0xFF38BDF8);

// ── Which tip is open ────────────────────────────────────────────────────────

class TierTipController extends Notifier<TierTip?> {
  @override
  TierTip? build() => null;

  void show(TierTip tip) => state = tip;

  void close() => state = null;
}

final tierTipProvider = NotifierProvider<TierTipController, TierTip?>(
  TierTipController.new,
);

// ── The bubble ───────────────────────────────────────────────────────────────

/// Sits in the [StarLayer], above every page: while a tip is open, a veil
/// that closes it at a touch, and the bubble hanging from the star — below it
/// when the star is in the top half of the screen, above it at the foot of a
/// page. Never while the star is flying.
class StarTipHost extends ConsumerStatefulWidget {
  const StarTipHost({super.key, required this.layer});

  final StarLayerState layer;

  static const _maxWidth = 300.0;
  static const _arrow = 8.0;

  @override
  ConsumerState<StarTipHost> createState() => _StarTipHostState();
}

class _StarTipHostState extends ConsumerState<StarTipHost> {
  Rect? _star;

  void _measure() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final rect = widget.layer.restingStarRect();
      if (rect != _star) setState(() => _star = rect);
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(tierTipProvider, (_, tip) {
      if (tip != null) _measure();
    });
    final tip = ref.watch(tierTipProvider);
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final close = ref.read(tierTipProvider.notifier).close;
    final star = _star;
    final size = MediaQuery.sizeOf(context);
    final width = (size.width - 24).clamp(0.0, StarTipHost._maxWidth);
    final below = star == null || star.center.dy < size.height / 2;
    final left = star == null
        ? 12.0
        : (star.center.dx - width / 2).clamp(12.0, size.width - width - 12);

    return Stack(
      children: [
        // While a tip is open, a touch anywhere closes it — and only closes
        // it, so it never opens what was underneath.
        if (tip != null)
          Positioned.fill(
            child: GestureDetector(
              key: const ValueKey('tier-tip-close'),
              behavior: HitTestBehavior.opaque,
              onTap: close,
              onPanDown: (_) => close(),
            ),
          ),
        if (star != null && !widget.layer.busy)
          Positioned(
            left: left,
            width: width,
            top: below ? star.bottom + 4 : null,
            bottom: below ? null : size.height - star.top + 4,
            child: Material(
              type: MaterialType.transparency,
              child: DefaultTextStyle(
                style: const TextStyle(
                  color: SpColors.text,
                  fontFamily: 'Geist',
                ),
                child: AnimatedSwitcher(
                  duration: Duration(milliseconds: reduceMotion ? 0 : 220),
                  transitionBuilder: (child, animation) => FadeTransition(
                    opacity: animation,
                    child: reduceMotion
                        ? child
                        : SlideTransition(
                            position: Tween(
                              begin: Offset(0, below ? -0.08 : 0.08),
                              end: Offset.zero,
                            ).animate(animation),
                            child: child,
                          ),
                  ),
                  child: tip == null
                      ? const SizedBox.shrink()
                      : Align(
                          alignment: below
                              ? Alignment.topLeft
                              : Alignment.bottomLeft,
                          child: _Bubble(
                            key: ValueKey(tip),
                            tip: tip,
                            arrowX: star.center.dx - left,
                            pointsUp: below,
                            onTap: close,
                          ),
                        ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({
    super.key,
    required this.tip,
    required this.arrowX,
    required this.onTap,
    this.pointsUp = true,
  });

  final TierTip tip;
  final double arrowX;
  final bool pointsUp;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      key: const ValueKey('tier-tip'),
      liveRegion: true,
      button: true,
      label: '${tip.title}: ${tip.line} Double-tap to close.',
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: StarTipHost._maxWidth),
          child: CustomPaint(
            painter: _BubblePainter(
              arrowX: arrowX,
              pointsUp: pointsUp,
              border: tip.accent.withValues(alpha: 0.55),
            ),
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                14,
                12 + (pointsUp ? StarTipHost._arrow : 0),
                12,
                12 + (pointsUp ? 0 : StarTipHost._arrow),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Flexible(
                        child: Text(
                          tip.title,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: tip.accent,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      const Icon(
                        Icons.close,
                        size: 16,
                        color: SpColors.textFaint,
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    tip.line,
                    style: const TextStyle(fontSize: 13.5, height: 1.4),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BubblePainter extends CustomPainter {
  _BubblePainter({
    required this.arrowX,
    required this.border,
    this.pointsUp = true,
  });

  final double arrowX;
  final Color border;
  final bool pointsUp;

  @override
  void paint(Canvas canvas, Size size) {
    const a = StarTipHost._arrow;
    final body = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, pointsUp ? a : 0, size.width, size.height - a),
      const Radius.circular(14),
    );
    final x = arrowX.clamp(18.0, size.width - 18);
    final h = size.height;
    final arrow = pointsUp
        ? (Path()
            ..moveTo(x - a, a + 1)
            ..lineTo(x, 0)
            ..lineTo(x + a, a + 1)
            ..close())
        : (Path()
            ..moveTo(x - a, h - a - 1)
            ..lineTo(x, h)
            ..lineTo(x + a, h - a - 1)
            ..close());
    final path = Path.combine(
      PathOperation.union,
      Path()..addRRect(body),
      arrow,
    );
    canvas
      ..drawShadow(path, const Color(0xFF000000), 6, false)
      ..drawPath(path, Paint()..color = SpColors.surfaceRaised)
      ..drawPath(
        path,
        Paint()
          ..color = border
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1,
      );
  }

  @override
  bool shouldRepaint(_BubblePainter old) =>
      old.arrowX != arrowX || old.border != border || old.pointsUp != pointsUp;
}

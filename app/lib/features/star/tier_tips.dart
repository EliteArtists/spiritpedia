import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/colors.dart';

/// The star's tier tips: tap the SUPERHERO, LUMINARY or LOCAL HERO badge at
/// the top of a Discover shelf and the star explains it, in the website's own
/// words (web/components/HealerCard.js → TIER_TOOLTIPS) — every time it is
/// tapped. A tap anywhere closes it. The badges on teachers' cards are not
/// tappable: a card always opens the teacher's page.
enum TierTip {
  superhero(
    'superhero',
    'Superheroes',
    'One of the most influential spiritual teachers in the world.',
    Color(0xFFFEF08A),
  ),
  luminary(
    'luminary',
    'Luminaries',
    'A respected and established spiritual teacher.',
    Color(0xFFA78BFA),
  ),
  localHero(
    'local_hero',
    'Local Heroes',
    'A practitioner available in your area.',
    Color(0xFF34D399),
  );

  const TierTip(this.key, this.title, this.line, this.accent);

  final String key;
  final String title;
  final String line;
  final Color accent;
}

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

/// The tip, hanging from the star: [star] is the star's rect in the
/// coordinates of the Stack this sits in.
class TierTipBubble extends ConsumerWidget {
  const TierTipBubble({super.key, required this.star});

  final Rect star;

  static const _maxWidth = 300.0;
  static const _arrow = 8.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tip = ref.watch(tierTipProvider);
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final left = (star.left - 6).clamp(12.0, double.infinity);
    return Positioned(
      left: left,
      top: star.bottom + 4,
      child: AnimatedSwitcher(
        duration: Duration(milliseconds: reduceMotion ? 0 : 220),
        transitionBuilder: (child, animation) => FadeTransition(
          opacity: animation,
          child: reduceMotion
              ? child
              : SlideTransition(
                  position: Tween(
                    begin: const Offset(0, -0.08),
                    end: Offset.zero,
                  ).animate(animation),
                  child: child,
                ),
        ),
        child: tip == null
            ? const SizedBox.shrink()
            : _Bubble(
                key: ValueKey(tip),
                tip: tip,
                arrowX: star.center.dx - left,
                onTap: ref.read(tierTipProvider.notifier).close,
              ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({
    super.key,
    required this.tip,
    required this.arrowX,
    required this.onTap,
  });

  final TierTip tip;
  final double arrowX;
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
          constraints: const BoxConstraints(maxWidth: TierTipBubble._maxWidth),
          child: CustomPaint(
            painter: _BubblePainter(
              arrowX: arrowX,
              border: tip.accent.withValues(alpha: 0.55),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                14,
                12 + TierTipBubble._arrow,
                12,
                12,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        tip.title,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: tip.accent,
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
  _BubblePainter({required this.arrowX, required this.border});

  final double arrowX;
  final Color border;

  @override
  void paint(Canvas canvas, Size size) {
    const a = TierTipBubble._arrow;
    final body = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, a, size.width, size.height - a),
      const Radius.circular(14),
    );
    final x = arrowX.clamp(18.0, size.width - 18);
    final path = Path.combine(
      PathOperation.union,
      Path()..addRRect(body),
      Path()
        ..moveTo(x - a, a + 1)
        ..lineTo(x, 0)
        ..lineTo(x + a, a + 1)
        ..close(),
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
      old.arrowX != arrowX || old.border != border;
}

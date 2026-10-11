import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'slipstream.dart';

/// The star thinking — while search results load: a soft breathing glow, a
/// little swell and a slight turn, over and over. With Reduce Motion it is
/// still: the star with a steady glow.
class TwinklingStar extends StatefulWidget {
  const TwinklingStar({super.key});

  @override
  State<TwinklingStar> createState() => _TwinklingStarState();
}

class _TwinklingStarState extends State<TwinklingStar>
    with SingleTickerProviderStateMixin {
  late final _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (reduceMotion(context)) {
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (reduceMotion(context)) return const StarSprite(glow: 0.6);
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        // 0 → 1 → 0 across each cycle.
        final pulse = math.sin(_controller.value * math.pi);
        return Transform.scale(
          scale: 1 + 0.14 * pulse,
          child: StarSprite(angle: 0.35 * pulse, glow: 0.25 + 0.6 * pulse),
        );
      },
    );
  }
}

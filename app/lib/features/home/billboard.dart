import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../data/models.dart';
import '../../data/shelf_rules.dart';
import '../../shared/widgets/net_image.dart';
import '../../shared/widgets/tier_badge.dart';
import '../../theme/colors.dart';
import '../../theme/layout.dart';

/// The hero billboard (HeroBillboard.js): Superheroes and Ascended Masters,
/// three-to-one, starting from a random slide each launch, advancing every
/// seven seconds. Superheroes carry their pill; Ascended Masters show their
/// lifespan instead.
class Billboard extends StatefulWidget {
  const Billboard({super.key, required this.healers, this.random});

  final List<Healer> healers;
  final Random? random;

  @override
  State<Billboard> createState() => _BillboardState();
}

class _BillboardState extends State<Billboard> {
  late final PageController _pages;
  late int _index;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    final n = widget.healers.length;
    _index = n == 0 ? 0 : (widget.random ?? Random()).nextInt(n);
    _pages = PageController(initialPage: _index);
    _startTimer();
  }

  @override
  void didUpdateWidget(Billboard old) {
    super.didUpdateWidget(old);
    // A new subject filter can shrink the rotation below the current slide.
    if (widget.healers.length != old.healers.length &&
        widget.healers.isNotEmpty) {
      _index = 0;
      if (_pages.hasClients) _pages.jumpToPage(0);
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 7), (_) {
      if (!mounted || widget.healers.length < 2 || !_pages.hasClients) return;
      _pages.animateToPage(
        (_index + 1) % widget.healers.length,
        duration: const Duration(milliseconds: 650),
        curve: Curves.easeInOutCubic,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final healers = widget.healers;
    if (healers.isEmpty) return const SizedBox.shrink();
    final layout = SpLayout.of(context);
    return Padding(
      padding: EdgeInsets.fromLTRB(layout.gutter, 0, layout.gutter, 34),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: SizedBox(
          height: _height(context, layout),
          child: Stack(
            children: [
              PageView.builder(
                controller: _pages,
                itemCount: healers.length,
                onPageChanged: (i) {
                  setState(() => _index = i);
                  _startTimer(); // a swipe restarts the clock
                },
                itemBuilder: (context, i) => _Slide(healer: healers[i]),
              ),
              if (healers.length > 1)
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 14,
                  child: _Dots(count: healers.length, index: _index),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 440 on a phone, as always. On an iPad, larger with the cards — but never
/// more than 60% of a short landscape screen, so a shelf still shows below.
double _height(BuildContext context, SpLayout layout) {
  if (layout.isCompact) return 440;
  final screen = MediaQuery.sizeOf(context).height;
  return min(440 * layout.cardScale, max(440.0, screen * 0.6));
}

class _Slide extends StatelessWidget {
  const _Slide({required this.healer});

  final Healer healer;

  @override
  Widget build(BuildContext context) {
    final lifespan = healer.isAscendedMaster ? formatLifespan(healer) : null;
    // An iPad's billboard is far wider than tall: the portrait keeps its
    // shape at the right, fading into the words at the left, instead of
    // being cropped to a strip of forehead.
    final wide = !SpLayout.of(context).isCompact;
    final portrait = NetImage(
      url: billboardPortrait(healer),
      fallbackLabel: healer.name,
      alignment: Alignment.topCenter,
    );
    return GestureDetector(
      onTap: () => context.push('/healers/${healer.slug}'),
      child: LayoutBuilder(
        builder: (context, box) =>
            _frame(context, box, wide, portrait, lifespan),
      ),
    );
  }

  Widget _frame(
    BuildContext context,
    BoxConstraints box,
    bool wide,
    Widget portrait,
    String? lifespan,
  ) {
    final portraitWidth = min(box.maxHeight * 0.9, box.maxWidth * 0.55);
    final textWidth = min(480.0, box.maxWidth - portraitWidth * 0.75 - 40);
    return Stack(
      fit: StackFit.expand,
      children: [
        if (!wide) ...[
          portrait,
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                stops: [0.25, 0.62, 1],
                colors: [
                  Colors.transparent,
                  Color(0xCC1E1B4B),
                  Color(0xF20A0F1D),
                ],
              ),
            ),
          ),
        ] else
          Stack(
            fit: StackFit.expand,
            children: [
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [Color(0xFF0A0F1D), Color(0xFF1E1B4B)],
                  ),
                ),
              ),
              Positioned(
                right: 0,
                top: 0,
                bottom: 0,
                width: portraitWidth,
                // The portrait's left side fades into the background, so
                // there is no edge where it meets the words.
                child: ShaderMask(
                  blendMode: BlendMode.dstIn,
                  shaderCallback: (rect) => const LinearGradient(
                    stops: [0, 0.4],
                    colors: [Color(0x00FFFFFF), Color(0xFFFFFFFF)],
                  ).createShader(rect),
                  child: portrait,
                ),
              ),
            ],
          ),
        Positioned(
          left: wide ? 40 : 20,
          right: wide ? null : 20,
          bottom: 40,
          width: wide ? textWidth : null,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Its tier (and ✓ Verified), which the star explains.
              if (healer.tier == 'superhero') ListingBadgeRow.healer(healer),
              if (lifespan != null)
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: const Color(0x4D000000),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: const Color(0x33FFFFFF)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    child: Text(
                      lifespan,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w300,
                        letterSpacing: 1.6,
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 12),
              Text(
                healer.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w700,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                truncateBio(healer.bio),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFFD1D5DB),
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => context.push('/healers/${healer.slug}'),
                child: const Text('View Profile →'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Dots extends StatelessWidget {
  const _Dots({required this.count, required this.index});

  final int count;
  final int index;

  @override
  Widget build(BuildContext context) {
    // Long rotations get a compact window of dots around the current slide.
    const window = 9;
    final start = (index - window ~/ 2).clamp(0, max(0, count - window));
    final end = min(count, start + window);
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = start; i < end; i++)
          AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            margin: const EdgeInsets.symmetric(horizontal: 3),
            width: i == index ? 18 : 6,
            height: 6,
            decoration: BoxDecoration(
              color: i == index ? SpColors.link : const Color(0x66FFFFFF),
              borderRadius: BorderRadius.circular(3),
            ),
          ),
      ],
    );
  }
}

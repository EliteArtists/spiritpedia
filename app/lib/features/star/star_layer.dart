import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'slipstream.dart';

/// Where Home's star is resting right now — the search box, or the start of
/// the sticky pill row. Home registers itself with the [StarLayer].
abstract interface class HomeStarTarget {
  Rect? restingRect();
  void scrollToTop();
}

/// The layer every star flight is drawn on, above the whole app.
///
/// A resting star is an ordinary widget ([StarAnchor]) that scrolls with its
/// page. To move, the page hides its resting stars, asks this layer to [fly]
/// from one place to the other, and shows the star again at its new place
/// when the flight lands — so there is only ever one star on screen.
class StarLayer extends StatefulWidget {
  const StarLayer({super.key, required this.child});

  final Widget child;

  static StarLayerState? maybeOf(BuildContext context) =>
      context.findAncestorStateOfType<StarLayerState>();

  @override
  State<StarLayer> createState() => StarLayerState();
}

class _Flight {
  _Flight(this.from, this.to, this.controller, this.glow);

  final Rect from;
  final Rect? Function() to;
  final AnimationController controller;
  final double glow;
  Rect? lastTo;

  Rect get current {
    final target = lastTo ?? from;
    final s = Curves.easeInOutCubic.transform(controller.value);
    final centre = SlipstreamPath(from.center, target.center).at(s);
    final size = from.width + (target.width - from.width) * s;
    return Rect.fromCenter(center: centre, width: size, height: size);
  }
}

class StarLayerState extends State<StarLayer> with TickerProviderStateMixin {
  final _flights = <Object, _Flight>{};

  /// Home, once it has been built.
  HomeStarTarget? home;

  /// True while a star is on its way to Home: Home hides its resting star.
  final homeHidden = ValueNotifier<bool>(false);

  /// [box] in this layer's coordinates.
  Rect? rectOfBox(RenderObject? box) {
    final self = context.findRenderObject() as RenderBox?;
    if (box is! RenderBox || !box.attached || !box.hasSize || self == null) {
      return null;
    }
    final topLeft = box.localToGlobal(Offset.zero, ancestor: self);
    return topLeft & box.size;
  }

  Rect? rectOfKey(GlobalKey key) =>
      rectOfBox(key.currentContext?.findRenderObject());

  /// Flies the star from [from] to wherever [to] says, re-asked every frame
  /// so a target that scrolls is still met. A new flight by the same [owner]
  /// takes over from wherever the previous one had got to. Completes true when
  /// the star lands, false if it was taken over. With Reduce Motion there is
  /// no flight at all: it completes true at once.
  Future<bool> fly({
    required Object owner,
    required Rect from,
    required Rect? Function() to,
    Duration? duration,
    double glow = 0,
  }) async {
    if (!mounted || reduceMotion(context)) return true;
    final previous = _flights.remove(owner);
    if (previous != null) {
      from = previous.current;
      previous.controller.stop(canceled: true);
    }
    final target = to();
    if (target == null) return true;
    final distance = (target.center - from.center).distance;
    final controller = AnimationController(
      vsync: this,
      duration:
          duration ??
          Duration(
            milliseconds: (380 + distance * 0.9).clamp(420, 950).round(),
          ),
    );
    final flight = _Flight(from, to, controller, glow)..lastTo = target;
    setState(() => _flights[owner] = flight);
    try {
      await controller.forward().orCancel;
      return true;
    } on TickerCanceled {
      return false;
    } finally {
      if (_flights[owner] == flight) _flights.remove(owner);
      controller.dispose();
      if (mounted) setState(() {});
    }
  }

  @override
  void dispose() {
    for (final f in _flights.values) {
      f.controller.dispose();
    }
    homeHidden.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        widget.child,
        for (final entry in _flights.entries)
          Positioned.fill(
            key: ObjectKey(entry.value),
            child: IgnorePointer(
              child: AnimatedBuilder(
                animation: entry.value.controller,
                builder: (context, _) {
                  final f = entry.value;
                  final target = f.to() ?? f.lastTo ?? f.from;
                  f.lastTo = target;
                  return SlipstreamFrame(
                    path: SlipstreamPath(f.from.center, target.center),
                    progress: f.controller.value,
                    fromSize: f.from.width,
                    toSize: target.width,
                    glow: f.glow * (1 - f.controller.value),
                  );
                },
              ),
            ),
          ),
      ],
    );
  }
}

/// Takes the person home, the star flying from [from] (where they tapped it)
/// into Home's resting star. On Home already: back to the top.
Future<void> goHome(BuildContext context, {Rect? from}) async {
  final layer = StarLayer.maybeOf(context);
  final router = GoRouter.of(context);
  final here = router.routerDelegate.currentConfiguration.uri.path;
  if (here == '/') {
    layer?.home?.scrollToTop();
    return;
  }
  if (layer == null || from == null) {
    router.go('/');
    return;
  }
  layer.homeHidden.value = true;
  router.go('/');
  // Let Home lay out where it is going to be before aiming at it.
  await WidgetsBinding.instance.endOfFrame;
  try {
    await layer.fly(
      owner: layer.homeHidden,
      from: from,
      to: () => layer.home?.restingRect(),
    );
  } finally {
    layer.homeHidden.value = false;
  }
}

/// A resting star: tapping it goes home. Screen readers call it "Home".
///
/// [visible] false leaves its space but hides the star — while a flight is
/// carrying it elsewhere. [starKey] marks the star itself, for aiming flights.
class StarAnchor extends StatefulWidget {
  const StarAnchor({
    super.key,
    required this.size,
    this.visible = true,
    this.starKey,
    this.onTap,
    this.tapTarget = 44,
  });

  final double size;
  final bool visible;
  final GlobalKey? starKey;
  final VoidCallback? onTap;
  final double tapTarget;

  @override
  State<StarAnchor> createState() => _StarAnchorState();
}

class _StarAnchorState extends State<StarAnchor> {
  final _ownKey = GlobalKey();

  GlobalKey get _key => widget.starKey ?? _ownKey;

  void _tap() {
    if (widget.onTap != null) return widget.onTap!();
    final layer = StarLayer.maybeOf(context);
    goHome(
      context,
      from: layer?.rectOfBox(_key.currentContext?.findRenderObject()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Home',
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: _tap,
        child: SizedBox(
          width: widget.tapTarget,
          height: widget.tapTarget,
          child: Center(
            child: SizedBox(
              key: _key,
              width: widget.size,
              height: widget.size,
              child: AnimatedOpacity(
                opacity: widget.visible ? 1 : 0,
                duration: widget.visible
                    ? const Duration(milliseconds: 140)
                    : Duration.zero,
                child: const StarSprite(),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The star that floats at the foot of pages without the tab bar — detail
/// pages, a subject, My Library, Account — where the tab bar would be.
class FloatingHomeStar extends StatelessWidget {
  const FloatingHomeStar({super.key});

  /// How far above the bottom edge the tab bar and this star float.
  static double bottomOffset(BuildContext context) =>
      MediaQuery.paddingOf(context).bottom + 12;

  /// Room to leave under a page's last content so it can scroll clear.
  static const clearance = 96.0;

  @override
  Widget build(BuildContext context) {
    // Out of the way while typing.
    if (MediaQuery.viewInsetsOf(context).bottom > 0) {
      return const SizedBox.shrink();
    }
    return Positioned(
      left: 0,
      right: 0,
      bottom: bottomOffset(context),
      child: Center(
        child: DecoratedBox(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0xEB111827),
            border: Border.all(color: const Color(0x26FFFFFF)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x66000000),
                blurRadius: 18,
                offset: Offset(0, 6),
              ),
            ],
          ),
          child: const StarAnchor(size: 32, tapTarget: 60),
        ),
      ),
    );
  }
}

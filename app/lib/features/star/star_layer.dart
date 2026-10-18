import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import 'slipstream.dart';
import 'tier_tips.dart';
import 'twinkle.dart';

/// A tab's page (Discover, Videos, Books): where its star is resting right
/// now — the search box, or the start of the sticky pill row — and a way back
/// to its top. Each registers itself with the [StarLayer] under its path.
abstract interface class TabStarTarget {
  Rect? restingRect();

  /// Where the star will rest once the tab's page is still — ignoring the
  /// slide of a page transition in progress. In this layer's coordinates.
  Rect? settledRect();

  /// Back to the top: animated when the person can see it, at once when the
  /// tab is about to be revealed.
  void scrollToTop({bool animate = true});
}

/// The tabs, by path. Discover is first, and where the app opens.
const tabPaths = ['/', '/videos', '/books'];

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
  bool _gone = false;

  /// The tabs' pages, by path, once built.
  final tabs = <String, TabStarTarget>{};

  /// Discover — where the intro's star lands.
  TabStarTarget? get discover => tabs['/'];

  /// Who is carrying a tab's star away right now — a flight between pages
  /// or tabs, the intro, the star's tray — and which tab's. That tab hides
  /// its resting star until every one of them has let go, so one finishing
  /// never shows a star another is still carrying.
  final _holds = <Object, String>{};

  /// The tabs whose resting star is hidden ([hold]).
  final held = ValueNotifier<Set<String>>(const {});

  /// Whether anything is carrying the star now (a flight, the intro, the
  /// tray): other movements leave it alone until it is back.
  bool get busy => _holds.isNotEmpty;

  /// [owner] carries [tab]'s star away: it hides until [release].
  void hold(Object owner, String tab) {
    _holds[owner] = tab;
    held.value = _holds.values.toSet();
  }

  /// [owner] has put the star back (a no-op if it held nothing).
  void release(Object owner) {
    if (_holds.remove(owner) == null || _gone) return;
    held.value = _holds.values.toSet();
  }

  /// The tab on screen (the shell says), whatever pages cover it.
  String? currentTab;

  /// Each page's one resting star — a detail page's floating star, the
  /// search's — by the page it is on. Tabs' stars are in [tabs] instead.
  final _pageStars = <_StarAnchorState>{};

  _StarAnchorState? _pageStarOf(Route<dynamic> route) =>
      _pageStars.where((a) => a._route == route).firstOrNull;

  /// Where the star is resting on screen now: the page on top's own star (a
  /// detail page's foot, the search's), or else the tab's. For the star's
  /// tips (tier_tips.dart → StarTipHost).
  Rect? restingStarRect() {
    final onPage = _pageStars
        .where((a) => a._route?.isCurrent ?? false)
        .map((a) => a.rect)
        .nonNulls
        .firstOrNull;
    if (onPage != null) return onPage;
    final tab = currentTab;
    return tab == null ? null : tabs[tab]?.restingRect();
  }

  /// The star moving with the pages, as the navigator pushes or pops one:
  /// from where it is on the page leaving (or the tab under it) to where it
  /// will rest on the page arriving. Back button and swipe-back alike.
  /// Skipped while another flight owns the star (a tap on it, the intro),
  /// and when the two places are the same (one detail page to another).
  Future<void> followPages({
    required Route<dynamic> leaving,
    required Route<dynamic> arriving,
    required bool popping,
  }) async {
    if (!mounted || busy) return;
    final fromStar = _pageStarOf(leaving);
    final fromTab = fromStar == null ? currentTab : null;
    final from =
        fromStar?.rect ??
        (fromTab == null ? null : tabs[fromTab]?.restingRect());
    if (from == null) return;
    // A page being pushed is built on the next frame.
    if (!popping) await WidgetsBinding.instance.endOfFrame;
    if (!mounted || busy) return;

    final toStar = _pageStarOf(arriving);
    final toTab = toStar == null ? currentTab : null;
    Rect? target() => toStar != null
        ? toStar.settledRect
        : (toTab == null ? null : tabs[toTab]?.settledRect());
    final first = target();
    if (first == null || (first.center - from.center).distance < 4) return;

    fromStar?.suppress(true);
    toStar?.suppress(true);
    final flight = Object();
    final tab = toTab ?? fromTab;
    if (tab != null) hold(flight, tab);
    try {
      await fly(owner: held, from: from, to: target);
    } finally {
      if (!popping) fromStar?.suppress(false); // a popped page is gone
      toStar?.suppress(false);
      release(flight);
    }
  }

  /// Switching tabs: if the star rests somewhere else on the new tab (one
  /// scrolled to its pill row, the other not), it flies there.
  Future<void> followTabs(
    String from,
    String to,
    VoidCallback switchTabs,
  ) async {
    final start = tabs[from]?.restingRect();
    switchTabs();
    if (start == null || from == to || busy) return;
    await WidgetsBinding.instance.endOfFrame;
    final end = tabs[to]?.restingRect();
    if (!mounted || end == null || (end.center - start.center).distance < 4) {
      return;
    }
    final flight = Object();
    hold(flight, to);
    try {
      await fly(owner: held, from: start, to: () => tabs[to]?.restingRect());
    } finally {
      release(flight);
    }
  }

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
      // The layer may have gone mid-flight (the app closing): it has
      // disposed this already.
      if (!_gone) controller.dispose();
      if (mounted) setState(() {});
    }
  }

  @override
  void dispose() {
    _gone = true;
    for (final f in _flights.values) {
      f.controller.dispose();
    }
    _flights.clear();
    _holds.clear();
    held.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        widget.child,
        StarTipHost(layer: this),
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

/// What the star does. On a tab: back to that tab's top. On a page opened
/// over the tabs (a book, a teacher, My Library, the search…): back to the
/// tab it was opened from, at the top, the star flying from [from] (where it
/// was tapped) into that tab's search box. The subject filter is never
/// touched.
Future<void> starTapped(BuildContext context, {Rect? from}) async {
  final layer = StarLayer.maybeOf(context);
  final router = GoRouter.of(context);
  final config = router.routerDelegate.currentConfiguration;
  // The configuration's uri is the tab underneath; pages pushed over it
  // only show in its last match.
  final tab = tabPaths.contains(config.uri.path) ? config.uri.path : '/';
  final top = config.lastOrNull?.matchedLocation ?? config.uri.path;
  final target = layer?.tabs[tab];
  if (top == tab) {
    target?.scrollToTop();
    return;
  }
  target?.scrollToTop(animate: false);
  if (layer == null || from == null) {
    router.go(tab);
    return;
  }
  final flight = Object();
  layer.hold(flight, tab);
  router.go(tab);
  // Let the tab lay out where it is going to be before aiming at it.
  await WidgetsBinding.instance.endOfFrame;
  try {
    await layer.fly(
      owner: layer.held,
      from: from,
      to: () => layer.tabs[tab]?.restingRect(),
    );
  } finally {
    layer.release(flight);
  }
}

/// Press and hold the star, anywhere: My Library, with a light tap of the
/// phone. Already there, nothing happens.
void starHeld(BuildContext context) {
  final router = GoRouter.of(context);
  final config = router.routerDelegate.currentConfiguration;
  final top = config.lastOrNull?.matchedLocation ?? config.uri.path;
  if (top == '/library') return;
  HapticFeedback.lightImpact();
  router.push('/library');
}

/// A resting star: tapping it goes back to the tab's top ([starTapped]);
/// holding it opens My Library ([starHeld]). Screen readers call it "Home".
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
    this.thinking = false,
    this.pageStar = false,
  });

  final double size;

  /// Twinkles while something loads (search results).
  final bool thinking;

  /// This page's one resting star (a detail page's floating star, the
  /// search's): when pages change, the star flies from here or to here.
  final bool pageStar;
  final bool visible;
  final GlobalKey? starKey;
  final VoidCallback? onTap;
  final double tapTarget;

  @override
  State<StarAnchor> createState() => _StarAnchorState();
}

class _StarAnchorState extends State<StarAnchor> {
  final _ownKey = GlobalKey();
  StarLayerState? _layer;
  Route<dynamic>? _route;
  bool _suppressed = false; // hidden while a flight carries the star

  GlobalKey get _key => widget.starKey ?? _ownKey;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _layer?._pageStars.remove(this);
    _layer = StarLayer.maybeOf(context);
    _route = ModalRoute.of(context);
    if (widget.pageStar) _layer?._pageStars.add(this);
  }

  @override
  void dispose() {
    _layer?._pageStars.remove(this);
    super.dispose();
  }

  void suppress(bool hidden) {
    if (mounted && hidden != _suppressed) setState(() => _suppressed = hidden);
  }

  /// Where the star is now, in the layer's coordinates.
  Rect? get rect => _layer?.rectOfKey(_key);

  /// Where it will be once its page has finished sliding: its place within
  /// the page. Pages fill the screen, so that is its place on screen too.
  Rect? get settledRect => settledRectOf(_key, _route);

  void _tap() {
    if (widget.onTap != null) return widget.onTap!();
    final layer = StarLayer.maybeOf(context);
    starTapped(
      context,
      from: layer?.rectOfBox(_key.currentContext?.findRenderObject()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Home',
      onLongPressHint: 'My Library',
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: _tap,
        onLongPress: () => starHeld(context),
        child: SizedBox(
          width: widget.tapTarget,
          height: widget.tapTarget,
          child: Center(
            child: SizedBox(
              key: _key,
              width: widget.size,
              height: widget.size,
              child: AnimatedOpacity(
                opacity: widget.visible && !_suppressed ? 1 : 0,
                duration: widget.visible && !_suppressed
                    ? const Duration(milliseconds: 140)
                    : Duration.zero,
                child: widget.thinking
                    ? const TwinklingStar()
                    : const StarSprite(),
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
  static const clearance = 104.0;

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
      // Just the star — no disc behind it.
      child: const Center(
        child: StarAnchor(size: 64, tapTarget: 72, pageStar: true),
      ),
    );
  }
}

/// [key]'s place within [route]'s page — unmoved by the page's transition —
/// which, as pages fill the screen, is where it will be once the page is
/// still.
Rect? settledRectOf(GlobalKey key, Route<dynamic>? route) {
  // Either may have just left the tree (a page closing, a star moving on)
  // while a flight still asks where to go.
  final starContext = key.currentContext;
  final pageContext = route is ModalRoute ? route.subtreeContext : null;
  if (starContext == null || !starContext.mounted) return null;
  if (pageContext == null || !pageContext.mounted) return null;
  final RenderObject? box;
  final RenderObject? page;
  try {
    box = starContext.findRenderObject();
    page = pageContext.findRenderObject();
  } on FlutterError {
    return null; // deactivated this frame, not yet unmounted
  }
  if (box is! RenderBox || page is! RenderBox) return null;
  if (!box.attached || !page.attached || !box.hasSize) return null;
  return box.localToGlobal(Offset.zero, ancestor: page) & box.size;
}

/// Tells the [StarLayer] when the root navigator changes page, so the star
/// moves with it ([StarLayerState.followPages]). Sheets and dialogs are not
/// pages and are left alone.
class StarFlightObserver extends NavigatorObserver {
  StarFlightObserver(this.layer);

  final StarLayerState? Function() layer;

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (route is! PageRoute || previousRoute is! PageRoute) return;
    layer()?.followPages(
      leaving: previousRoute,
      arriving: route,
      popping: false,
    );
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (route is! PageRoute || previousRoute is! PageRoute) return;
    layer()?.followPages(
      leaving: route,
      arriving: previousRoute,
      popping: true,
    );
  }
}

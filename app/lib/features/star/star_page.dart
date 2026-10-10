import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/providers.dart';
import '../../theme/colors.dart';
import '../home/subject_pills.dart';
import 'star_layer.dart';

/// The frame Home, Videos and Books share, as the website's pages do: the top
/// bar (My Library and Account on the right), the search box with the star
/// in it, and the subject pills, which stick to the top while the rest
/// scrolls.
///
/// The star rests in the search box. When the box scrolls off the screen the
/// star flies into the start of the sticky pill row; scrolling back up, it
/// flies back into the box.
class StarPage extends ConsumerStatefulWidget {
  const StarPage({
    super.key,
    required this.filter,
    required this.slivers,
    required this.onRefresh,
    this.isHome = false,
  });

  final NotifierProvider<SubjectFilter, String?> filter;

  /// Everything under the pills.
  final List<Widget> slivers;
  final Future<void> Function() onRefresh;

  /// Home is where every other star flies back to.
  final bool isHome;

  /// Room under a tab's last content, clear of the floating tab bar.
  static const tabBarClearance = 110.0;

  @override
  ConsumerState<StarPage> createState() => _StarPageState();
}

class _StarPageState extends ConsumerState<StarPage> implements HomeStarTarget {
  final _scroll = ScrollController();
  final _boxStar = GlobalKey(debugLabel: 'box star');
  final _dockStar = GlobalKey(debugLabel: 'dock star');
  bool _docked = false;
  bool _flying = false;
  StarLayerState? _layer;
  final _noLayer = ValueNotifier(false); // only without a StarLayer (tests)

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _layer = StarLayer.maybeOf(context);
    if (widget.isHome) _layer?.home = this;
  }

  @override
  void dispose() {
    if (widget.isHome && _layer?.home == this) _layer?.home = null;
    _scroll.dispose();
    _noLayer.dispose();
    super.dispose();
  }

  // ── HomeStarTarget ──

  @override
  Rect? restingRect() => _layer?.rectOfKey(_docked ? _dockStar : _boxStar);

  @override
  void scrollToTop() {
    if (!_scroll.hasClients) return;
    _scroll.animateTo(
      0,
      duration: const Duration(milliseconds: 450),
      curve: Curves.easeOutCubic,
    );
  }

  // ── Docking ──

  bool _checkScheduled = false;

  // The scroll position changes before the page is laid out at it, so the
  // star's place is read after the frame.
  void _onScroll() {
    if (_checkScheduled) return;
    _checkScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkScheduled = false;
      if (mounted) _checkDock();
    });
  }

  void _checkDock() {
    final box = _layer?.rectOfKey(_boxStar);
    if (box == null) return;
    final top = MediaQuery.paddingOf(context).top;
    // A little hysteresis, so resting on the line does not flick back and forth.
    final gone = _docked ? box.center.dy < top + 18 : box.center.dy < top + 2;
    if (gone != _docked) _move(dock: gone);
  }

  Future<void> _move({required bool dock}) async {
    final layer = _layer;
    final from = layer?.rectOfKey(dock ? _boxStar : _dockStar);
    setState(() {
      _docked = dock;
      _flying = layer != null && from != null;
    });
    if (layer == null || from == null) return;
    final landed = await layer.fly(
      owner: this,
      from: from,
      to: () => layer.rectOfKey(dock ? _dockStar : _boxStar),
    );
    if (landed && mounted) setState(() => _flying = false);
  }

  @override
  Widget build(BuildContext context) {
    final homeHidden = _layer?.homeHidden ?? _noLayer;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: ValueListenableBuilder<bool>(
          valueListenable: homeHidden,
          builder: (context, incoming, _) {
            final hidden = _flying || (widget.isHome && incoming);
            return RefreshIndicator(
              color: SpColors.link,
              onRefresh: widget.onRefresh,
              child: CustomScrollView(
                controller: _scroll,
                slivers: [
                  const SliverToBoxAdapter(child: TopBar()),
                  SliverToBoxAdapter(
                    child: StarSearchBox(
                      starKey: _boxStar,
                      starVisible: !hidden && !_docked,
                    ),
                  ),
                  SliverPersistentHeader(
                    pinned: true,
                    delegate: _PillsHeader(
                      filter: widget.filter,
                      docked: _docked,
                      starVisible: !hidden && _docked,
                      starKey: _dockStar,
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: SubjectFilterNote(filter: widget.filter),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 20)),
                  ...widget.slivers,
                  const SliverToBoxAdapter(
                    child: SizedBox(height: StarPage.tabBarClearance),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

/// My Library and Account, on the right. Nothing on the left: the star is the
/// brand.
class TopBar extends StatelessWidget {
  const TopBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 8, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          IconButton(
            tooltip: 'My Library',
            onPressed: () => context.push('/library'),
            icon: const Icon(Icons.bookmark_border),
          ),
          IconButton(
            tooltip: 'Account',
            onPressed: () => context.push('/account'),
            icon: const Icon(Icons.person_outline),
          ),
        ],
      ),
    );
  }
}

/// "How are you feeling today?" with the star where the magnifying glass
/// was. The box opens the search; the star takes you home.
class StarSearchBox extends StatelessWidget {
  const StarSearchBox({
    super.key,
    required this.starKey,
    this.starVisible = true,
  });

  final GlobalKey starKey;
  final bool starVisible;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
      child: Material(
        color: SpColors.surface,
        shape: const StadiumBorder(side: BorderSide(color: SpColors.border)),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: () => context.push('/feel'),
          child: SizedBox(
            height: 56,
            child: Row(
              children: [
                const SizedBox(width: 8),
                StarAnchor(size: 28, starKey: starKey, visible: starVisible),
                const SizedBox(width: 6),
                // Expanded + ellipsis: on a narrow phone or with large
                // accessibility text the question truncates, never overflows.
                Expanded(
                  child: Semantics(
                    button: true,
                    label: 'How are you feeling today? Search',
                    excludeSemantics: true,
                    child: const Text(
                      'How are you feeling today?',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 16, color: SpColors.textMuted),
                    ),
                  ),
                ),
                const SizedBox(width: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The sticky row: the pills, and — once the search box has gone — the star
/// at its start.
class _PillsHeader extends SliverPersistentHeaderDelegate {
  _PillsHeader({
    required this.filter,
    required this.docked,
    required this.starVisible,
    required this.starKey,
  });

  final NotifierProvider<SubjectFilter, String?> filter;
  final bool docked;
  final bool starVisible;
  final GlobalKey starKey;

  static const _height = 58.0;
  static const _dockWidth = 58.0;

  @override
  double get minExtent => _height;
  @override
  double get maxExtent => _height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlaps) {
    return ColoredBox(
      color: SpColors.background,
      child: Stack(
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: TweenAnimationBuilder<double>(
              tween: Tween(end: docked ? _dockWidth : 20),
              duration: const Duration(milliseconds: 260),
              curve: Curves.easeOutCubic,
              builder: (context, lead, _) =>
                  SubjectPillRow(filter: filter, leadingPadding: lead),
            ),
          ),
          // The pills slide under the docked star, fading out beneath it.
          if (docked)
            const Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              width: _dockWidth,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    stops: [0.75, 1],
                    colors: [SpColors.background, Color(0x000A0F1D)],
                  ),
                ),
              ),
            ),
          Positioned(
            left: 8,
            top: 0,
            bottom: 0,
            child: Center(
              child: ExcludeSemantics(
                excluding: !docked,
                child: IgnorePointer(
                  ignoring: !docked,
                  child: StarAnchor(
                    size: 28,
                    starKey: starKey,
                    visible: starVisible,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  bool shouldRebuild(_PillsHeader old) =>
      old.docked != docked ||
      old.starVisible != starVisible ||
      old.filter != filter;
}

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../theme/colors.dart';

/// The star's tier tips: the first time the Superhero, Luminary and Local
/// Hero shelves come into view on Discover, the star explains the badge, in
/// the website's own words (web/components/HealerCard.js → TIER_TOOLTIPS).
///
/// One tip at a time, at most one per visit, each only ever once, and only
/// until it is tapped away. Nothing is in the way: there is no veil, and the
/// shelf scrolls and taps as normal underneath. "Star tips" in My Account
/// switches them off.
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

// ── What the phone remembers ─────────────────────────────────────────────────

abstract class TierTipsPrefs {
  Future<bool> enabled();
  Future<void> setEnabled(bool value);
  Future<Set<TierTip>> seen();
  Future<void> markSeen(TierTip tip);

  /// As if the app were new (debug "Replay intro"). Leaves the switch alone.
  Future<void> reset();
}

class PreferencesTierTipsPrefs implements TierTipsPrefs {
  final _prefs = SharedPreferencesAsync();
  static const _on = 'star_tips_on';
  static String _seenKey(TierTip t) => 'tier_tip_seen_${t.key}';

  @override
  Future<bool> enabled() async {
    try {
      return await _prefs.getBool(_on) ?? true;
    } catch (_) {
      return true;
    }
  }

  @override
  Future<void> setEnabled(bool value) async {
    try {
      await _prefs.setBool(_on, value);
    } catch (_) {}
  }

  @override
  Future<Set<TierTip>> seen() async {
    final seen = <TierTip>{};
    for (final t in TierTip.values) {
      try {
        if (await _prefs.getBool(_seenKey(t)) ?? false) seen.add(t);
      } catch (_) {
        seen.add(t); // unreadable: better no tip than the same tip again
      }
    }
    return seen;
  }

  @override
  Future<void> markSeen(TierTip tip) async {
    try {
      await _prefs.setBool(_seenKey(tip), true);
    } catch (_) {}
  }

  @override
  Future<void> reset() async {
    for (final t in TierTip.values) {
      try {
        await _prefs.remove(_seenKey(t));
      } catch (_) {}
    }
  }
}

class MemoryTierTipsPrefs implements TierTipsPrefs {
  MemoryTierTipsPrefs({this.on = true, Set<TierTip>? seen})
    : seenTips = seen ?? {};

  bool on;
  final Set<TierTip> seenTips;

  @override
  Future<bool> enabled() async => on;
  @override
  Future<void> setEnabled(bool value) async => on = value;
  @override
  Future<Set<TierTip>> seen() async => {...seenTips};
  @override
  Future<void> markSeen(TierTip tip) async => seenTips.add(tip);
  @override
  Future<void> reset() async => seenTips.clear();
}

final tierTipsPrefsProvider = Provider<TierTipsPrefs>(
  (ref) => PreferencesTierTipsPrefs(),
);

// ── The rules ────────────────────────────────────────────────────────────────

class TierTipsState {
  const TierTipsState({
    this.loaded = false,
    this.enabled = true,
    this.seen = const {},
    this.showing,
  });

  final bool loaded;
  final bool enabled;
  final Set<TierTip> seen;

  /// The tip the star is showing now, if any.
  final TierTip? showing;

  TierTipsState copyWith({
    bool? loaded,
    bool? enabled,
    Set<TierTip>? seen,
    TierTip? showing,
    bool clearShowing = false,
  }) => TierTipsState(
    loaded: loaded ?? this.loaded,
    enabled: enabled ?? this.enabled,
    seen: seen ?? this.seen,
    showing: clearShowing ? null : showing ?? this.showing,
  );
}

class TierTipsController extends Notifier<TierTipsState> {
  /// Away this long, and coming back is a new visit.
  static const newVisitAfter = Duration(minutes: 30);

  bool _shownThisVisit = false;
  DateTime? _leftAt;

  TierTipsPrefs get _prefs => ref.read(tierTipsPrefsProvider);

  @override
  TierTipsState build() {
    final lifecycle = AppLifecycleListener(
      onHide: () => _leftAt = DateTime.now(),
      onShow: () {
        final left = _leftAt;
        if (left != null && DateTime.now().difference(left) >= newVisitAfter) {
          _shownThisVisit = false;
        }
        _leftAt = null;
      },
    );
    ref.onDispose(lifecycle.dispose);
    unawaited(_load());
    return const TierTipsState();
  }

  Future<void> _load() async {
    final prefs = _prefs;
    final (on, seen) = await (prefs.enabled(), prefs.seen()).wait;
    state = state.copyWith(loaded: true, enabled: on, seen: seen);
  }

  /// A tier shelf is at least half on screen.
  void shelfInView(TierTip tip) {
    final s = state;
    if (!s.loaded || !s.enabled || s.showing != null) return;
    if (_shownThisVisit || s.seen.contains(tip)) return;
    _shownThisVisit = true;
    state = s.copyWith(showing: tip);
  }

  /// Tapped away: never again.
  void dismiss() {
    final tip = state.showing;
    if (tip == null) return;
    state = state.copyWith(seen: {...state.seen, tip}, clearShowing: true);
    unawaited(_prefs.markSeen(tip));
  }

  Future<void> setEnabled(bool value) async {
    state = state.copyWith(enabled: value, clearShowing: !value);
    await _prefs.setEnabled(value);
  }

  /// Every tip unseen again, as on a new phone (debug "Replay intro").
  Future<void> reset() async {
    _shownThisVisit = false;
    state = state.copyWith(seen: {}, clearShowing: true);
    await _prefs.reset();
  }
}

final tierTipsProvider = NotifierProvider<TierTipsController, TierTipsState>(
  TierTipsController.new,
);

// ── Noticing a shelf ─────────────────────────────────────────────────────────

/// Wraps a tier shelf: tells the tips when it is at least half on screen, on
/// a visible page (not a tab in the background, not under a pushed page).
class TierTipTrigger extends ConsumerStatefulWidget {
  const TierTipTrigger({super.key, required this.tip, required this.child});

  final TierTip tip;
  final Widget child;

  @override
  ConsumerState<TierTipTrigger> createState() => _TierTipTriggerState();
}

class _TierTipTriggerState extends ConsumerState<TierTipTrigger> {
  ScrollPosition? _position;
  bool _scheduled = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final position = Scrollable.maybeOf(context)?.position;
    if (position != _position) {
      _position?.removeListener(_schedule);
      _position = position?..addListener(_schedule);
    }
    _schedule();
  }

  @override
  void dispose() {
    _position?.removeListener(_schedule);
    super.dispose();
  }

  void _schedule() {
    if (_scheduled) return;
    _scheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scheduled = false;
      if (mounted) _check();
    });
  }

  void _check() {
    final tips = ref.read(tierTipsProvider);
    if (!tips.loaded || !tips.enabled || tips.showing != null) return;
    if (tips.seen.contains(widget.tip)) return;
    if (!TickerMode.valuesOf(context).enabled) return; // a background tab
    if (ModalRoute.of(context)?.isCurrent == false) return;
    final box = context.findRenderObject();
    if (box is! RenderBox || !box.hasSize || box.size.height == 0) return;
    final top = box.localToGlobal(Offset.zero).dy;
    final screen = MediaQuery.sizeOf(context).height;
    final visible =
        (top + box.size.height).clamp(0.0, screen) - top.clamp(0.0, screen);
    if (visible >= box.size.height / 2) {
      ref.read(tierTipsProvider.notifier).shelfInView(widget.tip);
    }
  }

  @override
  Widget build(BuildContext context) {
    // A late load, the switch turned on, or the previous tip dismissed: look
    // again without waiting for a scroll.
    ref.listen(tierTipsProvider, (_, _) => _schedule());
    return widget.child;
  }
}

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
    final tip = ref.watch(tierTipsProvider.select((s) => s.showing));
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
                onTap: ref.read(tierTipsProvider.notifier).dismiss,
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

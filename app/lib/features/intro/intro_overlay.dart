import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../theme/colors.dart';
import '../star/slipstream.dart';
import '../star/star_layer.dart';

/// Which intro this launch gets.
enum IntroKind {
  /// The first launch: the star introduces itself, flies into Home's search
  /// box, and explains that tapping it always comes home.
  full,

  /// Every later launch: the star flies from the launch screen into the box.
  short,

  /// "Don't show me again": straight onto Home.
  none,
}

/// What the phone remembers about the intro.
abstract class IntroPrefs {
  Future<IntroKind> kind();

  /// The full intro has been seen; [off] also switches off the short one.
  Future<void> markSeen({required bool off});
}

class PreferencesIntroPrefs implements IntroPrefs {
  final _prefs = SharedPreferencesAsync();
  static const _seen = 'intro_full_seen';
  static const _off = 'intro_off';

  @override
  Future<IntroKind> kind() async {
    try {
      if (await _prefs.getBool(_off) ?? false) return IntroKind.none;
      return await _prefs.getBool(_seen) ?? false
          ? IntroKind.short
          : IntroKind.full;
    } catch (_) {
      return IntroKind.short;
    }
  }

  @override
  Future<void> markSeen({required bool off}) async {
    try {
      await _prefs.setBool(_seen, true);
      if (off) await _prefs.setBool(_off, true);
    } catch (_) {}
  }
}

class MemoryIntroPrefs implements IntroPrefs {
  MemoryIntroPrefs([this.value = IntroKind.full]);

  IntroKind value;

  @override
  Future<IntroKind> kind() async => value;

  @override
  Future<void> markSeen({required bool off}) async =>
      value = off ? IntroKind.none : IntroKind.short;
}

final introPrefsProvider = Provider<IntroPrefs>(
  (ref) => PreferencesIntroPrefs(),
);

enum _Phase { waiting, greeting, flying, callout, done }

/// The opening, played over the real home screen, which is already built
/// underneath and is revealed as the star arrives in its search box.
///
/// First launch (about 4 s, a tap moves it on): the star — exactly where the
/// launch screen left it — glows, "I am your guiding star"; it flies along
/// the slipstream into Home's search box as the dark veil lifts; then "Tap me
/// anytime to come home", with "Got it" and "Don't show me again".
///
/// Later launches (about 1 s): just the flight. After "Don't show me again":
/// nothing. With Reduce Motion there is no flight: the first launch still
/// shows its two messages, later launches show nothing.
class IntroOverlay extends ConsumerStatefulWidget {
  const IntroOverlay({
    super.key,
    required this.child,
    this.removeNativeSplash = true,
  });

  /// The app underneath — the router's current screen.
  final Widget child;

  /// Off in tests, where there is no native launch screen to hand over from.
  final bool removeNativeSplash;

  /// Must match the launch screen: a 480 px image shown at 4x → 120 pt, centred.
  static const double startStarWidth = 120;

  static const greeting = 'I am your guiding star';
  static const callout = 'Tap me anytime to come home';

  @override
  ConsumerState<IntroOverlay> createState() => _IntroOverlayState();
}

class _IntroOverlayState extends ConsumerState<IntroOverlay>
    with TickerProviderStateMixin {
  // How long the greeting stays. Kept at full length with Reduce Motion
  // (which would otherwise shorten it to a blink): it is reading time.
  late final _greet = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2400),
    animationBehavior: AnimationBehavior.preserve,
  );
  late final _fly = AnimationController(vsync: this);

  _Phase _phase = _Phase.waiting;
  IntroKind _kind = IntroKind.short;
  bool _still = false; // Reduce Motion
  bool _started = false;
  StarLayerState? _layer;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _layer = StarLayer.maybeOf(context);
    if (_started) return;
    _started = true;
    _still = reduceMotion(context);
    _layer?.homeHidden.value = true;
    _start();
  }

  Future<void> _start() async {
    final kind = await ref.read(introPrefsProvider).kind();
    // Decode the star before the launch screen goes away, so the first frame
    // of the intro is identical to the launch screen rather than blank.
    if (mounted) await precacheImage(starAsset, context).catchError((_) {});
    if (!mounted) return;
    _kind = kind;
    _removeNativeSplash();
    if (kind == IntroKind.none || (kind == IntroKind.short && _still)) {
      return _finish();
    }
    if (kind == IntroKind.short) return _flyHome();
    setState(() => _phase = _Phase.greeting);
    await _greet.forward().orCancel.catchError((_) {});
    if (mounted && _phase == _Phase.greeting) _flyHome();
  }

  void _removeNativeSplash() {
    if (widget.removeNativeSplash) FlutterNativeSplash.remove();
  }

  Future<void> _flyHome() async {
    if (_still) return _land();
    setState(() => _phase = _Phase.flying);
    _fly.duration = Duration(
      milliseconds: _kind == IntroKind.full ? 1100 : 950,
    );
    await _fly.forward().orCancel.catchError((_) {});
    if (mounted) _land();
  }

  void _land() {
    _layer?.homeHidden.value = false;
    if (_kind == IntroKind.full) {
      setState(() => _phase = _Phase.callout);
    } else {
      _finish();
    }
  }

  void _finish() {
    _layer?.homeHidden.value = false;
    if (mounted) setState(() => _phase = _Phase.done);
  }

  /// A tap moves the intro on: past the greeting, or to the end of the flight.
  void _skip() {
    switch (_phase) {
      case _Phase.greeting:
        _greet.stop();
        _flyHome();
      case _Phase.flying:
        _fly.animateTo(
          1,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      default:
        break;
    }
  }

  Future<void> _dismiss({required bool off}) async {
    unawaited(ref.read(introPrefsProvider).markSeen(off: off));
    _finish();
  }

  @override
  void dispose() {
    _greet.dispose();
    _fly.dispose();
    super.dispose();
  }

  Rect _homeRect(Size size) {
    final rect = _layer?.home?.restingRect();
    if (rect != null) return rect;
    // Home not laid out yet: roughly where its search box star sits.
    final top = MediaQuery.paddingOf(context).top;
    return Rect.fromCenter(
      center: Offset(42, top + 52 + 32),
      width: 28,
      height: 28,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_phase == _Phase.done) return widget.child;
    return Stack(
      fit: StackFit.expand,
      children: [
        widget.child,
        if (_phase == _Phase.callout)
          _Callout(
            star: _homeRect(MediaQuery.sizeOf(context)),
            onGotIt: () => _dismiss(off: false),
            onNeverAgain: () => _dismiss(off: true),
          )
        else
          Positioned.fill(
            child: Semantics(
              button: true,
              label: 'Skip intro',
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: _skip,
                child: AnimatedBuilder(
                  animation: Listenable.merge([_greet, _fly]),
                  builder: (context, _) => _frame(context),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _frame(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = constraints.biggest;
        final centre = size.center(Offset.zero);
        final glow = _kind == IntroKind.full && !_still
            ? const Interval(
                0,
                0.4,
                curve: Curves.easeOut,
              ).transform(_greet.value)
            : 0.0;
        final start = Rect.fromCenter(
          center: centre,
          width: IntroOverlay.startStarWidth * (1 + 0.12 * glow),
          height: IntroOverlay.startStarWidth * (1 + 0.12 * glow),
        );
        final t = _fly.value;
        final reveal = const Interval(
          0.35,
          1,
          curve: Curves.easeInOut,
        ).transform(t);
        final caption =
            const Interval(
              0.2,
              0.5,
              curve: Curves.easeOut,
            ).transform(_greet.value) *
            (1 - const Interval(0, 0.25).transform(t));
        final waiting = _phase == _Phase.waiting;

        final target = _homeRect(size);
        return Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(
              color: SpColors.background.withValues(alpha: 1 - reveal),
            ),
            if (_phase == _Phase.flying)
              SlipstreamFrame(
                path: SlipstreamPath(start.center, target.center),
                progress: t,
                fromSize: start.width,
                toSize: target.width,
                glow: glow * (1 - t),
              )
            else
              Positioned.fromRect(
                rect: start,
                child: StarSprite(glow: waiting ? 0 : glow),
              ),
            if (caption > 0)
              Positioned(
                left: 24,
                right: 24,
                top: start.bottom + 34,
                child: Opacity(
                  opacity: caption,
                  // Its own node, read on its own — not merged into the
                  // "Skip intro" button it sits on.
                  child: Semantics(
                    container: true,
                    child: const Text(
                      IntroOverlay.greeting,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -0.2,
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

/// "Tap me anytime to come home", pointing at the star in the search box.
class _Callout extends StatelessWidget {
  const _Callout({
    required this.star,
    required this.onGotIt,
    required this.onNeverAgain,
  });

  final Rect star;
  final VoidCallback onGotIt;
  final VoidCallback onNeverAgain;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        // A light veil that keeps Home visible but not yet tappable — except
        // the star itself, which counts as "Got it".
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () {},
          child: const ColoredBox(color: Color(0x8C000000)),
        ),
        Positioned.fromRect(
          rect: star.inflate(14),
          child: GestureDetector(onTap: onGotIt, child: const _Halo()),
        ),
        Positioned(
          left: 20,
          right: 20,
          top: star.bottom + 22,
          child: Material(
            color: SpColors.surface,
            elevation: 8,
            borderRadius: BorderRadius.circular(18),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 12, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    IntroOverlay.callout,
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Wherever you are in Spiritpedia, the star brings you back here.',
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.45,
                      color: SpColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      TextButton(
                        onPressed: onNeverAgain,
                        style: TextButton.styleFrom(
                          foregroundColor: SpColors.textMuted,
                        ),
                        child: const Text('Don’t show me again'),
                      ),
                      const Spacer(),
                      TextButton(
                        onPressed: onGotIt,
                        style: TextButton.styleFrom(
                          foregroundColor: SpColors.link,
                        ),
                        child: const Text(
                          'Got it',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// The star in a soft gold ring while the callout is up.
class _Halo extends StatelessWidget {
  const _Halo();

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      border: Border.all(color: SpColors.gold.withValues(alpha: 0.7), width: 2),
      boxShadow: [
        BoxShadow(
          color: SpColors.gold.withValues(alpha: 0.35),
          blurRadius: 18,
          spreadRadius: 2,
        ),
      ],
    ),
    // The star itself, bright above the veil.
    child: const Padding(padding: EdgeInsets.all(14), child: StarSprite()),
  );
}

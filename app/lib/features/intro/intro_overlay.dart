import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:shared_preferences/shared_preferences.dart';

import '../../data/providers.dart';
import '../../theme/colors.dart';
import '../interests/interests_picker.dart';
import '../account/display_name.dart';
import '../star/conductor.dart';
import '../star/slipstream.dart';
import '../star/star_layer.dart';
import '../../theme/layout.dart';

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

  /// As if the app were new: the next intro is the full one (debug builds).
  Future<void> reset();
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

  @override
  Future<void> reset() async {
    try {
      await _prefs.remove(_seen);
      await _prefs.remove(_off);
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

  @override
  Future<void> reset() async => value = IntroKind.full;
}

final introPrefsProvider = Provider<IntroPrefs>(
  (ref) => PreferencesIntroPrefs(),
);

/// Bumped to play the intro again without restarting the app — the debug-only
/// "Replay intro" in Account. The intro listens, and starts over.
class IntroReplay extends Notifier<int> {
  @override
  int build() => 0;

  void bump() => state++;
}

final introReplayProvider = NotifierProvider<IntroReplay, int>(IntroReplay.new);

/// Everything a first launch shows, shown again: the intro, then the
/// onboarding ("What interests you most?"). Debug builds only.
///
/// Reads what it needs at once, so the screen that called it (Account) may
/// close straight away — a widget's ref is unusable once it has gone.
Future<void> replayFirstLaunch(WidgetRef ref) async {
  final prefs = ref.read(introPrefsProvider);
  final replay = ref.read(introReplayProvider.notifier);
  await prefs.reset();
  replay.bump();
}

enum _Phase { waiting, greeting, flying, callout, onboarding, done }

/// The opening, played over the real home screen, which is already built
/// underneath and is revealed as the star arrives in its search box.
///
/// First launch (about 4 s, a tap moves it on): the star — exactly where the
/// launch screen left it — glows, "I am your guiding star"; it flies along
/// the slipstream into Home's search box as the dark veil lifts; then "Tap me
/// anytime to come home", with "Got it" and "Don't show me again".
///
/// Then, on the first launch only, the onboarding: "What interests you
/// most?" — never on a later launch.
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

  /// What the star says before it flies: who it is, the first time; on a
  /// later launch, for someone who shared their name, "Welcome back, Ross".
  String _caption = IntroOverlay.greeting;
  bool _still = false; // Reduce Motion
  bool _started = false;
  int _run = 0; // which play this is; a replay makes older ones stand down
  StarLayerState? _layer;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _layer = StarLayer.maybeOf(context);
    if (_started) return;
    _started = true;
    _still = reduceMotion(context);
    _layer?.hold(this, '/');
    _start();
  }

  Future<void> _start() async {
    final run = _run;
    final kind = await ref.read(introPrefsProvider).kind();
    final name = kind == IntroKind.short
        ? firstNameOf(await ref.read(nameStoreProvider).load())
        : null;
    // Decode the star before the launch screen goes away, so the first frame
    // of the intro is identical to the launch screen rather than blank.
    if (mounted) await precacheImage(starAsset, context).catchError((_) {});
    if (!mounted || run != _run) return;
    _kind = kind;
    _removeNativeSplash();
    if (kind == IntroKind.none || (kind == IntroKind.short && _still)) {
      return _finish();
    }
    if (kind == IntroKind.short) {
      if (name == null) return _flyHome();
      _caption = 'Welcome back, $name';
      _greet.duration = const Duration(milliseconds: 1600);
    } else {
      _caption = IntroOverlay.greeting;
      _greet.duration = const Duration(milliseconds: 2400);
      // The full intro is this session's one appearance of the star.
      ref.read(conductorProvider.notifier).introPlayed();
    }
    setState(() => _phase = _Phase.greeting);
    await _greet.forward().orCancel.catchError((_) {});
    if (mounted && run == _run && _phase == _Phase.greeting) _flyHome();
  }

  /// "Replay intro": from the top, over whatever is on screen (Home — the
  /// button goes there first).
  void _replay() {
    _run++;
    _greet.reset();
    _fly.reset();
    _still = reduceMotion(context);
    _layer?.hold(this, '/');
    setState(() => _phase = _Phase.waiting);
    _start();
  }

  void _removeNativeSplash() {
    if (widget.removeNativeSplash) FlutterNativeSplash.remove();
  }

  Future<void> _flyHome() async {
    if (_still) return _land();
    final run = _run;
    setState(() => _phase = _Phase.flying);
    _fly.duration = Duration(
      milliseconds: _kind == IntroKind.full ? 1100 : 950,
    );
    await _fly.forward().orCancel.catchError((_) {});
    if (mounted && run == _run) _land();
  }

  void _land() {
    _layer?.release(this);
    if (_kind == IntroKind.full) {
      setState(() => _phase = _Phase.callout);
    } else {
      _finish();
    }
  }

  void _finish() {
    _layer?.release(this);
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
    // Only a first launch gets here (the callout is the full intro's), so
    // the onboarding follows it once — and never a later launch.
    if (mounted) setState(() => _phase = _Phase.onboarding);
  }

  /// Onboarding done or skipped: Discover, View All, nothing filtered.
  void _onboarded() {
    ref.read(subjectFilterProvider.notifier).select(null);
    _finish();
  }

  @override
  void dispose() {
    _greet.dispose();
    _fly.dispose();
    super.dispose();
  }

  Rect _homeRect(Size size) {
    final rect = _layer?.discover?.restingRect();
    if (rect != null) return rect;
    // Home not laid out yet: roughly where its search box star sits — the
    // first row under the status bar (8 above a 56-high box, the star 22 in).
    // On an iPad the search row is centred (SpLayout.searchRowWidth).
    final top = MediaQuery.paddingOf(context).top;
    final row = SpLayout.of(context).centredInset(SpLayout.searchRowWidth);
    return Rect.fromCenter(
      center: Offset(row + 42, top + 8 + 28),
      width: 28,
      height: 28,
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(introReplayProvider, (_, _) => _replay());
    if (_phase == _Phase.done) return widget.child;
    return Stack(
      fit: StackFit.expand,
      children: [
        widget.child,
        if (_phase == _Phase.onboarding)
          // One movement: the callout fades out as the welcome fades in over
          // the same veil, so Home is never uncovered in between.
          Positioned.fill(
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: _still
                  ? Duration.zero
                  : const Duration(milliseconds: 520),
              curve: Curves.easeInOutCubic,
              builder: (context, t, onboarding) => Stack(
                fit: StackFit.expand,
                children: [
                  if (t < 1)
                    IgnorePointer(
                      child: Opacity(
                        opacity: 1 - t,
                        child: _Callout(
                          star: _homeRect(MediaQuery.sizeOf(context)),
                          onGotIt: () {},
                        ),
                      ),
                    ),
                  Opacity(
                    opacity: t,
                    child: Transform.scale(
                      scale: 0.985 + 0.015 * t,
                      child: onboarding,
                    ),
                  ),
                ],
              ),
              child: RepaintBoundary(
                child: OnboardingScreen(onDone: _onboarded),
              ),
            ),
          )
        else if (_phase == _Phase.callout)
          _Callout(
            star: _homeRect(MediaQuery.sizeOf(context)),
            onGotIt: () => _dismiss(off: false),
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
                    // The intro sits above the app's pages, outside any
                    // Material: without one, Flutter draws text in its
                    // debug style (the deformed, underlined look).
                    child: Material(
                      type: MaterialType.transparency,
                      child: Text(
                        _caption,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -0.2,
                        ),
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
  const _Callout({required this.star, required this.onGotIt});

  final Rect star;
  final VoidCallback onGotIt;

  @override
  Widget build(BuildContext context) {
    final compact = SpLayout.of(context).isCompact;
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
          // Under the star: on an iPad, a card's width from the star's
          // side rather than the whole screen.
          left: compact ? 20 : max(20.0, star.left - 20),
          right: compact ? 20 : null,
          width: compact ? null : 440,
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
                  const SizedBox(height: 4),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      key: const ValueKey('intro-got-it'),
                      onPressed: onGotIt,
                      style: TextButton.styleFrom(
                        foregroundColor: SpColors.link,
                      ),
                      child: const Text(
                        'Got it',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
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

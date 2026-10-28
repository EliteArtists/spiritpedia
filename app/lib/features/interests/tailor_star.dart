import 'dart:async';
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../theme/colors.dart';
import '../search/feeling_placeholder.dart';
import '../star/slipstream.dart';
import '../star/star_layer.dart';
import '../../theme/layout.dart';

/// What the star says as Tailor Spiritpedia opens.
const tailorStarIntro =
    'Entirely optional, and never shared. Your choices only shape what you '
    'see in Spiritpedia. Change them anytime.';

/// Whether the star still introduces Tailor Spiritpedia ("Don't show me
/// again" switches it off). Overridden in tests.
abstract class TailorIntroPrefs {
  Future<bool> show();
  Future<void> turnOff();
}

class PreferencesTailorIntroPrefs implements TailorIntroPrefs {
  final _prefs = SharedPreferencesAsync();
  static const _off = 'tailor_intro_off';

  @override
  Future<bool> show() async {
    try {
      return !(await _prefs.getBool(_off) ?? false);
    } catch (_) {
      return false;
    }
  }

  @override
  Future<void> turnOff() async {
    try {
      await _prefs.setBool(_off, true);
    } catch (_) {}
  }
}

final tailorIntroPrefsProvider = Provider<TailorIntroPrefs>(
  (ref) => PreferencesTailorIntroPrefs(),
);

/// Whether the star introduces the page — read as the app starts, so the
/// page knows at once where its star goes and the opening flight lands
/// there.
final tailorIntroShowProvider = FutureProvider<bool>(
  (ref) => ref.watch(tailorIntroPrefsProvider).show(),
);

/// Tailor Spiritpedia as the star's own space. The star arrives with the
/// page (the shared flight every page has) and floats at the top, typing
/// its introduction while the choices scroll underneath — nothing is ever
/// blocked. Once it has finished it can be swiped away, or after a moment it
/// glides down to rest at the foot of the page, as on every other page.
class TailorStarFrame extends ConsumerStatefulWidget {
  const TailorStarFrame({
    super.key,
    required this.builder,
    this.always = false,
  });

  /// The page's scrolling content, given the room to leave at its top.
  final Widget Function(BuildContext context, double top) builder;

  /// Speak whatever "Don't show me again" was set to, and without that
  /// button: opened from the For You pill, where the words say why.
  final bool always;

  /// How long the finished words stay before the star moves on.
  static const linger = Duration(milliseconds: 3600);

  @override
  ConsumerState<TailorStarFrame> createState() => _TailorStarFrameState();
}

enum _Star { deciding, speaking, resting }

class _TailorStarFrameState extends ConsumerState<TailorStarFrame> {
  final _topKey = GlobalKey();
  final _footKey = GlobalKey();
  final _bubbleKey = GlobalKey();
  _Star _star = _Star.deciding;
  Timer? _linger;
  bool _gliding = false;
  double _room = 0;

  @override
  void initState() {
    super.initState();
    if (widget.always) {
      _star = _Star.speaking;
      WidgetsBinding.instance.addPostFrameCallback((_) => _measure());
      return;
    }
    // Only a settled answer: just after "Don't show me again" it is being
    // read again, and the old one is still there.
    final answer = ref.read(tailorIntroShowProvider);
    final known = answer.isLoading ? null : answer.value;
    if (known != null) {
      _star = known ? _Star.speaking : _Star.resting;
      if (known) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _measure());
      }
    } else {
      _decide();
    }
  }

  Future<void> _decide() async {
    final show = await ref.read(tailorIntroShowProvider.future);
    if (!mounted) return;
    setState(() => _star = show ? _Star.speaking : _Star.resting);
    if (show) WidgetsBinding.instance.addPostFrameCallback((_) => _measure());
  }

  /// Room at the top for the star and its words, so nothing starts under
  /// them.
  void _measure() {
    final box = _bubbleKey.currentContext?.findRenderObject() as RenderBox?;
    if (box != null && box.hasSize && mounted) {
      setState(() => _room = box.size.height + 12);
    }
  }

  void _typed() {
    _linger?.cancel();
    _linger = Timer(TailorStarFrame.linger, () {
      if (mounted && _star == _Star.speaking) _glideDown();
    });
  }

  @override
  void dispose() {
    _linger?.cancel();
    super.dispose();
  }

  Future<void> _glideDown() async {
    _linger?.cancel();
    final layer = StarLayer.maybeOf(context);
    final from = layer?.rectOfKey(_topKey);
    setState(() {
      _star = _Star.resting;
      _gliding = true;
      _room = 0;
    });
    await WidgetsBinding.instance.endOfFrame;
    if (layer != null && from != null && mounted) {
      await layer.fly(
        owner: this,
        from: from,
        to: () => layer.rectOfKey(_footKey),
      );
    }
    if (mounted) setState(() => _gliding = false);
  }

  void _swiped() => setState(() {
    _star = _Star.resting;
    _room = 0;
  });

  Future<void> _neverAgain() async {
    final prefs = ref.read(tailorIntroPrefsProvider);
    final container = ProviderScope.containerOf(context, listen: false);
    final glide = _glideDown();
    await prefs.turnOff();
    container.invalidate(tailorIntroShowProvider);
    await glide;
  }

  @override
  Widget build(BuildContext context) {
    final still = reduceMotion(context);
    return Stack(
      fit: StackFit.expand,
      children: [
        // The room at the top closes smoothly as the star moves on.
        TweenAnimationBuilder<double>(
          tween: Tween(end: _room),
          duration: still ? Duration.zero : const Duration(milliseconds: 420),
          curve: Curves.easeInOutCubic,
          builder: (context, top, _) => widget.builder(context, top),
        ),
        if (_star == _Star.speaking)
          Positioned(
            left: 12 + SpLayout.of(context).centredInset(SpLayout.readingWidth),
            right:
                12 + SpLayout.of(context).centredInset(SpLayout.readingWidth),
            top: 4,
            child: Dismissible(
              key: const ValueKey('tailor-star'),
              onDismissed: (_) => _swiped(),
              child: _Speaking(
                key: _bubbleKey,
                words: tailorStarIntro,
                onNeverAgain: widget.always ? null : _neverAgain,
                starKey: _topKey,
                onTyped: _typed,
              ),
            ),
          ),
        if (_star == _Star.resting &&
            MediaQuery.viewInsetsOf(context).bottom == 0)
          Positioned(
            left: 0,
            right: 0,
            bottom: FloatingHomeStar.bottomOffset(context),
            child: Center(
              child: StarAnchor(
                size: 64,
                tapTarget: 72,
                pageStar: true,
                starKey: _footKey,
                visible: !_gliding,
              ),
            ),
          ),
      ],
    );
  }
}

/// The star at the top, and what it says beside it on frosted glass.
class _Speaking extends StatelessWidget {
  const _Speaking({
    super.key,
    required this.starKey,
    required this.words,
    required this.onTyped,
    required this.onNeverAgain,
  });

  final GlobalKey starKey;
  final String words;
  final VoidCallback onTyped;

  /// Null: no "Don't show me again".
  final VoidCallback? onNeverAgain;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // The page's one resting star while it speaks: the flight that
        // opens the page lands here.
        StarAnchor(size: 40, tapTarget: 52, pageStar: true, starKey: starKey),
        const SizedBox(width: 6),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 13, 10, 4),
                decoration: BoxDecoration(
                  color: SpColors.surface.withValues(alpha: 0.72),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0x26FFFFFF)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TypedOnce(
                      words,
                      key: const ValueKey('tailor-star-words'),
                      style: const TextStyle(
                        fontSize: 15,
                        height: 1.45,
                        color: SpColors.text,
                      ),
                      onDone: onTyped,
                    ),
                    if (onNeverAgain == null)
                      const SizedBox(height: 10)
                    else
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          key: const ValueKey('tailor-star-never'),
                          onPressed: onNeverAgain,
                          style: TextButton.styleFrom(
                            foregroundColor: SpColors.textMuted,
                            textStyle: const TextStyle(fontSize: 13),
                            visualDensity: VisualDensity.compact,
                          ),
                          child: const Text('Don’t show me again'),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

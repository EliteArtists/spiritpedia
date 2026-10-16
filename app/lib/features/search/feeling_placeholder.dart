import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/colors.dart';
import '../star/slipstream.dart';

/// The question the search box asks once someone has tapped into it — and
/// always, with Reduce Motion.
const feelingQuestion = 'How are you feeling today?';

/// The website's typewriter phrases, in its order
/// (web/components/EmotionSearch.js → PHRASES). Change both together.
const feelingPhrases = [
  'I feel lost',
  'I feel grateful',
  'I feel anxious',
  'I feel excited',
  'I feel heartbroken',
  'I feel on top of the world',
  'I feel stuck',
  'I feel curious',
  'I feel overwhelmed',
  'I feel peaceful',
];

// The website's timing, in milliseconds (EmotionSearch.js).
const _typeMs = 80; // per character while typing
const _deleteMs = 40; // per character while deleting
const _holdTypedMs = 2000; // once a phrase is fully typed
const _holdEmptyMs = 400; // once it is fully deleted
const _initialDelayMs = 1000; // before the first phrase
const _blinkMs = 500;

/// What the typewriter shows [elapsed] after it started: the text so far, and
/// whether the cursor is lit. Pure, so it can be tested; the website's
/// type → hold → delete → pause cycle, worked out from the clock.
({String text, bool cursor}) typewriterAt(Duration elapsed) {
  var t = elapsed.inMilliseconds - _initialDelayMs;
  if (t < 0) return (text: '', cursor: false);
  final cycle = [
    for (final p in feelingPhrases)
      p.length * _typeMs + _holdTypedMs + p.length * _deleteMs + _holdEmptyMs,
  ];
  t %= cycle.fold(0, (a, b) => a + b);
  var i = 0;
  while (t >= cycle[i]) {
    t -= cycle[i];
    i++;
  }
  final phrase = feelingPhrases[i];
  final typing = phrase.length * _typeMs;
  // The cursor blinks while typing and holding; it is hidden while deleting.
  final blink = (elapsed.inMilliseconds ~/ _blinkMs).isEven;
  if (t < typing) {
    return (text: phrase.substring(0, t ~/ _typeMs), cursor: blink);
  }
  t -= typing;
  if (t < _holdTypedMs) return (text: phrase, cursor: blink);
  t -= _holdTypedMs;
  final deleting = phrase.length * _deleteMs;
  if (t < deleting) {
    return (
      text: phrase.substring(0, phrase.length - t ~/ _deleteMs),
      cursor: false,
    );
  }
  return (text: '', cursor: false);
}

/// Whether the typewriter runs. Widget tests switch it off: it never stops,
/// so a screen with it would never settle.
final typewriterRunsProvider = Provider<bool>((ref) => true);

/// The search box's placeholder: example feelings typed out and deleted, as
/// on the website, in the muted placeholder grey with a violet cursor. With
/// Reduce Motion it is simply the question. Pauses with its tab (TickerMode).
class FeelingTypewriter extends ConsumerStatefulWidget {
  const FeelingTypewriter({super.key, this.style});

  final TextStyle? style;

  @override
  ConsumerState<FeelingTypewriter> createState() => _FeelingTypewriterState();
}

class _FeelingTypewriterState extends ConsumerState<FeelingTypewriter>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker = createTicker(_tick);
  ({String text, bool cursor}) _shown = (text: '', cursor: false);

  void _tick(Duration elapsed) {
    final next = typewriterAt(elapsed);
    if (next != _shown) setState(() => _shown = next);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final still = reduceMotion(context) || !ref.read(typewriterRunsProvider);
    if (still && _ticker.isActive) _ticker.stop();
    if (!still && !_ticker.isActive) _ticker.start();
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final style =
        widget.style ??
        const TextStyle(fontSize: 16, color: SpColors.textMuted);
    if (reduceMotion(context) || !ref.watch(typewriterRunsProvider)) {
      return Text(
        feelingQuestion,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: style,
      );
    }
    // Screen readers hear the question, not letters coming and going.
    return Semantics(
      label: feelingQuestion,
      excludeSemantics: true,
      child: _typed(style),
    );
  }

  Widget _typed(TextStyle style) {
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(text: _shown.text),
          // Always laid out, only lit when on, so the text never shifts.
          TextSpan(
            text: '|',
            style: TextStyle(
              color: _shown.cursor ? SpColors.link : Colors.transparent,
            ),
          ),
        ],
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: style,
    );
  }
}

/// [text] typed out once, as the search box types its feelings (the same
/// speed, the same violet cursor), and then kept: for the star speaking.
/// With Reduce Motion — or with the typewriter off, in widget tests — it is
/// all there at once. [onDone] is called once it is all shown.
class TypedOnce extends ConsumerStatefulWidget {
  const TypedOnce(this.text, {super.key, this.style, this.onDone});

  final String text;
  final TextStyle? style;
  final VoidCallback? onDone;

  @override
  ConsumerState<TypedOnce> createState() => _TypedOnceState();
}

class _TypedOnceState extends ConsumerState<TypedOnce>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker = createTicker(_tick);
  int _shown = 0;
  bool _cursor = true;
  bool _started = false;
  bool _done = false;

  void _tick(Duration elapsed) {
    final shown = (elapsed.inMilliseconds ~/ _typeMs).clamp(
      0,
      widget.text.length,
    );
    final cursor = (elapsed.inMilliseconds ~/ _blinkMs).isEven;
    if (shown != _shown || cursor != _cursor) {
      setState(() {
        _shown = shown;
        _cursor = cursor;
      });
    }
    if (shown == widget.text.length) _finish();
  }

  void _finish() {
    if (_done) return;
    _done = true;
    _ticker.stop();
    // After this frame: the caller may rebuild around the finished text.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) widget.onDone?.call();
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (reduceMotion(context) || !ref.read(typewriterRunsProvider)) {
      _shown = widget.text.length;
      _finish();
    } else {
      _ticker.start();
    }
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final style =
        widget.style ?? const TextStyle(fontSize: 16, color: SpColors.text);
    return Semantics(
      label: widget.text,
      excludeSemantics: true,
      // The whole text is always laid out, the rest invisible, so the
      // bubble is its final size from the start and nothing shifts.
      child: Text.rich(
        TextSpan(
          children: [
            TextSpan(text: widget.text.substring(0, _shown)),
            if (!_done)
              TextSpan(
                text: '|',
                style: TextStyle(
                  color: _cursor ? SpColors.link : Colors.transparent,
                ),
              ),
            TextSpan(
              text: widget.text.substring(_shown),
              style: const TextStyle(color: Colors.transparent),
            ),
          ],
        ),
        style: style,
      ),
    );
  }
}

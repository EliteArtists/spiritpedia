import 'dart:math' as math;

import 'package:flutter/widgets.dart';

/// How wide the app's window is — never which device it is on. An iPad in
/// a narrow Split View window gets the phone layout, which is made for it.
///
/// Compact is the phone layout, exactly as it was before the iPad (Phase B):
/// every iPhone is under 440 points wide, so every iPhone is compact, and
/// everything below changes nothing there.
enum WidthClass { compact, regular, wide }

class SpLayout {
  const SpLayout._(this.width, this.size);

  factory SpLayout.of(BuildContext context) =>
      SpLayout.forWidth(MediaQuery.sizeOf(context).width);

  factory SpLayout.forWidth(double width) => SpLayout._(width, classify(width));

  /// Below 600: compact (every phone, and narrow iPad windows). 600–1000:
  /// regular (iPad portrait, wide Split View). From 1000: wide (iPad
  /// landscape on the larger iPads).
  static WidthClass classify(double width) => width < 600
      ? WidthClass.compact
      : width < 1000
      ? WidthClass.regular
      : WidthClass.wide;

  final double width;
  final WidthClass size;

  bool get isCompact => size == WidthClass.compact;

  /// Cards and shelf heights.
  double get cardScale => switch (size) {
    WidthClass.compact => 1,
    WidthClass.regular => 1.2,
    WidthClass.wide => 1.3,
  };

  /// Text, on top of the person's own text size. Shelves grow by more
  /// ([cardScale]), so nothing in a card is cut off.
  double get textScale => isCompact ? 1 : 1.1;

  /// The margin at the sides of the page.
  double get gutter => switch (size) {
    WidthClass.compact => 20,
    WidthClass.regular => 32,
    WidthClass.wide => 48,
  };

  /// [compact] on a phone; [gutter] otherwise. For the places whose phone
  /// margin is not 20.
  double side(double compact) => isCompact ? compact : gutter;

  /// Text to read: a comfortable line, never edge to edge.
  static const readingWidth = 720.0;

  /// Forms and their buttons.
  static const formWidth = 560.0;

  /// The star's trays.
  static const trayWidth = 520.0;

  /// The video player.
  static const videoWidth = 900.0;

  /// The search row (the star's search box and the menu).
  static const searchRowWidth = 760.0;

  /// What to add at each side to keep [maxWidth] centred — nothing on a
  /// phone.
  double centredInset(double maxWidth) =>
      isCompact ? 0 : math.max(0, (width - maxWidth) / 2);
}

/// [child] at most [maxWidth] wide: centred, or (with [centre] false) at the
/// start, in line with the shelves. A phone gets [child] untouched.
class Readable extends StatelessWidget {
  const Readable({
    super.key,
    required this.child,
    this.maxWidth = SpLayout.readingWidth,
    this.centre = true,
  });

  final Widget child;
  final double maxWidth;
  final bool centre;

  @override
  Widget build(BuildContext context) {
    if (SpLayout.of(context).isCompact) return child;
    return Align(
      alignment: centre ? Alignment.topCenter : Alignment.topLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: child,
      ),
    );
  }
}

/// A scrolling page whose whole column is centred at [maxWidth] on an
/// iPad; the scroll still answers anywhere on the screen. A phone gets the
/// [padding] it always had.
EdgeInsets readingPadding(
  BuildContext context, [
  EdgeInsets padding = EdgeInsets.zero,
  double maxWidth = SpLayout.readingWidth,
]) {
  final inset = SpLayout.of(context).centredInset(maxWidth);
  return padding + EdgeInsets.symmetric(horizontal: inset);
}

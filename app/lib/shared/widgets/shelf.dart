import 'package:flutter/material.dart';

import '../../theme/colors.dart';

/// A titled, horizontally scrolling row — the website's ContentShelf.
///
/// Items are built lazily, so a shelf of hundreds of books only builds (and
/// downloads images for) the few on screen.
class Shelf extends StatelessWidget {
  const Shelf({
    super.key,
    required this.title,
    required this.itemCount,
    required this.itemBuilder,
    required this.itemWidth,
    required this.height,
    this.subtitle,
    this.badge,
    this.onSeeAll,
    this.onTitleTap,
  });

  final String title;
  final String? subtitle;
  final Widget? badge;
  final int itemCount;
  final IndexedWidgetBuilder itemBuilder;
  final double itemWidth;
  final double height;
  final VoidCallback? onSeeAll;
  final VoidCallback? onTitleTap;

  @override
  Widget build(BuildContext context) {
    // Like the website: an empty shelf is hidden, never shown as a gap.
    if (itemCount == 0) return const SizedBox.shrink();
    final titleText = Text(
      title,
      style: const TextStyle(
        fontSize: 21,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.2,
      ),
    );
    return Padding(
      padding: const EdgeInsets.only(bottom: 34),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (badge != null)
                        Padding(
                          // A tappable badge brings its own room around it.
                          padding: EdgeInsets.only(
                            bottom:
                                badge is ShelfBadge &&
                                    (badge as ShelfBadge).onTap != null
                                ? 0
                                : 8,
                          ),
                          child: badge,
                        ),
                      if (subtitle != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text(
                            subtitle!.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 1.0,
                              color: SpColors.textFaint,
                            ),
                          ),
                        ),
                      onTitleTap == null
                          ? titleText
                          : GestureDetector(
                              onTap: onTitleTap,
                              child: titleText,
                            ),
                    ],
                  ),
                ),
                if (onSeeAll != null)
                  TextButton(
                    onPressed: onSeeAll,
                    style: TextButton.styleFrom(foregroundColor: SpColors.link),
                    child: const Text(
                      'See all',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: height,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: itemCount,
              separatorBuilder: (_, _) => const SizedBox(width: 14),
              itemBuilder: (context, i) =>
                  SizedBox(width: itemWidth, child: itemBuilder(context, i)),
            ),
          ),
        ],
      ),
    );
  }
}

/// The small coloured label above a tier shelf ("SUPERHERO", "LUMINARY"…),
/// drawn as the website draws the shelf badges.
class ShelfBadge extends StatelessWidget {
  const ShelfBadge({
    super.key,
    required this.label,
    required this.background,
    required this.foreground,
    this.onTap,
    this.semanticLabel,
  });

  final String label;
  final Color background;
  final Color foreground;

  /// Tappable badges (the tier shelves on Discover) explain themselves.
  final VoidCallback? onTap;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final pill = _pill();
    if (onTap == null) return pill;
    // A finger-sized target around a small pill: the extra room is above,
    // below and to the right, so the pill itself does not move sideways.
    return Semantics(
      button: true,
      label: semanticLabel ?? label,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(0, 10, 18, 10),
          child: pill,
        ),
      ),
    );
  }

  Widget _pill() {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 4),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.6,
            color: foreground,
          ),
        ),
      ),
    );
  }
}

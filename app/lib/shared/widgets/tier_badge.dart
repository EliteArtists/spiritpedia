import 'package:flutter/material.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/badges.dart';
import '../../data/models.dart';
import '../../features/star/tier_tips.dart';
import '../../theme/colors.dart';

/// The four healer tiers, as stored in `healers.tier`.
enum Tier {
  superhero('superhero', 'Superhero'),
  luminary('luminary', 'Luminary'),
  localHero('local_hero', 'Local Hero'),
  ascendedMaster('ascended_master', 'Ascended Master');

  const Tier(this.dbValue, this.label);

  final String dbValue;
  final String label;

  /// null for NULL or any value the app does not know yet.
  static Tier? fromDb(String? value) {
    for (final tier in Tier.values) {
      if (tier.dbValue == value) return tier;
    }
    return null;
  }
}

/// A healer's tier badge, drawn the way the website draws it.
///
/// An unknown or missing tier gets a neutral grey "Teacher" badge — the
/// website's rule — so a tier added to the database before the app knows it is
/// visibly unstyled rather than silently mislabelled.
class TierBadge extends StatelessWidget {
  const TierBadge({super.key, required this.tier, this.label});

  /// The raw `healers.tier` value.
  final String? tier;

  /// The tier's name for this kind of listing (data/badges.dart → tierName):
  /// a channel's superhero is a Superstar, in the same gold.
  final String? label;

  @override
  Widget build(BuildContext context) {
    final style = _styleFor(Tier.fromDb(tier));
    final label = this.label ?? style.label;
    return Semantics(
      label: 'Tier: $label',
      excludeSemantics: true,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: style.background,
          borderRadius: BorderRadius.circular(style.pill ? 999 : 6),
          border: style.border == null
              ? null
              : Border.all(color: style.border!),
        ),
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: style.pill ? 10 : 9,
            vertical: 3,
          ),
          child: Text(
            label.toUpperCase(),
            style: TextStyle(
              fontFamily: 'Geist',
              fontSize: style.fontSize,
              fontWeight: FontWeight.w700,
              letterSpacing: style.fontSize * 0.05, // Tailwind tracking-wider
              color: style.text,
              height: 1.4,
            ),
          ),
        ),
      ),
    );
  }

  static _BadgeStyle _styleFor(Tier? tier) => switch (tier) {
    Tier.superhero => const _BadgeStyle(
      label: 'Superhero',
      background: SpTierColors.superheroBackground,
      text: SpTierColors.superheroText,
      border: SpTierColors.superheroBorder,
      pill: true,
      fontSize: 10,
    ),
    Tier.luminary => const _BadgeStyle(
      label: 'Luminary',
      background: SpTierColors.luminaryBackground,
      text: Colors.white,
      fontSize: 11,
    ),
    Tier.localHero => const _BadgeStyle(
      label: 'Local Hero',
      background: SpTierColors.localHeroBackground,
      text: Colors.white,
      fontSize: 10,
    ),
    Tier.ascendedMaster => const _BadgeStyle(
      label: 'Ascended Master',
      background: SpTierColors.ascendedBackground,
      text: SpTierColors.ascendedText,
      fontSize: 10,
    ),
    null => const _BadgeStyle(
      label: 'Teacher',
      background: SpTierColors.unknownBackground,
      text: Colors.white,
      fontSize: 10,
    ),
  };
}

/// A listing's badges (data/badges.dart): its tier — named for people or for
/// platforms — then, for a channel, app or organisation, its type; then
/// ✓ Verified. Spiritpedia's own wears ✦ OFFICIAL alone. Each one is a
/// button: the star explains it, and the card underneath does not open.
class ListingBadgeRow extends ConsumerWidget {
  const ListingBadgeRow({
    super.key,
    required this.name,
    required this.tier,
    this.entityType,
    this.verified = false,
    this.official = false,
    this.alignment = WrapAlignment.start,
  });

  ListingBadgeRow.healer(
    Healer h, {
    Key? key,
    WrapAlignment alignment = WrapAlignment.start,
  }) : this(
         key: key,
         name: h.name,
         tier: h.tier,
         entityType: h.entityType,
         verified: h.verified,
         official: h.official,
         alignment: alignment,
       );

  ListingBadgeRow.publisher(Publisher p, {Key? key})
    : this(
        key: key,
        name: p.name,
        tier: p.tier,
        entityType: publisherType,
        verified: p.verified,
      );

  final String name;
  final String? tier;
  final String? entityType;
  final bool verified;
  final bool official;
  final WrapAlignment alignment;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final badges = listingBadges(
      name: name,
      tier: tier,
      entityType: entityType,
      verified: verified,
      official: official,
    );
    if (badges.isEmpty) return const SizedBox.shrink();
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      alignment: alignment,
      children: [
        for (final badge in badges)
          _TappableBadge(
            badge: badge,
            onTap: switch (TierTip.forBadge(badge)) {
              final tip? => () => ref.read(tierTipProvider.notifier).show(tip),
              null => null,
            },
          ),
      ],
    );
  }
}

class _TappableBadge extends StatelessWidget {
  const _TappableBadge({required this.badge, this.onTap});

  final ListingBadge badge;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final drawn = switch (badge.kind) {
      BadgeKind.tier => TierBadge(tier: badge.tier, label: badge.label),
      BadgeKind.type => _Pill.type(label: badge.label),
      BadgeKind.verified => const _Pill.verified(),
      BadgeKind.official => const _Pill.official(),
    };
    if (onTap == null) return drawn;
    return Semantics(
      button: true,
      label: '${badge.label.replaceAll(RegExp('[✦✓] '), '')}: what this means',
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        // A finger-sized target around a small pill.
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: drawn,
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill.type({this.label = ''})
    : background = SpColors.surfaceRaised,
      text = SpColors.text,
      border = const Color(0x33FFFFFF);
  const _Pill.verified()
    : label = '✓ Verified',
      background = const Color(0xFF0EA5E9),
      text = Colors.white,
      border = null;
  const _Pill.official()
    : label = '✦ Official',
      background = Colors.white,
      text = const Color(0xFF4C1D95),
      border = null;

  final String label;
  final Color background;
  final Color text;
  final Color? border;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label.replaceAll(RegExp('[✦✓] '), ''),
      excludeSemantics: true,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(999),
          border: border == null ? null : Border.all(color: border!),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
          child: Text(
            label.toUpperCase(),
            style: TextStyle(
              fontFamily: 'Geist',
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
              color: text,
              height: 1.4,
            ),
          ),
        ),
      ),
    );
  }
}

class _BadgeStyle {
  const _BadgeStyle({
    required this.label,
    required this.background,
    required this.text,
    required this.fontSize,
    this.border,
    this.pill = false,
  });

  final String label;
  final Color background;
  final Color text;
  final Color? border;
  final bool pill;
  final double fontSize;
}

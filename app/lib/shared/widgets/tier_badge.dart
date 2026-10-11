import 'package:flutter/material.dart';

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
  const TierBadge({super.key, required this.tier});

  /// The raw `healers.tier` value.
  final String? tier;

  @override
  Widget build(BuildContext context) {
    final style = _styleFor(Tier.fromDb(tier));
    return Semantics(
      label: 'Tier: ${style.label}',
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
            style.label.toUpperCase(),
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

/// A healer's badge: the tier for a teacher; for a channel or an app, what
/// it is — never a teacher's tier, which describes a person.
class HealerBadge extends StatelessWidget {
  const HealerBadge({super.key, required this.tier, this.entityType});

  final String? tier;
  final String? entityType;

  @override
  Widget build(BuildContext context) {
    final platform = switch (entityType) {
      'channel' => 'Channel',
      'app' => 'App',
      _ => null,
    };
    if (platform == null) return TierBadge(tier: tier);
    return Semantics(
      label: platform,
      excludeSemantics: true,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: SpColors.surfaceRaised,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: const Color(0x33FFFFFF)),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
          child: Text(
            platform.toUpperCase(),
            style: const TextStyle(
              fontFamily: 'Geist',
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
              color: SpColors.text,
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

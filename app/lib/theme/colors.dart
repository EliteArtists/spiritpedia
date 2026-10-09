import 'package:flutter/painting.dart';

/// The website's palette, so the app and spiritpedia.co look like one product.
///
/// Every value here is taken from web/ — the Tailwind classes the site uses,
/// resolved to hex. If the website's look changes, change it here too.
abstract final class SpColors {
  // Surfaces — the site is dark-only.
  static const background = Color(0xFF0A0F1D); // every page's #0a0f1d
  static const surface = Color(0xFF111827); // cards, inputs (#111827)
  static const surfaceRaised = Color(0xFF1A2234); // hover / pressed card
  static const border = Color(0x1AFFFFFF); // border-white/10

  // Text.
  static const text = Color(0xFFEDEDED); // --foreground
  static const textMuted = Color(0xFF9CA3AF); // text-gray-400
  static const textFaint = Color(0xFF6B7280); // text-gray-500

  // Accent — the site's violet buttons and links.
  static const primary = Color(0xFF7C3AED); // bg-[#7c3aed]
  static const primaryPressed = Color(0xFF6D28D9); // hover:bg-[#6d28d9]
  static const link = Color(0xFFA78BFA); // text-[#a78bfa]

  // The gold of the star.
  static const gold = Color(0xFFF5B301);
}

/// Tier badge colours, exactly as the website's HealerCard and claim page draw
/// them (web/components/HealerCard.js, web/app/auth/claim/page.js).
abstract final class SpTierColors {
  // Superhero — amber pill with a border.
  static const superheroBackground = Color(0xFFFEF3C7); // amber-100
  static const superheroText = Color(0xFFD97706); // amber-600
  static const superheroBorder = Color(0xFFFCD34D); // amber-300

  // Luminary — solid violet.
  static const luminaryBackground = Color(0xFF7C3AED); // violet-600

  // Local Hero — solid emerald.
  static const localHeroBackground = Color(0xFF10B981); // emerald-500

  // Ascended Master — pale gold with deep brown text.
  static const ascendedBackground = Color(0xFFFEF08A); // #fef08a
  static const ascendedText = Color(0xFF78350F); // #78350f

  // Unknown or missing tier — neutral grey "Teacher", so bad data is visible
  // rather than borrowing another tier's badge.
  static const unknownBackground = Color(0xFF6B7280); // gray-500
}

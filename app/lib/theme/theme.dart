import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'colors.dart';

/// The one theme. Dark-only, like the website: there is no light variant.
ThemeData buildSpiritpediaTheme() {
  const scheme = ColorScheme.dark(
    surface: SpColors.background,
    onSurface: SpColors.text,
    surfaceContainer: SpColors.surface,
    surfaceContainerHigh: SpColors.surfaceRaised,
    primary: SpColors.primary,
    onPrimary: Colors.white,
    secondary: SpColors.link,
    onSecondary: Colors.white,
    outline: SpColors.border,
    outlineVariant: SpColors.border,
  );

  final base = ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    brightness: Brightness.dark,
    fontFamily: 'Geist',
    scaffoldBackgroundColor: SpColors.background,
    splashFactory: InkSparkle.splashFactory,
  );

  return base.copyWith(
    textTheme: base.textTheme.apply(
      bodyColor: SpColors.text,
      displayColor: SpColors.text,
      fontFamily: 'Geist',
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: SpColors.background,
      foregroundColor: SpColors.text,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      // Light status-bar icons on the dark background.
      systemOverlayStyle: SystemUiOverlayStyle.light,
    ),
    cardTheme: const CardThemeData(
      color: SpColors.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(16)),
        side: BorderSide(color: SpColors.border),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: SpColors.background,
      indicatorColor: SpColors.primary.withValues(alpha: 0.22),
      surfaceTintColor: Colors.transparent,
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontFamily: 'Geist',
          fontSize: 12,
          fontWeight: states.contains(WidgetState.selected) ? FontWeight.w600 : FontWeight.w500,
          color: states.contains(WidgetState.selected) ? SpColors.text : SpColors.textMuted,
        ),
      ),
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(
          color: states.contains(WidgetState.selected) ? SpColors.link : SpColors.textMuted,
        ),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: SpColors.primary,
        foregroundColor: Colors.white,
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontFamily: 'Geist', fontWeight: FontWeight.w600),
      ),
    ),
    dividerTheme: const DividerThemeData(color: SpColors.border, space: 1),
  );
}

import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../theme/colors.dart';
import '../star/star_layer.dart';
import 'tab_bar_state.dart';

/// The tabs: Home (reached by the star — it has no button), then Videos, Books
/// and Search in the floating pill. Each keeps its own navigation history
/// (go_router's StatefulShellRoute), so switching tabs never loses your place.
class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _home = 0;

  void _go(int index) => navigationShell.goBranch(
    index,
    // Tapping the tab you are already on returns it to its first screen.
    initialLocation: index == navigationShell.currentIndex,
  );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final typing = MediaQuery.viewInsetsOf(context).bottom > 0;
    // Out of the way while a subject tray is open, back when it closes.
    final covered = ref.watch(tabBarCoverProvider) > 0;
    return PopScope(
      // Android's back button: from another tab, back goes home first.
      canPop: navigationShell.currentIndex == _home,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _go(_home);
      },
      child: Scaffold(
        body: Stack(
          children: [
            navigationShell,
            if (!typing)
              Positioned(
                left: 0,
                right: 0,
                bottom: FloatingHomeStar.bottomOffset(context),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  // Large accessibility text shrinks the pill rather than
                  // overflowing a narrow phone.
                  child: Center(
                    child: IgnorePointer(
                      ignoring: covered,
                      child: ExcludeSemantics(
                        excluding: covered,
                        child: AnimatedSlide(
                          offset: covered ? const Offset(0, 1.6) : Offset.zero,
                          duration: const Duration(milliseconds: 220),
                          curve: Curves.easeOutCubic,
                          child: AnimatedOpacity(
                            opacity: covered ? 0 : 1,
                            duration: const Duration(milliseconds: 180),
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: PillTabBar(
                                current: navigationShell.currentIndex,
                                onSelect: _go,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Videos · Books · Search, in a floating pill. On Home none is selected.
class PillTabBar extends StatelessWidget {
  const PillTabBar({super.key, required this.current, required this.onSelect});

  /// The shell's branch index (0 = Home, 1 = Videos, 2 = Books, 3 = Search).
  final int current;
  final ValueChanged<int> onSelect;

  static const _tabs = [
    (1, 'Videos', Icons.play_circle_outline, Icons.play_circle),
    (2, 'Books', Icons.menu_book_outlined, Icons.menu_book),
    (3, 'Search', Icons.search, Icons.search),
  ];

  @override
  Widget build(BuildContext context) {
    // The shadow sits outside the clip, so the bar lifts off the page.
    return DecoratedBox(
      decoration: const BoxDecoration(
        borderRadius: BorderRadius.all(Radius.circular(999)),
        boxShadow: [
          BoxShadow(
            color: Color(0x8C000000),
            blurRadius: 24,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(999),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: DecoratedBox(
            decoration: BoxDecoration(
              // Dark frosted glass: see-through charcoal over the blur,
              // with a thin light edge.
              color: const Color(0xA61C1F26),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: const Color(0x38FFFFFF), width: 0.8),
            ),
            child: Padding(
              padding: const EdgeInsets.all(5),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (final (index, label, icon, selectedIcon) in _tabs)
                    _PillTab(
                      label: label,
                      icon: current == index ? selectedIcon : icon,
                      selected: current == index,
                      onTap: () => onSelect(index),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PillTab extends StatelessWidget {
  const _PillTab({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    // The chosen tab in the star's gold.
    final colour = selected ? SpColors.gold : const Color(0xD9FFFFFF);
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: selected ? const Color(0x24F5B301) : Colors.transparent,
        shape: StadiumBorder(
          side: selected
              ? const BorderSide(color: Color(0x66F5B301), width: 0.8)
              : BorderSide.none,
        ),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: onTap,
          child: AnimatedSize(
            duration: const Duration(milliseconds: 180),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 21, color: colour),
                  const SizedBox(width: 7),
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: colour,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

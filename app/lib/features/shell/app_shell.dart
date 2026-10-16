import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/providers.dart';
import '../../theme/colors.dart';
import '../star/star_layer.dart';
import 'tab_bar_state.dart';

/// The tabs — Discover (where the app opens), Videos and Books — in the
/// floating pill. Each keeps its own navigation history (go_router's
/// StatefulShellRoute), so switching tabs never loses your place.
class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _discover = 0;

  void _go(BuildContext context, WidgetRef ref, int index) {
    // Landing on Discover's View All turns For You to its next content type.
    if (index == _discover &&
        navigationShell.currentIndex != _discover &&
        ref.read(subjectFilterProvider) == null) {
      ref.read(forYouTurnProvider.notifier).landed();
    }
    void go() => navigationShell.goBranch(
      index,
      // Tapping the tab you are already on returns it to its first screen.
      initialLocation: index == navigationShell.currentIndex,
    );
    final layer = StarLayer.maybeOf(context);
    if (layer == null) return go();
    // The star flies if it rests somewhere else on the new tab.
    layer.followTabs(
      tabPaths[navigationShell.currentIndex],
      tabPaths[index],
      go,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final typing = MediaQuery.viewInsetsOf(context).bottom > 0;
    // Which tab is showing, for star flights between pages.
    StarLayer.maybeOf(context)?.currentTab =
        tabPaths[navigationShell.currentIndex];
    // Out of the way while a subject tray is open, back when it closes.
    final covered = ref.watch(tabBarCoverProvider) > 0;
    return PopScope(
      // Android's back button: from another tab, back goes to Discover first.
      canPop: navigationShell.currentIndex == _discover,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _go(context, ref, _discover);
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
                                onSelect: (i) => _go(context, ref, i),
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

/// Discover · Videos · Books, in a floating pill of dark frosted glass; the
/// chosen tab in the site's violet.
class PillTabBar extends StatelessWidget {
  const PillTabBar({super.key, required this.current, required this.onSelect});

  /// The shell's branch index (0 = Discover, 1 = Videos, 2 = Books).
  final int current;
  final ValueChanged<int> onSelect;

  static const _tabs = [
    (0, 'Discover', Icons.explore_outlined, Icons.explore),
    (1, 'Videos', Icons.play_circle_outline, Icons.play_circle),
    (2, 'Books', Icons.menu_book_outlined, Icons.menu_book),
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
    final colour = selected ? Colors.white : const Color(0xD9FFFFFF);
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: selected ? SpColors.primary : Colors.transparent,
        shape: const StadiumBorder(),
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

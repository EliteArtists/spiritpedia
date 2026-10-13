import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config.dart';
import '../../core/links/open_link.dart';
import '../../core/links/share.dart';
import '../../theme/colors.dart';
import '../account/account_providers.dart';
import '../library/saved_items.dart';

const _supportEmail = 'love@spiritpedia.co';

/// The menu button at the end of the search row on Discover, Videos and
/// Books. It scrolls away with the search bar; only the star docks.
class MenuButton extends StatelessWidget {
  const MenuButton({super.key});

  @override
  Widget build(BuildContext context) => IconButton(
    key: const ValueKey('menu-button'),
    tooltip: 'Menu',
    onPressed: () => showAppMenu(context),
    icon: const Icon(Icons.menu_rounded, size: 28),
  );
}

/// How many things are saved in My Library ("Mark as Read" is a shelf of its
/// own, not a save).
int savedCount(Map<SavedKind, List<String>> saved) => saved.entries
    .where((e) => e.key != SavedKind.readBooks)
    .fold(0, (sum, e) => sum + e.value.length);

/// The right-side drawer, over everything — the tab bar included — in the
/// tab bar's frosted glass. A tap outside it, a swipe to the right or the
/// close button puts it away.
Future<void> showAppMenu(BuildContext context) {
  final reduceMotion = MediaQuery.disableAnimationsOf(context);
  return showGeneralDialog<void>(
    context: context,
    useRootNavigator: true,
    barrierDismissible: true,
    barrierLabel: 'Close menu',
    barrierColor: const Color(0x8C000000),
    transitionDuration: Duration(milliseconds: reduceMotion ? 0 : 260),
    pageBuilder: (_, _, _) => const AppMenu(),
    transitionBuilder: (_, animation, _, child) => SlideTransition(
      position: Tween(
        begin: const Offset(1, 0),
        end: Offset.zero,
      ).animate(CurvedAnimation(parent: animation, curve: Curves.easeOutCubic)),
      child: child,
    ),
  );
}

class AppMenu extends ConsumerWidget {
  const AppMenu({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final account = ref.watch(accountProvider);
    final saved = savedCount(ref.watch(savedItemsProvider));
    final width = (MediaQuery.sizeOf(context).width * 0.84).clamp(0.0, 340.0);
    final router = GoRouter.of(context);

    // Close the drawer, then go: the drawer sits on the root navigator, above
    // every page, so it has to be gone before the next page arrives.
    void go(String path) {
      Navigator.of(context).pop();
      router.push(path);
    }

    void open(String url) {
      openExternal(context, url);
      Navigator.of(context).pop();
    }

    final items = <Widget>[
      if (!account.signedIn)
        _Item(
          key: const ValueKey('menu-sign-in'),
          icon: Icons.login_rounded,
          label: 'Sign in',
          detail: 'Keep your saves on every device',
          strong: true,
          onTap: () => go('/account'),
        ),
      _Item(
        key: const ValueKey('menu-library'),
        icon: Icons.bookmark_border_rounded,
        label: 'My Library',
        count: saved > 0 ? saved : null,
        onTap: () => go('/library'),
      ),
      if (account.signedIn) ...[
        _Item(
          key: const ValueKey('menu-account'),
          icon: Icons.person_outline_rounded,
          label: 'Account',
          detail: account.user!.email,
          onTap: () => go('/account'),
        ),
        _Item(
          key: const ValueKey('menu-notifications'),
          icon: Icons.notifications_none_rounded,
          label: 'Notifications',
          onTap: () => go('/account?show=notifications'),
        ),
      ],
      _Item(
        key: const ValueKey('menu-share'),
        icon: Icons.ios_share_rounded,
        label: 'Share Spiritpedia',
        onTap: () => share(context, ref, '/', 'Spiritpedia'),
      ),
      const _Divider(),
      _Item(
        icon: Icons.description_outlined,
        label: 'Terms of Use',
        quiet: true,
        onTap: () => open('${AppConfig.siteUrl}/terms'),
      ),
      _Item(
        icon: Icons.privacy_tip_outlined,
        label: 'Privacy Policy',
        quiet: true,
        onTap: () => open('${AppConfig.siteUrl}/privacy'),
      ),
      _Item(
        icon: Icons.mail_outline_rounded,
        label: 'Contact',
        detail: _supportEmail,
        quiet: true,
        onTap: () => open('mailto:$_supportEmail'),
      ),
    ];

    return Align(
      alignment: Alignment.centerRight,
      child: GestureDetector(
        // A swipe to the right puts it away, as it came.
        onHorizontalDragEnd: (d) {
          if ((d.primaryVelocity ?? 0) > 250) Navigator.of(context).pop();
        },
        child: SizedBox(
          width: width,
          height: double.infinity,
          child: ClipRRect(
            borderRadius: const BorderRadius.horizontal(
              left: Radius.circular(28),
            ),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
              child: DecoratedBox(
                decoration: const BoxDecoration(
                  // The tab bar's dark frosted glass, a little denser so the
                  // words stay easy to read over a busy page.
                  color: Color(0xD91C1F26),
                  border: Border(
                    left: BorderSide(color: Color(0x38FFFFFF), width: 0.8),
                  ),
                ),
                child: Material(
                  type: MaterialType.transparency,
                  child: SafeArea(
                    left: false,
                    child: Column(
                      key: const ValueKey('app-menu'),
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(22, 8, 8, 12),
                          child: Row(
                            children: [
                              Image.asset(
                                'assets/images/star.png',
                                width: 26,
                                height: 26,
                                errorBuilder: (_, _, _) => const Icon(
                                  Icons.auto_awesome,
                                  color: SpColors.gold,
                                ),
                              ),
                              const SizedBox(width: 10),
                              const Expanded(
                                child: Text(
                                  'Spiritpedia',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              IconButton(
                                tooltip: 'Close menu',
                                onPressed: () => Navigator.of(context).pop(),
                                icon: const Icon(Icons.close_rounded),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: ListView(
                            padding: const EdgeInsets.only(bottom: 24),
                            children: items,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Item extends StatelessWidget {
  const _Item({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.detail,
    this.count,
    this.strong = false,
    this.quiet = false,
  });

  final IconData icon;
  final String label;
  final String? detail;
  final int? count;
  final bool strong;
  final bool quiet;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colour = quiet ? SpColors.textMuted : SpColors.text;
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 22),
      minLeadingWidth: 24,
      leading: Icon(
        icon,
        size: quiet ? 20 : 24,
        color: strong ? SpColors.link : colour,
      ),
      title: Text(
        label,
        style: TextStyle(
          fontSize: quiet ? 15 : 17,
          fontWeight: strong || !quiet ? FontWeight.w600 : FontWeight.w500,
          color: strong ? SpColors.link : colour,
        ),
      ),
      subtitle: detail == null
          ? null
          : Text(
              detail!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: SpColors.textFaint),
            ),
      trailing: count == null
          ? null
          : Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
              decoration: BoxDecoration(
                color: SpColors.primary,
                borderRadius: BorderRadius.circular(99),
              ),
              child: Text(
                '$count',
                semanticsLabel: '$count saved',
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.symmetric(horizontal: 22, vertical: 8),
    child: Divider(height: 1, color: Color(0x1FFFFFFF)),
  );
}

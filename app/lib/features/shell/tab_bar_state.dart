import 'package:flutter_riverpod/flutter_riverpod.dart';

/// How the floating Videos · Books · Search bar is coloured. Two looks while
/// we choose; debug builds can switch between them in Account.
enum TabBarLook {
  /// The site's violet, with the chosen tab in white.
  violet,

  /// Pale and frosted, with the chosen tab in violet.
  light,
}

class TabBarLookSetting extends Notifier<TabBarLook> {
  @override
  TabBarLook build() => TabBarLook.violet;

  void set(TabBarLook look) => state = look;
}

final tabBarLookProvider = NotifierProvider<TabBarLookSetting, TabBarLook>(
  TabBarLookSetting.new,
);

/// How many things are covering the bottom of the screen and want the
/// floating bar out of the way (a subject tray, for now). Counted, so two
/// overlapping never bring it back early.
class TabBarCover extends Notifier<int> {
  @override
  int build() => 0;

  /// Hides the bar until [shown] completes — the tray closing.
  Future<T> whileShowing<T>(Future<T> shown) async {
    state++;
    try {
      return await shown;
    } finally {
      if (ref.mounted) state--;
    }
  }
}

final tabBarCoverProvider = NotifierProvider<TabBarCover, int>(TabBarCover.new);

// The star's tier tips: each once, one at a time, at most one per visit,
// tapped away, and a switch to turn them off.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/features/star/tier_tips.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<ProviderContainer> launch(MemoryTierTipsPrefs prefs) async {
    final c = ProviderContainer(
      overrides: [tierTipsPrefsProvider.overrideWithValue(prefs)],
    );
    addTearDown(c.dispose);
    c.read(tierTipsProvider);
    await Future<void>.delayed(Duration.zero); // the prefs load
    return c;
  }

  test('the first shelf in view gets its tip; one at a time', () async {
    final prefs = MemoryTierTipsPrefs();
    final c = await launch(prefs);
    final tips = c.read(tierTipsProvider.notifier);

    tips.shelfInView(TierTip.superhero);
    expect(c.read(tierTipsProvider).showing, TierTip.superhero);
    tips.shelfInView(TierTip.luminary); // close by, but one is showing
    expect(c.read(tierTipsProvider).showing, TierTip.superhero);

    tips.dismiss();
    expect(c.read(tierTipsProvider).showing, isNull);
    expect(prefs.seenTips, {TierTip.superhero}); // never again

    // The next tier waits for another visit.
    tips.shelfInView(TierTip.luminary);
    expect(c.read(tierTipsProvider).showing, isNull);
  });

  test('next visit: the next tier, never one already seen', () async {
    final prefs = MemoryTierTipsPrefs(seen: {TierTip.superhero});
    final c = await launch(prefs);
    final tips = c.read(tierTipsProvider.notifier);
    tips.shelfInView(TierTip.superhero);
    expect(c.read(tierTipsProvider).showing, isNull);
    tips.shelfInView(TierTip.luminary);
    expect(c.read(tierTipsProvider).showing, TierTip.luminary);
  });

  test('all three seen: no more tips, ever', () async {
    final c = await launch(MemoryTierTipsPrefs(seen: {...TierTip.values}));
    for (final t in TierTip.values) {
      c.read(tierTipsProvider.notifier).shelfInView(t);
    }
    expect(c.read(tierTipsProvider).showing, isNull);
  });

  test('switched off: none; switching off hides one showing', () async {
    final off = await launch(MemoryTierTipsPrefs(on: false));
    off.read(tierTipsProvider.notifier).shelfInView(TierTip.superhero);
    expect(off.read(tierTipsProvider).showing, isNull);

    final prefs = MemoryTierTipsPrefs();
    final c = await launch(prefs);
    final tips = c.read(tierTipsProvider.notifier);
    tips.shelfInView(TierTip.localHero);
    await tips.setEnabled(false);
    expect(c.read(tierTipsProvider).showing, isNull);
    expect(prefs.on, isFalse);
    expect(prefs.seenTips, isEmpty); // hidden, not seen
  });

  test('nothing before the remembered state has loaded', () {
    final c = ProviderContainer(
      overrides: [
        tierTipsPrefsProvider.overrideWithValue(MemoryTierTipsPrefs()),
      ],
    );
    addTearDown(c.dispose);
    c.read(tierTipsProvider.notifier).shelfInView(TierTip.superhero);
    expect(c.read(tierTipsProvider).showing, isNull);
  });

  test('Replay intro makes every tip new again', () async {
    final prefs = MemoryTierTipsPrefs(seen: {...TierTip.values});
    final c = await launch(prefs);
    await c.read(tierTipsProvider.notifier).reset();
    expect(prefs.seenTips, isEmpty);
    c.read(tierTipsProvider.notifier).shelfInView(TierTip.superhero);
    expect(c.read(tierTipsProvider).showing, TierTip.superhero);
  });
}

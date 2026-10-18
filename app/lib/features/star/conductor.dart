import 'dart:async';
import 'dart:math';
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../theme/colors.dart';
import '../account/account_providers.dart';
import '../account/display_name.dart';
import '../area/area.dart';
import '../area/area_sheet.dart';
import '../learning/learning.dart';
import 'slipstream.dart';
import 'star_layer.dart';
import '../../theme/layout.dart';

// ── The conductor ───────────────────────────────────────────────────────────
//
// The star does at most ONE thing a session, and the conductor decides what.
// A session is a cold start, or coming back after 30 minutes or more away.
// In order, the first that applies wins:
//
//   1. the first-launch intro and onboarding (session 1; IntroOverlay)
//   2. (later: in-app messages — the welcome tray)
//   3. "Shall I learn from what you explore?"       — from the 3rd visit,
//      signed in only, while learning is off (migration 0021)
//   4. "Shall I show you practitioners near you?"  — from the 5th visit
//   5. "Would you like to share your name?"         — from the 7th visit
//
// A question asks once; if it is put away ("Not now", or swiped), once
// more, at least 15 visits and 3 weeks later; then never. Answered — the
// area or the name set, however — it never asks again.
//
// It only ever appears on a main tab, after about 3 seconds there with
// nothing open over it (no search, sheet or menu), and never in a session
// in which the search has been opened — so never near the crisis intercept.

/// What the star can ask.
enum StarAsk { learning, area, name }

/// A question's history: how many times it has been asked, and when last.
typedef AskRecord = ({int times, int lastVisit, DateTime? lastAt});

const _neverAsked = (times: 0, lastVisit: 0, lastAt: null);

/// The visit from which each question may be asked.
const askFromVisit = {StarAsk.learning: 3, StarAsk.area: 5, StarAsk.name: 7};

/// After it is put away once: this many more visits, and this long.
const askAgainAfterVisits = 15;
const askAgainAfter = Duration(days: 21);

/// Away this long, and coming back is a new session (a new visit).
const newSessionAfter = Duration(minutes: 30);

/// Whether [ask] may come up now.
bool mayAsk(StarAsk ask, int visit, AskRecord record, DateTime now) {
  if (visit < askFromVisit[ask]!) return false;
  if (record.times == 0) return true;
  if (record.times >= 2) return false;
  final at = record.lastAt;
  return visit >= record.lastVisit + askAgainAfterVisits &&
      at != null &&
      !now.isBefore(at.add(askAgainAfter));
}

/// This session's one question, if any: learning first (only when
/// [mayLearn]: signed in, with learning off), then the area, then the name.
StarAsk? nextAsk({
  required int visit,
  required bool hasArea,
  required bool hasName,
  required Map<StarAsk, AskRecord> records,
  required DateTime now,
  bool mayLearn = false,
}) {
  if (mayLearn &&
      mayAsk(
        StarAsk.learning,
        visit,
        records[StarAsk.learning] ?? _neverAsked,
        now,
      )) {
    return StarAsk.learning;
  }
  if (!hasArea &&
      mayAsk(StarAsk.area, visit, records[StarAsk.area] ?? _neverAsked, now)) {
    return StarAsk.area;
  }
  if (!hasName &&
      mayAsk(StarAsk.name, visit, records[StarAsk.name] ?? _neverAsked, now)) {
    return StarAsk.name;
  }
  return null;
}

/// Visits and questions asked, kept on this phone only.
abstract class ConductorStore {
  Future<int> visits();
  Future<void> setVisits(int n);
  Future<AskRecord> record(StarAsk ask);
  Future<void> setRecord(StarAsk ask, AskRecord record);

  /// Forget the count and every answer (debug builds' "Reset star
  /// questions").
  Future<void> reset();
}

class PreferencesConductorStore implements ConductorStore {
  final _prefs = SharedPreferencesAsync();

  @override
  Future<int> visits() async {
    try {
      return await _prefs.getInt('star_visits') ?? 0;
    } catch (_) {
      return 0;
    }
  }

  @override
  Future<void> setVisits(int n) async {
    try {
      await _prefs.setInt('star_visits', n);
    } catch (_) {}
  }

  @override
  Future<AskRecord> record(StarAsk ask) async {
    try {
      final at = await _prefs.getInt('star_ask_${ask.name}_at');
      return (
        times: await _prefs.getInt('star_ask_${ask.name}_times') ?? 0,
        lastVisit: await _prefs.getInt('star_ask_${ask.name}_visit') ?? 0,
        lastAt: at == null ? null : DateTime.fromMillisecondsSinceEpoch(at),
      );
    } catch (_) {
      return _neverAsked;
    }
  }

  @override
  Future<void> reset() async {
    try {
      await _prefs.remove('star_visits');
      for (final ask in StarAsk.values) {
        await _prefs.remove('star_ask_${ask.name}_times');
        await _prefs.remove('star_ask_${ask.name}_visit');
        await _prefs.remove('star_ask_${ask.name}_at');
      }
    } catch (_) {}
  }

  @override
  Future<void> setRecord(StarAsk ask, AskRecord r) async {
    try {
      await _prefs.setInt('star_ask_${ask.name}_times', r.times);
      await _prefs.setInt('star_ask_${ask.name}_visit', r.lastVisit);
      if (r.lastAt != null) {
        await _prefs.setInt(
          'star_ask_${ask.name}_at',
          r.lastAt!.millisecondsSinceEpoch,
        );
      }
    } catch (_) {}
  }
}

class MemoryConductorStore implements ConductorStore {
  MemoryConductorStore({this.visitCount = 0});

  int visitCount;
  final records = <StarAsk, AskRecord>{};

  @override
  Future<int> visits() async => visitCount;

  @override
  Future<void> setVisits(int n) async => visitCount = n;

  @override
  Future<AskRecord> record(StarAsk ask) async => records[ask] ?? _neverAsked;

  @override
  Future<void> setRecord(StarAsk ask, AskRecord record) async =>
      records[ask] = record;

  @override
  Future<void> reset() async {
    visitCount = 0;
    records.clear();
  }
}

final conductorStoreProvider = Provider<ConductorStore>(
  (ref) => PreferencesConductorStore(),
);

/// The clock, so tests can move time.
final conductorClockProvider = Provider<DateTime Function()>(
  (ref) => DateTime.now,
);

/// How long the star waits, once all is quiet, before it appears.
final conductorDelayProvider = Provider<Duration>(
  (ref) => const Duration(seconds: 3),
);

/// This session: its visit number, whether the star has appeared, whether
/// the search has been opened, and what the star is asking now.
class ConductorState {
  const ConductorState({
    this.visit = 0,
    this.appeared = false,
    this.searched = false,
    this.asking,
    this.tick = 0,
  });

  final int visit;

  /// Bumped by the debug controls: the tray looks again.
  final int tick;
  final bool appeared;
  final bool searched;
  final StarAsk? asking;

  ConductorState copyWith({
    int? visit,
    bool? appeared,
    bool? searched,
    StarAsk? asking,
    bool clearAsking = false,
  }) => ConductorState(
    visit: visit ?? this.visit,
    appeared: appeared ?? this.appeared,
    searched: searched ?? this.searched,
    asking: clearAsking ? null : (asking ?? this.asking),
    tick: tick,
  );
}

class Conductor extends Notifier<ConductorState> {
  @override
  ConductorState build() => const ConductorState();

  /// A new session: the next visit.
  Future<void> newSession() async {
    final store = ref.read(conductorStoreProvider);
    final visit = await store.visits() + 1;
    await store.setVisits(visit);
    if (ref.mounted) state = ConductorState(visit: visit, tick: state.tick);
  }

  /// DEBUG BUILDS ONLY (Account): make this session visit [visit], with
  /// [ask] never asked before — so the star asks it on the next quiet
  /// moment on a main tab.
  Future<void> debugSetVisit(int visit, StarAsk ask) async {
    final store = ref.read(conductorStoreProvider);
    await store.setVisits(visit);
    await store.setRecord(ask, _neverAsked);
    if (ref.mounted) {
      state = ConductorState(visit: visit, tick: state.tick + 1);
    }
  }

  /// DEBUG BUILDS ONLY: the count and every answer forgotten. The next
  /// launch is visit 1.
  Future<void> debugReset() async {
    await ref.read(conductorStoreProvider).reset();
    if (ref.mounted) state = ConductorState(tick: state.tick + 1);
  }

  /// The search opened: the star keeps quiet for the rest of the session.
  void searchOpened() {
    if (!state.searched) state = state.copyWith(searched: true);
  }

  /// The intro played this session: that was the star's appearance.
  void introPlayed() {
    if (!state.appeared) state = state.copyWith(appeared: true);
  }

  /// If the star may appear now, what it asks — and it is recorded as
  /// asked. Null if it stays quiet.
  Future<StarAsk?> conduct() async {
    if (state.appeared || state.searched || state.visit == 0) return null;
    final store = ref.read(conductorStoreProvider);
    final now = ref.read(conductorClockProvider)();
    final hasArea = ref.read(areaProvider).place != null;
    final hasName = ref.read(displayNameProvider) != null;
    final mayLearn =
        ref.read(signedInUserIdProvider) != null && !ref.read(learningProvider);
    final records = {
      for (final ask in StarAsk.values) ask: await store.record(ask),
    };
    if (!ref.mounted || state.appeared || state.searched) return null;
    final ask = nextAsk(
      visit: state.visit,
      hasArea: hasArea,
      hasName: hasName,
      records: records,
      now: now,
      mayLearn: mayLearn,
    );
    if (ask == null) return null;
    final r = records[ask]!;
    await store.setRecord(ask, (
      times: r.times + 1,
      lastVisit: state.visit,
      lastAt: now,
    ));
    if (ref.mounted) state = state.copyWith(appeared: true, asking: ask);
    return ask;
  }

  void doneAsking() => state = state.copyWith(clearAsking: true);
}

final conductorProvider = NotifierProvider<Conductor, ConductorState>(
  Conductor.new,
);

// ── The star's tray ─────────────────────────────────────────────────────────

/// Sits in the app shell, above the tab bar. Counts sessions, waits for a
/// quiet moment on a main tab, and lets the conductor choose; when it asks,
/// the star flies down from the search box onto a frosted tray carrying the
/// question. Swiping the tray away is "Not now".
class StarTrayHost extends ConsumerStatefulWidget {
  const StarTrayHost({super.key});

  @override
  ConsumerState<StarTrayHost> createState() => _StarTrayHostState();
}

class _StarTrayHostState extends ConsumerState<StarTrayHost> {
  late final AppLifecycleListener _lifecycle;
  DateTime? _awaySince;
  Timer? _wait;
  final _trayStar = GlobalKey();
  bool _landed = false; // the star has reached the tray
  int _tries = 0;
  StarLayerState? _layer; // for letting go of the star on dispose

  @override
  void initState() {
    super.initState();
    _lifecycle = AppLifecycleListener(
      onHide: () => _awaySince = DateTime.now(),
      onShow: () {
        final away = _awaySince;
        _awaySince = null;
        if (away != null &&
            DateTime.now().difference(away) >= newSessionAfter) {
          _startSession();
        }
      },
    );
    WidgetsBinding.instance.addPostFrameCallback((_) => _startSession());
  }

  @override
  void dispose() {
    _wait?.cancel();
    if (_layer case final layer?) _release(layer);
    _lifecycle.dispose();
    super.dispose();
  }

  Future<void> _startSession() async {
    await ref.read(conductorProvider.notifier).newSession();
    _tries = 0;
    _schedule();
  }

  void _schedule() {
    _wait?.cancel();
    if (_tries++ > 20) return; // a busy session: try again next time
    _wait = Timer(ref.read(conductorDelayProvider), _tryNow);
  }

  /// A main tab on screen, and nothing over it: no page, sheet or menu —
  /// and the star at home in it, not still on its way there (the intro, a
  /// flight back from a page). There is only ever one star.
  bool _quiet() {
    if (!mounted) return false;
    if (StarLayer.maybeOf(context)?.busy ?? false) return false;
    final router = GoRouter.maybeOf(context);
    final root = Navigator.maybeOf(context, rootNavigator: true);
    if (router == null || root == null) return false;
    final top =
        router.routerDelegate.currentConfiguration.lastOrNull?.matchedLocation;
    return top != null && tabPaths.contains(top) && !root.canPop();
  }

  Future<void> _tryNow() async {
    final conductor = ref.read(conductorProvider);
    if (conductor.appeared || conductor.searched) return;
    if (!_quiet()) return _schedule();
    final ask = await ref.read(conductorProvider.notifier).conduct();
    if (ask == null || !mounted) return;
    await _flyDown();
  }

  /// The star leaves the tab's search box for the tray.
  Future<void> _flyDown() async {
    final layer = _layer = StarLayer.maybeOf(context);
    final tab = layer?.currentTab;
    final from = tab == null ? null : layer?.tabs[tab]?.restingRect();
    setState(() => _landed = false);
    await WidgetsBinding.instance.endOfFrame;
    if (!mounted) return;
    // The resting star hides while away — on every tab, so switching tabs
    // under the tray shows none either. Held by the tray: nothing else
    // finishing (a flight, the intro) can show it before the tray lets go.
    _hold(layer);
    if (layer != null && tab != null && from != null) {
      await layer.fly(
        owner: this,
        from: from,
        to: () => layer.rectOfKey(_trayStar),
      );
    }
    if (mounted) setState(() => _landed = true);
  }

  /// And back again, as the tray goes.
  Future<void> _close() async {
    final layer = StarLayer.maybeOf(context);
    final tab = layer?.currentTab;
    final from = layer?.rectOfKey(_trayStar);
    ref.read(conductorProvider.notifier).doneAsking();
    if (layer != null && tab != null && from != null && mounted) {
      await WidgetsBinding.instance.endOfFrame;
      await layer.fly(
        owner: this,
        from: from,
        to: () => layer.tabs[tab]?.restingRect(),
      );
    }
    _release(layer);
  }

  void _hold(StarLayerState? layer) {
    for (final t in tabPaths) {
      layer?.hold((this, t), t);
    }
  }

  void _release(StarLayerState? layer) {
    for (final t in tabPaths) {
      layer?.release((this, t));
    }
  }

  @override
  Widget build(BuildContext context) {
    // The debug controls changed the visit: look for a quiet moment again.
    ref.listen(conductorProvider.select((s) => s.tick), (_, _) {
      _tries = 0;
      _schedule();
    });
    final asking = ref.watch(conductorProvider).asking;
    if (asking == null) return const SizedBox.shrink();
    // On an iPad the tray is a tray's width (SpLayout.trayWidth), centred
    // over the star; on a phone, edge to edge as before.
    final side = max(
      14.0,
      SpLayout.of(context).centredInset(SpLayout.trayWidth),
    );
    return Positioned(
      left: side,
      right: side,
      bottom: FloatingHomeStar.bottomOffset(context) + 78,
      child: Dismissible(
        key: ValueKey('star-tray-$asking'),
        direction: DismissDirection.horizontal,
        onDismissed: (_) => _close(),
        child: _Tray(
          starKey: _trayStar,
          starVisible: _landed,
          child: switch (asking) {
            StarAsk.learning => _LearningAsk(onDone: _close),
            StarAsk.area => _AreaAsk(onDone: _close),
            StarAsk.name => _NameAsk(onDone: _close),
          },
        ),
      ),
    );
  }
}

class _Tray extends StatelessWidget {
  const _Tray({
    required this.starKey,
    required this.starVisible,
    required this.child,
  });

  final GlobalKey starKey;
  final bool starVisible;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      key: const ValueKey('star-tray'),
      borderRadius: BorderRadius.circular(22),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
          decoration: BoxDecoration(
            color: const Color(0xD91C1F26),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: const Color(0x38FFFFFF), width: 0.8),
          ),
          child: Material(
            type: MaterialType.transparency,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox.square(
                  key: starKey,
                  dimension: 34,
                  child: AnimatedOpacity(
                    opacity: starVisible ? 1 : 0,
                    duration: const Duration(milliseconds: 140),
                    child: const StarSprite(),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(child: child),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

const _question = TextStyle(
  fontSize: 16,
  height: 1.4,
  fontWeight: FontWeight.w600,
);

class _AreaAsk extends StatelessWidget {
  const _AreaAsk({required this.onDone});

  final VoidCallback onDone;

  static const question = 'Shall I show you practitioners near you?';

  @override
  Widget build(BuildContext context) {
    Future<void> open({required bool typing}) async {
      onDone();
      await showAreaSheet(context, typing: typing, locate: !typing);
    }

    return Column(
      key: const ValueKey('star-ask-area'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(question, style: _question),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            FilledButton(
              key: const ValueKey('star-area-locate'),
              onPressed: () => open(typing: false),
              style: FilledButton.styleFrom(
                backgroundColor: SpColors.primary,
                shape: const StadiumBorder(),
                visualDensity: VisualDensity.compact,
              ),
              child: const Text('Use my location'),
            ),
            OutlinedButton(
              key: const ValueKey('star-area-type'),
              onPressed: () => open(typing: true),
              style: OutlinedButton.styleFrom(
                foregroundColor: SpColors.text,
                side: const BorderSide(color: SpColors.border),
                shape: const StadiumBorder(),
                visualDensity: VisualDensity.compact,
              ),
              child: const Text('Type my city'),
            ),
            TextButton(
              key: const ValueKey('star-not-now'),
              onPressed: onDone,
              style: TextButton.styleFrom(
                foregroundColor: SpColors.textMuted,
                visualDensity: VisualDensity.compact,
              ),
              child: const Text('Not now'),
            ),
          ],
        ),
      ],
    );
  }
}

/// "Let Spiritpedia learn from what I explore", asked by the star.
class _LearningAsk extends ConsumerStatefulWidget {
  const _LearningAsk({required this.onDone});

  final VoidCallback onDone;

  static const question =
      'Shall I learn from what you explore, to put more of what you love '
      'first?';
  static const promise =
      'Used only to tailor what you see. Never shown to our team, never '
      'shared, never used for advertising. Turn off anytime.';

  @override
  ConsumerState<_LearningAsk> createState() => _LearningAskState();
}

class _LearningAskState extends ConsumerState<_LearningAsk> {
  String? _said;

  Future<void> _yes() async {
    final ok = await ref.read(learningProvider.notifier).set(true);
    if (!mounted) return;
    setState(
      () => _said = ok
          ? 'Thank you. You can turn this off in Tailor Spiritpedia.'
          : 'That didn’t save. You can turn it on in Tailor Spiritpedia.',
    );
    await Future<void>.delayed(const Duration(milliseconds: 1800));
    if (mounted) widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    if (_said != null) {
      return Padding(
        padding: const EdgeInsets.only(top: 6, bottom: 8),
        child: Text(_said!, style: _question),
      );
    }
    return Column(
      key: const ValueKey('star-ask-learning'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(_LearningAsk.question, style: _question),
        const SizedBox(height: 6),
        const Text(
          _LearningAsk.promise,
          style: TextStyle(
            fontSize: 13,
            height: 1.4,
            color: SpColors.textMuted,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            FilledButton(
              key: const ValueKey('star-learning-yes'),
              onPressed: _yes,
              style: FilledButton.styleFrom(
                backgroundColor: SpColors.primary,
                shape: const StadiumBorder(),
                visualDensity: VisualDensity.compact,
              ),
              child: const Text('Yes, learn'),
            ),
            TextButton(
              key: const ValueKey('star-not-now'),
              onPressed: widget.onDone,
              style: TextButton.styleFrom(
                foregroundColor: SpColors.textMuted,
                visualDensity: VisualDensity.compact,
              ),
              child: const Text('Not now'),
            ),
          ],
        ),
      ],
    );
  }
}

class _NameAsk extends ConsumerStatefulWidget {
  const _NameAsk({required this.onDone});

  final VoidCallback onDone;

  static const question =
      'Would you like to share your name? I’ll use it only to greet you '
      'here and in my emails.';

  @override
  ConsumerState<_NameAsk> createState() => _NameAskState();
}

class _NameAskState extends ConsumerState<_NameAsk> {
  final _name = TextEditingController();
  String? _thanks;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = cleanName(_name.text);
    if (name == null) return;
    FocusScope.of(context).unfocus();
    await ref.read(displayNameProvider.notifier).set(name);
    if (!mounted) return;
    setState(() => _thanks = 'Lovely to meet you, ${firstNameOf(name)}.');
    await Future<void>.delayed(const Duration(milliseconds: 1800));
    if (mounted) widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    if (_thanks != null) {
      return Padding(
        padding: const EdgeInsets.only(top: 6, bottom: 8),
        child: Text(_thanks!, style: _question),
      );
    }
    return Column(
      key: const ValueKey('star-ask-name'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(_NameAsk.question, style: _question),
        const SizedBox(height: 10),
        TextField(
          key: const ValueKey('star-name-field'),
          controller: _name,
          maxLength: maxNameLength,
          textCapitalization: TextCapitalization.words,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _save(),
          decoration: InputDecoration(
            hintText: 'Your first name',
            counterText: '',
            isDense: true,
            filled: true,
            fillColor: SpColors.background,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: SpColors.border),
            ),
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            TextButton(
              key: const ValueKey('star-not-now'),
              onPressed: widget.onDone,
              style: TextButton.styleFrom(foregroundColor: SpColors.textMuted),
              child: const Text('Not now'),
            ),
            TextButton(
              key: const ValueKey('star-name-save'),
              onPressed: _save,
              style: TextButton.styleFrom(foregroundColor: SpColors.link),
              child: const Text(
                'Save',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

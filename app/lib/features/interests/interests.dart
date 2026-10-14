import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../account/account_providers.dart';
import '../account/account_service.dart';

/// How someone tailored Spiritpedia (docs/personalisation.md): subjects to
/// see more of ([subjects], "More of") and subjects never to show
/// ([hidden], "Never show") — subject slugs, as user_interests holds them
/// (migrations 0017 and 0018). A subject is never in both.
///
/// [chosen] tells "chose nothing" (an empty choice, saved) from "never asked
/// or skipped" (nothing saved): when the phone and the account differ, an
/// account that has chosen wins, even if it chose nothing.
class Interests {
  const Interests({
    this.subjects = const [],
    this.hidden = const [],
    this.chosen = false,
  });

  static const none = Interests();

  final List<String> subjects;
  final List<String> hidden;
  final bool chosen;

  bool get isEmpty => subjects.isEmpty && hidden.isEmpty;
}

/// Sorted, without duplicates, and nothing hidden that is also wanted more
/// of — More of gives way, as "Never show" is the stronger wish.
Interests tidyInterests(Iterable<String> subjects, Iterable<String> hidden) {
  final never = {...hidden};
  return Interests(
    subjects: ({...subjects}..removeAll(never)).toList()..sort(),
    hidden: never.toList()..sort(),
    chosen: true,
  );
}

/// Where the choice is kept on the phone. Overridden in tests.
abstract class InterestsStore {
  Future<Interests> load();
  Future<void> write(Interests interests);

  /// A choice made while signed in that has not reached the account yet
  /// (offline). Until it has, the phone's choice beats the account's.
  Future<bool> unsynced();
  Future<void> setUnsynced(bool value);
}

class PreferencesInterestsStore implements InterestsStore {
  final _prefs = SharedPreferencesAsync();
  static const _key = 'interests_subjects';
  static const _hiddenKey = 'interests_hidden';
  static const _unsyncedKey = 'interests_unsynced';

  static List<String> _decode(String? raw) {
    try {
      final v = jsonDecode(raw ?? '[]');
      return [
        if (v is List)
          for (final s in v)
            if (s is String) s,
      ];
    } catch (_) {
      return const [];
    }
  }

  @override
  Future<Interests> load() async {
    try {
      final raw = await _prefs.getString(_key);
      final hidden = await _prefs.getString(_hiddenKey);
      if (raw == null && hidden == null) return Interests.none;
      return Interests(
        subjects: _decode(raw),
        hidden: _decode(hidden),
        chosen: true,
      );
    } catch (_) {
      return Interests.none;
    }
  }

  @override
  Future<void> write(Interests interests) async {
    try {
      if (interests.chosen) {
        await _prefs.setString(_key, jsonEncode(interests.subjects));
        await _prefs.setString(_hiddenKey, jsonEncode(interests.hidden));
      } else {
        await _prefs.remove(_key);
        await _prefs.remove(_hiddenKey);
      }
    } catch (_) {}
  }

  @override
  Future<bool> unsynced() async {
    try {
      return await _prefs.getBool(_unsyncedKey) ?? false;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<void> setUnsynced(bool value) async {
    try {
      value
          ? await _prefs.setBool(_unsyncedKey, true)
          : await _prefs.remove(_unsyncedKey);
    } catch (_) {}
  }
}

class MemoryInterestsStore implements InterestsStore {
  MemoryInterestsStore([this.value = Interests.none]);

  Interests value;
  bool pending = false;

  @override
  Future<Interests> load() async => value;

  @override
  Future<void> write(Interests interests) async => value = interests;

  @override
  Future<bool> unsynced() async => pending;

  @override
  Future<void> setUnsynced(bool value) async => pending = value;
}

final interestsStoreProvider = Provider<InterestsStore>(
  (ref) => PreferencesInterestsStore(),
);

/// The tailoring. Saved on the phone at once, so it works signed out;
/// written through to the account when signed in. At sign-in the account's
/// wins if it has one; otherwise the phone's is attached to it.
class InterestsController extends Notifier<Interests> {
  late Future<void> _loaded;

  // Kept from build, and every method reads what else it needs before its
  // first wait: the ref may be gone after one (a sign-out as the app or a
  // test closes).
  late InterestsStore _store;

  @override
  Interests build() {
    _store = ref.watch(interestsStoreProvider);
    _loaded = _store.load().then((v) {
      if (ref.mounted) state = v;
    });
    return Interests.none;
  }

  /// "More of" — from onboarding. Keeps what is hidden.
  Future<void> choose(Iterable<String> subjectSlugs) async {
    await _loaded;
    return tailor(subjects: subjectSlugs, hidden: state.hidden);
  }

  /// "Never show" — onboarding's "Anything you'd rather not see?". Keeps
  /// More of, less anything now hidden.
  Future<void> hide(Iterable<String> subjectSlugs) async {
    await _loaded;
    return tailor(subjects: state.subjects, hidden: subjectSlugs);
  }

  /// Both at once — Account → Tailor Spiritpedia. Empty lists are a choice
  /// too ("nothing in particular").
  Future<void> tailor({
    required Iterable<String> subjects,
    required Iterable<String> hidden,
  }) async {
    final store = _store;
    final service = ref.read(accountServiceProvider);
    final userId = ref.read(signedInUserIdProvider);
    final next = tidyInterests(subjects, hidden);
    await _loaded;
    if (ref.mounted) state = next;
    await store.write(next);

    if (userId == null) return;
    try {
      await service.saveInterests(userId, (
        subjects: next.subjects,
        hidden: next.hidden,
      ));
      await store.setUnsynced(false);
    } catch (_) {
      // Offline: the phone keeps it, and the next sign-in or start sends it.
      await store.setUnsynced(true);
    }
  }

  /// After sign-in or a restored session.
  Future<void> syncWithAccount(String userId) async {
    final store = _store;
    final service = ref.read(accountServiceProvider);
    await _loaded;
    final phone = await store.load();
    TailoringRow row(Interests i) => (subjects: i.subjects, hidden: i.hidden);
    try {
      if (await store.unsynced() && phone.chosen) {
        await service.saveInterests(userId, row(phone));
        await store.setUnsynced(false);
        return;
      }
      final account = await service.interests(userId);
      if (account != null) {
        final next = tidyInterests(account.subjects, account.hidden);
        if (ref.mounted) state = next;
        await store.write(next);
      } else if (phone.chosen) {
        await service.saveInterests(userId, row(phone));
      }
    } catch (_) {
      // Offline or refused: keep the phone's; the next start tries again.
    }
  }

  /// Sign-out: the choice is in the account, so the phone forgets it — the
  /// next person to use the phone starts fresh. [userId] is who was signed
  /// in; unknown (a launch while signed out) clears nothing. A choice that
  /// never reached the account stays.
  Future<void> clearAfterSignOut(String? userId) async {
    if (userId == null) return;
    final store = _store;
    if (await store.unsynced()) return;
    await clearAll(store);
  }

  /// Account deletion: nothing stays on the phone.
  Future<void> clearAll([InterestsStore? store]) async {
    store ??= _store;
    await _loaded;
    if (ref.mounted) state = Interests.none;
    await store.write(Interests.none);
    await store.setUnsynced(false);
  }
}

final interestsProvider = NotifierProvider<InterestsController, Interests>(
  InterestsController.new,
);

/// "More of", as a set, for ranking.
final interestSubjectsProvider = Provider<Set<String>>(
  (ref) => {...ref.watch(interestsProvider).subjects},
);

/// "Never show", as a set, for hiding.
final hiddenSubjectsProvider = Provider<Set<String>>(
  (ref) => {...ref.watch(interestsProvider).hidden},
);

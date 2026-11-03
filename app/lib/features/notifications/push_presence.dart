import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../account/account_providers.dart';
import '../account/account_service.dart';

/// Whether this phone has already told the server about an account's first
/// real visit. Overridden in tests.
abstract class FirstVisitStore {
  Future<bool> noted(String userId);
  Future<void> setNoted(String userId);
}

class PreferencesFirstVisitStore implements FirstVisitStore {
  final _prefs = SharedPreferencesAsync();
  static String _key(String userId) => 'push_first_visit_$userId';

  @override
  Future<bool> noted(String userId) async =>
      await _prefs.getBool(_key(userId)) ?? false;

  @override
  Future<void> setNoted(String userId) => _prefs.setBool(_key(userId), true);
}

class MemoryFirstVisitStore implements FirstVisitStore {
  final noticed = <String>{};

  @override
  Future<bool> noted(String userId) async => noticed.contains(userId);

  @override
  Future<void> setNoted(String userId) async => noticed.add(userId);
}

final firstVisitStoreProvider = Provider<FirstVisitStore>(
  (ref) => PreferencesFirstVisitStore(),
);

/// What the push package's rules need from the app (migration 0032), for a
/// signed-in member only:
///
/// - **Each opening** (at start, at sign-in, and on coming back to the front
///   after [reopenAfter]): when, and the phone's offset from UTC. That is how
///   notifications keep to the hours where they are, and how the invitations
///   back know someone has been away — never to tell them so.
/// - **The first real visit**: [realVisitAfter] in the app, a save, or a
///   feeling search (called by the save and search code). The welcome ("It
///   was lovely getting to know you…") goes the next evening. Told once per
///   account from this phone; the server keeps only the first anyway.
///
/// Nothing is sent signed out, and nothing about what was looked at.
class PushPresence with WidgetsBindingObserver {
  PushPresence(
    this._account,
    this._store, {
    this.realVisitAfter = const Duration(minutes: 3),
    this.reopenAfter = const Duration(minutes: 30),
    DateTime Function()? clock,
    bool observeLifecycle = true,
  }) : _clock = clock ?? DateTime.now {
    if (observeLifecycle) WidgetsBinding.instance.addObserver(this);
    _observing = observeLifecycle;
    _sub = _account.userChanges.listen((user) => _signedIn(user?.id));
    scheduleMicrotask(() => _signedIn(_account.currentUser?.id));
  }

  final AccountService _account;
  final FirstVisitStore _store;
  final Duration realVisitAfter;
  final Duration reopenAfter;
  final DateTime Function() _clock;
  late final bool _observing;
  late final StreamSubscription<AccountUser?> _sub;

  String? _userId;
  DateTime? _lastOpen;
  Timer? _visitTimer;

  // Time in the app this session, for the 3 minutes: it pauses in the
  // background.
  Duration _spent = Duration.zero;
  DateTime? _since;

  void _signedIn(String? userId) {
    if (userId == _userId) return;
    _userId = userId;
    _lastOpen = null;
    _visitTimer?.cancel();
    if (userId == null) return;
    unawaited(_opened());
    _since = _clock();
    _armVisitTimer();
  }

  Future<void> _opened() async {
    final now = _clock();
    if (_lastOpen != null && now.difference(_lastOpen!) < reopenAfter) return;
    _lastOpen = now;
    try {
      await _account.noteAppOpen(now.timeZoneOffset.inMinutes);
    } catch (_) {
      // The next opening tries again; nothing here may disturb the app.
      _lastOpen = null;
    }
  }

  void _armVisitTimer() {
    _visitTimer?.cancel();
    final left = realVisitAfter - _spent;
    _visitTimer = Timer(left.isNegative ? Duration.zero : left, realVisit);
  }

  /// A save, a feeling search, or [realVisitAfter] in the app.
  Future<void> realVisit() async {
    final userId = _userId;
    if (userId == null) return;
    _visitTimer?.cancel();
    try {
      if (await _store.noted(userId)) return;
      await _account.noteFirstVisit();
      await _store.setNoted(userId);
    } catch (_) {}
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      if (_userId == null) return;
      unawaited(_opened());
      _since = _clock();
      _armVisitTimer();
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      if (_since != null) _spent += _clock().difference(_since!);
      _since = null;
      _visitTimer?.cancel();
    }
  }

  void dispose() {
    _visitTimer?.cancel();
    unawaited(_sub.cancel());
    if (_observing) WidgetsBinding.instance.removeObserver(this);
  }
}

final pushPresenceProvider = Provider<PushPresence>((ref) {
  final presence = PushPresence(
    ref.watch(accountServiceProvider),
    ref.watch(firstVisitStoreProvider),
  );
  ref.onDispose(presence.dispose);
  return presence;
});

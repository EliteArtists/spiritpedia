import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../account/account_providers.dart';
import '../account/account_service.dart';
import 'push_messaging.dart';

/// Firebase Cloud Messaging, or the unavailable stand-in. main.dart overrides
/// this with [FirebasePushMessaging] once Firebase has started.
final pushMessagingProvider = Provider<PushMessaging>(
  (ref) => UnavailablePushMessaging(),
);

/// Whether THIS phone has said yes, for the signed-in person. Cleared on
/// sign-out, so the next person to sign in on the phone is asked themselves.
/// It also keeps the token last registered from this phone, so turning off
/// can remove it even when Firebase can't hand it over at that moment, and
/// which accounts the server has confirmed the welcome for.
abstract class PushDeviceStore {
  Future<bool> enabled();
  Future<void> setEnabled(bool value);
  Future<String?> lastToken();
  Future<void> setLastToken(String? token);
  Future<bool> welcomeDone(String userId);
  Future<void> setWelcomeDone(String userId);
}

class PreferencesPushDeviceStore implements PushDeviceStore {
  final _prefs = SharedPreferencesAsync();
  static const _key = 'push_enabled_on_device';
  static const _tokenKey = 'push_last_token';
  static String _welcomeKey(String userId) => 'push_welcome_done_$userId';

  @override
  Future<bool> enabled() async => await _prefs.getBool(_key) ?? false;

  @override
  Future<void> setEnabled(bool value) => _prefs.setBool(_key, value);

  @override
  Future<String?> lastToken() => _prefs.getString(_tokenKey);

  @override
  Future<void> setLastToken(String? token) => token == null
      ? _prefs.remove(_tokenKey)
      : _prefs.setString(_tokenKey, token);

  @override
  Future<bool> welcomeDone(String userId) async =>
      await _prefs.getBool(_welcomeKey(userId)) ?? false;

  @override
  Future<void> setWelcomeDone(String userId) =>
      _prefs.setBool(_welcomeKey(userId), true);
}

class MemoryPushDeviceStore implements PushDeviceStore {
  bool value = false;
  String? token;
  final welcomed = <String>{};

  @override
  Future<bool> enabled() async => value;

  @override
  Future<void> setEnabled(bool v) async => value = v;

  @override
  Future<String?> lastToken() async => token;

  @override
  Future<void> setLastToken(String? t) async => token = t;

  @override
  Future<bool> welcomeDone(String userId) async => welcomed.contains(userId);

  @override
  Future<void> setWelcomeDone(String userId) async => welcomed.add(userId);
}

final pushDeviceStoreProvider = Provider<PushDeviceStore>(
  (ref) => PreferencesPushDeviceStore(),
);

/// Which platform the token belongs to; overridden in tests.
final pushPlatformProvider = Provider<String>(
  (ref) => Platform.isIOS ? 'ios' : 'android',
);

class NotificationsState {
  const NotificationsState({
    this.loading = true,
    this.permission = PushPermission.notAsked,
    this.onThisPhone = false,
    this.prefs = const NotificationPrefs(),
    this.busy = false,
    this.error,
  });

  final bool loading;
  final PushPermission permission;

  /// This phone has said yes and its token is registered for the account.
  final bool onThisPhone;
  final NotificationPrefs prefs;
  final bool busy;
  final String? error;

  NotificationsState copyWith({
    bool? loading,
    PushPermission? permission,
    bool? onThisPhone,
    NotificationPrefs? prefs,
    bool? busy,
    String? error,
    bool clearError = false,
  }) => NotificationsState(
    loading: loading ?? this.loading,
    permission: permission ?? this.permission,
    onThisPhone: onThisPhone ?? this.onThisPhone,
    prefs: prefs ?? this.prefs,
    busy: busy ?? this.busy,
    error: clearError ? null : (error ?? this.error),
  );
}

/// Notifications for the signed-in person on this phone.
///
/// Turning on: the friendly in-app screen (the caller shows it) → the one-time
/// system prompt → a token, registered for the account → the welcome
/// notification, which the server sends once ever. Turning off, or signing
/// out, removes the token from the account and from Firebase.
class NotificationsController extends Notifier<NotificationsState> {
  PushMessaging get _messaging => ref.read(pushMessagingProvider);
  AccountService get _account => ref.read(accountServiceProvider);
  PushDeviceStore get _store => ref.read(pushDeviceStoreProvider);
  String? get _userId => _account.currentUser?.id;

  // Follows sign-ins through the account SERVICE, not accountProvider: the
  // account controller calls into this one on sign-out, so depending on it
  // here would be a loop.
  @override
  NotificationsState build() {
    final service = ref.watch(accountServiceProvider);
    final subs = [
      ref.read(pushMessagingProvider).tokenRefreshes.listen(_onTokenRefresh),
      service.userChanges.listen((user) => _load(user?.id)),
    ];
    ref.onDispose(() {
      for (final s in subs) {
        s.cancel();
      }
    });
    scheduleMicrotask(() => _load(service.currentUser?.id));
    return const NotificationsState();
  }

  Future<void> _load(String? userId) async {
    try {
      final permission = await _messaging.permission();
      final enabled =
          userId != null &&
          permission == PushPermission.granted &&
          await _store.enabled();
      final prefs = userId == null
          ? const NotificationPrefs()
          : await _account.notificationPrefs(userId);
      state = state.copyWith(
        loading: false,
        permission: permission,
        onThisPhone: enabled,
        prefs: prefs,
      );
      // Keep the account's copy of this phone's token current (it rotates),
      // and ask again for a welcome the server hasn't confirmed yet.
      if (enabled) {
        await _register();
        unawaited(_welcome());
      }
    } catch (_) {
      state = state.copyWith(loading: false);
    }
  }

  Future<void> _register() async {
    final token = await _messaging.token(waitForApple: true);
    if (token == null) {
      throw const AccountError(
        'Your phone hasn’t connected to the notification service yet. '
        'Check you’re online, then try again.',
      );
    }
    await _account.registerPushToken(
      token,
      platform: ref.read(pushPlatformProvider),
    );
    await _store.setLastToken(token);
  }

  Future<void> _onTokenRefresh(String token) async {
    if (_userId == null || !state.onThisPhone) return;
    try {
      await _account.registerPushToken(
        token,
        platform: ref.read(pushPlatformProvider),
      );
      await _store.setLastToken(token);
    } catch (_) {}
  }

  /// Waits between welcome attempts; tests set it to zero.
  static Duration welcomeRetryDelay = const Duration(seconds: 2);

  /// The welcome notification. The server sends it once ever per account;
  /// the app keeps asking — three tries now, then at each start — until the
  /// server says it went (or already had). A request that never arrived
  /// (offline, the app suspended mid-request) was lost silently before
  /// build 24: on 22 Oct 2026 an iPad turned on and the welcome route was
  /// never called.
  Future<void> _welcome() async {
    final userId = _userId;
    if (userId == null) return;
    try {
      if (await _store.welcomeDone(userId)) return;
    } catch (_) {}
    for (var attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await Future<void>.delayed(welcomeRetryDelay * attempt);
      if (_userId != userId) return;
      String? status;
      try {
        status = await _account.sendWelcomePush();
      } catch (_) {}
      if (status == 'sent' || status == 'already_sent') {
        try {
          await _store.setWelcomeDone(userId);
        } catch (_) {}
        return;
      }
      // Nothing to retry now (no devices yet, General off): the next start
      // asks again.
      if (status != null && status != 'failed') return;
    }
  }

  /// After the person said yes on the friendly screen. True if notifications
  /// are now on; false if the phone refused (then [state.permission] is
  /// denied and only Settings can change it).
  Future<bool> turnOn() async {
    final userId = _userId;
    if (userId == null || state.busy) return false;
    state = state.copyWith(busy: true, clearError: true);
    try {
      var permission = await _messaging.permission();
      if (permission == PushPermission.notAsked) {
        permission = await _messaging.requestPermission();
      }
      if (permission != PushPermission.granted) {
        state = state.copyWith(
          busy: false,
          permission: permission,
          onThisPhone: false,
        );
        return false;
      }
      await _messaging.enableAutoInit(true);
      await _register();
      await _store.setEnabled(true);
      // Make the account's choices explicit (General on unless they changed it).
      await _account.saveNotificationPrefs(userId, state.prefs);
      state = state.copyWith(
        busy: false,
        permission: permission,
        onThisPhone: true,
      );
      // Once ever per account — the server decides; never blocks turning on.
      unawaited(_welcome());
      return true;
    } on AccountError catch (e) {
      state = state.copyWith(busy: false, error: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        busy: false,
        error:
            'Notifications could not be turned on just now. Please try again.',
      );
      return false;
    }
  }

  /// "Turn off notifications on this phone".
  Future<void> turnOff() async {
    if (state.busy) return;
    state = state.copyWith(busy: true, clearError: true);
    await forgetThisPhone();
    state = state.copyWith(busy: false, onThisPhone: false);
  }

  /// Remove this phone's token from the account (while still signed in, so
  /// row-level security allows it) and from Firebase. Called on turning off and
  /// on sign-out; after account deletion the server has already removed it, so
  /// [fromAccount] is false.
  ///
  /// The token to remove is the one this phone last registered, plus
  /// whatever Firebase says now (waiting for Apple's token as turning on
  /// does). Before build 24 it only asked Firebase, without waiting: on an
  /// iPad that came back empty, the token stayed on the account and the
  /// error was swallowed (README §16.1).
  Future<void> forgetThisPhone({bool fromAccount = true}) async {
    if (fromAccount && _userId != null) {
      final tokens = <String>{};
      try {
        final saved = await _store.lastToken();
        if (saved != null) tokens.add(saved);
      } catch (_) {}
      try {
        final now = await _messaging.token(waitForApple: true);
        if (now != null) tokens.add(now);
      } catch (_) {}
      for (final token in tokens) {
        try {
          await _account.removePushToken(token);
        } catch (_) {}
      }
    }
    try {
      await _messaging.deleteToken();
      await _messaging.enableAutoInit(false);
    } catch (_) {}
    try {
      await _store.setEnabled(false);
      await _store.setLastToken(null);
    } catch (_) {}
    // Never lets signing out or deleting the account fail.
    state = state.copyWith(onThisPhone: false);
  }

  Future<void> setGeneral(bool value) => _savePrefs(
    NotificationPrefs(
      general: value,
      iamAffirmations: state.prefs.iamAffirmations,
    ),
  );

  Future<void> _savePrefs(NotificationPrefs prefs) async {
    final userId = _userId;
    if (userId == null) return;
    final before = state.prefs;
    state = state.copyWith(prefs: prefs, clearError: true);
    try {
      await _account.saveNotificationPrefs(userId, prefs);
    } catch (_) {
      state = state.copyWith(
        prefs: before,
        error: 'That change could not be saved. Please try again.',
      );
    }
  }
}

final notificationsProvider =
    NotifierProvider<NotificationsController, NotificationsState>(
      NotificationsController.new,
    );

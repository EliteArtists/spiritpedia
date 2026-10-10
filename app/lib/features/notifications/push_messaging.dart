import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';

/// What the phone says about notification permission for Spiritpedia.
enum PushPermission {
  /// Never asked: the friendly screen can lead to the one-time system prompt.
  notAsked,
  granted,

  /// Refused in the system prompt or switched off in Settings. The app cannot
  /// ask again — only Settings can change it.
  denied,
}

/// A notification as the app needs it: what it said and where it leads.
class PushNote {
  const PushNote({this.title, this.body, this.route});

  final String? title;
  final String? body;

  /// An in-app path from the message data, e.g. /library.
  final String? route;
}

/// Firebase Cloud Messaging, behind an interface so tests need no Firebase.
///
/// Nothing here runs until the person has said yes: auto-init is off in the
/// native config (Info.plist / AndroidManifest), so no token exists — and
/// nothing reaches Google — before [enableAutoInit].
abstract class PushMessaging {
  Future<PushPermission> permission();

  /// Shows the one-time system prompt (iOS; Android 13+). Only after the
  /// friendly in-app screen.
  Future<PushPermission> requestPermission();

  Future<void> enableAutoInit(bool enabled);
  Future<String?> token();
  Stream<String> get tokenRefreshes;
  Future<void> deleteToken();

  /// Arrives while the app is open — shown as an in-app banner.
  Stream<PushNote> get foreground;

  /// Tapped while the app was in the background.
  Stream<PushNote> get opened;

  /// Tapped while the app was closed: it opened the app.
  Future<PushNote?> initialNote();
}

PushNote _note(RemoteMessage m) => PushNote(
  title: m.notification?.title,
  body: m.notification?.body,
  route: m.data['route'] as String?,
);

class FirebasePushMessaging implements PushMessaging {
  FirebaseMessaging get _fm => FirebaseMessaging.instance;

  static PushPermission _map(AuthorizationStatus s) => switch (s) {
    AuthorizationStatus.authorized ||
    AuthorizationStatus.provisional => PushPermission.granted,
    AuthorizationStatus.denied ||
    AuthorizationStatus.deniedPermanently => PushPermission.denied,
    AuthorizationStatus.notDetermined => PushPermission.notAsked,
  };

  @override
  Future<PushPermission> permission() async =>
      _map((await _fm.getNotificationSettings()).authorizationStatus);

  @override
  Future<PushPermission> requestPermission() async {
    final settings = await _fm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    // While the app is open the in-app banner shows it, not a system banner.
    await _fm.setForegroundNotificationPresentationOptions(
      alert: false,
      badge: true,
      sound: true,
    );
    return _map(settings.authorizationStatus);
  }

  @override
  Future<void> enableAutoInit(bool enabled) => _fm.setAutoInitEnabled(enabled);

  @override
  Future<String?> token() => _fm.getToken();

  @override
  Stream<String> get tokenRefreshes => _fm.onTokenRefresh;

  @override
  Future<void> deleteToken() => _fm.deleteToken();

  @override
  Stream<PushNote> get foreground => FirebaseMessaging.onMessage.map(_note);

  @override
  Stream<PushNote> get opened =>
      FirebaseMessaging.onMessageOpenedApp.map(_note);

  @override
  Future<PushNote?> initialNote() async {
    final m = await _fm.getInitialMessage();
    return m == null ? null : _note(m);
  }
}

/// Used when Firebase could not start (no config for this build): push is
/// simply unavailable, and the Account screen says so instead of failing.
class UnavailablePushMessaging implements PushMessaging {
  @override
  Future<PushPermission> permission() async => PushPermission.denied;
  @override
  Future<PushPermission> requestPermission() async => PushPermission.denied;
  @override
  Future<void> enableAutoInit(bool enabled) async {}
  @override
  Future<String?> token() async => null;
  @override
  Stream<String> get tokenRefreshes => const Stream.empty();
  @override
  Future<void> deleteToken() async {}
  @override
  Stream<PushNote> get foreground => const Stream.empty();
  @override
  Stream<PushNote> get opened => const Stream.empty();
  @override
  Future<PushNote?> initialNote() async => null;
}

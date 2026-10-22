import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

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

  /// This phone's notification token, or null. [waitForApple]: on an
  /// iPhone, first wait (a few seconds at most) for Apple's own push token —
  /// needed straight after the person says yes, see [waitForApnsToken].
  Future<String?> token({bool waitForApple = false});
  Stream<String> get tokenRefreshes;
  Future<void> deleteToken();

  /// Tapped while the app was in the background.
  Stream<PushNote> get opened;

  /// Arrived while the app was open, on Android only: Android shows nothing
  /// for an app in front, so the app shows it itself. An iPhone shows its own
  /// banner ([FirebasePushMessaging.showWhileOpen]), so this is empty there.
  Stream<PushNote> get arrivedWhileOpen;

  /// Tapped while the app was closed: it opened the app.
  Future<PushNote?> initialNote();
}

/// Apple's push token, waited for. With auto-init off until the person says
/// yes, the iPhone only registers with Apple at that moment, and Apple's
/// token arrives a little later — usually well under a second, longer on a
/// slow connection. Asked every [every] for up to [patience]; null if it
/// never came (offline, or push not set up for this build).
Future<String?> waitForApnsToken(
  Future<String?> Function() apnsToken, {
  Duration patience = const Duration(seconds: 10),
  Duration every = const Duration(milliseconds: 250),
}) async {
  final deadline = DateTime.now().add(patience);
  while (true) {
    final token = await apnsToken();
    if (token != null) return token;
    if (!DateTime.now().isBefore(deadline)) return null;
    await Future<void>.delayed(every);
  }
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
    await showWhileOpen();
    return _map(settings.authorizationStatus);
  }

  /// While the app is open, a notification shows as the iPhone's own
  /// banner, as when it is closed. iOS forgets this between launches, so it
  /// is said at every start (main.dart) — it asks nothing of the person.
  static Future<void> showWhileOpen() async {
    try {
      await FirebaseMessaging.instance
          .setForegroundNotificationPresentationOptions(
            alert: true,
            badge: true,
            sound: true,
          );
    } catch (_) {}
  }

  @override
  Future<void> enableAutoInit(bool enabled) => _fm.setAutoInitEnabled(enabled);

  @override
  Future<String?> token({bool waitForApple = false}) async {
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      // Firebase refuses to issue a token before Apple's has arrived — it
      // throws "apns-token-not-set". Asking for it then is no error, just
      // nothing to register yet.
      final apns = waitForApple
          ? await waitForApnsToken(_fm.getAPNSToken)
          : await _fm.getAPNSToken();
      if (apns == null) return null;
    }
    return _fm.getToken();
  }

  @override
  Stream<String> get tokenRefreshes => _fm.onTokenRefresh;

  @override
  Future<void> deleteToken() => _fm.deleteToken();

  @override
  Stream<PushNote> get opened =>
      FirebaseMessaging.onMessageOpenedApp.map(_note);

  @override
  Stream<PushNote> get arrivedWhileOpen =>
      defaultTargetPlatform == TargetPlatform.android
      ? FirebaseMessaging.onMessage.map(_note)
      : const Stream.empty();

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
  Future<String?> token({bool waitForApple = false}) async => null;
  @override
  Stream<String> get tokenRefreshes => const Stream.empty();
  @override
  Future<void> deleteToken() async {}
  @override
  Stream<PushNote> get opened => const Stream.empty();
  @override
  Stream<PushNote> get arrivedWhileOpen => const Stream.empty();
  @override
  Future<PushNote?> initialNote() async => null;
}

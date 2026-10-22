import 'dart:async';

import 'package:spiritpedia/features/notifications/push_messaging.dart';

/// Firebase Cloud Messaging stand-in: a phone whose answer to the system
/// prompt is [answer], with a log of every call.
class FakePushMessaging implements PushMessaging {
  FakePushMessaging({
    this.current = PushPermission.notAsked,
    this.answer = PushPermission.granted,
  });

  PushPermission current;
  PushPermission answer;
  final calls = <String>[];
  String? currentToken;
  int _issued = 0;
  final refreshes = StreamController<String>.broadcast();
  final openedNotes = StreamController<PushNote>.broadcast();
  PushNote? launchedFrom;

  @override
  Future<PushPermission> permission() async => current;

  @override
  Future<PushPermission> requestPermission() async {
    calls.add('requestPermission');
    current = answer;
    return current;
  }

  @override
  Future<void> enableAutoInit(bool enabled) async =>
      calls.add('autoInit:$enabled');

  /// Null until set: like an iPhone whose Apple token never came.
  bool appleTokenNeverCame = false;
  final tokenRequests = <bool>[]; // waitForApple, per request

  @override
  Future<String?> token({bool waitForApple = false}) async {
    tokenRequests.add(waitForApple);
    if (appleTokenNeverCame) return null;
    return currentToken ??= 'token-${++_issued}';
  }

  @override
  Stream<String> get tokenRefreshes => refreshes.stream;

  @override
  Future<void> deleteToken() async {
    calls.add('deleteToken');
    currentToken = null;
  }

  @override
  Stream<PushNote> get opened => openedNotes.stream;

  final arrivedNotes = StreamController<PushNote>.broadcast();

  @override
  Stream<PushNote> get arrivedWhileOpen => arrivedNotes.stream;

  @override
  Future<PushNote?> initialNote() async => launchedFrom;
}

import 'dart:async';
import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/config.dart';
import '../../core/supabase_providers.dart';
import '../../data/shelf_rules.dart';
import '../account/account_providers.dart';
import '../interests/interests.dart';

// ── Activity learning (migration 0021, docs/personalisation.md) ─────────────
//
// Two layers, one queue.
//
// Everything worth counting — an item opened, a watch started, a save or an
// unsave, a share, a review, a pill or filter tapped, a search that settled —
// goes into ActivityLog, which sends it in batches to the website's
// /api/activity. Every batch adds to the anonymous totals behind Admin →
// Activity. Only for a signed-in member with "Let Spiritpedia learn from what
// I explore" on does the database also keep their own events and turn them
// into per-subject scores; that is decided on the server, from their own
// token.
//
// The scores come back as [learnedProvider]: level 2 of the ranking, just
// below More of. They never hide anything.
//
// A search the crisis intercept caught is never sent: the search only calls
// [ActivityLog.search] for a resolved, non-crisis search, and the website
// checks again.

/// Sends a batch to /api/activity. True if it was accepted. Overridden in
/// tests.
abstract class ActivitySender {
  Future<bool> send(List<Map<String, Object?>> events);
}

class HttpActivitySender implements ActivitySender {
  HttpActivitySender(this._token, [http.Client? client])
    : _http = client ?? http.Client();

  final String? Function() _token;
  final http.Client _http;

  @override
  Future<bool> send(List<Map<String, Object?>> events) async {
    if (AppConfig.apiBaseUrl.isEmpty) return true; // no website to tell
    try {
      final token = _token();
      final res = await _http
          .post(
            Uri.parse('${AppConfig.apiBaseUrl}/api/activity'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': ?(token == null ? null : 'Bearer $token'),
            },
            body: jsonEncode({'platform': 'app', 'events': events}),
          )
          .timeout(const Duration(seconds: 15));
      // A batch the website refused (400) will never be accepted: drop it.
      return res.statusCode < 500;
    } catch (_) {
      return false;
    }
  }
}

/// Where unsent events wait if the app closes before they go.
abstract class ActivityQueueStore {
  Future<List<Map<String, Object?>>> load();
  Future<void> write(List<Map<String, Object?>> events);
}

class PreferencesActivityQueueStore implements ActivityQueueStore {
  final _prefs = SharedPreferencesAsync();
  static const _key = 'activity_queue';

  @override
  Future<List<Map<String, Object?>>> load() async {
    try {
      final raw = await _prefs.getString(_key);
      if (raw == null) return const [];
      return [
        for (final e in jsonDecode(raw) as List)
          (e as Map).cast<String, Object?>(),
      ];
    } catch (_) {
      return const [];
    }
  }

  @override
  Future<void> write(List<Map<String, Object?>> events) async {
    try {
      events.isEmpty
          ? await _prefs.remove(_key)
          : await _prefs.setString(_key, jsonEncode(events));
    } catch (_) {}
  }
}

class MemoryActivityQueueStore implements ActivityQueueStore {
  List<Map<String, Object?>> value = const [];

  @override
  Future<List<Map<String, Object?>>> load() async => value;

  @override
  Future<void> write(List<Map<String, Object?>> events) async =>
      value = [...events];
}

/// The queue: sent every [flushEvery], at [flushAt] events, and when the app
/// goes to the background; kept on the phone if it could not go. An item
/// opened again within [openAgainAfter] is not a second open.
class ActivityLog with WidgetsBindingObserver {
  ActivityLog(
    this._sender,
    this._store, {
    this.flushEvery = const Duration(seconds: 30),
    this.flushAt = 20,
    this.openAgainAfter = const Duration(minutes: 30),
    DateTime Function()? clock,
    bool observeLifecycle = true,
  }) : _clock = clock ?? DateTime.now {
    if (observeLifecycle) WidgetsBinding.instance.addObserver(this);
    _observing = observeLifecycle;
    // What a closed app left behind goes with the next batch.
    _restored = _store.load().then((saved) {
      if (saved.isNotEmpty) _queue.insertAll(0, saved);
    });
  }

  final ActivitySender _sender;
  final ActivityQueueStore _store;
  final Duration flushEvery;
  final int flushAt;
  final Duration openAgainAfter;
  final DateTime Function() _clock;
  late final Future<void> _restored;
  late final bool _observing;

  final _queue = <Map<String, Object?>>[];
  final _opened = <String, DateTime>{};
  Timer? _timer;
  bool _sending = false;
  bool _disposed = false;

  /// What is waiting to go.
  List<Map<String, Object?>> get pending => List.unmodifiable(_queue);

  void _add(Map<String, Object?> event) {
    if (_disposed) return;
    _queue.add(event);
    if (_queue.length >= flushAt) {
      unawaited(flush());
    } else {
      _timer ??= Timer(flushEvery, () {
        _timer = null;
        unawaited(flush());
      });
    }
  }

  /// An item's page opened (once per item per session).
  void open(String type, String slug) {
    final key = '$type:$slug';
    final now = _clock();
    final last = _opened[key];
    if (last != null && now.difference(last) < openAgainAfter) return;
    _opened[key] = now;
    _add({'kind': 'open', 'content_type': type, 'content_slug': slug});
  }

  /// A video started (once per video per session, like [open]).
  void watch(String slug) {
    final key = 'watch:$slug';
    final now = _clock();
    final last = _opened[key];
    if (last != null && now.difference(last) < openAgainAfter) return;
    _opened[key] = now;
    _add({'kind': 'watch', 'content_type': 'video', 'content_slug': slug});
  }

  /// A save, unsave, share or review of an item.
  void content(String kind, String type, String slug) =>
      _add({'kind': kind, 'content_type': type, 'content_slug': slug});

  /// A subject pill or filter tapped.
  void subjects(String kind, Iterable<String> subjects) {
    final list = subjects.where((s) => s.isNotEmpty).toList();
    if (list.isNotEmpty) _add({'kind': kind, 'subjects': list});
  }

  /// A search that settled, past the crisis intercept. With results: the
  /// subjects it led to, never the words. With none: the words, for
  /// "Searches with no results".
  void search({List<String> subjects = const [], String? term}) {
    final words = term?.trim() ?? '';
    if (subjects.isEmpty && words.isNotEmpty) {
      _add({'kind': 'search', 'term': words, 'no_results': true});
    } else if (subjects.isNotEmpty) {
      _add({'kind': 'search', 'subjects': subjects.take(5).toList()});
    }
  }

  /// Send what is waiting, 50 at a time. What could not go is kept.
  Future<void> flush() async {
    _timer?.cancel();
    _timer = null;
    await _restored;
    if (_sending || _queue.isEmpty) return;
    _sending = true;
    try {
      while (_queue.isNotEmpty) {
        final batch = _queue.take(50).toList();
        if (!await _sender.send(batch)) break;
        _queue.removeRange(0, batch.length);
      }
    } finally {
      _sending = false;
      await _store.write(_queue);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      unawaited(flush());
    }
  }

  void dispose() {
    _disposed = true;
    _timer?.cancel();
    if (_observing) WidgetsBinding.instance.removeObserver(this);
  }
}

// The session is looked up only when a batch goes, so nothing here touches
// Supabase before then (tests have none).
final activitySenderProvider = Provider<ActivitySender>(
  (ref) => HttpActivitySender(() {
    try {
      return ref.read(supabaseProvider).auth.currentSession?.accessToken;
    } catch (_) {
      return null;
    }
  }),
);

final activityQueueStoreProvider = Provider<ActivityQueueStore>(
  (ref) => PreferencesActivityQueueStore(),
);

final activityLogProvider = Provider<ActivityLog>((ref) {
  final log = ActivityLog(
    ref.watch(activitySenderProvider),
    ref.watch(activityQueueStoreProvider),
  );
  ref.onDispose(log.dispose);
  return log;
});

/// The content type a share link is about ("/books/slug" → book), or null.
({String type, String slug})? contentOfPath(String path) {
  const prefixes = {
    '/healers/': 'healer',
    '/books/': 'book',
    '/videos/': 'video',
    '/offerings/': 'course',
    '/free-resources/': 'free_resource',
    '/publishers/': 'publisher',
  };
  for (final MapEntry(key: prefix, value: type) in prefixes.entries) {
    if (path.startsWith(prefix) && path.length > prefix.length) {
      return (type: type, slug: path.substring(prefix.length));
    }
  }
  return null;
}

// ── The switch ──────────────────────────────────────────────────────────────

/// "Let Spiritpedia learn from what I explore": off unless a signed-in
/// member turns it on (in Tailor Spiritpedia, or when the star asks). Kept
/// in the account only (user_preferences.learning_enabled); signed out it is
/// off and nothing personal is recorded. Turning it off deletes what was
/// learned, in the database.
class LearningController extends Notifier<bool> {
  @override
  bool build() {
    final userId = ref.watch(signedInUserIdProvider);
    if (userId == null) return false;
    final service = ref.read(accountServiceProvider);
    service
        .learning(userId)
        .then((on) {
          if (ref.mounted && ref.read(signedInUserIdProvider) == userId) {
            state = on;
          }
        })
        .catchError((_) {});
    return false;
  }

  /// Turn learning on or off. False if it could not be saved (signed out,
  /// or offline).
  Future<bool> set(bool on) async {
    final userId = ref.read(signedInUserIdProvider);
    if (userId == null) return false;
    final service = ref.read(accountServiceProvider);
    try {
      await service.saveLearning(userId, on);
    } catch (_) {
      return false;
    }
    // affinityProvider watches this, so it reads again (or empties) itself.
    if (ref.mounted) state = on;
    return true;
  }
}

final learningProvider = NotifierProvider<LearningController, bool>(
  LearningController.new,
);

/// What has been learned, as stored — read once a session (and again when
/// the switch changes). Empty unless signed in with learning on.
final affinityProvider = FutureProvider<List<AffinityRowView>>((ref) async {
  final userId = ref.watch(signedInUserIdProvider);
  final on = ref.watch(learningProvider);
  if (userId == null || !on) return const [];
  try {
    return await ref.read(accountServiceProvider).affinity(userId);
  } catch (_) {
    return const [];
  }
});

typedef AffinityRowView = ({String subject, double score, DateTime updatedAt});

/// When learned scores are read. Overridden in tests.
final learningClockProvider = Provider<DateTime Function()>(
  (ref) => DateTime.now,
);

/// Level 2 of the ranking: the subjects someone has explored most, faded,
/// with their More of and Never show subjects left out.
final learnedProvider = Provider<Map<String, double>>((ref) {
  final rows = ref.watch(affinityProvider).value ?? const [];
  if (rows.isEmpty) return const {};
  return learnedSubjects(
    rows,
    now: ref.read(learningClockProvider)(),
    chosen: ref.watch(interestSubjectsProvider),
    hidden: ref.watch(hiddenSubjectsProvider),
  );
});

import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../account/account_providers.dart';

/// What can be saved, the device key each list lives under, and the
/// content_type it has in user_favourites — the same types the website uses,
/// so a save made on either shows on both.
///
/// Every list holds SLUGS, as user_favourites.content_slug does since
/// migration 0012 and as the website now does too.
enum SavedKind {
  healers('saved_healers', 'healer'),
  books('saved_books', 'book'),
  readBooks('read_books', 'book_read'),
  videos('saved_videos', 'video'),
  offerings('saved_offerings', 'course'),
  freeResources('saved_free_resources', 'free_resource'),
  publishers('saved_publishers', 'publisher');

  const SavedKind(this.storageKey, this.contentType);

  final String storageKey;
  final String contentType;

  static SavedKind? fromContentType(String type) {
    for (final kind in values) {
      if (kind.contentType == type) return kind;
    }
    return null;
  }
}

/// Where saves are kept on the device. Overridden in tests with an in-memory
/// store.
abstract class SavedStore {
  Future<Map<SavedKind, List<String>>> load();
  Future<void> write(SavedKind kind, List<String> slugs);

  /// Whether this device's own saves have been merged into [userId]'s account.
  Future<bool> isMerged(String userId);
  Future<void> markMerged(String userId);
  Future<void> forgetMerges();
}

class PreferencesSavedStore implements SavedStore {
  final _prefs = SharedPreferencesAsync();

  static const _mergedPrefix = 'saved_merged:';

  @override
  Future<Map<SavedKind, List<String>>> load() async => {
    for (final kind in SavedKind.values)
      kind: _decode(await _prefs.getString(kind.storageKey)),
  };

  // A malformed value reads as empty rather than breaking the Library.
  static List<String> _decode(String? raw) {
    try {
      final v = jsonDecode(raw ?? '[]');
      return v is List
          ? [
              for (final s in v)
                if (s is String) s,
            ]
          : const [];
    } catch (_) {
      return const [];
    }
  }

  @override
  Future<void> write(SavedKind kind, List<String> slugs) =>
      _prefs.setString(kind.storageKey, jsonEncode(slugs));

  @override
  Future<bool> isMerged(String userId) async =>
      await _prefs.getBool('$_mergedPrefix$userId') ?? false;

  @override
  Future<void> markMerged(String userId) =>
      _prefs.setBool('$_mergedPrefix$userId', true);

  @override
  Future<void> forgetMerges() async {
    for (final key in await _prefs.getKeys()) {
      if (key.startsWith(_mergedPrefix)) await _prefs.remove(key);
    }
  }
}

class MemorySavedStore implements SavedStore {
  final data = <SavedKind, List<String>>{};
  final merged = <String>{};

  @override
  Future<Map<SavedKind, List<String>>> load() async => {
    for (final kind in SavedKind.values) kind: [...?data[kind]],
  };

  @override
  Future<void> write(SavedKind kind, List<String> slugs) async =>
      data[kind] = [...slugs];

  @override
  Future<bool> isMerged(String userId) async => merged.contains(userId);

  @override
  Future<void> markMerged(String userId) async => merged.add(userId);

  @override
  Future<void> forgetMerges() async => merged.clear();
}

final savedStoreProvider = Provider<SavedStore>(
  (ref) => PreferencesSavedStore(),
);

/// Every saved slug, newest first.
///
/// Signed out, the device's lists are the library. Signed in, the account is
/// the source of truth: this device's saves are merged up once per account,
/// the account's list then replaces the device's, and every tap is written
/// through. Signing out clears the device's lists — they are in the account.
class SavedItems extends Notifier<Map<SavedKind, List<String>>> {
  late Future<void> _loaded;

  @override
  Map<SavedKind, List<String>> build() {
    _loaded = ref.watch(savedStoreProvider).load().then((l) => state = l);
    return const {};
  }

  SavedStore get _store => ref.read(savedStoreProvider);

  bool contains(SavedKind kind, String slug) =>
      state[kind]?.contains(slug) ?? false;

  Future<void> toggle(SavedKind kind, String slug) async {
    await _loaded; // never let the first read overwrite a tap made before it
    final current = [...?state[kind]];
    final saving = !current.contains(slug);
    saving ? current.insert(0, slug) : current.remove(slug);
    state = {...state, kind: current};
    await _store.write(kind, current);

    // Write through to the account. A failure is not shown: the next sign-in
    // or app start pulls the account's list back down, the honest state.
    final userId = ref.read(signedInUserIdProvider);
    if (userId == null) return;
    final service = ref.read(accountServiceProvider);
    final row = (contentType: kind.contentType, slug: slug);
    try {
      saving
          ? await service.addFavourites(userId, [row])
          : await service.removeFavourite(userId, row);
    } catch (_) {}
  }

  /// After sign-in or a restored session. Nothing on the device is replaced
  /// unless the account has accepted this device's saves at some point, so a
  /// failure here never loses a save.
  Future<void> syncWithAccount(String userId) async {
    await _loaded;
    final service = ref.read(accountServiceProvider);
    try {
      if (!await _store.isMerged(userId)) {
        await service.addFavourites(userId, [
          for (final kind in SavedKind.values)
            for (final slug in state[kind] ?? const <String>[])
              (contentType: kind.contentType, slug: slug),
        ]);
        await _store.markMerged(userId);
      }
      final rows = await service.favourites(userId); // newest first
      final next = {for (final kind in SavedKind.values) kind: <String>[]};
      for (final r in rows) {
        final kind = SavedKind.fromContentType(r.contentType);
        if (kind != null && !next[kind]!.contains(r.slug)) {
          next[kind]!.add(r.slug);
        }
      }
      for (final kind in SavedKind.values) {
        await _store.write(kind, next[kind]!);
      }
      state = next;
    } catch (_) {
      // Offline or refused: keep what the device has; the next start retries.
    }
  }

  /// Sign-out: the device's lists go with the account — but only once they
  /// are known to be in it (merged), so a failed merge never loses a save.
  /// [userId] is who was signed in; unknown clears nothing.
  Future<void> clearAfterSignOut(String? userId) async {
    if (userId != null && await _store.isMerged(userId)) return clearAll();
    await _store.forgetMerges();
  }

  /// Account deletion, or a confirmed sign-out: nothing stays on the phone.
  Future<void> clearAll() async {
    await _loaded;
    for (final kind in SavedKind.values) {
      await _store.write(kind, const []);
    }
    await _store.forgetMerges();
    state = {for (final kind in SavedKind.values) kind: const <String>[]};
  }
}

final savedItemsProvider =
    NotifierProvider<SavedItems, Map<SavedKind, List<String>>>(SavedItems.new);

import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// What can be saved, and the device key each list lives under.
///
/// Every list holds SLUGS — one key per kind, used everywhere in the app. The
/// website's localStorage mixes ids and slugs for books (cards save the id,
/// the book page saves the slug); the app does not repeat that, so Phase 2's
/// sync has one clean shape to map. Nothing here leaves the device.
enum SavedKind {
  healers('saved_healers'),
  books('saved_books'),
  readBooks('read_books'),
  videos('saved_videos'),
  offerings('saved_offerings'),
  freeResources('saved_free_resources'),
  publishers('saved_publishers');

  const SavedKind(this.storageKey);

  final String storageKey;
}

/// Where saves are kept. Overridden in tests with an in-memory store.
abstract class SavedStore {
  Future<Map<SavedKind, List<String>>> load();
  Future<void> write(SavedKind kind, List<String> slugs);
}

class PreferencesSavedStore implements SavedStore {
  final _prefs = SharedPreferencesAsync();

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
}

class MemorySavedStore implements SavedStore {
  final data = <SavedKind, List<String>>{};

  @override
  Future<Map<SavedKind, List<String>>> load() async => {
    for (final kind in SavedKind.values) kind: [...?data[kind]],
  };

  @override
  Future<void> write(SavedKind kind, List<String> slugs) async =>
      data[kind] = [...slugs];
}

final savedStoreProvider = Provider<SavedStore>(
  (ref) => PreferencesSavedStore(),
);

/// Every saved slug, newest first.
class SavedItems extends Notifier<Map<SavedKind, List<String>>> {
  late Future<void> _loaded;

  @override
  Map<SavedKind, List<String>> build() {
    _loaded = ref.watch(savedStoreProvider).load().then((l) => state = l);
    return const {};
  }

  bool contains(SavedKind kind, String slug) =>
      state[kind]?.contains(slug) ?? false;

  Future<void> toggle(SavedKind kind, String slug) async {
    await _loaded; // never let the first read overwrite a tap made before it
    final current = [...?state[kind]];
    current.contains(slug) ? current.remove(slug) : current.insert(0, slug);
    state = {...state, kind: current};
    await ref.read(savedStoreProvider).write(kind, current);
  }
}

final savedItemsProvider =
    NotifierProvider<SavedItems, Map<SavedKind, List<String>>>(SavedItems.new);

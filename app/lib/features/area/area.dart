import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/models.dart';
import '../account/account_providers.dart';

/// Someone's area for Practitioners Near You: a town (public.places), never
/// a position. Kept on the phone at once, so it works signed out, and in the
/// account when signed in (user_preferences, migration 0019) — the same
/// rules as tailoring: at sign-in the account's wins if it has one;
/// otherwise the phone's is attached. Sign-out forgets it on the phone.
class Area {
  const Area({this.place, this.chosen = false});

  static const none = Area();

  final Place? place;

  /// Set (or cleared) by them — as opposed to never asked.
  final bool chosen;
}

/// Where the area is kept on the phone. Overridden in tests.
abstract class AreaStore {
  Future<Area> load();
  Future<void> write(Area area);
  Future<bool> unsynced();
  Future<void> setUnsynced(bool value);
}

class PreferencesAreaStore implements AreaStore {
  final _prefs = SharedPreferencesAsync();
  static const _key = 'area_place';
  static const _unsyncedKey = 'area_unsynced';

  @override
  Future<Area> load() async {
    try {
      final raw = await _prefs.getString(_key);
      if (raw == null) return Area.none;
      final v = jsonDecode(raw);
      return Area(
        place: v is Map<String, dynamic> ? Place.fromJson(v) : null,
        chosen: true,
      );
    } catch (_) {
      return Area.none;
    }
  }

  @override
  Future<void> write(Area area) async {
    try {
      area.chosen
          ? await _prefs.setString(_key, jsonEncode(area.place?.toJson()))
          : await _prefs.remove(_key);
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

class MemoryAreaStore implements AreaStore {
  MemoryAreaStore([this.value = Area.none]);

  Area value;
  bool pending = false;

  @override
  Future<Area> load() async => value;

  @override
  Future<void> write(Area area) async => value = area;

  @override
  Future<bool> unsynced() async => pending;

  @override
  Future<void> setUnsynced(bool value) async => pending = value;
}

final areaStoreProvider = Provider<AreaStore>((ref) => PreferencesAreaStore());

class AreaController extends Notifier<Area> {
  late Future<void> _loaded;
  late AreaStore _store; // kept from build: the ref may go after a wait

  @override
  Area build() {
    _store = ref.watch(areaStoreProvider);
    _loaded = _store.load().then((v) {
      if (ref.mounted) state = v;
    });
    return Area.none;
  }

  /// Set [place] as their area — or clear it (null).
  Future<void> set(Place? place) async {
    final store = _store;
    final service = ref.read(accountServiceProvider);
    final userId = ref.read(signedInUserIdProvider);
    final next = Area(place: place, chosen: true);
    await _loaded;
    if (ref.mounted) state = next;
    await store.write(next);
    if (userId == null) return;
    try {
      await service.saveArea(userId, place);
      await store.setUnsynced(false);
    } catch (_) {
      await store.setUnsynced(true); // offline: the next start sends it
    }
  }

  /// After sign-in or a restored session.
  Future<void> syncWithAccount(String userId) async {
    final store = _store;
    final service = ref.read(accountServiceProvider);
    await _loaded;
    final phone = await store.load();
    try {
      if (await store.unsynced() && phone.chosen) {
        await service.saveArea(userId, phone.place);
        await store.setUnsynced(false);
        return;
      }
      final account = await service.area(userId);
      if (account != null) {
        final next = Area(place: account.place, chosen: true);
        if (ref.mounted) state = next;
        await store.write(next);
      } else if (phone.chosen) {
        await service.saveArea(userId, phone.place);
      }
    } catch (_) {
      // Offline or refused: keep the phone's; the next start tries again.
    }
  }

  /// Sign-out: the account keeps it; the phone forgets it (unless it never
  /// reached the account). [userId] unknown clears nothing.
  Future<void> clearAfterSignOut(String? userId) async {
    if (userId == null) return;
    final store = _store;
    if (await store.unsynced()) return;
    await clearAll(store);
  }

  /// Account deletion: nothing stays on the phone.
  Future<void> clearAll([AreaStore? store]) async {
    store ??= _store;
    await _loaded;
    if (ref.mounted) state = Area.none;
    await store.write(Area.none);
    await store.setUnsynced(false);
  }
}

final areaProvider = NotifierProvider<AreaController, Area>(AreaController.new);

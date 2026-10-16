import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'account_providers.dart';

/// The name someone chose to share, used only to greet them — here ("Welcome
/// back, Ross") and in Spiritpedia's emails. Kept on the phone at once and in
/// the account when signed in (user_profiles.full_name, which the emails
/// already use). At sign-in a name the account has wins; otherwise the
/// phone's is given to it. Sign-out forgets it on the phone.
abstract class NameStore {
  Future<String?> load();
  Future<void> write(String? name);
  Future<bool> unsynced();
  Future<void> setUnsynced(bool value);
}

class PreferencesNameStore implements NameStore {
  final _prefs = SharedPreferencesAsync();
  static const _key = 'display_name';
  static const _unsyncedKey = 'display_name_unsynced';

  @override
  Future<String?> load() async {
    try {
      return cleanName(await _prefs.getString(_key));
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> write(String? name) async {
    try {
      name == null
          ? await _prefs.remove(_key)
          : await _prefs.setString(_key, name);
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

class MemoryNameStore implements NameStore {
  MemoryNameStore([this.value]);

  String? value;
  bool pending = false;

  @override
  Future<String?> load() async => value;

  @override
  Future<void> write(String? name) async => value = name;

  @override
  Future<bool> unsynced() async => pending;

  @override
  Future<void> setUnsynced(bool value) async => pending = value;
}

final nameStoreProvider = Provider<NameStore>((ref) => PreferencesNameStore());

/// The longest name kept.
const maxNameLength = 40;

/// Trimmed, single-spaced, at most [maxNameLength]; null if empty.
String? cleanName(String? raw) {
  final s = (raw ?? '').trim().replaceAll(RegExp(r'\s+'), ' ');
  if (s.isEmpty) return null;
  return s.length > maxNameLength ? s.substring(0, maxNameLength).trim() : s;
}

/// "Ross" from "Ross Baiken".
String? firstNameOf(String? name) => cleanName(name)?.split(' ').first;

class DisplayNameController extends Notifier<String?> {
  late Future<void> _loaded;
  late NameStore _store;

  @override
  String? build() {
    _store = ref.watch(nameStoreProvider);
    _loaded = _store.load().then((v) {
      if (ref.mounted) state = v;
    });
    return null;
  }

  Future<void> set(String? raw) async {
    final store = _store;
    final service = ref.read(accountServiceProvider);
    final userId = ref.read(signedInUserIdProvider);
    final name = cleanName(raw);
    await _loaded;
    if (ref.mounted) state = name;
    await store.write(name);
    if (userId == null) return;
    try {
      await service.saveDisplayName(userId, name);
      await store.setUnsynced(false);
    } catch (_) {
      await store.setUnsynced(true);
    }
  }

  /// After sign-in: [accountName] is the profile's full_name.
  Future<void> syncWithAccount(String userId, String? accountName) async {
    final store = _store;
    final service = ref.read(accountServiceProvider);
    await _loaded;
    final phone = await store.load();
    try {
      if (await store.unsynced()) {
        await service.saveDisplayName(userId, phone);
        await store.setUnsynced(false);
        return;
      }
      final account = cleanName(accountName);
      if (account != null) {
        if (ref.mounted) state = account;
        await store.write(account);
      } else if (phone != null) {
        await service.saveDisplayName(userId, phone);
      }
    } catch (_) {}
  }

  Future<void> clearAfterSignOut(String? userId) async {
    if (userId == null) return;
    final store = _store;
    if (await store.unsynced()) return;
    await clearAll(store);
  }

  Future<void> clearAll([NameStore? store]) async {
    store ??= _store;
    await _loaded;
    if (ref.mounted) state = null;
    await store.write(null);
    await store.setUnsynced(false);
  }
}

final displayNameProvider = NotifierProvider<DisplayNameController, String?>(
  DisplayNameController.new,
);

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Where the sign-in session lives: the iOS Keychain / Android Keystore-backed
/// storage, not plain preferences — the session is a credential.
///
/// The Keychain outlives the app: delete Spiritpedia, reinstall it, and the old
/// session would still be there. So the first launch of each install (marked in
/// ordinary preferences, which ARE removed with the app) clears it first.
class SecureSessionStorage extends LocalStorage {
  SecureSessionStorage();

  static const _sessionKey = 'spiritpedia.session';
  static const _installMarker = 'spiritpedia.installed';

  final _secure = const FlutterSecureStorage(
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  @override
  Future<void> initialize() async {
    final prefs = SharedPreferencesAsync();
    if (await prefs.getBool(_installMarker) != true) {
      await _secure.delete(key: _sessionKey);
      await prefs.setBool(_installMarker, true);
    }
  }

  @override
  Future<bool> hasAccessToken() => _secure.containsKey(key: _sessionKey);

  @override
  Future<String?> accessToken() => _secure.read(key: _sessionKey);

  @override
  Future<void> removePersistedSession() => _secure.delete(key: _sessionKey);

  @override
  Future<void> persistSession(String persistSessionString) =>
      _secure.write(key: _sessionKey, value: persistSessionString);
}

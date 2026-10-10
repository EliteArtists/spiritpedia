import 'dart:async';

import 'package:spiritpedia/features/account/account_service.dart';

/// An in-memory account backend: users, codes, profiles and user_favourites,
/// with a log of every call — so tests can check what reached "the server".
class FakeAccountService implements AccountService {
  FakeAccountService({this.code = '123456'});

  /// The code every "email" contains.
  final String code;

  final _changes = StreamController<AccountUser?>.broadcast();
  final calls = <String>[];
  final profiles = <String, AccountProfile>{};
  final favouriteRows =
      <String, List<FavouriteRow>>{}; // user id → newest first
  final deletedUsers = <String>{};
  AccountUser? _current;
  bool failDelete = false;
  bool offline = false;

  String _idFor(String email) => 'user-${cleanEmail(email)}';

  /// Sign someone in directly, as a restored session would.
  void restoreSession(String email) {
    _current = AccountUser(id: _idFor(email), email: cleanEmail(email));
    _changes.add(_current);
  }

  @override
  AccountUser? get currentUser => _current;

  @override
  Stream<AccountUser?> get userChanges => _changes.stream;

  @override
  Future<void> sendCode(String email) async {
    calls.add('sendCode:${cleanEmail(email)}');
  }

  @override
  Future<void> verifyCode(String email, String code) async {
    calls.add('verifyCode');
    if (code != this.code) {
      throw const AccountError("That code didn't work. Please try again.");
    }
    restoreSession(email);
  }

  @override
  Future<void> signOut() async {
    calls.add('signOut');
    _current = null;
    _changes.add(null);
  }

  @override
  Future<bool> ensureProfile(String userId) async {
    calls.add('ensureProfile');
    if (profiles.containsKey(userId)) return false;
    profiles[userId] = const AccountProfile(userType: 'explorer');
    return true;
  }

  @override
  Future<AccountProfile?> profile(String userId) async => profiles[userId];

  @override
  Future<void> sendWelcome() async => calls.add('sendWelcome');

  @override
  Future<void> deleteAccount() async {
    calls.add('deleteAccount');
    if (failDelete) {
      throw const AccountError(
        'Your account could not be deleted just now. Nothing was removed — please try again.',
      );
    }
    final id = _current!.id;
    deletedUsers.add(id);
    profiles.remove(id);
    favouriteRows.remove(id);
  }

  void _check() {
    if (offline) throw Exception('offline');
  }

  @override
  Future<List<FavouriteRow>> favourites(String userId) async {
    _check();
    return [...?favouriteRows[userId]];
  }

  @override
  Future<void> addFavourites(String userId, List<FavouriteRow> rows) async {
    _check();
    calls.add('addFavourites:${rows.length}');
    final list = favouriteRows.putIfAbsent(userId, () => []);
    for (final r in rows) {
      if (!list.contains(r)) list.insert(0, r);
    }
  }

  @override
  Future<void> removeFavourite(String userId, FavouriteRow row) async {
    _check();
    calls.add('removeFavourite:${row.contentType}:${row.slug}');
    favouriteRows[userId]?.remove(row);
  }
}

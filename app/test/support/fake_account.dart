import 'dart:async';

import 'package:spiritpedia/data/models.dart';
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
  final interestsByUser = <String, TailoringRow>{};
  bool failDelete = false;
  bool offline = false;

  String _idFor(String email) => 'user-${cleanEmail(email)}';

  /// Sign someone in directly, as a restored session would.
  void restoreSession(String email) {
    // A restored session belongs to an account that already exists.
    profiles.putIfAbsent(
      _idFor(email),
      () => const AccountProfile(userType: 'explorer'),
    );
    _signIn(email);
  }

  /// Signed in by code: a new address becomes a new account.
  void _signIn(String email) {
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
    _signIn(email);
  }

  /// The codes the email change "sends": to the current and new address.
  static const currentAddressCode = '111111';
  static const newAddressCode = '222222';
  String? pendingEmail;
  final _confirmed = <String>{};
  final takenEmails = <String>{};

  @override
  Future<void> requestEmailChange(String newEmail) async {
    calls.add('requestEmailChange:${cleanEmail(newEmail)}');
    if (takenEmails.contains(cleanEmail(newEmail))) {
      throw const AccountError(
        'That email address already belongs to another account.',
      );
    }
    pendingEmail = cleanEmail(newEmail);
    _confirmed.clear();
  }

  @override
  Future<bool> confirmEmailChange(String email, String code) async {
    calls.add('confirmEmailChange:${cleanEmail(email)}');
    final current = _current!;
    final ok =
        (cleanEmail(email) == pendingEmail && code == newAddressCode) ||
        (cleanEmail(email) == current.email && code == currentAddressCode);
    if (!ok || _confirmed.contains(cleanEmail(email))) {
      throw const AccountError("That code didn't work. Please try again.");
    }
    _confirmed.add(cleanEmail(email));
    if (_confirmed.length < 2) return false;
    _current = AccountUser(id: current.id, email: pendingEmail!);
    pendingEmail = null;
    _changes.add(_current);
    return true;
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

  final areasByUser = <String, AreaRow>{};

  @override
  Future<AreaRow?> area(String userId) async {
    if (offline) throw Exception('offline');
    return areasByUser[userId];
  }

  @override
  Future<void> saveArea(String userId, Place? place) async {
    if (offline) throw Exception('offline');
    calls.add('saveArea:${place?.id}');
    areasByUser[userId] = (place: place);
  }

  final learningByUser = <String, bool>{};
  final affinityByUser = <String, List<AffinityRow>>{};

  @override
  Future<bool> learning(String userId) async {
    if (offline) throw Exception('offline');
    return learningByUser[userId] ?? false;
  }

  @override
  Future<void> saveLearning(String userId, bool on) async {
    if (offline) throw Exception('offline');
    calls.add('saveLearning:$on');
    learningByUser[userId] = on;
    // As the database does: off deletes what was learned.
    if (!on) affinityByUser.remove(userId);
  }

  @override
  Future<List<AffinityRow>> affinity(String userId) async {
    if (offline) throw Exception('offline');
    return affinityByUser[userId] ?? const [];
  }

  @override
  Future<void> saveDisplayName(String userId, String? name) async {
    if (offline) throw Exception('offline');
    calls.add('saveDisplayName:$name');
    final p = profiles[userId];
    profiles[userId] = AccountProfile(
      userType: p?.userType ?? 'explorer',
      linkedHealerSlug: p?.linkedHealerSlug,
      fullName: name,
    );
  }

  @override
  Future<void> recordPractitionerIntent(String email) async =>
      calls.add('practitionerIntent:$email');

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
    interestsByUser.remove(id);
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

  final pushTokens = <String, String>{}; // token → user id
  final prefsByUser = <String, NotificationPrefs>{};
  int welcomeCalls = 0;

  @override
  Future<void> registerPushToken(
    String token, {
    required String platform,
  }) async {
    calls.add('registerPushToken:$platform');
    pushTokens[token] = _current!.id;
  }

  @override
  Future<void> removePushToken(String token) async {
    calls.add('removePushToken');
    if (pushTokens[token] == _current?.id) pushTokens.remove(token);
  }

  @override
  Future<NotificationPrefs> notificationPrefs(String userId) async =>
      prefsByUser[userId] ?? const NotificationPrefs();

  @override
  Future<void> saveNotificationPrefs(
    String userId,
    NotificationPrefs prefs,
  ) async {
    calls.add('savePrefs:${prefs.general}:${prefs.iamAffirmations}');
    prefsByUser[userId] = prefs;
  }

  @override
  Future<void> sendWelcomePush() async {
    calls.add('sendWelcomePush');
    welcomeCalls++;
  }

  @override
  Future<TailoringRow?> interests(String userId) async {
    if (offline) throw const AccountError('offline');
    return interestsByUser[userId];
  }

  @override
  Future<void> saveInterests(String userId, TailoringRow row) async {
    if (offline) throw const AccountError('offline');
    calls.add(
      'saveInterests:${row.subjects.join(',')}|${row.hidden.join(',')}',
    );
    interestsByUser[userId] = (
      subjects: [...row.subjects],
      hidden: [...row.hidden],
    );
  }
}

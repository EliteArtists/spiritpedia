import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../data/models.dart';

/// A signed-in person, as the app needs them.
class AccountUser {
  const AccountUser({required this.id, required this.email});

  final String id;
  final String email;
}

/// The person's profile row (user_profiles), the parts the app shows.
class AccountProfile {
  const AccountProfile({
    required this.userType,
    this.linkedHealerSlug,
    this.fullName,
    this.verificationStatus,
  });

  final String userType; // 'explorer' | 'practitioner'
  final String? linkedHealerSlug;

  /// 'pending', 'approved' or 'rejected'. A declined applicant reads explorer
  /// again but keeps 'rejected'.
  final String? verificationStatus;

  /// The name they gave (user_profiles.full_name): greetings and emails.
  final String? fullName;

  bool get isPractitioner => userType == 'practitioner';

  /// Who gets the discovery emails (Day 4 and the personal editions): an
  /// explorer who has never applied and manages no listing — the website's
  /// isExplorerForDay4.
  bool get getsDiscoveryEmails =>
      !isPractitioner &&
      verificationStatus != 'rejected' &&
      linkedHealerSlug == null;
}

/// Which kinds of notification the account wants (notification_preferences).
/// No row = the defaults: general on, IAM affirmations off.
class NotificationPrefs {
  const NotificationPrefs({this.general = true, this.iamAffirmations = false});

  final bool general;
  final bool iamAffirmations;
}

/// One saved item as user_favourites holds it.
typedef FavouriteRow = ({String contentType, String slug});

/// One account's user_interests row: subjects to see more of, and subjects
/// never to show.
typedef TailoringRow = ({List<String> subjects, List<String> hidden});

/// Everything accounts need from Supabase and the website's API routes — an
/// interface so tests can run the whole flow without a network.
///
/// Writes here are the person's OWN rows (user_profiles, user_favourites),
/// made with their own session under the existing row-level security, exactly
/// as the website makes them. Deletion and emails need the server's key, so
/// they go through the website's API routes with the person's access token.
abstract class AccountService {
  AccountUser? get currentUser;

  /// Fires with the person after every sign-in and session restore, and with
  /// null on sign-out.
  Stream<AccountUser?> get userChanges;

  /// Step 1: email a 6-digit code. Creates the account on first use. The
  /// reply is the same whether or not the address already has an account.
  Future<void> sendCode(String email);

  /// Step 2: the code from the email. Throws [AccountError] if it is wrong or
  /// expired.
  Future<void> verifyCode(String email, String code);

  Future<void> signOut();

  /// Change email, step 1. Supabase emails a code to the NEW address and —
  /// with "Secure email change" on, as it is — another to the CURRENT one.
  Future<void> requestEmailChange(String newEmail);

  /// Step 2, once per code: [email] is the address that code was sent to.
  /// True once the change is complete (the last code); false after the first
  /// of two. Throws [AccountError] if the code is wrong or expired.
  Future<bool> confirmEmailChange(String email, String code);

  /// Create the explorer profile if there is none — never overwrite one. True
  /// if it was created just now (a brand new account).
  Future<bool> ensureProfile(String userId);

  Future<AccountProfile?> profile(String userId);

  /// The website's welcome email for a new explorer.
  Future<void> sendWelcome();

  /// "Discovery emails" (email_preferences, migration 0025), through the
  /// website's /api/account/email-preferences: null if it can't be read.
  Future<bool?> discoveryEmailsOn();

  /// Turn them on or off. True if it saved.
  Future<bool> setDiscoveryEmails(bool on);

  /// Notes [email] as joining to share their work (the website's
  /// /api/pending-user-type, as its own sign-up does), so the website's
  /// application flow takes it from there.
  Future<void> recordPractitionerIntent(String email);

  /// Delete the account (POST /api/account/delete). Throws [AccountError].
  Future<void> deleteAccount();

  Future<List<FavouriteRow>> favourites(String userId);
  Future<void> addFavourites(String userId, List<FavouriteRow> rows);
  Future<void> removeFavourite(String userId, FavouriteRow row);

  /// This install's notification token, for the signed-in account
  /// (register_push_token — moves it from another account if needed).
  Future<void> registerPushToken(String token, {required String platform});

  /// Forget this install's token (turning notifications off, signing out).
  Future<void> removePushToken(String token);

  Future<NotificationPrefs> notificationPrefs(String userId);
  Future<void> saveNotificationPrefs(String userId, NotificationPrefs prefs);

  /// The welcome notification (POST /api/push/welcome) — once ever per
  /// account; the server decides, so calling it again does nothing.
  Future<void> sendWelcomePush();

  /// The account's tailoring (user_interests, migrations 0017 and 0018):
  /// More of and Never show. Null if it never chose, which is not the same
  /// as choosing nothing.
  Future<TailoringRow?> interests(String userId);
  Future<void> saveInterests(String userId, TailoringRow row);

  /// The account's area (user_preferences, migration 0019): null if none is
  /// set. [AreaRow.place] null with a row: set, then cleared.
  Future<AreaRow?> area(String userId);
  Future<void> saveArea(String userId, Place? place);

  /// The name used to greet them, here and in emails
  /// (user_profiles.full_name). Null clears it.
  Future<void> saveDisplayName(String userId, String? name);

  /// "Let Spiritpedia learn from what I explore"
  /// (user_preferences.learning_enabled, migration 0021). Off unless turned
  /// on. Turning it off deletes what was learned, in the database.
  Future<bool> learning(String userId);
  Future<void> saveLearning(String userId, bool on);

  /// What has been learned (subject_affinity): each subject's score as last
  /// stored, and when — it halves every 30 days from then.
  Future<List<AffinityRow>> affinity(String userId);
}

/// One account's user_preferences row.
typedef AreaRow = ({Place? place});

/// One learned subject, as stored.
typedef AffinityRow = ({String subject, double score, DateTime updatedAt});

class AccountError implements Exception {
  const AccountError(this.message);

  final String message;

  @override
  String toString() => message;
}

/// The website's cleanEmail(): trimmed, lower case.
String cleanEmail(String email) => email.trim().toLowerCase();

class SupabaseAccountService implements AccountService {
  SupabaseAccountService(
    this._db, {
    required this.apiBaseUrl,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  final SupabaseClient _db;
  final String apiBaseUrl;
  final http.Client _http;

  static AccountUser? _user(User? u) =>
      u == null ? null : AccountUser(id: u.id, email: u.email ?? '');

  @override
  AccountUser? get currentUser => _user(_db.auth.currentUser);

  @override
  Stream<AccountUser?> get userChanges => _db.auth.onAuthStateChange
      .where(
        (s) =>
            s.event == AuthChangeEvent.initialSession ||
            s.event == AuthChangeEvent.signedIn ||
            s.event == AuthChangeEvent.signedOut,
      )
      .map((s) => _user(s.session?.user));

  @override
  Future<void> sendCode(String email) async {
    try {
      await _db.auth.signInWithOtp(
        email: cleanEmail(email),
        shouldCreateUser: true,
      );
    } on AuthException catch (e) {
      throw AccountError(switch ((e.statusCode, e.code)) {
        ('429', _) =>
          'Too many codes requested. Please wait a minute and try again.',
        (_, 'email_address_invalid') =>
          "That email address doesn't look right. Please check it.",
        _ => 'We could not send a code just now. Please try again.',
      });
    }
  }

  @override
  Future<void> verifyCode(String email, String code) async {
    try {
      await _db.auth.verifyOTP(
        email: cleanEmail(email),
        token: code.replaceAll(RegExp(r'\s'), ''),
        type: OtpType.email,
      );
    } on AuthException {
      throw const AccountError("That code didn't work. Please try again.");
    }
  }

  @override
  Future<void> signOut() => _db.auth.signOut(scope: SignOutScope.local);

  @override
  Future<void> requestEmailChange(String newEmail) async {
    try {
      await _db.auth.updateUser(UserAttributes(email: cleanEmail(newEmail)));
    } on AuthException catch (e) {
      throw AccountError(switch ((e.statusCode, e.code)) {
        (_, 'email_exists') =>
          'That email address already belongs to another account.',
        ('429', _) || (_, 'over_email_send_rate_limit') =>
          'Too many codes requested. Please wait a minute and try again.',
        (_, 'email_address_invalid') || (_, 'validation_failed') =>
          "That email address doesn't look right. Please check it.",
        _ => 'We could not send the codes just now. Please try again.',
      });
    }
  }

  @override
  Future<bool> confirmEmailChange(String email, String code) async {
    try {
      // The first of the two codes is accepted without a session; the second
      // returns one, carrying the new address.
      final res = await _db.auth.verifyOTP(
        email: cleanEmail(email),
        token: code.replaceAll(RegExp(r'\s'), ''),
        type: OtpType.emailChange,
      );
      return res.session != null;
    } on AuthException {
      throw const AccountError("That code didn't work. Please try again.");
    }
  }

  @override
  Future<bool> ensureProfile(String userId) async {
    // ONE statement, as the website's ensureProfile: insert … on conflict do
    // nothing. An existing row is left untouched (a practitioner is never
    // reset to explorer), and a row comes back only when it was created.
    final inserted = await _db
        .from('user_profiles')
        .upsert(
          // Where the account was made, for Admin → Activity (0021).
          {'id': userId, 'user_type': 'explorer', 'signup_platform': 'app'},
          onConflict: 'id',
          ignoreDuplicates: true,
        )
        .select('id');
    return inserted.isNotEmpty;
  }

  @override
  Future<AccountProfile?> profile(String userId) async {
    final row = await _db
        .from('user_profiles')
        .select('user_type, linked_healer_slug, full_name, verification_status')
        .eq('id', userId)
        .maybeSingle();
    if (row == null) return null;
    return AccountProfile(
      userType: (row['user_type'] as String?) ?? 'explorer',
      linkedHealerSlug: row['linked_healer_slug'] as String?,
      fullName: (row['full_name'] as String?)?.trim().nullIfEmpty,
      verificationStatus: row['verification_status'] as String?,
    );
  }

  Future<http.Response> _post(String path, [Map<String, Object?>? body]) {
    final token = _db.auth.currentSession?.accessToken;
    if (token == null) throw const AccountError('You are signed out.');
    return _http.post(
      Uri.parse('$apiBaseUrl$path'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(body ?? const {}),
    );
  }

  @override
  Future<void> sendWelcome() async {
    await _post('/api/email/explorer-welcome');
  }

  @override
  Future<void> recordPractitionerIntent(String email) async {
    // No token: the website's own sign-up records it before the code is
    // sent. Only ever "practitioner" for this email; the website reads it
    // back only for the account that signs in with it.
    await _http.post(
      Uri.parse('$apiBaseUrl/api/pending-user-type'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': cleanEmail(email),
        'userType': 'practitioner',
      }),
    );
  }

  @override
  Future<void> deleteAccount() async {
    final http.Response res;
    try {
      res = await _post('/api/account/delete', {
        'confirm': 'DELETE',
        'source': 'app',
      });
    } on AccountError {
      rethrow;
    } catch (_) {
      throw const AccountError(
        'Your account could not be deleted just now. Nothing was removed — please try again.',
      );
    }
    if (res.statusCode == 401) {
      throw const AccountError(
        'Your session has ended. Sign in again, then delete your account.',
      );
    }
    if (res.statusCode != 200) {
      throw const AccountError(
        'Your account could not be deleted just now. Nothing was removed — please try again.',
      );
    }
  }

  @override
  Future<List<FavouriteRow>> favourites(String userId) async {
    final rows = await _db
        .from('user_favourites')
        .select('content_type, content_slug')
        .eq('user_id', userId)
        .order('created_at', ascending: false);
    return [
      for (final r in rows)
        (
          contentType: r['content_type'] as String,
          slug: r['content_slug'] as String,
        ),
    ];
  }

  @override
  Future<void> addFavourites(String userId, List<FavouriteRow> rows) async {
    if (rows.isEmpty) return;
    await _db
        .from('user_favourites')
        .upsert(
          [
            for (final r in rows)
              {
                'user_id': userId,
                'content_type': r.contentType,
                'content_slug': r.slug,
              },
          ],
          onConflict: 'user_id,content_type,content_slug',
          ignoreDuplicates: true,
        );
  }

  @override
  Future<void> registerPushToken(String token, {required String platform}) =>
      _db.rpc(
        'register_push_token',
        params: {'p_token': token, 'p_platform': platform},
      );

  @override
  Future<void> removePushToken(String token) async {
    await _db.from('push_tokens').delete().eq('token', token);
  }

  @override
  Future<NotificationPrefs> notificationPrefs(String userId) async {
    final row = await _db
        .from('notification_preferences')
        .select('general, iam_affirmations')
        .eq('user_id', userId)
        .maybeSingle();
    if (row == null) return const NotificationPrefs();
    return NotificationPrefs(
      general: row['general'] as bool? ?? true,
      iamAffirmations: row['iam_affirmations'] as bool? ?? false,
    );
  }

  @override
  Future<void> saveNotificationPrefs(
    String userId,
    NotificationPrefs prefs,
  ) async {
    await _db.from('notification_preferences').upsert({
      'user_id': userId,
      'general': prefs.general,
      'iam_affirmations': prefs.iamAffirmations,
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    });
  }

  @override
  Future<void> sendWelcomePush() async {
    await _post('/api/push/welcome');
  }

  @override
  Future<bool?> discoveryEmailsOn() async {
    final token = _db.auth.currentSession?.accessToken;
    if (token == null) return null;
    try {
      final res = await _http.get(
        Uri.parse('$apiBaseUrl/api/account/email-preferences'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (res.statusCode != 200) return null;
      return (jsonDecode(res.body) as Map<String, dynamic>)['on'] == true;
    } catch (_) {
      return null;
    }
  }

  @override
  Future<bool> setDiscoveryEmails(bool on) async {
    final token = _db.auth.currentSession?.accessToken;
    if (token == null) return false;
    try {
      final res = await _http.put(
        Uri.parse('$apiBaseUrl/api/account/email-preferences'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'on': on}),
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<TailoringRow?> interests(String userId) async {
    final row = await _db
        .from('user_interests')
        .select('subjects, hidden_subjects')
        .eq('user_id', userId)
        .maybeSingle();
    if (row == null) return null;
    List<String> strings(Object? v) => [
      for (final s in v as List? ?? const [])
        if (s is String) s,
    ];
    return (
      subjects: strings(row['subjects']),
      hidden: strings(row['hidden_subjects']),
    );
  }

  @override
  Future<void> saveInterests(String userId, TailoringRow row) async {
    await _db.from('user_interests').upsert({
      'user_id': userId,
      'subjects': row.subjects,
      'hidden_subjects': row.hidden,
    });
  }

  @override
  Future<AreaRow?> area(String userId) async {
    final row = await _db
        .from('user_preferences')
        .select('place:places(id, name, region, country, lat, lng)')
        .eq('user_id', userId)
        .maybeSingle();
    if (row == null) return null;
    final place = row['place'];
    return (
      place: place is Map<String, dynamic> ? Place.fromJson(place) : null,
    );
  }

  @override
  Future<void> saveArea(String userId, Place? place) async {
    await _db.from('user_preferences').upsert({
      'user_id': userId,
      'area_place_id': place?.id,
    });
  }

  @override
  Future<bool> learning(String userId) async {
    final row = await _db
        .from('user_preferences')
        .select('learning_enabled')
        .eq('user_id', userId)
        .maybeSingle();
    return row?['learning_enabled'] == true;
  }

  @override
  Future<void> saveLearning(String userId, bool on) async {
    await _db.from('user_preferences').upsert({
      'user_id': userId,
      'learning_enabled': on,
    });
  }

  @override
  Future<List<AffinityRow>> affinity(String userId) async {
    final rows = await _db
        .from('subject_affinity')
        .select('subject_slug, score, updated_at')
        .eq('user_id', userId);
    return [
      for (final r in rows)
        (
          subject: r['subject_slug'] as String,
          score: (r['score'] as num).toDouble(),
          updatedAt: DateTime.parse(r['updated_at'] as String),
        ),
    ];
  }

  @override
  Future<void> saveDisplayName(String userId, String? name) async {
    await _db
        .from('user_profiles')
        .update({'full_name': name?.trim().nullIfEmpty})
        .eq('id', userId);
  }

  @override
  Future<void> removeFavourite(String userId, FavouriteRow row) async {
    await _db
        .from('user_favourites')
        .delete()
        .eq('user_id', userId)
        .eq('content_type', row.contentType)
        .eq('content_slug', row.slug);
  }
}

extension on String {
  String? get nullIfEmpty => isEmpty ? null : this;
}

import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

/// A signed-in person, as the app needs them.
class AccountUser {
  const AccountUser({required this.id, required this.email});

  final String id;
  final String email;
}

/// The person's profile row (user_profiles), the parts the app shows.
class AccountProfile {
  const AccountProfile({required this.userType, this.linkedHealerSlug});

  final String userType; // 'explorer' | 'practitioner'
  final String? linkedHealerSlug;

  bool get isPractitioner => userType == 'practitioner';
}

/// One saved item as user_favourites holds it.
typedef FavouriteRow = ({String contentType, String slug});

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

  /// Create the explorer profile if there is none — never overwrite one. True
  /// if it was created just now (a brand new account).
  Future<bool> ensureProfile(String userId);

  Future<AccountProfile?> profile(String userId);

  /// The website's welcome email for a new explorer.
  Future<void> sendWelcome();

  /// Delete the account (POST /api/account/delete). Throws [AccountError].
  Future<void> deleteAccount();

  Future<List<FavouriteRow>> favourites(String userId);
  Future<void> addFavourites(String userId, List<FavouriteRow> rows);
  Future<void> removeFavourite(String userId, FavouriteRow row);
}

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
      throw AccountError(
        e.statusCode == '429'
            ? 'Too many codes requested. Please wait a minute and try again.'
            : 'We could not send a code just now. Please try again.',
      );
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
  Future<bool> ensureProfile(String userId) async {
    // ONE statement, as the website's ensureProfile: insert … on conflict do
    // nothing. An existing row is left untouched (a practitioner is never
    // reset to explorer), and a row comes back only when it was created.
    final inserted = await _db
        .from('user_profiles')
        .upsert(
          {'id': userId, 'user_type': 'explorer'},
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
        .select('user_type, linked_healer_slug')
        .eq('id', userId)
        .maybeSingle();
    if (row == null) return null;
    return AccountProfile(
      userType: (row['user_type'] as String?) ?? 'explorer',
      linkedHealerSlug: row['linked_healer_slug'] as String?,
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
  Future<void> removeFavourite(String userId, FavouriteRow row) async {
    await _db
        .from('user_favourites')
        .delete()
        .eq('user_id', userId)
        .eq('content_type', row.contentType)
        .eq('content_slug', row.slug);
  }
}

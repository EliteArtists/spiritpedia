import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config.dart';
import '../../core/supabase_providers.dart';
import '../library/saved_items.dart';
import 'account_service.dart';

final accountServiceProvider = Provider<AccountService>(
  (ref) => SupabaseAccountService(
    ref.watch(supabaseProvider),
    apiBaseUrl: AppConfig.apiBaseUrl,
  ),
);

enum AccountStatus { signedOut, signedIn }

class AccountState {
  const AccountState.signedOut()
    : status = AccountStatus.signedOut,
      user = null,
      profile = null;
  const AccountState.signedIn(AccountUser this.user, {this.profile})
    : status = AccountStatus.signedIn;

  final AccountStatus status;
  final AccountUser? user;

  /// null until loaded, or if the row could not be read.
  final AccountProfile? profile;

  bool get signedIn => status == AccountStatus.signedIn;
}

/// Who is signed in, and everything that happens when that changes — the
/// app's AuthSync. On every sign-in and restored session: make sure there is a
/// profile row (sending the welcome once, for a new account), then sync My
/// Library with the account. On sign-out: clear the device's saves.
class AccountController extends Notifier<AccountState> {
  String? _syncedUserId;

  AccountService get _service => ref.read(accountServiceProvider);

  @override
  AccountState build() {
    final service = ref.watch(accountServiceProvider);
    final sub = service.userChanges.listen(_onUser);
    ref.onDispose(sub.cancel);
    final user = service.currentUser;
    if (user == null) return const AccountState.signedOut();
    scheduleMicrotask(() => _onUser(user));
    return AccountState.signedIn(user);
  }

  Future<void> _onUser(AccountUser? user) async {
    if (user == null) {
      final previous = state.user?.id ?? _syncedUserId;
      _syncedUserId = null;
      state = const AccountState.signedOut();
      await ref.read(savedItemsProvider.notifier).clearAfterSignOut(previous);
      return;
    }
    if (_syncedUserId == user.id) return; // token refreshes repeat the event
    _syncedUserId = user.id;
    state = AccountState.signedIn(
      user,
      profile: state.user?.id == user.id ? state.profile : null,
    );

    // Saves first: it is the step with something to lose.
    await ref.read(savedItemsProvider.notifier).syncWithAccount(user.id);
    try {
      if (await _service.ensureProfile(user.id)) {
        unawaited(_service.sendWelcome().catchError((_) {}));
      }
      final profile = await _service.profile(user.id);
      if (_syncedUserId == user.id) {
        state = AccountState.signedIn(user, profile: profile);
      }
    } catch (_) {
      // A background repair: the next start tries again.
      _syncedUserId = null;
    }
  }

  Future<void> sendCode(String email) => _service.sendCode(email);

  Future<void> verifyCode(String email, String code) =>
      _service.verifyCode(email, code);

  Future<void> signOut() async {
    await ref
        .read(savedItemsProvider.notifier)
        .clearAfterSignOut(state.user?.id);
    await _service.signOut();
  }

  /// Throws [AccountError] if the server did not delete it — and then nothing
  /// on the phone is cleared either.
  Future<void> deleteAccount() async {
    await _service.deleteAccount();
    await ref.read(savedItemsProvider.notifier).clearAll();
    try {
      await _service.signOut();
    } catch (_) {
      // The account no longer exists on the server; the local session is
      // removed regardless.
    }
  }
}

final accountProvider = NotifierProvider<AccountController, AccountState>(
  AccountController.new,
);

final signedInUserIdProvider = Provider<String?>(
  (ref) => ref.watch(accountProvider).user?.id,
);

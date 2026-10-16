import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config.dart';
import '../../core/supabase_providers.dart';
import '../interests/interests.dart';
import '../library/saved_items.dart';
import '../notifications/notifications_controller.dart';
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
      profile = null,
      isNew = false;
  const AccountState.signedIn(
    AccountUser this.user, {
    this.profile,
    this.isNew = false,
  }) : status = AccountStatus.signedIn;

  final AccountStatus status;
  final AccountUser? user;

  /// null until loaded, or if the row could not be read.
  final AccountProfile? profile;

  /// A brand-new account that has not yet said how it will use Spiritpedia
  /// ("How will you use Spiritpedia?", [AccountController.chooseExploring],
  /// [AccountController.chooseSharing]). Its welcome waits for the answer.
  final bool isNew;

  bool get signedIn => status == AccountStatus.signedIn;
}

/// Who is signed in, and everything that happens when that changes — the
/// app's AuthSync. On every sign-in and restored session: make sure there is a
/// profile row (sending the welcome once, for a new account), then sync My
/// Library and the chosen interests with the account. On sign-out: clear the
/// device's saves and interests.
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
      // Both read before the first wait: the ref may be gone after it.
      final saved = ref.read(savedItemsProvider.notifier);
      final interests = ref.read(interestsProvider.notifier);
      await saved.clearAfterSignOut(previous);
      await interests.clearAfterSignOut(previous);
      return;
    }
    if (_syncedUserId == user.id) {
      // Token refreshes repeat the event; a changed email arrives this way.
      if (state.user?.email != user.email) {
        state = AccountState.signedIn(
          user,
          profile: state.profile,
          isNew: state.isNew,
        );
      }
      return;
    }
    _syncedUserId = user.id;
    state = AccountState.signedIn(
      user,
      profile: state.user?.id == user.id ? state.profile : null,
    );

    // Saves first: it is the step with something to lose.
    final interests = ref.read(interestsProvider.notifier);
    await ref.read(savedItemsProvider.notifier).syncWithAccount(user.id);
    await interests.syncWithAccount(user.id);
    try {
      // A new account is asked how it will use Spiritpedia first; the
      // welcome follows the answer.
      final created = await _service.ensureProfile(user.id);
      final profile = await _service.profile(user.id);
      if (_syncedUserId == user.id) {
        state = AccountState.signedIn(user, profile: profile, isNew: created);
      }
    } catch (_) {
      // A background repair: the next start tries again.
      _syncedUserId = null;
    }
  }

  /// "I'm exploring" — or the question put away: the explorer welcome,
  /// and the app carries on as it is.
  Future<void> chooseExploring() async {
    final user = state.user;
    if (user == null || !state.isNew) return;
    state = AccountState.signedIn(user, profile: state.profile);
    try {
      await _service.sendWelcome();
    } catch (_) {}
  }

  /// "I share my work": the account is noted as a practitioner-to-be by its
  /// email (the website's pending_user_types), so signing in on the website
  /// takes them to its application and makes them a practitioner there. The
  /// caller opens the website. No explorer welcome: the website sends the
  /// practitioner one.
  Future<void> chooseSharing() async {
    final user = state.user;
    if (user == null || !state.isNew) return;
    state = AccountState.signedIn(user, profile: state.profile);
    try {
      await _service.recordPractitionerIntent(user.email);
    } catch (_) {}
  }

  Future<void> sendCode(String email) => _service.sendCode(email);

  Future<void> verifyCode(String email, String code) =>
      _service.verifyCode(email, code);

  Future<void> requestEmailChange(String newEmail) =>
      _service.requestEmailChange(newEmail);

  /// True once the email has changed; the account then shows the new one.
  Future<bool> confirmEmailChange(String email, String code) async {
    final done = await _service.confirmEmailChange(email, code);
    final user = _service.currentUser;
    if (done && user != null) {
      state = AccountState.signedIn(user, profile: state.profile);
    }
    return done;
  }

  Future<void> signOut() async {
    // Notifications first, while still signed in: row-level security lets
    // only the owner remove their device token.
    final saved = ref.read(savedItemsProvider.notifier);
    final interests = ref.read(interestsProvider.notifier);
    final userId = state.user?.id;
    await ref.read(notificationsProvider.notifier).forgetThisPhone();
    await saved.clearAfterSignOut(userId);
    await interests.clearAfterSignOut(userId);
    await _service.signOut();
  }

  /// Throws [AccountError] if the server did not delete it — and then nothing
  /// on the phone is cleared either.
  Future<void> deleteAccount() async {
    final interests = ref.read(interestsProvider.notifier);
    await _service.deleteAccount();
    // The server removed the device token with the account; this clears it
    // from Firebase and the phone.
    await ref
        .read(notificationsProvider.notifier)
        .forgetThisPhone(fromAccount: false);
    await ref.read(savedItemsProvider.notifier).clearAll();
    await interests.clearAll();
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

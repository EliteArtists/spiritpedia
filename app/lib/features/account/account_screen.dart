import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config.dart';
import '../../core/links/open_link.dart';
import '../../data/providers.dart';
import '../../theme/colors.dart';
import '../detail/detail_widgets.dart';
import '../interests/interests.dart';
import '../interests/interests_picker.dart';
import '../learning/learning.dart';
import '../intro/intro_overlay.dart';
import '../notifications/notifications_section.dart';
import '../reviews/reviews_providers.dart';
import '../reviews/reviews_service.dart';
import '../area/area.dart';
import '../star/conductor.dart';
import '../star/star_layer.dart';
import 'account_providers.dart';
import 'display_name.dart';
import 'account_service.dart';

const supportEmail = 'love@spiritpedia.co';

/// The Account tab: sign in with an emailed code, or — signed in — the
/// account, sign out and delete. Explorers only; practitioners manage their
/// profile on the website.
class AccountScreen extends ConsumerStatefulWidget {
  const AccountScreen({super.key, this.show});

  /// A part of the page to bring into view on opening: 'notifications' (the
  /// menu's Notifications, /account?show=notifications).
  final String? show;

  @override
  ConsumerState<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends ConsumerState<AccountScreen> {
  final _notifications = GlobalKey(debugLabel: 'notifications');

  @override
  void initState() {
    super.initState();
    if (widget.show == 'notifications') {
      // After the first frames, when the section has its place.
      Future<void>.delayed(const Duration(milliseconds: 350), () {
        final target = _notifications.currentContext;
        if (!mounted || target == null || !target.mounted) return;
        Scrollable.ensureVisible(
          target,
          alignment: 0.15,
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : const Duration(milliseconds: 400),
          curve: Curves.easeOutCubic,
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final account = ref.watch(accountProvider);
    return Scaffold(
      appBar: AppBar(),
      body: WithHomeStar(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            20,
            0,
            20,
            40 + FloatingHomeStar.clearance,
          ),
          children: [
            Text(
              account.signedIn ? 'My Account' : 'Your account',
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 20),
            if (account.signedIn)
              _SignedIn(account: account, notificationsKey: _notifications)
            else ...[
              const SignInForm(),
              const SizedBox(height: 28),
              const TailorCard(),
            ],
            const SizedBox(height: 36),
            const _Links(),
            // Never in a release build — TestFlight and the App Store.
            if (kDebugMode) const _DebugTools(),
          ],
        ),
      ),
    );
  }
}

// ── Signing in ───────────────────────────────────────────────────────────────

/// Two steps, as on the website: an email address, then the 6-digit code.
/// There is no separate sign-up — a new address becomes an account.
class SignInForm extends ConsumerStatefulWidget {
  const SignInForm({super.key, this.intro});

  /// The words above the email field; the account page's own by default.
  final String? intro;

  @override
  ConsumerState<SignInForm> createState() => _SignInFormState();
}

class _SignInFormState extends ConsumerState<SignInForm> {
  // Set by Supabase (Authentication → Providers → Email → Email OTP Length);
  // the website's verify page uses the same number.
  static const codeLength = 6;

  final _email = TextEditingController();
  final _code = TextEditingController();
  String? _sentTo;
  bool _busy = false;
  String? _error;
  String? _notice;

  static final _emailShape = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      await action();
    } on AccountError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Something went wrong. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _send() async {
    final email = cleanEmail(_email.text);
    if (!_emailShape.hasMatch(email)) {
      setState(() => _error = 'Please enter your email address.');
      return;
    }
    await _run(() async {
      await ref.read(accountProvider.notifier).sendCode(email);
      if (mounted) setState(() => _sentTo = email);
    });
  }

  Future<void> _verify() async {
    final code = _code.text.trim();
    if (code.length != codeLength || _sentTo == null) return;
    await _run(() async {
      try {
        await ref.read(accountProvider.notifier).verifyCode(_sentTo!, code);
      } on AccountError {
        _code.clear();
        rethrow;
      }
    });
  }

  Future<void> _resend() async {
    await _run(() async {
      await ref.read(accountProvider.notifier).sendCode(_sentTo!);
      if (mounted) setState(() => _notice = 'Code resent');
    });
  }

  @override
  Widget build(BuildContext context) {
    final sentTo = _sentTo;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          sentTo == null
              ? widget.intro ?? 'Sign in to keep your saved teachers, books and videos on every device — here and on spiritpedia.co. No password: we email you a code.'
              : 'Enter the $codeLength-digit code we sent to $sentTo.',
          style: const TextStyle(
            fontSize: 15,
            height: 1.5,
            color: SpColors.textMuted,
          ),
        ),
        const SizedBox(height: 20),
        if (sentTo == null) ...[
          TextField(
            key: const ValueKey('email-field'),
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            // NO autofillHints here. With AutofillHints.email, iOS AutoFill
            // offered suggestions on this field and, in testing on the live
            // build, stopped turning key presses into text after the first
            // character (the log showed ~37 presses received, 2 inserted).
            // A plain email field, suggestions off, types normally.
            autocorrect: false,
            enableSuggestions: false,
            textInputAction: TextInputAction.send,
            onSubmitted: (_) => _send(),
            decoration: _fieldDecoration('Email address'),
          ),
          const SizedBox(height: 14),
          _PrimaryButton(
            label: _busy ? 'Sending…' : 'Email me a code',
            onPressed: _busy ? null : _send,
          ),
        ] else ...[
          TextField(
            key: const ValueKey('code-field'),
            controller: _code,
            autofocus: true,
            keyboardType: TextInputType.number,
            autofillHints: const [AutofillHints.oneTimeCode],
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(codeLength),
            ],
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 26,
              letterSpacing: 10,
              fontWeight: FontWeight.w600,
            ),
            // Filling the last digit is the submission, as on the website.
            onChanged: (v) {
              if (v.length == codeLength) _verify();
            },
            decoration: _fieldDecoration('••••••'),
          ),
          const SizedBox(height: 14),
          _PrimaryButton(
            label: _busy ? 'Checking…' : 'Sign in',
            onPressed: _busy ? null : _verify,
          ),
          const SizedBox(height: 6),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: _busy ? null : _resend,
                style: TextButton.styleFrom(foregroundColor: SpColors.link),
                child: const Text('Resend code'),
              ),
              TextButton(
                onPressed: _busy
                    ? null
                    : () => setState(() {
                        _sentTo = null;
                        _code.clear();
                        _error = null;
                        _notice = null;
                      }),
                style: TextButton.styleFrom(
                  foregroundColor: SpColors.textMuted,
                ),
                child: const Text('Use a different email'),
              ),
            ],
          ),
        ],
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Text(
              _error!,
              style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 14),
            ),
          ),
        if (_notice != null && _error == null)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Text(
              _notice!,
              style: const TextStyle(color: Color(0xFF34D399), fontSize: 14),
            ),
          ),
      ],
    );
  }
}

InputDecoration _fieldDecoration(String hint) => InputDecoration(
  hintText: hint,
  hintStyle: const TextStyle(color: SpColors.textFaint),
  filled: true,
  fillColor: SpColors.surface,
  contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
  border: OutlineInputBorder(
    borderRadius: BorderRadius.circular(14),
    borderSide: const BorderSide(color: SpColors.border),
  ),
  enabledBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(14),
    borderSide: const BorderSide(color: SpColors.border),
  ),
  focusedBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(14),
    borderSide: const BorderSide(color: SpColors.primary, width: 1.5),
  ),
);

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton({required this.label, required this.onPressed});

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 52,
    child: FilledButton(
      onPressed: onPressed,
      child: Text(label, style: const TextStyle(fontSize: 16)),
    ),
  );
}

// ── Signed in ────────────────────────────────────────────────────────────────

class _SignedIn extends ConsumerStatefulWidget {
  const _SignedIn({required this.account, this.notificationsKey});

  final AccountState account;
  final GlobalKey? notificationsKey;

  @override
  ConsumerState<_SignedIn> createState() => _SignedInState();
}

class _SignedInState extends ConsumerState<_SignedIn> {
  bool _signingOut = false;
  bool _changingEmail = false;

  @override
  Widget build(BuildContext context) {
    final user = widget.account.user!;
    final profile = widget.account.profile;
    Widget row(String label, Widget value) => Padding(
      padding: const EdgeInsets.fromLTRB(18, 6, 8, 6),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 40),
        child: Row(
          children: [
            Text(
              label,
              style: const TextStyle(color: SpColors.textMuted, fontSize: 14),
            ),
            const SizedBox(width: 16),
            Expanded(child: value),
          ],
        ),
      ),
    );
    const valueStyle = TextStyle(fontSize: 14, fontWeight: FontWeight.w500);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Card(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              row(
                'Email',
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Flexible(
                      child: Text(
                        user.email,
                        textAlign: TextAlign.right,
                        overflow: TextOverflow.ellipsis,
                        style: valueStyle,
                      ),
                    ),
                    if (!_changingEmail)
                      TextButton(
                        key: const ValueKey('change-email'),
                        onPressed: () => setState(() => _changingEmail = true),
                        style: TextButton.styleFrom(
                          foregroundColor: SpColors.link,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          minimumSize: const Size(0, 36),
                        ),
                        child: const Text('Change'),
                      )
                    else
                      const SizedBox(width: 10),
                  ],
                ),
              ),
              const Divider(height: 1),
              row(
                'Account type',
                Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: Text(
                    profile?.isPractitioner == true
                        ? 'Practitioner'
                        : 'Explorer',
                    textAlign: TextAlign.right,
                    style: valueStyle,
                  ),
                ),
              ),
            ],
          ),
        ),
        if (_changingEmail) ...[
          const SizedBox(height: 12),
          ChangeEmailForm(
            currentEmail: user.email,
            onClose: () => setState(() => _changingEmail = false),
          ),
        ],
        const SizedBox(height: 10),
        const Text(
          'Your saved items are kept with your account and match on spiritpedia.co.',
          style: TextStyle(
            fontSize: 13,
            color: SpColors.textFaint,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 22),
        const NameCard(),
        const SizedBox(height: 12),
        const TailorCard(),
        const SizedBox(height: 22),
        KeyedSubtree(
          key: widget.notificationsKey,
          child: const NotificationsSection(),
        ),
        const _BlockedReviewers(),
        if (profile?.isPractitioner == true) ...[
          const SizedBox(height: 12),
          _Note(
            text: 'Your practitioner profile is managed on the website.',
            action: 'Open spiritpedia.co/account',
            url: '${AppConfig.siteUrl}/account',
          ),
        ],
        const SizedBox(height: 28),
        SizedBox(
          height: 50,
          child: OutlinedButton(
            onPressed: _signingOut
                ? null
                : () async {
                    setState(() => _signingOut = true);
                    await ref.read(accountProvider.notifier).signOut();
                  },
            style: OutlinedButton.styleFrom(
              foregroundColor: SpColors.text,
              side: const BorderSide(color: SpColors.border),
              shape: const StadiumBorder(),
            ),
            child: Text(_signingOut ? 'Signing out…' : 'Sign out'),
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Signing out removes your saved items from this phone. They stay in your account.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12.5, color: SpColors.textFaint),
        ),
        const SizedBox(height: 14),
        _DeleteAccount(hasListing: profile?.linkedHealerSlug != null),
      ],
    );
  }
}

/// "Tailor Spiritpedia": More of and Never show, and the way back into the
/// picker. Signed in or out — the choice works either way.
class TailorCard extends ConsumerWidget {
  const TailorCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = tailoringSummary(
      ref.watch(interestsProvider),
      ref.watch(subjectsProvider).value,
    );
    return _Card(
      padding: EdgeInsets.zero,
      child: ListTile(
        key: const ValueKey('account-tailor'),
        onTap: () => context.push('/tailor'),
        contentPadding: const EdgeInsets.fromLTRB(18, 6, 12, 6),
        leading: const Icon(Icons.tune_rounded, color: SpColors.link),
        minLeadingWidth: 24,
        title: const Text(
          'Tailor Spiritpedia',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          summary ?? 'Subjects to see more of, or never',
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 13, color: SpColors.textMuted),
        ),
        trailing: const Icon(
          Icons.chevron_right_rounded,
          color: SpColors.textMuted,
        ),
      ),
    );
  }
}

/// "Your name": the name Spiritpedia greets them by, here and in its emails
/// (user_profiles.full_name). Editable, and clearable.
class NameCard extends ConsumerStatefulWidget {
  const NameCard({super.key});

  @override
  ConsumerState<NameCard> createState() => _NameCardState();
}

class _NameCardState extends ConsumerState<NameCard> {
  bool _editing = false;
  final _name = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    await ref.read(displayNameProvider.notifier).set(_name.text);
    if (mounted) setState(() => _editing = false);
  }

  @override
  Widget build(BuildContext context) {
    final name = ref.watch(displayNameProvider);
    return _Card(
      child: Column(
        key: const ValueKey('account-name'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _CardTitle('Your name'),
          const SizedBox(height: 4),
          const Text(
            'Used only to greet you here and in our emails.',
            style: TextStyle(fontSize: 13, color: SpColors.textMuted),
          ),
          const SizedBox(height: 10),
          if (_editing) ...[
            TextField(
              key: const ValueKey('account-name-field'),
              controller: _name,
              autofocus: true,
              maxLength: maxNameLength,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _save(),
              decoration: _fieldDecoration('Your name'),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => setState(() => _editing = false),
                  style: TextButton.styleFrom(
                    foregroundColor: SpColors.textMuted,
                  ),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  key: const ValueKey('account-name-save'),
                  onPressed: _save,
                  style: TextButton.styleFrom(foregroundColor: SpColors.link),
                  child: const Text(
                    'Save',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ] else
            Row(
              children: [
                Expanded(
                  child: Text(
                    name ?? 'Not set',
                    style: TextStyle(
                      fontSize: 16,
                      color: name == null ? SpColors.textFaint : SpColors.text,
                    ),
                  ),
                ),
                TextButton(
                  key: const ValueKey('account-name-edit'),
                  onPressed: () => setState(() {
                    _name.text = name ?? '';
                    _editing = true;
                  }),
                  style: TextButton.styleFrom(foregroundColor: SpColors.link),
                  child: Text(name == null ? 'Add' : 'Change'),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

/// A rounded card on the page's surface colour: every group on this screen.
class _Card extends StatelessWidget {
  const _Card({
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(18, 16, 18, 14),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  // A Material, not a coloured box: switches and list rows ink on it.
  @override
  Widget build(BuildContext context) => Material(
    color: SpColors.surface,
    borderRadius: BorderRadius.circular(16),
    clipBehavior: Clip.antiAlias,
    child: Padding(padding: padding, child: child),
  );
}

class _CardTitle extends StatelessWidget {
  const _CardTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
  );
}

/// Reviewers this person blocked, to unblock. Only shown when there are any.
class _BlockedReviewers extends ConsumerWidget {
  const _BlockedReviewers();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final blocked = ref.watch(blockedReviewersProvider).value ?? const [];
    if (blocked.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: _Card(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _CardTitle('Blocked reviewers'),
            const SizedBox(height: 4),
            const Text(
              "You don't see their reviews.",
              style: TextStyle(fontSize: 13, color: SpColors.textFaint),
            ),
            const SizedBox(height: 6),
            for (final b in blocked)
              Row(
                children: [
                  Expanded(
                    child: Text(b.name, style: const TextStyle(fontSize: 14)),
                  ),
                  TextButton(
                    key: ValueKey('unblock-${b.id}'),
                    onPressed: () => _unblock(context, ref, b),
                    style: TextButton.styleFrom(foregroundColor: SpColors.link),
                    child: const Text('Unblock'),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _unblock(
    BuildContext context,
    WidgetRef ref,
    BlockedReviewer b,
  ) async {
    final userId = ref.read(signedInUserIdProvider);
    if (userId == null) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(reviewsServiceProvider).unblock(userId, b.id);
    } catch (_) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text('That could not be done just now. Please try again.'),
        ),
      );
      return;
    }
    ref.invalidate(blockedReviewersProvider);
    ref.invalidate(reviewsProvider);
    messenger.showSnackBar(SnackBar(content: Text('${b.name} is unblocked.')));
  }
}

/// Change email: the new address, then two codes — one sent to the new
/// address, one to the current (Supabase's "Secure email change"). The email
/// changes only when both are in. A code already accepted is not asked for
/// again, so a mistyped second code does not mean starting over.
class ChangeEmailForm extends ConsumerStatefulWidget {
  const ChangeEmailForm({
    super.key,
    required this.currentEmail,
    required this.onClose,
  });

  final String currentEmail;
  final VoidCallback onClose;

  @override
  ConsumerState<ChangeEmailForm> createState() => _ChangeEmailFormState();
}

class _ChangeEmailFormState extends ConsumerState<ChangeEmailForm> {
  static const codeLength = _SignInFormState.codeLength;
  static final _emailShape = _SignInFormState._emailShape;

  final _email = TextEditingController();
  final _newCode = TextEditingController();
  final _currentCode = TextEditingController();
  String? _sentTo;
  bool _newDone = false;
  bool _currentDone = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _newCode.dispose();
    _currentCode.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final email = cleanEmail(_email.text);
    if (!_emailShape.hasMatch(email)) {
      setState(() => _error = 'Please enter the new email address.');
      return;
    }
    if (email == cleanEmail(widget.currentEmail)) {
      setState(() => _error = "That's already your email address.");
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(accountProvider.notifier).requestEmailChange(email);
      if (mounted) setState(() => _sentTo = email);
    } on AccountError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Something went wrong. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirm() async {
    final newCode = _newCode.text.trim();
    final currentCode = _currentCode.text.trim();
    if ((!_newDone && newCode.length != codeLength) ||
        (!_currentDone && currentCode.length != codeLength)) {
      setState(() => _error = 'Enter both $codeLength-digit codes.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final account = ref.read(accountProvider.notifier);
    var done = false;
    try {
      if (!_newDone) {
        try {
          done = await account.confirmEmailChange(_sentTo!, newCode);
          _newDone = true;
        } on AccountError {
          _newCode.clear();
          throw const AccountError(
            "The code sent to your new address didn't work. Please check it.",
          );
        }
      }
      if (!done && !_currentDone) {
        try {
          done = await account.confirmEmailChange(
            widget.currentEmail,
            currentCode,
          );
          _currentDone = true;
        } on AccountError {
          _currentCode.clear();
          throw const AccountError(
            "The code sent to your current address didn't work. Please check it.",
          );
        }
      }
      if (!mounted) return;
      if (done) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Your email is now $_sentTo.')));
        widget.onClose();
      }
    } on AccountError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Something went wrong. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _codeField(
    TextEditingController controller,
    String label,
    Key key, {
    required bool done,
  }) => Padding(
    padding: const EdgeInsets.only(top: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 13.5, color: SpColors.textMuted),
        ),
        const SizedBox(height: 6),
        if (done)
          const Row(
            children: [
              Icon(Icons.check_circle, size: 18, color: Color(0xFF34D399)),
              SizedBox(width: 6),
              Text('Confirmed', style: TextStyle(color: Color(0xFF34D399))),
            ],
          )
        else
          TextField(
            key: key,
            controller: controller,
            keyboardType: TextInputType.number,
            autofillHints: const [AutofillHints.oneTimeCode],
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(codeLength),
            ],
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 22,
              letterSpacing: 8,
              fontWeight: FontWeight.w600,
            ),
            decoration: _fieldDecoration('••••••'),
          ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final sentTo = _sentTo;
    return _Card(
      child: Column(
        key: const ValueKey('change-email-form'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _CardTitle('Change email'),
          const SizedBox(height: 6),
          Text(
            sentTo == null
                ? "We'll send a code to the new address, and another to ${widget.currentEmail} to check it's you."
                : 'Enter the two $codeLength-digit codes we sent. Your email changes once both are in.',
            style: const TextStyle(
              fontSize: 13.5,
              height: 1.5,
              color: SpColors.textMuted,
            ),
          ),
          if (sentTo == null) ...[
            const SizedBox(height: 12),
            TextField(
              key: const ValueKey('new-email-field'),
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              enableSuggestions: false,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _send(),
              decoration: _fieldDecoration('New email address'),
            ),
          ] else ...[
            _codeField(
              _newCode,
              'Code sent to $sentTo',
              const ValueKey('new-address-code'),
              done: _newDone,
            ),
            _codeField(
              _currentCode,
              'Code sent to ${widget.currentEmail}',
              const ValueKey('current-address-code'),
              done: _currentDone,
            ),
          ],
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                _error!,
                style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 14),
              ),
            ),
          const SizedBox(height: 14),
          Row(
            children: [
              FilledButton(
                key: const ValueKey('change-email-go'),
                onPressed: _busy ? null : (sentTo == null ? _send : _confirm),
                child: Text(
                  _busy
                      ? (sentTo == null ? 'Sending…' : 'Checking…')
                      : (sentTo == null ? 'Send codes' : 'Change email'),
                ),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: _busy ? null : widget.onClose,
                style: TextButton.styleFrom(
                  foregroundColor: SpColors.textMuted,
                ),
                child: const Text('Cancel'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.text, required this.action, required this.url});

  final String text;
  final String action;
  final String url;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: const Color(0x1A7C3AED),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: const Color(0x4D7C3AED)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(text, style: const TextStyle(fontSize: 14, height: 1.5)),
        TextButton(
          onPressed: () => openExternal(context, url),
          style: TextButton.styleFrom(
            padding: EdgeInsets.zero,
            foregroundColor: SpColors.link,
          ),
          child: Text(action),
        ),
      ],
    ),
  );
}

/// Delete account — Apple requires it in the app. The same two steps as the
/// website: an explanation of exactly what goes and what stays, then typing
/// DELETE. POST /api/account/delete does the work.
class _DeleteAccount extends ConsumerStatefulWidget {
  const _DeleteAccount({required this.hasListing});

  final bool hasListing;

  @override
  ConsumerState<_DeleteAccount> createState() => _DeleteAccountState();
}

class _DeleteAccountState extends ConsumerState<_DeleteAccount> {
  bool _open = false;
  bool _deleting = false;
  String? _error;
  final _typed = TextEditingController();

  @override
  void dispose() {
    _typed.dispose();
    super.dispose();
  }

  Future<void> _delete() async {
    if (_typed.text.trim() != 'DELETE' || _deleting) return;
    setState(() {
      _deleting = true;
      _error = null;
    });
    try {
      await ref.read(accountProvider.notifier).deleteAccount();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your account has been deleted.')),
      );
    } on AccountError catch (e) {
      if (mounted) {
        setState(() {
          _deleting = false;
          _error = e.message;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_open) {
      return SizedBox(
        height: 50,
        child: FilledButton(
          key: const ValueKey('delete-account'),
          onPressed: () => setState(() => _open = true),
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFFDC2626),
            foregroundColor: Colors.white,
            shape: const StadiumBorder(),
          ),
          child: const Text('Delete account'),
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0x14DC2626),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x66EF4444)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'This permanently deletes your account, your saved items and any reviews you have written. It cannot be undone.',
            style: TextStyle(
              fontSize: 14,
              height: 1.5,
              color: Color(0xFFD1D5DB),
            ),
          ),
          if (widget.hasListing) ...[
            const SizedBox(height: 8),
            const Text(
              'Your public teacher profile stays on Spiritpedia, unclaimed. We will remove the contact details and photos you added to it. If you would like the profile removed entirely, email $supportEmail.',
              style: TextStyle(
                fontSize: 14,
                height: 1.5,
                color: Color(0xFFD1D5DB),
              ),
            ),
          ],
          const SizedBox(height: 14),
          const Text(
            'Type DELETE to confirm',
            style: TextStyle(fontSize: 13.5, color: SpColors.textMuted),
          ),
          const SizedBox(height: 8),
          TextField(
            key: const ValueKey('confirm-delete'),
            controller: _typed,
            autocorrect: false,
            textCapitalization: TextCapitalization.characters,
            onChanged: (_) => setState(() {}),
            decoration: _fieldDecoration('DELETE'),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                _error!,
                style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 14),
              ),
            ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton(
                onPressed: _typed.text.trim() == 'DELETE' && !_deleting
                    ? _delete
                    : null,
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFDC2626),
                ),
                child: Text(_deleting ? 'Deleting…' : 'Delete my account'),
              ),
              TextButton(
                onPressed: _deleting
                    ? null
                    : () => setState(() {
                        _open = false;
                        _typed.clear();
                        _error = null;
                      }),
                style: TextButton.styleFrom(
                  foregroundColor: SpColors.textMuted,
                ),
                child: const Text('Cancel'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Debug builds only ────────────────────────────────────────────────────────

/// Tools for checking first-launch screens without reinstalling. Compiled
/// out of release builds: kDebugMode is a constant false there.
class _DebugTools extends ConsumerWidget {
  const _DebugTools();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.only(top: 28),
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0x66F59E0B)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'DEBUG BUILD ONLY',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
                color: Color(0xFFF59E0B),
              ),
            ),
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton.icon(
                onPressed: () {
                  // Start the replay before leaving: Account (and its ref)
                  // is gone once Home is showing.
                  replayFirstLaunch(ref);
                  GoRouter.of(context).go('/');
                },
                icon: const Icon(Icons.replay, size: 18),
                label: const Text('Replay intro'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: SpColors.text,
                  side: const BorderSide(color: SpColors.border),
                  shape: const StadiumBorder(),
                ),
              ),
            ),
            const SizedBox(height: 14),
            const _StarVisits(),
          ],
        ),
      ),
    );
  }
}

/// DEBUG BUILDS ONLY: the star's visit count (lib/features/star/conductor.dart)
/// and its questions, to test them without waiting for real visits.
class _StarVisits extends ConsumerStatefulWidget {
  const _StarVisits();

  @override
  ConsumerState<_StarVisits> createState() => _StarVisitsState();
}

class _StarVisitsState extends ConsumerState<_StarVisits> {
  String? _note;

  Future<void> _set(int visit, StarAsk ask) async {
    final conductor = ref.read(conductorProvider.notifier);
    final signedIn = ref.read(signedInUserIdProvider) != null;
    final learning = ref.read(learningProvider);
    final answered = switch (ask) {
      StarAsk.learning => !signedIn || learning,
      StarAsk.area => ref.read(areaProvider).place != null,
      StarAsk.name => ref.read(displayNameProvider) != null,
    };
    await conductor.debugSetVisit(visit, ask);
    if (!mounted) return;
    setState(
      () => _note = ask == StarAsk.learning && answered
          ? 'Visit $visit — but the star only asks to learn when you’re '
                'signed in with learning off.'
          : answered
          ? 'Visit $visit — but the ${ask.name} is already set, so the star '
                'won’t ask. Reset first.'
          : 'Visit $visit. Go back to Discover: the star asks after about '
                '3 seconds — the first question not yet answered, in order: '
                'learning, area, name.',
    );
  }

  Future<void> _reset() async {
    final area = ref.read(areaProvider.notifier);
    final name = ref.read(displayNameProvider.notifier);
    final conductor = ref.read(conductorProvider.notifier);
    await area.set(null);
    await name.set(null);
    await conductor.debugReset();
    if (mounted) {
      setState(
        () => _note =
            'Cleared: area, name, “Not now” answers and the count. The next '
            'launch is visit 1.',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final visit = ref.watch(conductorProvider).visit;
    final style = OutlinedButton.styleFrom(
      foregroundColor: SpColors.text,
      side: const BorderSide(color: SpColors.border),
      shape: const StadiumBorder(),
      visualDensity: VisualDensity.compact,
    );
    return Column(
      key: const ValueKey('debug-star-visits'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Star visits: $visit',
          key: const ValueKey('debug-visit-count'),
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 2),
        const Text(
          'Learning question from visit 3 (signed in), area from 5, name '
          'from 7.',
          style: TextStyle(fontSize: 12.5, color: SpColors.textMuted),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 6,
          children: [
            OutlinedButton(
              key: const ValueKey('debug-visit-3'),
              onPressed: () => _set(3, StarAsk.learning),
              style: style,
              child: const Text('Set to 3'),
            ),
            OutlinedButton(
              key: const ValueKey('debug-visit-5'),
              onPressed: () => _set(5, StarAsk.area),
              style: style,
              child: const Text('Set to 5'),
            ),
            OutlinedButton(
              key: const ValueKey('debug-visit-7'),
              onPressed: () => _set(7, StarAsk.name),
              style: style,
              child: const Text('Set to 7'),
            ),
            OutlinedButton(
              key: const ValueKey('debug-star-reset'),
              onPressed: _reset,
              style: style,
              child: const Text('Reset star questions'),
            ),
          ],
        ),
        if (_note != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              _note!,
              style: const TextStyle(fontSize: 12.5, color: SpColors.textMuted),
            ),
          ),
      ],
    );
  }
}

// ── Links ────────────────────────────────────────────────────────────────────

class _Links extends StatelessWidget {
  const _Links();

  @override
  Widget build(BuildContext context) {
    final links = [
      ('Privacy Policy', '${AppConfig.siteUrl}/privacy'),
      ('Terms of Use', '${AppConfig.siteUrl}/terms'),
      ('Affiliate disclosure', '${AppConfig.siteUrl}/affiliate-disclosure'),
      ('Contact us · $supportEmail', 'mailto:$supportEmail'),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final (label, url) in links)
          TextButton(
            onPressed: () => openExternal(context, url),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 6),
              foregroundColor: SpColors.textMuted,
            ),
            child: Text(label, style: const TextStyle(fontSize: 14)),
          ),
      ],
    );
  }
}

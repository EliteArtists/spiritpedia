import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config.dart';
import '../../core/links/open_link.dart';
import '../../theme/colors.dart';
import '../notifications/notifications_section.dart';
import 'account_providers.dart';
import 'account_service.dart';

const supportEmail = 'love@spiritpedia.co';

/// The Account tab: sign in with an emailed code, or — signed in — the
/// account, sign out and delete. Explorers only; practitioners manage their
/// profile on the website.
class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final account = ref.watch(accountProvider);
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 40),
          children: [
            Text(
              account.signedIn ? 'My Account' : 'Your account',
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 20),
            if (account.signedIn)
              _SignedIn(account: account)
            else
              const SignInForm(),
            const SizedBox(height: 36),
            const _Links(),
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
  const SignInForm({super.key});

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
              ? 'Sign in to keep your saved teachers, books and videos on every device — here and on spiritpedia.co. No password: we email you a code.'
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
  const _SignedIn({required this.account});

  final AccountState account;

  @override
  ConsumerState<_SignedIn> createState() => _SignedInState();
}

class _SignedInState extends ConsumerState<_SignedIn> {
  bool _signingOut = false;

  @override
  Widget build(BuildContext context) {
    final user = widget.account.user!;
    final profile = widget.account.profile;
    Widget row(String label, String value) => Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      child: Row(
        children: [
          Text(
            label,
            style: const TextStyle(color: SpColors.textMuted, fontSize: 14),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DecoratedBox(
          decoration: BoxDecoration(
            color: SpColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: SpColors.border),
          ),
          child: Column(
            children: [
              row('Email', user.email),
              const Divider(height: 1),
              row(
                'Account type',
                profile?.isPractitioner == true ? 'Practitioner' : 'Explorer',
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        const Text(
          'Your saved items are kept with your account and match on spiritpedia.co.',
          style: TextStyle(
            fontSize: 13.5,
            color: SpColors.textFaint,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 20),
        const NotificationsSection(),
        if (profile?.isPractitioner == true) ...[
          const SizedBox(height: 18),
          _Note(
            text: 'Your practitioner profile is managed on the website.',
            action: 'Open spiritpedia.co/account',
            url: '${AppConfig.siteUrl}/account',
          ),
        ],
        const SizedBox(height: 24),
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
        const SizedBox(height: 28),
        _DeleteAccount(hasListing: profile?.linkedHealerSlug != null),
      ],
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
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: SpColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Delete account',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),
          if (!_open)
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton(
                onPressed: () => setState(() => _open = true),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFFCA5A5),
                  side: const BorderSide(color: Color(0x66EF4444)),
                  shape: const StadiumBorder(),
                ),
                child: const Text('Delete account'),
              ),
            )
          else ...[
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
                  style: const TextStyle(
                    color: Color(0xFFFCA5A5),
                    fontSize: 14,
                  ),
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
                const SizedBox(width: 8),
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
        ],
      ),
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

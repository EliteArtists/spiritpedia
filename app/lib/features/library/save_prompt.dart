import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/colors.dart';
import '../account/account_providers.dart';
import '../account/account_screen.dart';
import '../star/slipstream.dart';
import 'saved_items.dart';

/// A heart or Save tapped: saving needs an account. Signed in, or taking
/// something out of the Library, it simply happens. Signed out, a warm
/// prompt asks first — and after signing in (a 6-digit code, in the same
/// sheet) the save completes and the person is still where they were.
/// Browsing, search and Tailor Spiritpedia never ask.
Future<void> saveOrAsk(
  BuildContext context,
  WidgetRef ref,
  SavedKind kind,
  String slug,
) async {
  final saved = ref.read(savedItemsProvider.notifier);
  if (ref.read(signedInUserIdProvider) != null || saved.contains(kind, slug)) {
    return saved.toggle(kind, slug);
  }
  saved.saveAfterSignIn(kind, slug);
  final signedIn = await showModalBottomSheet<bool>(
    context: context,
    // Above the floating tab bar, which would cover its foot.
    useRootNavigator: true,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: SpColors.surface,
    showDragHandle: true,
    builder: (_) => const SavePrompt(),
  );
  if (signedIn != true) saved.cancelPendingSave();
}

class SavePrompt extends ConsumerStatefulWidget {
  const SavePrompt({super.key});

  static const title = 'Save it to your Library.';
  static const body =
      'Create a free account so your saves follow you everywhere.';

  @override
  ConsumerState<SavePrompt> createState() => _SavePromptState();
}

class _SavePromptState extends ConsumerState<SavePrompt> {
  bool _signingIn = false;
  bool _closed = false; // the account changes more than once as it signs in

  void _close(bool signedIn) {
    if (_closed || !mounted) return;
    _closed = true;
    Navigator.of(context).pop(signedIn);
  }

  @override
  Widget build(BuildContext context) {
    // Signed in: the sheet's work is done; the save completes behind it.
    ref.listen(accountProvider, (_, next) {
      if (next.signedIn) _close(true);
    });
    return Padding(
      key: const ValueKey('save-prompt'),
      padding: EdgeInsets.fromLTRB(
        24,
        0,
        24,
        24 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Center(
              child: SizedBox.square(dimension: 40, child: StarSprite()),
            ),
            const SizedBox(height: 14),
            const Text(
              SavePrompt.title,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 21, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            if (!_signingIn) ...[
              const Text(
                SavePrompt.body,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  height: 1.5,
                  color: SpColors.textMuted,
                ),
              ),
              const SizedBox(height: 22),
              SizedBox(
                height: 50,
                child: FilledButton(
                  key: const ValueKey('save-prompt-sign-in'),
                  onPressed: () => setState(() => _signingIn = true),
                  style: FilledButton.styleFrom(
                    backgroundColor: SpColors.primary,
                    shape: const StadiumBorder(),
                  ),
                  child: const Text(
                    'Sign in / Create account',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(height: 6),
              TextButton(
                key: const ValueKey('save-prompt-not-now'),
                onPressed: () => _close(false),
                style: TextButton.styleFrom(
                  foregroundColor: SpColors.textMuted,
                ),
                child: const Text('Not now'),
              ),
            ] else ...[
              const SizedBox(height: 8),
              const SignInForm(
                intro: 'No password: we email you a 6-digit code. A new address becomes a free account.',
              ),
            ],
          ],
        ),
      ),
    );
  }
}

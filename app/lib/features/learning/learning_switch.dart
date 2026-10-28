import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/colors.dart';
import '../account/account_providers.dart';
import '../account/account_screen.dart';
import 'learning.dart';

/// Tailor Spiritpedia's "Let Spiritpedia learn from what I explore"
/// (migration 0021). Saved the moment it is changed, apart from the Save
/// button: like Your Area. Signed out it is off, greyed, and cannot be
/// turned on — learning lives only in an account — with a line asking them
/// to sign in, and a Sign in link that signs in right here, on Tailor.
class LearningSwitch extends ConsumerStatefulWidget {
  const LearningSwitch({super.key});

  static const label = 'Let Spiritpedia learn from what I explore';
  static const promise =
      'Used only to tailor what you see. Never shown to our team, never '
      'shared, never used for advertising. Turn off anytime.';
  static const signedOut = 'Sign in so I can learn from what you explore.';

  @override
  ConsumerState<LearningSwitch> createState() => _LearningSwitchState();
}

class _LearningSwitchState extends ConsumerState<LearningSwitch> {
  bool _saving = false;
  String? _note;

  Future<void> _flip(bool on) async {
    setState(() {
      _saving = true;
      _note = null;
    });
    final ok = await ref.read(learningProvider.notifier).set(on);
    if (!mounted) return;
    setState(() {
      _saving = false;
      _note = !ok
          ? 'That didn’t save. Please try again.'
          : on
          ? null
          : 'Off. What Spiritpedia had learned has been deleted.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final signedIn = ref.watch(signedInUserIdProvider) != null;
    final on = ref.watch(learningProvider);
    return Column(
      key: const ValueKey('tailor-learning'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Expanded(
              child: Text(
                LearningSwitch.label,
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(width: 12),
            Switch.adaptive(
              key: const ValueKey('tailor-learning-switch'),
              value: signedIn && on,
              activeTrackColor: SpColors.primary,
              onChanged: !signedIn || _saving ? null : _flip,
            ),
          ],
        ),
        if (!signedIn)
          Wrap(
            key: const ValueKey('tailor-learning-signed-out'),
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              const Text(
                LearningSwitch.signedOut,
                style: TextStyle(fontSize: 14, color: SpColors.textMuted),
              ),
              TextButton(
                key: const ValueKey('tailor-learning-sign-in'),
                onPressed: () => showSignInSheet(context),
                style: TextButton.styleFrom(
                  foregroundColor: SpColors.link,
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                ),
                child: const Text('Sign in'),
              ),
            ],
          ),
        const SizedBox(height: 4),
        Text(
          LearningSwitch.promise,
          style: const TextStyle(
            fontSize: 13,
            height: 1.45,
            color: SpColors.textFaint,
          ),
        ),
        if (_note != null) ...[
          const SizedBox(height: 6),
          Text(
            _note!,
            key: const ValueKey('tailor-learning-note'),
            style: const TextStyle(fontSize: 13, color: SpColors.textMuted),
          ),
        ],
      ],
    );
  }
}

/// Sign in without leaving the page: the 6-digit code form in a sheet, which
/// closes itself once signed in, so they are back where they were.
Future<void> showSignInSheet(BuildContext context) => showModalBottomSheet(
  context: context,
  // Above the floating tab bar, which would cover its foot.
  useRootNavigator: true,
  isScrollControlled: true,
  useSafeArea: true,
  backgroundColor: SpColors.surface,
  showDragHandle: true,
  builder: (_) => const _SignInSheet(),
);

class _SignInSheet extends ConsumerStatefulWidget {
  const _SignInSheet();

  @override
  ConsumerState<_SignInSheet> createState() => _SignInSheetState();
}

class _SignInSheetState extends ConsumerState<_SignInSheet> {
  bool _closed = false; // the account changes more than once as it signs in

  @override
  Widget build(BuildContext context) {
    ref.listen(accountProvider, (_, next) {
      if (next.signedIn && !_closed && mounted) {
        _closed = true;
        Navigator.of(context).pop();
      }
    });
    return Padding(
      key: const ValueKey('sign-in-sheet'),
      padding: EdgeInsets.fromLTRB(
        24,
        0,
        24,
        24 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: const SingleChildScrollView(
        child: SignInForm(
          intro:
              'No password: we email you a 6-digit code. A new address '
              'becomes a free account.',
        ),
      ),
    );
  }
}

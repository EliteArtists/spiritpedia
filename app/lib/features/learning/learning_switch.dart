import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/colors.dart';
import '../account/account_providers.dart';
import 'learning.dart';

/// Tailor Spiritpedia's "Let Spiritpedia learn from what I explore"
/// (migration 0021). Saved the moment it is changed, apart from the Save
/// button: like Your area. Signed out it is off and cannot be turned on —
/// learning lives only in an account.
class LearningSwitch extends ConsumerStatefulWidget {
  const LearningSwitch({super.key});

  static const label = 'Let Spiritpedia learn from what I explore';
  static const promise =
      'Used only to tailor what you see. Never shown to our team, never '
      'shared, never used for advertising. Turn off anytime.';

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
        const SizedBox(height: 4),
        Text(
          signedIn
              ? LearningSwitch.promise
              : 'Sign in to turn this on. ${LearningSwitch.promise}',
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

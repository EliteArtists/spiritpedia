import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../theme/colors.dart';
import '../star/slipstream.dart';

/// What a whole view shows when Never show has left nothing in it — a tab, a
/// pill's view, a subject page, an opened Explore More shelf — instead of a
/// blank screen (docs/personalisation.md). A single shelf emptied by hiding
/// simply disappears.
class HiddenEmptyState extends StatelessWidget {
  const HiddenEmptyState({super.key, this.compact = false});

  /// Smaller, for an Explore More shelf.
  final bool compact;

  static const message = 'You’ve hidden most subjects.';
  static const action = 'Adjust in Tailor Spiritpedia';

  @override
  Widget build(BuildContext context) {
    return Padding(
      key: const ValueKey('hidden-empty'),
      padding: compact
          ? const EdgeInsets.fromLTRB(20, 4, 20, 30)
          : const EdgeInsets.fromLTRB(32, 48, 32, 48),
      child: Column(
        crossAxisAlignment: compact
            ? CrossAxisAlignment.start
            : CrossAxisAlignment.center,
        children: [
          SizedBox.square(
            dimension: compact ? 28 : 44,
            child: const StarSprite(),
          ),
          SizedBox(height: compact ? 10 : 16),
          Text(
            message,
            textAlign: compact ? TextAlign.start : TextAlign.center,
            style: TextStyle(
              fontSize: compact ? 15 : 17,
              color: SpColors.textMuted,
              height: 1.4,
            ),
          ),
          TextButton(
            key: const ValueKey('hidden-empty-tailor'),
            onPressed: () => context.push('/tailor'),
            style: TextButton.styleFrom(
              foregroundColor: SpColors.link,
              padding: compact
                  ? EdgeInsets.zero
                  : const EdgeInsets.symmetric(horizontal: 12),
            ),
            child: const Text(
              action,
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

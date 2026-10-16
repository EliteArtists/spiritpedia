import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config.dart';
import '../../core/links/open_link.dart';
import '../../theme/colors.dart';
import '../star/slipstream.dart';
import 'account_providers.dart';

/// Where "I share my work" continues: the website's sign-up, already set to
/// a practitioner (web/app/auth/signup → ?as=practitioner). No email in the
/// link: they type it there.
String practitionerSignUpUrl() =>
    '${AppConfig.siteUrl}/auth/signup?as=practitioner';

/// Once, for a brand-new account (AccountState.isNew): "How will you use
/// Spiritpedia?" Explorers carry on in the app; anyone sharing their work —
/// practitioners now; channels, apps and publishers later — continues on the
/// website's application flow. Put away without an answer, it counts as
/// exploring.
Future<void> askHowTheyWillUseIt(BuildContext context, WidgetRef ref) async {
  final account = ref.read(accountProvider.notifier);
  final choice = await showModalBottomSheet<_Choice>(
    context: context,
    useRootNavigator: true,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: SpColors.surface,
    showDragHandle: true,
    builder: (_) => const UserTypeCard(),
  );
  if (choice == _Choice.sharing) {
    await account.chooseSharing();
    if (context.mounted) await openExternal(context, practitionerSignUpUrl());
  } else {
    await account.chooseExploring();
  }
}

enum _Choice { exploring, sharing }

class UserTypeCard extends StatefulWidget {
  const UserTypeCard({super.key});

  static const title = 'How will you use Spiritpedia?';

  @override
  State<UserTypeCard> createState() => _UserTypeCardState();
}

class _UserTypeCardState extends State<UserTypeCard> {
  bool _sharing = false; // "I share my work" chosen: where it goes next

  @override
  Widget build(BuildContext context) {
    return Padding(
      key: const ValueKey('user-type-card'),
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Center(
              child: SizedBox.square(dimension: 40, child: StarSprite()),
            ),
            const SizedBox(height: 14),
            Text(
              _sharing ? 'Share your work on Spiritpedia' : UserTypeCard.title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 18),
            if (!_sharing) ...[
              _Option(
                key: const ValueKey('user-type-exploring'),
                title: 'I’m exploring',
                detail:
                    'Discover teachers, books and videos, and keep what you '
                    'love in your Library.',
                onTap: () => Navigator.of(context).pop(_Choice.exploring),
              ),
              const SizedBox(height: 12),
              _Option(
                key: const ValueKey('user-type-sharing'),
                title: 'I share my work',
                detail:
                    'You’re a practitioner or teacher and would like to be '
                    'listed on Spiritpedia.',
                onTap: () => setState(() => _sharing = true),
              ),
            ] else ...[
              const Text(
                'Applications are made on spiritpedia.co. Sign in there with '
                'this same email, and the application opens for you.',
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
                  key: const ValueKey('user-type-open-website'),
                  onPressed: () => Navigator.of(context).pop(_Choice.sharing),
                  style: FilledButton.styleFrom(
                    backgroundColor: SpColors.primary,
                    shape: const StadiumBorder(),
                  ),
                  child: const Text(
                    'Continue on spiritpedia.co',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(height: 6),
              TextButton(
                key: const ValueKey('user-type-back'),
                onPressed: () => setState(() => _sharing = false),
                style: TextButton.styleFrom(
                  foregroundColor: SpColors.textMuted,
                ),
                child: const Text('Back'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Option extends StatelessWidget {
  const _Option({
    super.key,
    required this.title,
    required this.detail,
    required this.onTap,
  });

  final String title;
  final String detail;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: SpColors.background,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: SpColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                detail,
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.45,
                  color: SpColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

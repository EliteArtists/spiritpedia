import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config.dart';
import '../../core/supabase_providers.dart';
import '../../shared/widgets/tier_badge.dart';
import '../../theme/colors.dart';

/// Explore — the home tab.
///
/// PHASE 0 PLACEHOLDER. Shows the brand, the theme and a live read-only
/// connection check, so the skeleton can be judged on a simulator. Phase 1b
/// replaces all of it with the real shelves.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subjects = ref.watch(subjectCountProvider);

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
          children: [
            Row(
              children: [
                Image.asset('assets/images/star.png', width: 32, height: 32),
                const SizedBox(width: 10),
                const Text(
                  'Spiritpedia',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.2),
                ),
              ],
            ),
            const SizedBox(height: 40),
            const Text(
              'How are you feeling today?',
              style: TextStyle(fontSize: 30, fontWeight: FontWeight.w700, height: 1.15),
            ),
            const SizedBox(height: 12),
            const Text(
              'Teachers, books, videos and practices — starting from how you feel. '
              'Exploring arrives in Phase 1.',
              style: TextStyle(fontSize: 15, color: SpColors.textMuted, height: 1.5),
            ),
            const SizedBox(height: 32),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'TIERS',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.1,
                        color: SpColors.textFaint,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 10,
                      children: [
                        for (final tier in Tier.values) TierBadge(tier: tier.dbValue),
                        const TierBadge(tier: null),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                leading: Icon(
                  subjects.hasError ? Icons.cloud_off : Icons.cloud_done_outlined,
                  color: subjects.hasError ? Colors.redAccent : SpColors.link,
                ),
                title: Text(
                  // Riverpod retries a failed request automatically, so an
                  // error can arrive while it is still "loading" — check for
                  // the error first, or a failure reads as "Connecting…".
                  subjects.hasError
                      ? 'Could not reach Spiritpedia — retrying'
                      : subjects.hasValue
                          ? 'Connected · ${subjects.value} subjects'
                          : 'Connecting…',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  'Read-only · ${AppConfig.env} database',
                  style: const TextStyle(color: SpColors.textMuted),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

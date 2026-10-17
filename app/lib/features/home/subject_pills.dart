import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../data/shelf_rules.dart';
import '../../theme/colors.dart';
import '../interests/interests.dart';
import '../shell/tab_bar_state.dart';
import '../learning/learning.dart';

/// "View All" and the five pillars, as one horizontally scrolling row — the
/// pillars holding someone's chosen interests first, and none whose every
/// subject they hid. Tapping a pillar opens
/// its subjects in a sheet — the website's hover panel, as a phone would show
/// it. The chosen subject narrows the whole screen.
class SubjectPillRow extends ConsumerWidget {
  const SubjectPillRow({
    super.key,
    required this.filter,
    this.leadingPadding = 20,
  });

  /// Which screen's filter this row controls (Home, Videos or Books).
  final NotifierProvider<SubjectFilter, String?> filter;

  /// Room at the start of the row — wider while the star is docked there.
  final double leadingPadding;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(filter);
    final subjects = ref.watch(subjectsProvider).value ?? const <Subject>[];
    final activePillar = pillarOf(current);
    final hidden = ref.watch(hiddenSubjectsProvider);
    final pillars = pillarsByInterest(
      ref.watch(interestSubjectsProvider),
      null,
      hidden,
      ref.watch(learnedProvider),
    );

    return SizedBox(
      height: 42,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.only(left: leadingPadding, right: 20),
        children: [
          _Pill(
            label: 'View All',
            active: current == null,
            onTap: () => ref.read(filter.notifier).select(null),
          ),
          for (final pillar in pillars)
            _Pill(
              label: pillar,
              active: activePillar == pillar,
              onTap: () => _openPillar(context, ref, pillar, subjects, current),
            ),
        ],
      ),
    );
  }

  void _openPillar(
    BuildContext context,
    WidgetRef ref,
    String pillar,
    List<Subject> subjects,
    String? current,
  ) {
    // Never show: a hidden subject is left out of its pillar's list.
    final hidden = ref.read(hiddenSubjectsProvider);
    final inPillar = [
      for (final slug in subjectPillars[pillar]!)
        if (!hidden.contains(slug))
          for (final s in subjects)
            if (s.slug == slug) s,
    ];
    final sheet = showModalBottomSheet<void>(
      context: context,
      backgroundColor: SpColors.surface,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                pillar,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 16),
              if (inPillar.isEmpty)
                const Text(
                  'Coming soon',
                  style: TextStyle(color: SpColors.textMuted),
                )
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 10,
                  children: [
                    for (final s in inPillar)
                      ChoiceChip(
                        label: Text(s.name),
                        selected: current == s.slug,
                        showCheckmark: false,
                        selectedColor: SpColors.primary,
                        backgroundColor: SpColors.background,
                        side: const BorderSide(color: SpColors.border),
                        labelStyle: const TextStyle(
                          fontFamily: 'Geist',
                          fontWeight: FontWeight.w500,
                        ),
                        onSelected: (_) {
                          // A subject pill on Discover, a filter on Videos
                          // or Books (activity learning, migration 0021).
                          ref
                              .read(activityLogProvider)
                              .subjects(
                                filter == subjectFilterProvider
                                    ? 'pill'
                                    : 'filter',
                                [s.slug],
                              );
                          ref.read(filter.notifier).select(s.slug);
                          Navigator.of(sheetContext).pop();
                        },
                      ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
    // The floating tab bar steps aside while the tray is open.
    ref.read(tabBarCoverProvider.notifier).whileShowing(sheet);
  }
}

/// The chosen subject, named under the pill row, with a way out.
class SubjectFilterNote extends ConsumerWidget {
  const SubjectFilterNote({super.key, required this.filter});

  final NotifierProvider<SubjectFilter, String?> filter;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(filter);
    if (current == null) return const SizedBox.shrink();
    final subjects = ref.watch(subjectsProvider).value ?? const <Subject>[];
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
      child: Row(
        children: [
          const Icon(
            Icons.filter_alt_outlined,
            size: 16,
            color: SpColors.textMuted,
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              'Showing ${subjectName(subjects, current)}',
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13.5, color: SpColors.textMuted),
            ),
          ),
          TextButton(
            onPressed: () => ref.read(filter.notifier).select(null),
            style: TextButton.styleFrom(
              foregroundColor: SpColors.link,
              visualDensity: VisualDensity.compact,
            ),
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, required this.active, required this.onTap});

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 10),
      child: Material(
        color: active ? SpColors.primary : Colors.transparent,
        shape: StadiumBorder(
          side: BorderSide(
            color: active ? Colors.transparent : const Color(0x4DFFFFFF),
          ),
        ),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Center(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

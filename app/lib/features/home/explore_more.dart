import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/widgets/cards.dart';
import '../../shared/widgets/shelf.dart';
import '../../theme/colors.dart';
import '../interests/hidden_empty.dart';
import '../../theme/layout.dart';

/// Explore More (ExploreMore.jsx): its sections fetched only when the visitor
/// asks for them. Opened sections appear as shelves, in the order opened; the
/// rest stay as tiles underneath.
class ExploreMore extends ConsumerWidget {
  const ExploreMore({super.key, required this.subject});

  final String? subject;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final opened = ref.watch(exploreMoreOpenedProvider);
    final remaining = [
      for (final s in ExploreSection.values)
        if (!opened.contains(s)) s,
    ];

    final layout = SpLayout.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final section in opened)
          _SectionShelf(section: section, subject: subject),
        if (remaining.isNotEmpty)
          Padding(
            padding: EdgeInsets.fromLTRB(layout.gutter, 8, layout.gutter, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Divider(),
                const SizedBox(height: 26),
                const Text(
                  'EXPLORE MORE',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.1,
                    color: SpColors.link,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'What would you like to discover?',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Choose a section to open it.',
                  style: TextStyle(color: SpColors.textMuted),
                ),
                const SizedBox(height: 18),
                GridView.count(
                  // More tiles a row on an iPad: 3 upright, 4 on its side.
                  crossAxisCount: switch (layout.size) {
                    WidthClass.compact => 2,
                    WidthClass.regular => 3,
                    WidthClass.wide => 4,
                  },
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.45,
                  children: [
                    for (final s in remaining)
                      _Tile(
                        section: s,
                        onTap: () => ref
                            .read(exploreMoreOpenedProvider.notifier)
                            .open(s),
                      ),
                  ],
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.section, required this.onTap});

  final ExploreSection section;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: SpColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: SpColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                section.label,
                style: const TextStyle(
                  fontSize: 15.5,
                  fontWeight: FontWeight.w700,
                  height: 1.25,
                ),
              ),
              const Align(
                alignment: Alignment.bottomRight,
                child: Text(
                  '↗',
                  style: TextStyle(fontSize: 18, color: SpColors.primary),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionShelf extends ConsumerWidget {
  const _SectionShelf({required this.section, required this.subject});

  final ExploreSection section;
  final String? subject;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rows = ref.watch(exploreSectionProvider((section, subject)));
    final directory = ref.watch(healerDirectoryProvider).value;
    final seeAll = subject == null
        ? null
        : () => context.push('/subject/$subject');

    return rows.when(
      loading: () => _LoadingShelf(title: section.label),
      error: (_, _) => _MessageShelf(
        title: section.label,
        message: 'Could not load this section.',
      ),
      data: (rows) {
        final items = rows.items;
        if (rows.hiddenAll) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Title(section.label),
              const HiddenEmptyState(compact: true),
            ],
          );
        }
        if (items.isEmpty) {
          return _MessageShelf(
            title: section.label,
            message: 'Nothing here yet for this subject.',
          );
        }
        return Shelf(
          title: section.label,
          subtitle: section.subtitle,
          itemCount: items.length,
          itemWidth: 250,
          height: 300,
          onSeeAll: seeAll,
          itemBuilder: (context, i) => switch (items[i]) {
            final FreeResource r => FreeResourceCard(
              resource: r,
              healerName: directory?.byId(r.healerId)?.name,
            ),
            final Offering o => OfferingCard(
              offering: o,
              healerName: directory?.byId(o.healerId)?.name,
            ),
            _ => const SizedBox.shrink(),
          },
        );
      },
    );
  }
}

class _LoadingShelf extends StatelessWidget {
  const _LoadingShelf({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) =>
      _MessageShelf(title: title, message: 'Loading…');
}

class _MessageShelf extends StatelessWidget {
  const _MessageShelf({required this.title, required this.message});

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        SpLayout.of(context).gutter,
        0,
        SpLayout.of(context).gutter,
        34,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: _Title.style),
          const SizedBox(height: 10),
          Text(message, style: const TextStyle(color: SpColors.textMuted)),
        ],
      ),
    );
  }
}

class _Title extends StatelessWidget {
  const _Title(this.text);

  final String text;

  static const style = TextStyle(fontSize: 21, fontWeight: FontWeight.w700);

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      SpLayout.of(context).gutter,
      0,
      SpLayout.of(context).gutter,
      10,
    ),
    child: Text(text, style: style),
  );
}

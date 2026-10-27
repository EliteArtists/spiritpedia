import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/content_repository.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../data/shelf_rules.dart';
import '../../shared/widgets/cards.dart';
import '../../shared/widgets/shelf.dart';
import '../../theme/colors.dart';
import '../../theme/layout.dart';
import '../detail/detail_widgets.dart';
import '../interests/hidden_empty.dart';
import '../interests/interests.dart';
import '../learning/learning.dart';
import '../star/star_layer.dart';

/// Explore More: a real shelf for every section (Free Resources, Courses,
/// Retreats, Downloads, Memberships), each with See all.
///
/// A sliver list, so a shelf is built — and its section fetched — only as it
/// comes within reach of the screen (the scroll view's cache extent, a few
/// hundred pixels below the bottom edge). Discover opens exactly as fast as
/// before; nobody who never scrolls this far downloads any of it. The four
/// offering shelves share one fetch (the `courses` table), and the results
/// are kept for the session, shared with For You.
SliverList exploreMoreShelves({
  required String? subject,
  bool forYou = false,
}) => SliverList(
  delegate: SliverChildBuilderDelegate(
    // A sliver list always builds its first child at once, however far down
    // the page it is, to measure itself. So the first child is nothing: the
    // shelves after it are built only as they come near.
    (context, i) => i == 0
        ? const SizedBox.shrink()
        : ExploreShelf(
            section: ExploreSection.values[i - 1],
            subject: subject,
            forYou: forYou,
          ),
    childCount: ExploreSection.values.length + 1,
  ),
);

/// How many a shelf holds before See all.
const _shelfLimit = 12;

const _itemWidth = 250.0;
const _shelfHeight = 300.0;

class ExploreShelf extends ConsumerWidget {
  const ExploreShelf({
    super.key,
    required this.section,
    required this.subject,
    this.forYou = false,
  });

  final ExploreSection section;
  final String? subject;

  /// For You: their subjects only, topped up from related ones; nearly
  /// empty, no shelf ([forYouShelf]).
  final bool forYou;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rows = ref.watch(exploreSectionProvider((section, subject)));
    final directory = ref.watch(healerDirectoryProvider).value;

    return rows.when(
      // The shelf's own shape while it loads, so nothing jumps.
      loading: () => Shelf(
        key: ValueKey('explore-loading-${section.name}'),
        title: section.label,
        subtitle: section.subtitle,
        itemCount: 3,
        itemWidth: _itemWidth,
        height: _shelfHeight,
        itemBuilder: (_, _) => const _Placeholder(),
      ),
      error: (_, _) => _MessageShelf(
        title: section.label,
        message: 'Could not load this section.',
        onRetry: () =>
            ref.invalidate(exploreSectionProvider((section, subject))),
      ),
      data: (rows) {
        final items = forYou
            ? forYouShelf(
                rows.items,
                ref.watch(interestSubjectsProvider),
                subjectsOf,
                learned: ref.watch(learnedProvider),
              )
            : rows.items;
        if (rows.hiddenAll) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Title(section.label),
              const HiddenEmptyState(compact: true),
            ],
          );
        }
        // Nothing for this subject: no shelf at all, as on the website.
        if (items.isEmpty) return const SizedBox.shrink();
        final shown = items.take(_shelfLimit).toList();
        return Shelf(
          key: ValueKey('explore-${section.name}'),
          title: section.label,
          subtitle: section.subtitle,
          itemCount: shown.length,
          itemWidth: _itemWidth,
          height: _shelfHeight,
          onSeeAll: () => context.push(exploreAllPath(section, subject)),
          itemBuilder: (context, i) =>
              exploreCard(shown[i], directory: directory),
        );
      },
    );
  }
}

/// See all, for a section (and the subject chosen on Discover, if any).
String exploreAllPath(ExploreSection section, String? subject) => Uri(
  path: '/explore/${section.name}',
  queryParameters: subject == null ? null : {'subject': subject},
).toString();

Widget exploreCard(Object item, {HealerDirectory? directory}) => switch (item) {
  final FreeResource r => FreeResourceCard(
    resource: r,
    healerName: directory?.byId(r.healerId)?.name,
  ),
  final Offering o => OfferingCard(
    offering: o,
    healerName: directory?.byId(o.healerId)?.name,
  ),
  _ => const SizedBox.shrink(),
};

/// A section's See all: everything in it, as a grid. Never show applies.
class ExploreAllScreen extends ConsumerWidget {
  const ExploreAllScreen({super.key, required this.section, this.subject});

  final ExploreSection section;
  final String? subject;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rows = ref.watch(exploreSectionProvider((section, subject)));
    final directory = ref.watch(healerDirectoryProvider).value;
    final layout = SpLayout.of(context);
    final subjectName = subject == null
        ? null
        : ref
              .watch(subjectsProvider)
              .value
              ?.where((s) => s.slug == subject)
              .firstOrNull
              ?.name;

    return Scaffold(
      appBar: AppBar(),
      body: WithHomeStar(
        child: rows.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: SpColors.link),
          ),
          error: (_, _) => Center(
            child: _MessageShelf(
              title: section.label,
              message: 'Could not load this section.',
              onRetry: () =>
                  ref.invalidate(exploreSectionProvider((section, subject))),
            ),
          ),
          data: (rows) => CustomScrollView(
            slivers: [
              SliverPadding(
                padding: EdgeInsets.fromLTRB(
                  layout.gutter,
                  4,
                  layout.gutter,
                  18,
                ),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        section.label,
                        style: _Title.style.copyWith(fontSize: 28),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subjectName == null
                            ? section.subtitle
                            : '${section.subtitle} · $subjectName',
                        style: const TextStyle(color: SpColors.textMuted),
                      ),
                    ],
                  ),
                ),
              ),
              if (rows.hiddenAll)
                const SliverToBoxAdapter(child: HiddenEmptyState())
              else if (rows.items.isEmpty)
                SliverPadding(
                  padding: EdgeInsets.symmetric(horizontal: layout.gutter),
                  sliver: const SliverToBoxAdapter(
                    child: Text(
                      'Nothing here yet.',
                      style: TextStyle(color: SpColors.textMuted),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(
                    layout.gutter,
                    0,
                    layout.gutter,
                    FloatingHomeStar.clearance,
                  ),
                  sliver: SliverGrid(
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      // More a row on an iPad: 3 upright, 4 on its side.
                      crossAxisCount: switch (layout.size) {
                        WidthClass.compact => 2,
                        WidthClass.regular => 3,
                        WidthClass.wide => 4,
                      },
                      mainAxisSpacing: 16,
                      crossAxisSpacing: 14,
                      childAspectRatio: _itemWidth / _shelfHeight,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, i) =>
                          exploreCard(rows.items[i], directory: directory),
                      childCount: rows.items.length,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder();

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: SpColors.surface,
      borderRadius: BorderRadius.circular(16),
    ),
  );
}

class _MessageShelf extends StatelessWidget {
  const _MessageShelf({
    required this.title,
    required this.message,
    this.onRetry,
  });

  final String title;
  final String message;
  final VoidCallback? onRetry;

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
          if (onRetry != null)
            TextButton(
              onPressed: onRetry,
              style: TextButton.styleFrom(
                foregroundColor: SpColors.link,
                padding: EdgeInsets.zero,
              ),
              child: const Text('Try again'),
            ),
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

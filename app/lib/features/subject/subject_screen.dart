import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/safety/medical_note.dart';
import '../../data/providers.dart';
import '../../shared/widgets/cards.dart';
import '../../shared/widgets/shelf.dart';
import '../../theme/colors.dart';
import '../detail/detail_widgets.dart';
import '../interests/hidden_empty.dart';
import '../interests/interests.dart';
import '../star/star_layer.dart';
import '../../theme/layout.dart';

/// A subject page (web/app/subject/[slug]/page.js): healers, free resources,
/// books, courses, retreats, downloads, and video shelves per teacher.
///
/// A subject the person hid (Never show) asks first: "You've hidden this
/// subject. Show anyway?" — and then shows it.
class SubjectScreen extends ConsumerStatefulWidget {
  const SubjectScreen({super.key, required this.slug});

  final String slug;

  @override
  ConsumerState<SubjectScreen> createState() => _SubjectScreenState();
}

class _SubjectScreenState extends ConsumerState<SubjectScreen> {
  bool _showAnyway = false;

  @override
  Widget build(BuildContext context) {
    final hidden = ref.watch(hiddenSubjectsProvider).contains(widget.slug);
    if (hidden && !_showAnyway) {
      final name = subjectName(ref.watch(subjectsProvider).value, widget.slug);
      return Scaffold(
        appBar: AppBar(),
        body: WithHomeStar(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.visibility_off_outlined,
                    color: SpColors.textFaint,
                    size: 32,
                  ),
                  const SizedBox(height: 14),
                  Text(
                    name,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'You’ve hidden this subject.',
                    style: TextStyle(color: SpColors.textMuted, fontSize: 15),
                  ),
                  const SizedBox(height: 10),
                  TextButton(
                    key: const ValueKey('subject-show-anyway'),
                    onPressed: () => setState(() => _showAnyway = true),
                    style: TextButton.styleFrom(foregroundColor: SpColors.link),
                    child: const Text('Show anyway?'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }
    return _SubjectBody(slug: widget.slug);
  }
}

class _SubjectBody extends ConsumerWidget {
  const _SubjectBody({required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = subjectName(ref.watch(subjectsProvider).value, slug);
    final content = ref.watch(subjectContentProvider(slug));
    final directory = ref.watch(healerDirectoryProvider).value;

    return Scaffold(
      appBar: AppBar(),
      body: WithHomeStar(
        child: content.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: SpColors.link),
          ),
          error: (_, _) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'This subject could not be loaded.',
                  style: TextStyle(color: SpColors.textMuted),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(subjectContentProvider(slug)),
                  child: const Text('Try again'),
                ),
              ],
            ),
          ),
          data: (c) {
            // Teachers' videos first, then channels'.
            final byHealer = directory?.videosByTeacher(c.videos) ?? const [];
            final teacherShelves = [
              for (final g in byHealer)
                if (!g.healer.isPlatform) g,
              for (final g in byHealer)
                if (g.healer.isPlatform) g,
            ];
            return ListView(
              padding: const EdgeInsets.only(
                bottom: 32 + FloatingHomeStar.clearance,
              ),
              children: [
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    SpLayout.of(context).gutter,
                    4,
                    SpLayout.of(context).gutter,
                    28,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontSize: 34,
                          fontWeight: FontWeight.w700,
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Curated content for your journey in $name.',
                        style: const TextStyle(
                          fontSize: 16,
                          color: SpColors.textMuted,
                        ),
                      ),
                      if (needsMedicalNote([slug])) const MedicalNote(),
                    ],
                  ),
                ),
                if (c.isEmpty &&
                    !ref.watch(hidingProvider).showing(slug).isEmpty)
                  const HiddenEmptyState()
                else if (c.isEmpty)
                  Padding(
                    padding: EdgeInsets.symmetric(
                      horizontal: SpLayout.of(context).gutter,
                    ),
                    child: const Card(
                      child: Padding(
                        padding: EdgeInsets.all(28),
                        child: Text(
                          'Nothing here yet — this subject is still being curated.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: SpColors.textMuted),
                        ),
                      ),
                    ),
                  ),
                // Teachers apart from channels and apps, as on Discover.
                for (final (title, subtitle, people) in [
                  (
                    'Teachers',
                    'Practitioners & Teachers',
                    [
                      for (final h in c.healers)
                        if (!h.isPlatform) h,
                    ],
                  ),
                  (
                    'Channels & Apps',
                    'Platforms & Channels',
                    [
                      for (final h in c.healers)
                        if (h.isPlatform) h,
                    ],
                  ),
                ])
                  Shelf(
                    title: title,
                    subtitle: subtitle,
                    itemCount: people.length,
                    itemWidth: 172,
                    height: 240,
                    itemBuilder: (_, i) => HealerCard(healer: people[i]),
                  ),
                Shelf(
                  title: 'Free Resources',
                  subtitle: 'No cost, no catch',
                  itemCount: c.freeResources.length,
                  itemWidth: 250,
                  height: 300,
                  itemBuilder: (_, i) => FreeResourceCard(
                    resource: c.freeResources[i],
                    healerName: directory
                        ?.byId(c.freeResources[i].healerId)
                        ?.name,
                  ),
                ),
                Shelf(
                  title: 'Books & Literature',
                  subtitle: 'The curated archive',
                  itemCount: c.books.length,
                  itemWidth: 140,
                  height: 262,
                  itemBuilder: (_, i) => BookCard(book: c.books[i]),
                ),
                for (final (title, subtitle, items) in [
                  ('Courses & Programmes', 'Go deeper', c.courses),
                  ('Retreats & Live Events', 'In person', c.retreats),
                  ('Downloads & Audio', 'Take it with you', c.downloads),
                ])
                  Shelf(
                    title: title,
                    subtitle: subtitle,
                    itemCount: items.length,
                    itemWidth: 250,
                    height: 300,
                    itemBuilder: (_, i) => OfferingCard(
                      offering: items[i],
                      healerName: directory?.byId(items[i].healerId)?.name,
                    ),
                  ),
                for (final group in teacherShelves)
                  Shelf(
                    title: group.healer.name,
                    subtitle: group.healer.isPlatform
                        ? '${group.healer.platformLabel} · ${group.total} videos'
                        : '${group.total} videos',
                    itemCount: group.videos.length,
                    itemWidth: 250,
                    height: 232,
                    onTitleTap: () =>
                        context.push('/healers/${group.healer.slug}'),
                    itemBuilder: (_, i) => VideoCard(
                      video: group.videos[i],
                      healerName: group.healer.name,
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

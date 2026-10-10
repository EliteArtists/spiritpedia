import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/providers.dart';
import '../../shared/widgets/cards.dart';
import '../../shared/widgets/shelf.dart';
import '../../theme/colors.dart';
import '../detail/detail_widgets.dart';
import '../star/star_layer.dart';

/// A subject page (web/app/subject/[slug]/page.js): healers, free resources,
/// books, courses, retreats, downloads, and video shelves per teacher.
class SubjectScreen extends ConsumerWidget {
  const SubjectScreen({super.key, required this.slug});

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
            final teacherShelves =
                directory?.videosByTeacher(c.videos) ?? const [];
            return ListView(
              padding: const EdgeInsets.only(
                bottom: 32 + FloatingHomeStar.clearance,
              ),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
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
                    ],
                  ),
                ),
                if (c.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 20),
                    child: Card(
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
                Shelf(
                  title: 'Healers',
                  subtitle: 'Practitioners & Teachers',
                  itemCount: c.healers.length,
                  itemWidth: 172,
                  height: 240,
                  itemBuilder: (_, i) => HealerCard(healer: c.healers[i]),
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
                    subtitle: '${group.total} videos',
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

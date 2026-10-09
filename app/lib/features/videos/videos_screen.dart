import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../shared/widgets/cards.dart';
import '../../shared/widgets/shelf.dart';
import '../../theme/colors.dart';
import '../home/subject_pills.dart';

/// Videos — shelves by subject, never more than two videos per teacher in a
/// shelf. View All shows New, the five pillars and a mixed shelf; a chosen
/// subject shows its newest videos, then the next batch.
class VideosScreen extends ConsumerWidget {
  const VideosScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subject = ref.watch(videosSubjectProvider);
    final shelves = ref.watch(videoShelvesProvider(subject));
    final directory = ref.watch(healerDirectoryProvider).value;

    return Scaffold(
      // SafeArea around the scroll view: content stops at the status bar
      // rather than scrolling underneath the clock.
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: SpColors.link,
          onRefresh: () async {
            ref.invalidate(videoShelvesProvider(subject));
            await ref.read(videoShelvesProvider(subject).future);
          },
          child: CustomScrollView(
            slivers: [
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(20, 16, 20, 18),
                  child: Text(
                    'Videos',
                    style: TextStyle(fontSize: 30, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: SubjectPills(filter: videosSubjectProvider),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 26)),
              ...shelves.when(
                loading: () => [
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(48),
                      child: Center(
                        child: CircularProgressIndicator(color: SpColors.link),
                      ),
                    ),
                  ),
                ],
                error: (_, _) => [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        children: [
                          const Text(
                            'Videos could not be loaded.',
                            style: TextStyle(color: SpColors.textMuted),
                          ),
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: () =>
                                ref.invalidate(videoShelvesProvider(subject)),
                            child: const Text('Try again'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                data: (list) => list.isEmpty
                    ? [
                        const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.all(32),
                            child: Text(
                              'No videos for this subject yet.',
                              style: TextStyle(color: SpColors.textMuted),
                            ),
                          ),
                        ),
                      ]
                    : [
                        for (final shelf in list)
                          SliverToBoxAdapter(
                            child: Shelf(
                              title: shelf.title,
                              subtitle: shelf.subtitle,
                              itemCount: shelf.videos.length,
                              itemWidth: 250,
                              height: 232,
                              itemBuilder: (_, i) => VideoCard(
                                video: shelf.videos[i],
                                healerName: directory
                                    ?.bySlug(shelf.videos[i].healerSlug)
                                    ?.name,
                              ),
                            ),
                          ),
                      ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

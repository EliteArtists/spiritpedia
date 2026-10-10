import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/links/share.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../data/shelf_rules.dart';
import '../../shared/widgets/cards.dart';
import '../../shared/widgets/shelf.dart';
import '../../theme/colors.dart';
import '../star/star_page.dart';
import 'billboard.dart';
import 'explore_more.dart';

/// Home — mirrors the website's homepage (HomePageContent.js): the feeling
/// question, the subject pills, the billboard, the healer and publisher
/// shelves, and Explore More. The chosen subject narrows all of it. The frame
/// (top bar, star search box, sticky pills) is the shared [StarPage].
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subject = ref.watch(homeSubjectProvider);
    final healers = ref.watch(healersProvider);
    final publishers =
        ref.watch(publishersProvider).value ?? const <Publisher>[];

    return StarPage(
      isHome: true,
      filter: homeSubjectProvider,
      onRefresh: () async {
        ref.invalidate(healersProvider);
        ref.invalidate(publishersProvider);
        await ref.read(healersProvider.future);
      },
      slivers: [
        ...healers.when(
          loading: () => [const SliverToBoxAdapter(child: _Loading())],
          error: (_, _) => [
            SliverToBoxAdapter(
              child: _Problem(onRetry: () => ref.invalidate(healersProvider)),
            ),
          ],
          data: (all) {
            final shelves = HealerShelves(
              bySubject(all, subject, (h) => h.subjectSlugs),
            );
            final seeAll = subject == null
                ? null
                : () => context.push('/subject/$subject');
            final shownPublishers = bySubject(
              publishers,
              subject,
              (p) => p.subjectSlugs,
            );
            Widget healerShelf(
              String title,
              List<Healer> items, {
              Widget? badge,
              String? subtitle,
              bool tall = false,
            }) => Shelf(
              title: title,
              subtitle: subtitle,
              badge: badge,
              itemCount: items.length,
              itemWidth: tall ? 230 : 172,
              height: tall ? 330 : 240,
              onSeeAll: seeAll,
              itemBuilder: (_, i) =>
                  HealerCard(healer: items[i], subjectSlug: subject),
            );
            return [
              SliverToBoxAdapter(
                child: Billboard(
                  key: ValueKey(subject),
                  healers: shelves.billboard,
                ),
              ),
              SliverToBoxAdapter(
                child: healerShelf(
                  'Worldwide',
                  shelves.superheroes,
                  badge: const ShelfBadge(
                    label: 'SUPERHERO',
                    background: Color(0xFFFEF08A),
                    foreground: Color(0xFF78350F),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: healerShelf(
                  'Rising Voices',
                  shelves.luminaries,
                  badge: const ShelfBadge(
                    label: 'LUMINARY',
                    background: Color(0xFF7C3AED),
                    foreground: Colors.white,
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: healerShelf(
                  'Practitioners Near You',
                  shelves.localHeroes,
                  badge: const ShelfBadge(
                    label: 'LOCAL HERO',
                    background: Color(0xFF10B981),
                    foreground: Colors.white,
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: healerShelf(
                  'Timeless Teachers',
                  shelves.ascendedMasters,
                  subtitle: 'Ascended Masters',
                  tall: true,
                ),
              ),
              SliverToBoxAdapter(
                child: Shelf(
                  title: 'Publishing Houses',
                  subtitle: 'Publishers',
                  itemCount: shownPublishers.length,
                  itemWidth: 200,
                  height: 230,
                  itemBuilder: (_, i) =>
                      PublisherCard(publisher: shownPublishers[i]),
                ),
              ),
              SliverToBoxAdapter(
                child: healerShelf(
                  'Explore These Channels',
                  shelves.platforms,
                  subtitle: 'Platforms & Channels',
                ),
              ),
              SliverToBoxAdapter(child: ExploreMore(subject: subject)),
            ];
          },
        ),
      ],
    );
  }
}

/// Home's share: spiritpedia.co itself.
class ShareSpiritpedia extends ConsumerWidget {
  const ShareSpiritpedia({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
    child: Center(
      child: Builder(
        builder: (context) => OutlinedButton.icon(
          onPressed: () => share(context, ref, '/', 'Spiritpedia'),
          icon: const Icon(Icons.ios_share, size: 18),
          label: const Text('Share Spiritpedia'),
          style: OutlinedButton.styleFrom(
            foregroundColor: SpColors.text,
            side: const BorderSide(color: SpColors.border),
            shape: const StadiumBorder(),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          ),
        ),
      ),
    ),
  );
}

class _Loading extends StatelessWidget {
  const _Loading();

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.all(48),
    child: Center(child: CircularProgressIndicator(color: SpColors.link)),
  );
}

class _Problem extends StatelessWidget {
  const _Problem({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          const Icon(Icons.cloud_off, color: SpColors.textMuted, size: 36),
          const SizedBox(height: 12),
          const Text(
            'Spiritpedia could not be reached. Check your connection and try again.',
            textAlign: TextAlign.center,
            style: TextStyle(color: SpColors.textMuted, height: 1.5),
          ),
          const SizedBox(height: 16),
          FilledButton(onPressed: onRetry, child: const Text('Try again')),
        ],
      ),
    );
  }
}

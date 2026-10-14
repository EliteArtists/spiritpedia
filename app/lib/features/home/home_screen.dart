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
import '../interests/interests.dart';
import '../star/star_page.dart';
import '../star/tier_tips.dart';
import 'billboard.dart';
import 'explore_more.dart';

/// Home — mirrors the website's homepage (HomePageContent.js): the feeling
/// question, the subject pills, the billboard, the healer and publisher
/// shelves, and Explore More; and, for someone who chose interests, a For You
/// shelf first. The chosen subject narrows all of it. The frame
/// (top bar, star search box, sticky pills) is the shared [StarPage].
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subject = ref.watch(subjectFilterProvider);
    // Chosen interests shape View All — a For You shelf, and each shelf
    // leading with them — and never a chosen subject, which is narrow already.
    final chosen = subject == null
        ? ref.watch(interestSubjectsProvider)
        : const <String>{};
    final healers = ref.watch(healersProvider);
    final publishers =
        ref.watch(publishersProvider).value ?? const <Publisher>[];

    return StarPage(
      filter: subjectFilterProvider,
      tabPath: '/',
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
              interestFirst(
                bySubject(all, subject, (h) => h.subjectSlugs),
                chosen,
                (h) => h.subjectSlugs,
              ),
            );
            final forYouHealers = forYou(
              [
                for (final h in all)
                  if (!h.isPlatform) h,
              ],
              chosen,
              (h) => h.subjectSlugs,
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
              if (forYouHealers.isNotEmpty)
                SliverToBoxAdapter(
                  child: healerShelf(
                    'For You',
                    forYouHealers,
                    subtitle: 'From the subjects you chose',
                  ),
                ),
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
                  badge: ShelfBadge(
                    label: 'SUPERHERO',
                    onTap: () => ref
                        .read(tierTipProvider.notifier)
                        .show(TierTip.superhero),
                    semanticLabel: 'Superhero badge: what it means',
                    background: Color(0xFFFEF08A),
                    foreground: Color(0xFF78350F),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: healerShelf(
                  'Rising Voices',
                  shelves.luminaries,
                  badge: ShelfBadge(
                    label: 'LUMINARY',
                    onTap: () => ref
                        .read(tierTipProvider.notifier)
                        .show(TierTip.luminary),
                    semanticLabel: 'Luminary badge: what it means',
                    background: Color(0xFF7C3AED),
                    foreground: Colors.white,
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: healerShelf(
                  'Practitioners Near You',
                  shelves.localHeroes,
                  badge: ShelfBadge(
                    label: 'LOCAL HERO',
                    onTap: () => ref
                        .read(tierTipProvider.notifier)
                        .show(TierTip.localHero),
                    semanticLabel: 'Local Hero badge: what it means',
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

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
import '../area/area.dart';
import '../area/area_sheet.dart';
import '../interests/hidden_empty.dart';
import '../interests/interests.dart';
import '../star/star_layer.dart';
import '../star/star_page.dart';
import '../star/tier_tips.dart';
import 'billboard.dart';
import 'explore_more.dart';
import '../learning/learning.dart';

/// Home — mirrors the website's homepage (HomePageContent.js): the feeling
/// question, the subject pills, the billboard, the healer and publisher
/// shelves, and Explore More; and, for someone who chose interests, a For You
/// shelf first — one content type per visit, in rotation. The chosen subject narrows all of it. The frame
/// (top bar, star search box, sticky pills) is the shared [StarPage].
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subject = ref.watch(subjectFilterProvider);
    // Choosing View All here is landing on it too: For You moves on a turn.
    ref.listen(subjectFilterProvider, (previous, next) {
      if (previous != null &&
          next == null &&
          StarLayer.maybeOf(context)?.currentTab == '/') {
        ref.read(forYouTurnProvider.notifier).landed();
      }
    });
    // Chosen interests shape View All — a For You shelf, and each shelf
    // leading with them — and never a chosen subject, which is narrow already.
    final chosen = subject == null
        ? ref.watch(interestSubjectsProvider)
        : const <String>{};
    // And what Spiritpedia has learned they explore, just below them.
    final learned = subject == null
        ? ref.watch(learnedProvider)
        : const <String, double>{};
    // Never show: everywhere, a chosen subject included.
    final hiding = ref.watch(hidingProvider);
    final forYouShelf = subject == null
        ? ref.watch(forYouProvider).value
        : null;
    final directory = ref.watch(healerDirectoryProvider).value;
    final area = ref.watch(areaProvider).place;
    final places = area == null
        ? const <int, Place>{}
        : ref.watch(healerPlacesProvider).value ?? const <int, Place>{};
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
          data: (everyone) {
            // A teacher or channel goes if every subject they cover is
            // hidden, or all their content is (docs/personalisation.md).
            final all = hiding.visible(everyone);
            final shelves = HealerShelves(
              byInterest(
                bySubject(all, subject, (h) => h.subjectSlugs),
                chosen,
                (h) => h.subjectSlugs,
                learned: learned,
              ),
            );
            final seeAll = subject == null
                ? null
                : () => context.push('/subject/$subject');
            final shownPublishers = bySubject(
              hiding.visible(publishers),
              subject,
              (p) => p.subjectSlugs,
            );
            Widget healerShelf(
              String title,
              List<Healer> items, {
              Widget? badge,
              String? subtitle,
              bool tall = false,
              Widget? note,
              bool keepWhenEmpty = false,
            }) => Shelf(
              title: title,
              subtitle: subtitle,
              badge: badge,
              note: note,
              keepWhenEmpty: keepWhenEmpty,
              itemCount: items.length,
              itemWidth: tall ? 230 : 172,
              height: tall ? 330 : 240,
              onSeeAll: seeAll,
              itemBuilder: (_, i) =>
                  HealerCard(healer: items[i], subjectSlug: subject),
            );
            // Practitioners Near You, for their area (docs/personalisation.md):
            // in person within 50 km, nearest first; then online ones.
            final near = nearYou(shelves.localHeroes, area, places);
            final nearby = [...near.near, ...near.online];
            // Never show emptied every shelf: say so, never a blank screen.
            final nothingLeft =
                !hiding.isEmpty &&
                shelves.billboard.isEmpty &&
                shelves.localHeroes.isEmpty &&
                shelves.luminaries.isEmpty &&
                shelves.platforms.isEmpty &&
                shownPublishers.isEmpty;
            return [
              if (forYouShelf case final f?)
                SliverToBoxAdapter(
                  child: Shelf(
                    key: const ValueKey('for-you'),
                    title: 'For You · ${f.section.label}',
                    subtitle: 'From the subjects you chose',
                    itemCount: f.items.length,
                    itemWidth: 250,
                    height: 300,
                    itemBuilder: (context, i) => switch (f.items[i]) {
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
                  ),
                ),
              if (nothingLeft)
                const SliverToBoxAdapter(child: HiddenEmptyState()),
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
                  nearby,
                  note: AreaNote(area: area, nearCount: near.near.length),
                  keepWhenEmpty: area != null,
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
              // A shelf for each Explore More section, each fetched only as
              // it comes within reach of the screen.
              exploreMoreShelves(subject: subject),
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

/// Under Practitioners Near You: "Set your area" for anyone who wants it
/// sooner than the star asks; with an area, where it is and a way to change
/// it — and, when nobody is near yet, that the ones shown work online.
class AreaNote extends StatelessWidget {
  const AreaNote({super.key, required this.area, required this.nearCount});

  final Place? area;
  final int nearCount;

  @override
  Widget build(BuildContext context) {
    final place = area;
    final text = place == null
        ? null
        : nearCount > 0
        ? 'Near ${place.label}'
        : 'No practitioners near ${place.name} yet — these offer online sessions.';
    return Padding(
      padding: const EdgeInsets.only(top: 2),
      child: Wrap(
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          if (text != null)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Text(
                text,
                style: const TextStyle(
                  fontSize: 13.5,
                  color: SpColors.textMuted,
                ),
              ),
            ),
          TextButton(
            key: const ValueKey('set-your-area'),
            onPressed: () => showAreaSheet(context),
            style: TextButton.styleFrom(
              foregroundColor: SpColors.link,
              padding: EdgeInsets.zero,
              minimumSize: const Size(0, 32),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(
              place == null ? 'Set your area' : 'Change',
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/badges.dart';
import '../../shared/widgets/tier_badge.dart';
import '../../core/links/open_link.dart';
import '../../shared/widgets/cards.dart';
import '../../shared/widgets/net_image.dart';
import '../../shared/widgets/shelf.dart';
import '../../theme/colors.dart';
import '../library/saved_items.dart';
import '../star/star_layer.dart';
import 'detail_providers.dart';
import 'detail_widgets.dart';
import '../../theme/layout.dart';

/// A publishing house (web/app/publishers/[slug]/page.js): its authors, then
/// one shelf of titles per author.
class PublisherScreen extends ConsumerWidget {
  const PublisherScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DetailScaffold<PublisherContent>(
      value: ref.watch(publisherProvider(slug)),
      onRetry: () => ref.invalidate(publisherProvider(slug)),
      notFoundLabel: 'publisher',
      saveKind: SavedKind.publishers,
      saveSlug: slug,
      sharePath: '/publishers/$slug',
      shareTitle: (c) => c.publisher.name,
      builder: (context, c) {
        final p = c.publisher;
        return ListView(
          padding: const EdgeInsets.only(
            bottom: 40 + FloatingHomeStar.clearance,
          ),
          children: [
            Padding(
              padding: EdgeInsets.symmetric(
                horizontal: SpLayout.of(context).gutter,
              ),
              child: Readable(
                child: Column(
                  children: [
                    Container(
                      width: 120,
                      height: 120,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: SpColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: SpColors.border),
                      ),
                      child: p.logoUrl == null
                          ? Center(
                              child: Text(
                                p.name.isEmpty ? '?' : p.name[0].toUpperCase(),
                                style: const TextStyle(
                                  fontSize: 46,
                                  fontWeight: FontWeight.w700,
                                  color: SpColors.link,
                                ),
                              ),
                            )
                          : NetImage(
                              url: p.logoUrl,
                              fit: BoxFit.contain,
                              fallbackLabel: p.name,
                            ),
                    ),
                    const SizedBox(height: 18),
                    DetailTitle(p.name, center: true),
                    // Its tier and ✓ Verified, which the star explains.
                    const SizedBox(height: 8),
                    ListingBadgeRow.publisher(p),
                    if (p.foundedYear != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        'Founded ${p.foundedYear}',
                        style: const TextStyle(
                          fontSize: 14,
                          color: SpColors.textMuted,
                        ),
                      ),
                    ],
                    if (withScheme(p.websiteUrl) case final site?)
                      TextButton(
                        onPressed: () => openExternal(context, site),
                        style: TextButton.styleFrom(
                          foregroundColor: SpColors.link,
                        ),
                        child: Text(
                          actionLabel(name: p.name, entityType: publisherType),
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    if (p.description != null) ...[
                      const SizedBox(height: 12),
                      Expandable(p.description!),
                    ],
                  ],
                ),
              ),
            ),
            // Channels and apps linked to the house are not its authors.
            for (final (heading, people) in [
              (
                'Our Authors',
                [
                  for (final a in c.authors)
                    if (!a.isPlatform) a,
                ],
              ),
              (
                'Channels & Apps',
                [
                  for (final a in c.authors)
                    if (a.isPlatform) a,
                ],
              ),
            ])
              if (people.isNotEmpty) ...[
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    SpLayout.of(context).gutter,
                    30,
                    SpLayout.of(context).gutter,
                    12,
                  ),
                  child: Text(
                    heading,
                    style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                SizedBox(
                  height: 92,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: EdgeInsets.symmetric(
                      horizontal: SpLayout.of(context).gutter,
                    ),
                    itemCount: people.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 16),
                    itemBuilder: (context, i) {
                      final a = people[i];
                      return GestureDetector(
                        onTap: () => context.push('/healers/${a.slug}'),
                        child: SizedBox(
                          width: 66,
                          child: Column(
                            children: [
                              ClipOval(
                                child: SizedBox(
                                  width: 54,
                                  height: 54,
                                  child: NetImage(
                                    url: a.imageUrls.firstOrNull,
                                    fallbackLabel: a.name,
                                    alignment: Alignment.topCenter,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                a.name,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  height: 1.2,
                                  color: SpColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            Padding(
              padding: EdgeInsets.fromLTRB(
                SpLayout.of(context).gutter,
                26,
                SpLayout.of(context).gutter,
                0,
              ),
              child: const Text(
                'Published Titles',
                style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
              ),
            ),
            if (c.shelves.isEmpty)
              Padding(
                padding: EdgeInsets.fromLTRB(
                  SpLayout.of(context).gutter,
                  10,
                  SpLayout.of(context).gutter,
                  0,
                ),
                child: const Text(
                  'No published titles linked yet.',
                  style: TextStyle(fontSize: 14, color: SpColors.textFaint),
                ),
              ),
            for (final s in c.shelves)
              Shelf(
                title: s.author.name,
                itemCount: s.books.length,
                itemWidth: 140,
                height: 262,
                onTitleTap: () => context.push('/healers/${s.author.slug}'),
                itemBuilder: (_, i) => BookCard(book: s.books[i]),
              ),
          ],
        );
      },
    );
  }
}

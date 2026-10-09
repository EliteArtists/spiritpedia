import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/links/open_link.dart';
import '../../shared/widgets/cards.dart';
import '../../shared/widgets/net_image.dart';
import '../../shared/widgets/shelf.dart';
import '../../theme/colors.dart';
import '../library/saved_items.dart';
import 'detail_providers.dart';
import 'detail_widgets.dart';

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
      builder: (context, c) {
        final p = c.publisher;
        return ListView(
          padding: const EdgeInsets.only(bottom: 40),
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
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
                  if (p.websiteUrl != null)
                    TextButton(
                      onPressed: () => openExternal(context, p.websiteUrl!),
                      style: TextButton.styleFrom(
                        foregroundColor: SpColors.link,
                      ),
                      child: const Text(
                        'Visit Website →',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  if (p.description != null) ...[
                    const SizedBox(height: 12),
                    Expandable(p.description!),
                  ],
                ],
              ),
            ),
            if (c.authors.isNotEmpty) ...[
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 30, 20, 12),
                child: Text(
                  'Our Authors',
                  style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
                ),
              ),
              SizedBox(
                height: 92,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: c.authors.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 16),
                  itemBuilder: (context, i) {
                    final a = c.authors[i];
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
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 26, 20, 0),
              child: Text(
                'Published Titles',
                style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
              ),
            ),
            if (c.shelves.isEmpty)
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 10, 20, 0),
                child: Text(
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

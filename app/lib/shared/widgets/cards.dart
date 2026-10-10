import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/models.dart';
import '../../data/shelf_rules.dart';
import '../../features/library/saved_items.dart';
import '../../theme/colors.dart';
import 'net_image.dart';
import 'tier_badge.dart';

// The website's cards, adapted to a phone. Every card opens the matching
// detail page at the same path the website uses, and carries the website's
// heart in its top-right corner.

BorderRadius get _radius => BorderRadius.circular(14);

class _Tappable extends StatelessWidget {
  const _Tappable({
    required this.onTap,
    required this.child,
    required this.label,
  });

  final VoidCallback onTap;
  final Widget child;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: ClipRRect(
        borderRadius: _radius,
        child: Material(
          color: SpColors.surface,
          child: InkWell(onTap: onTap, child: child),
        ),
      ),
    );
  }
}

/// The heart on a card, as the website draws it: an outline that fills red
/// when saved. Its own 44-point tap target — a tap saves, and never opens the
/// card underneath.
class CardHeart extends ConsumerWidget {
  const CardHeart({super.key, required this.kind, required this.slug});

  final SavedKind kind;
  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(savedItemsProvider)[kind]?.contains(slug) ?? false;
    return Positioned(
      top: 2,
      right: 2,
      child: IconButton(
        tooltip: saved ? 'Remove from My Library' : 'Save to My Library',
        constraints: const BoxConstraints.tightFor(width: 44, height: 44),
        padding: EdgeInsets.zero,
        onPressed: slug.isEmpty
            ? null
            : () => ref.read(savedItemsProvider.notifier).toggle(kind, slug),
        icon: Icon(
          saved ? Icons.favorite : Icons.favorite_border,
          size: 24,
          color: saved ? const Color(0xFFEF4444) : Colors.white,
          shadows: const [Shadow(color: Color(0xB3000000), blurRadius: 6)],
        ),
      ),
    );
  }
}

/// Portrait card: photo, name, and the tier pill — except Ascended Masters,
/// whose name stands alone, as on the website's HealerCard.
class HealerCard extends StatelessWidget {
  const HealerCard({super.key, required this.healer, this.subjectSlug});

  final Healer healer;

  /// The active subject filter — it picks which portrait shows (pickPortrait).
  final String? subjectSlug;

  @override
  Widget build(BuildContext context) {
    final portrait = pickPortrait(
      healer.imageUrls,
      subjectSlug,
      healer.slug.isEmpty ? '${healer.id}' : healer.slug,
    );
    final ascended = healer.isAscendedMaster;
    return _Tappable(
      label: healer.name,
      onTap: () => context.push('/healers/${healer.slug}'),
      child: Stack(
        fit: StackFit.expand,
        children: [
          NetImage(
            url: portrait,
            fallbackLabel: healer.name,
            alignment: Alignment.topCenter,
          ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                stops: [0.45, 0.75, 1],
                colors: [
                  Colors.transparent,
                  Color(0x99000000),
                  Color(0xF2000000),
                ],
              ),
            ),
          ),
          Positioned(
            left: 12,
            right: 12,
            bottom: 12,
            child: Column(
              crossAxisAlignment: ascended
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                Text(
                  healer.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: ascended ? TextAlign.right : TextAlign.left,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                  ),
                ),
                if (!ascended) ...[
                  const SizedBox(height: 8),
                  TierBadge(tier: healer.tier),
                ],
              ],
            ),
          ),
          CardHeart(kind: SavedKind.healers, slug: healer.slug),
        ],
      ),
    );
  }
}

class BookCard extends StatelessWidget {
  const BookCard({super.key, required this.book});

  final Book book;

  @override
  Widget build(BuildContext context) {
    return _Tappable(
      label: book.title,
      onTap: () => context.push('/books/${book.slug}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                NetImage(url: book.coverUrl, fallbackLabel: book.title),
                CardHeart(kind: SavedKind.books, slug: book.slug),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 9, 10, 10),
            child: Text(
              book.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ImageTextCard extends StatelessWidget {
  const _ImageTextCard({
    required this.label,
    required this.onTap,
    required this.imageUrl,
    required this.title,
    this.badge,
    this.byline,
    this.description,
    this.cta,
    this.heart,
  });

  final CardHeart? heart;
  final String label;
  final VoidCallback onTap;
  final String? imageUrl;
  final String title;
  final String? badge;
  final String? byline;
  final String? description;
  final String? cta;

  @override
  Widget build(BuildContext context) {
    return _Tappable(
      label: label,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Stack(
              fit: StackFit.expand,
              children: [
                NetImage(url: imageUrl, fallbackLabel: title),
                if (badge != null)
                  Positioned(
                    left: 10,
                    top: 10,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: const Color(0xD9000000),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 9,
                          vertical: 3,
                        ),
                        child: Text(
                          badge!.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                    ),
                  ),
                ?heart,
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      height: 1.3,
                    ),
                  ),
                  if (byline != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      byline!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: SpColors.link,
                      ),
                    ),
                  ],
                  if (description != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      description!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: SpColors.textMuted,
                        height: 1.4,
                      ),
                    ),
                  ],
                  const Spacer(),
                  if (cta != null)
                    Text(
                      cta!,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: SpColors.link,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class OfferingCard extends StatelessWidget {
  const OfferingCard({super.key, required this.offering, this.healerName});

  final Offering offering;
  final String? healerName;

  @override
  Widget build(BuildContext context) => _ImageTextCard(
    label: offering.title,
    onTap: () => context.push('/offerings/${offering.slug}'),
    imageUrl: offering.imageUrl,
    title: offering.title,
    badge: offering.price,
    byline: healerName,
    description: offering.description,
    cta: offering.ctaLabel,
    heart: CardHeart(kind: SavedKind.offerings, slug: offering.slug),
  );
}

class FreeResourceCard extends StatelessWidget {
  const FreeResourceCard({super.key, required this.resource, this.healerName});

  final FreeResource resource;
  final String? healerName;

  @override
  Widget build(BuildContext context) => _ImageTextCard(
    label: resource.title,
    onTap: () => context.push('/free-resources/${resource.slug}'),
    imageUrl: resource.imageUrl,
    title: resource.title,
    badge: resource.typeLabel,
    byline: healerName,
    description: resource.description,
    heart: CardHeart(kind: SavedKind.freeResources, slug: resource.slug),
  );
}

class PublisherCard extends StatelessWidget {
  const PublisherCard({super.key, required this.publisher});

  final Publisher publisher;

  @override
  Widget build(BuildContext context) {
    final meta = [
      if (publisher.foundedYear != null) 'Founded ${publisher.foundedYear}',
      if (publisher.authorCount > 0) '${publisher.authorCount} authors',
    ].join(' · ');
    return _Tappable(
      label: publisher.name,
      onTap: () => context.push('/publishers/${publisher.slug}'),
      child: Stack(
        fit: StackFit.expand,
        children: [
          _publisherBody(meta),
          CardHeart(kind: SavedKind.publishers, slug: publisher.slug),
        ],
      ),
    );
  }

  Widget _publisherBody(String meta) => Padding(
    padding: const EdgeInsets.all(14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: ColoredBox(
              color: Colors.white,
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: NetImage(
                  url: publisher.logoUrl,
                  fit: BoxFit.contain,
                  fallbackLabel: publisher.name,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          publisher.name,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
        if (meta.isNotEmpty) ...[
          const SizedBox(height: 3),
          Text(
            meta,
            style: const TextStyle(fontSize: 12, color: SpColors.textMuted),
          ),
        ],
      ],
    ),
  );
}

class VideoCard extends StatelessWidget {
  const VideoCard({super.key, required this.video, this.healerName});

  final Video video;
  final String? healerName;

  @override
  Widget build(BuildContext context) {
    return _Tappable(
      label: video.title,
      onTap: () => context.push('/videos/${video.slug}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Stack(
              fit: StackFit.expand,
              children: [
                NetImage(url: video.thumbnailUrl, fallbackLabel: video.title),
                const Center(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: Color(0x99000000),
                      shape: BoxShape.circle,
                    ),
                    child: Padding(
                      padding: EdgeInsets.all(8),
                      child: Icon(Icons.play_arrow_rounded, size: 26),
                    ),
                  ),
                ),
                CardHeart(kind: SavedKind.videos, slug: video.slug),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
            child: Text(
              video.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                height: 1.3,
              ),
            ),
          ),
          if (healerName != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
              child: Text(
                healerName!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12, color: SpColors.textMuted),
              ),
            ),
        ],
      ),
    );
  }
}

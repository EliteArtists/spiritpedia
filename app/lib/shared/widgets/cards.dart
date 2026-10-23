import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/models.dart';
import '../../data/shelf_rules.dart';
import '../../features/library/save_prompt.dart';
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
            : () => saveOrAsk(context, ref, kind, slug),
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

/// Portrait card: photo; the tier (with ✓ Verified, or Official) top left,
/// the heart top right; the name, and a channel's type bottom right. An
/// Ascended Master's name stands alone, as on the website's HealerCard.
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
                if (healer.isPlatform) ...[
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerRight,
                    child: ListingBadgeRow.healer(
                      healer,
                      kinds: ListingBadgeRow.typeOnly,
                    ),
                  ),
                ],
              ],
            ),
          ),
          // Each badge the star explains; a tap on one never opens the card.
          Positioned(
            top: 10,
            left: 10,
            right: 48, // clear of the heart
            child: ListingBadgeRow.healer(healer, kinds: ListingBadgeRow.top),
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
    this.when,
  });

  final CardHeart? heart;

  /// A dated offering's dates ("18–20 Sep 2026"), under the title.
  final String? when;
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
                  if (when != null) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(
                          Icons.event_outlined,
                          size: 13,
                          color: Color(0xFFFBBF24),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            when!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFFFBBF24),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
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
                      // A date line takes one of the description's lines, so
                      // every card in a shelf stays the same height.
                      maxLines: when == null ? 2 : 1,
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
    when: offering.whenLine,
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

/// A publisher's logo, the same way on the card and the page
/// (web/components/PublisherLogo.jsx): on a white, rounded, padded panel,
/// contained and centred, never stretched or cropped. White because most
/// logos come on white; it keeps pale and dark logos readable alike.
class PublisherLogo extends StatelessWidget {
  const PublisherLogo({
    super.key,
    required this.publisher,
    this.padding = const EdgeInsets.all(14),
  });

  final Publisher publisher;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final name = publisher.name.trim();
    final initial = Center(
      child: Text(
        name.isEmpty ? '?' : name[0].toUpperCase(),
        style: const TextStyle(
          fontSize: 40,
          fontWeight: FontWeight.w700,
          color: SpColors.link,
        ),
      ),
    );
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x0D000000)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: padding,
          child: publisher.logoUrl == null
              ? initial
              : NetImage(
                  url: publisher.logoUrl,
                  fit: BoxFit.contain,
                  fallbackLabel: publisher.name,
                ),
        ),
      ),
    );
  }
}

/// "18 authors · Founded 1984", or "Independent press" when there is neither
/// yet: always one line, so the cards line up.
String publisherMeta(Publisher p) {
  final parts = [
    if (p.authorCount > 0)
      '${p.authorCount} ${p.authorCount == 1 ? 'author' : 'authors'}',
    if (p.foundedYear != null) 'Founded ${p.foundedYear}',
  ];
  return parts.isEmpty ? 'Independent press' : parts.join(' · ');
}

class PublisherCard extends StatelessWidget {
  const PublisherCard({super.key, required this.publisher});

  final Publisher publisher;

  @override
  Widget build(BuildContext context) {
    return _Tappable(
      label: publisher.name,
      onTap: () => context.push('/publishers/${publisher.slug}'),
      child: Stack(
        fit: StackFit.expand,
        children: [
          _publisherBody(),
          // Top left, as on every card: its tier and ✓ Verified.
          Positioned(
            top: 22,
            left: 22,
            right: 52,
            child: ListingBadgeRow.publisher(publisher),
          ),
          CardHeart(kind: SavedKind.publishers, slug: publisher.slug),
        ],
      ),
    );
  }

  Widget _publisherBody() => Padding(
    padding: const EdgeInsets.all(14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // The panel fills the space the card gives it, whatever the logo's
        // own shape, so every card keeps the same top.
        Expanded(
          child: SizedBox(
            width: double.infinity,
            child: PublisherLogo(
              publisher: publisher,
              padding: const EdgeInsets.fromLTRB(40, 34, 40, 12),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          publisher.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 3),
        Text(
          publisherMeta(publisher),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 12, color: SpColors.textMuted),
        ),
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

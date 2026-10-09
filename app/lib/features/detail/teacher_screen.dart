import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/links/open_link.dart';
import '../../data/models.dart';
import '../../data/shelf_rules.dart';
import '../../shared/widgets/cards.dart';
import '../../shared/widgets/net_image.dart';
import '../../shared/widgets/shelf.dart';
import '../../shared/widgets/tier_badge.dart';
import '../../theme/colors.dart';
import '../library/saved_items.dart';
import 'detail_providers.dart';
import 'detail_widgets.dart';

/// A teacher's page (web/app/healers/[slug]/page.js): portraits, name, tier,
/// social links, bio, the contact card, then their shelves.
class TeacherScreen extends ConsumerWidget {
  const TeacherScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DetailScaffold<TeacherContent>(
      value: ref.watch(teacherProvider(slug)),
      onRetry: () => ref.invalidate(teacherProvider(slug)),
      notFoundLabel: 'teacher',
      saveKind: SavedKind.healers,
      saveSlug: slug,
      builder: (context, c) => _Teacher(content: c),
    );
  }
}

class _Teacher extends StatelessWidget {
  const _Teacher({required this.content});

  final TeacherContent content;

  @override
  Widget build(BuildContext context) {
    final h = content.healer;
    final offerings = content.offerings;
    final memberships = [
      for (final o in offerings)
        if (o.productType == 'membership') o,
    ];
    final split = splitOfferings(offerings);
    final name = h.name;

    Widget offeringShelf(String title, String subtitle, List<Offering> items) =>
        Shelf(
          title: title,
          subtitle: subtitle,
          itemCount: items.length,
          itemWidth: 250,
          height: 300,
          itemBuilder: (_, i) =>
              OfferingCard(offering: items[i], healerName: name),
        );

    return ListView(
      padding: const EdgeInsets.only(bottom: 40),
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: _Portraits(urls: h.imageUrls.take(3).toList(), name: name),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DetailTitle(name),
              const SizedBox(height: 10),
              _Badge(healer: h),
              _Social(healer: h),
              if (h.bio != null) ...[
                const SizedBox(height: 20),
                Expandable(h.bio!),
              ],
              _Contact(healer: h),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Shelf(
          title: 'Videos',
          subtitle: 'Teachings & Talks',
          itemCount: content.videos.length,
          itemWidth: 250,
          height: 232,
          itemBuilder: (_, i) =>
              VideoCard(video: content.videos[i], healerName: name),
        ),
        Shelf(
          title: 'Books & Literature',
          subtitle: 'The Curated Archive',
          itemCount: content.books.length,
          itemWidth: 140,
          height: 262,
          itemBuilder: (_, i) => BookCard(book: content.books[i]),
        ),
        Shelf(
          title: 'Free Resources',
          subtitle: 'No Cost, No Catch',
          itemCount: content.freeResources.length,
          itemWidth: 250,
          height: 300,
          itemBuilder: (_, i) => FreeResourceCard(
            resource: content.freeResources[i],
            healerName: name,
          ),
        ),
        offeringShelf('Courses & Programmes', 'Go Deeper', split.courses),
        offeringShelf('Retreats & Events', 'Live Experiences', split.retreats),
        offeringShelf('Downloads & Audio', 'Take It With You', split.downloads),
        offeringShelf('Memberships', 'Ongoing Journey', memberships),
      ],
    );
  }
}

/// Up to three portraits, swiped, with dots — HeroImageRotator's job.
class _Portraits extends StatefulWidget {
  const _Portraits({required this.urls, required this.name});

  final List<String> urls;
  final String name;

  @override
  State<_Portraits> createState() => _PortraitsState();
}

class _PortraitsState extends State<_Portraits> {
  int _page = 0;

  @override
  Widget build(BuildContext context) {
    final urls = widget.urls.isEmpty ? <String?>[null] : widget.urls;
    return Column(
      children: [
        AspectRatio(
          aspectRatio: 4 / 5,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: PageView.builder(
              itemCount: urls.length,
              onPageChanged: (i) => setState(() => _page = i),
              itemBuilder: (_, i) => NetImage(
                url: urls[i],
                fallbackLabel: widget.name,
                alignment: Alignment.topCenter,
              ),
            ),
          ),
        ),
        if (urls.length > 1)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < urls.length; i++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: i == _page ? 18 : 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: i == _page
                          ? SpColors.link
                          : const Color(0x55FFFFFF),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

/// An Ascended Master's badge IS their lifespan, omitted with no years.
class _Badge extends StatelessWidget {
  const _Badge({required this.healer});

  final Healer healer;

  @override
  Widget build(BuildContext context) {
    if (!healer.isAscendedMaster) return TierBadge(tier: healer.tier);
    final lifespan = formatLifespan(healer);
    if (lifespan == null) return const SizedBox.shrink();
    return DecoratedBox(
      decoration: BoxDecoration(
        color: SpTierColors.ascendedBackground,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        child: Text(
          lifespan,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: SpTierColors.ascendedText,
          ),
        ),
      ),
    );
  }
}

class _Social extends StatelessWidget {
  const _Social({required this.healer});

  final Healer healer;

  @override
  Widget build(BuildContext context) {
    final links = [
      ('Website', healer.websiteUrl, Icons.language),
      ('YouTube', healer.youtubeUrl, Icons.smart_display_outlined),
      ('Instagram', healer.instagramUrl, Icons.camera_alt_outlined),
      ('Facebook', healer.facebookUrl, Icons.facebook),
      ('Twitter', healer.twitterUrl, Icons.alternate_email),
      ('TikTok', healer.tiktokUrl, Icons.music_note_outlined),
    ].where((l) => l.$2 != null).toList();
    if (links.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Wrap(
        spacing: 10,
        runSpacing: 10,
        children: [
          for (final (label, url, icon) in links)
            Tooltip(
              message: label,
              child: Material(
                color: const Color(0x33FFFFFF),
                shape: const CircleBorder(),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: () => openExternal(context, url!),
                  child: SizedBox(
                    width: 42,
                    height: 42,
                    child: Icon(icon, size: 20, semanticLabel: label),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// The contact card — only when there is an email, phone or booking link, and
/// never for an Ascended Master.
class _Contact extends StatelessWidget {
  const _Contact({required this.healer});

  final Healer healer;

  @override
  Widget build(BuildContext context) {
    final h = healer;
    final show =
        !h.isAscendedMaster &&
        (h.contactEmail != null ||
            h.contactPhone != null ||
            h.bookingUrl != null);
    if (!show) return const SizedBox.shrink();
    final online = h.availabilityType?.contains('Online') ?? false;
    final firstName = h.name.split(' ').first;

    Widget pill(String text, Color bg, Color fg) => DecoratedBox(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 12,
            color: fg,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
    Widget row(IconData icon, String text, String url) => InkWell(
      onTap: () => openExternal(context, url),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          children: [
            Icon(icon, size: 17, color: SpColors.textMuted),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                text,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 14, color: Color(0xFFD1D5DB)),
              ),
            ),
          ],
        ),
      ),
    );

    return Container(
      margin: const EdgeInsets.only(top: 24),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: SpColors.surface,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (h.city != null || online)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (h.city != null)
                    pill(
                      'In Person (${h.city})',
                      const Color(0x991E1B4B),
                      const Color(0xFFA5B4FC),
                    ),
                  if (online)
                    pill(
                      'Online Session available',
                      const Color(0x993B0764),
                      const Color(0xFFD8B4FE),
                    ),
                ],
              ),
            ),
          if (h.contactEmail != null)
            row(
              Icons.mail_outline,
              h.contactEmail!,
              Uri(
                scheme: 'mailto',
                path: h.contactEmail,
                query:
                    'subject=${Uri.encodeComponent('Inquiry via Spiritpedia')}',
              ).toString(),
            ),
          if (h.contactPhone != null)
            row(
              Icons.phone_outlined,
              h.contactPhone!,
              Uri(
                scheme: 'tel',
                path: h.contactPhone!.replaceAll(' ', ''),
              ).toString(),
            ),
          if (h.bookingUrl != null) ...[
            const SizedBox(height: 12),
            OutboundButton(label: 'Book with $firstName →', url: h.bookingUrl!),
          ],
        ],
      ),
    );
  }
}

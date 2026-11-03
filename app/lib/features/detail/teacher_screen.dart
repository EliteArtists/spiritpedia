import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/safety/medical_note.dart';
import '../../data/badges.dart';
import '../../core/links/open_link.dart';
import '../../data/models.dart';
import '../../data/shelf_rules.dart';
import '../../shared/widgets/cards.dart';
import '../../shared/widgets/net_image.dart';
import '../../shared/widgets/shelf.dart';
import '../../shared/widgets/tier_badge.dart';
import '../../theme/colors.dart';
import '../library/saved_items.dart';
import '../star/star_layer.dart';
import 'detail_providers.dart';
import 'detail_widgets.dart';
import '../../theme/layout.dart';

/// A teacher's page (web/app/healers/[slug]/page.js): portraits, name, tier,
/// social links, bio, the contact card, then their shelves. A school's or
/// organisation's page is the same page, with Our Teachers first (README
/// §17.11); a school's picture sits on the white logo panel.
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
      sharePath: '/healers/$slug',
      shareTitle: (c) => c.healer.name,
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
      padding: const EdgeInsets.only(bottom: 40 + FloatingHomeStar.clearance),
      children: [
        ..._head(context, h, name, content.hubs),
        const SizedBox(height: 12),
        // A hub's teachers (0029, 0030), first. Hidden when it has none.
        Shelf(
          title: 'Our Teachers',
          subtitle: 'Teach With Us',
          itemCount: content.teachers.length,
          itemWidth: 172,
          height: 240,
          itemBuilder: (_, i) => HealerCard(healer: content.teachers[i]),
        ),
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
        offeringShelf('Memberships', 'Ongoing Journey', split.memberships),
      ],
    );
  }
}

/// Up to three portraits, swiped, with dots — HeroImageRotator's job.
/// The portraits and the words about them. On an iPad the portraits sit
/// beside the words, at a sensible size, instead of filling the width.
List<Widget> _head(
  BuildContext context,
  Healer h,
  String name,
  List<({String role, Healer hub})> hubs,
) {
  final layout = SpLayout.of(context);
  // A school's picture is usually its logo, so it sits on the publisher's
  // white logo panel instead.
  final portraits = h.isSchool
      ? AspectRatio(
          aspectRatio: 1,
          child: PublisherLogo.listing(
            name: name,
            logoUrl: h.imageUrls.firstOrNull,
            padding: const EdgeInsets.all(40),
          ),
        )
      : _Portraits(urls: h.imageUrls.take(3).toList(), name: name);
  final words = Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      DetailTitle(name),
      const SizedBox(height: 10),
      _Badge(healer: h),
      if (h.isSchool) _Founded(school: h),
      if (hubs.isNotEmpty) _HubLine(hubs: hubs),
      _Social(healer: h),
      if (h.bio != null) ...[const SizedBox(height: 20), Expandable(h.bio!)],
      if (needsMedicalNote(h.subjectSlugs)) const MedicalNote(),
      _Contact(healer: h),
    ],
  );
  if (layout.isCompact) {
    return [
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: portraits,
      ),
      Padding(padding: const EdgeInsets.fromLTRB(20, 20, 20, 0), child: words),
    ];
  }
  return [
    Padding(
      padding: EdgeInsets.fromLTRB(layout.gutter, 8, layout.gutter, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: layout.size == WidthClass.wide ? 400 : 320,
            child: portraits,
          ),
          const SizedBox(width: 32),
          Expanded(child: Readable(centre: false, child: words)),
        ],
      ),
    ),
  ];
}

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
    if (!healer.isAscendedMaster) {
      return ListingBadgeRow.healer(healer);
    }
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

/// A school: "Founded 2008 · Visit website →", as on a publisher's page.
class _Founded extends StatelessWidget {
  const _Founded({required this.school});

  final Healer school;

  @override
  Widget build(BuildContext context) {
    final site = withScheme(school.websiteUrl);
    if (school.foundedYear == null && site == null) {
      return const SizedBox.shrink();
    }
    const muted = TextStyle(fontSize: 14, color: SpColors.textMuted);
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Wrap(
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 12,
        runSpacing: 4,
        children: [
          if (school.foundedYear != null)
            Text('Founded ${school.foundedYear}', style: muted),
          if (school.foundedYear != null && site != null)
            const ExcludeSemantics(child: Text('·', style: muted)),
          if (site != null)
            TextButton(
              onPressed: () => openExternal(context, site),
              style: TextButton.styleFrom(
                foregroundColor: SpColors.link,
                padding: EdgeInsets.zero,
                minimumSize: const Size(0, 32),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text(
                'Visit website →',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
            ),
        ],
      ),
    );
  }
}

/// A teacher: the hubs they teach at or on, each linked to its page. The
/// words show again only when they change: "Founder of A, teaches at B and
/// C, teaches on D" ([hubLine]).
class _HubLine extends StatefulWidget {
  const _HubLine({required this.hubs});

  final List<({String role, Healer hub})> hubs;

  @override
  State<_HubLine> createState() => _HubLineState();
}

class _HubLineState extends State<_HubLine> {
  late List<({String lead, Healer hub})> _pieces;
  final _taps = <TapGestureRecognizer>[];

  @override
  void initState() {
    super.initState();
    _build();
  }

  @override
  void didUpdateWidget(_HubLine old) {
    super.didUpdateWidget(old);
    if (old.hubs != widget.hubs) _build();
  }

  void _build() {
    _dispose();
    _pieces = hubLine(widget.hubs);
    for (final p in _pieces) {
      _taps.add(
        TapGestureRecognizer()
          ..onTap = () => context.push('/healers/${p.hub.slug}'),
      );
    }
  }

  void _dispose() {
    for (final t in _taps) {
      t.dispose();
    }
    _taps.clear();
  }

  @override
  void dispose() {
    _dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Text.rich(
        TextSpan(
          style: const TextStyle(
            fontSize: 14,
            color: SpColors.textMuted,
            height: 1.5,
          ),
          children: [
            for (final (i, p) in _pieces.indexed) ...[
              TextSpan(text: p.lead),
              TextSpan(
                text: p.hub.name,
                recognizer: _taps[i],
                style: const TextStyle(
                  color: SpColors.link,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ],
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
    final links =
        [
              ('Website', healer.websiteUrl, Icons.language),
              ('YouTube', healer.youtubeUrl, Icons.smart_display_outlined),
              ('Instagram', healer.instagramUrl, Icons.camera_alt_outlined),
              ('Facebook', healer.facebookUrl, Icons.facebook),
              ('Twitter', healer.twitterUrl, Icons.alternate_email),
              ('TikTok', healer.tiktokUrl, Icons.music_note_outlined),
            ]
            // "www.example.com" typed without https:// still opens.
            .map((l) => (l.$1, withScheme(l.$2), l.$3))
            .where((l) => l.$2 != null)
            .toList();
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

/// The contact card — only when there is an email, phone or a link for its
/// button, and never for an Ascended Master.
class _Contact extends StatelessWidget {
  const _Contact({required this.healer});

  final Healer healer;

  @override
  Widget build(BuildContext context) {
    final h = healer;
    // "Book with Eckhart →" for a practitioner; "Visit {name} →" for
    // everyone else, Spiritpedia included (data/badges.dart).
    final actionLink = actionUrl(
      entityType: h.entityType,
      bookingUrl: h.bookingUrl,
      websiteUrl: h.websiteUrl,
      official: h.official,
    );
    final show =
        !h.isAscendedMaster &&
        (h.contactEmail != null ||
            h.contactPhone != null ||
            actionLink != null);
    if (!show) return const SizedBox.shrink();
    // Sessions are a person's: a channel shows no In Person or Online pill.
    final person = isPerson(h.entityType);
    final online = person && (h.availabilityType?.contains('Online') ?? false);

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
          if ((person && h.city != null) || online)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (person && h.city != null)
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
          if (actionLink != null) ...[
            const SizedBox(height: 12),
            OutboundButton(
              label: actionLabel(
                name: h.name,
                entityType: h.entityType,
                official: h.official,
              ),
              url: actionLink,
            ),
          ],
        ],
      ),
    );
  }
}

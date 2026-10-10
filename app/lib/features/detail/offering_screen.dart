import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/widgets/net_image.dart';
import '../../theme/colors.dart';
import '../library/saved_items.dart';
import 'detail_providers.dart';
import 'detail_widgets.dart';

/// The website's PRODUCT_TYPES (web/app/offerings/[slug]/page.js).
const _productTypes = {
  'course': (badge: Color(0xFF7C3AED), label: 'COURSE', cta: 'Enrol Now →'),
  'retreat': (badge: Color(0xFFF59E0B), label: 'RETREAT', cta: 'Book Place →'),
  'download': (
    badge: Color(0xFF2563EB),
    label: 'DOWNLOAD',
    cta: 'Get Download →',
  ),
  'membership': (
    badge: Color(0xFF059669),
    label: 'MEMBERSHIP',
    cta: 'Join Now →',
  ),
};

/// A course, retreat, download or membership.
class OfferingScreen extends ConsumerWidget {
  const OfferingScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DetailScaffold<Offering>(
      value: ref.watch(offeringProvider(slug)),
      onRetry: () => ref.invalidate(offeringProvider(slug)),
      notFoundLabel: 'offering',
      saveKind: SavedKind.offerings,
      saveSlug: slug,
      sharePath: '/offerings/$slug',
      shareTitle: (o) => o.title,
      builder: (context, o) {
        final type = _productTypes[o.productType] ?? _productTypes['course']!;
        return _OfferingLayout(
          badges: [
            _Pill(type.label, background: type.badge),
            if (o.price != null)
              _Pill(
                o.price!,
                background: SpColors.surface,
                border: SpColors.border,
              ),
          ],
          title: o.title,
          healerId: o.healerId,
          imageUrl: o.imageUrl,
          description: o.description,
          ctaLabel: type.cta,
          ctaUrl: o.url,
          missingCta: 'booking',
          subjects: o.subjectSlugs,
        );
      },
    );
  }
}

/// A free resource (web/app/free-resources/[slug]/page.js).
class FreeResourceScreen extends ConsumerWidget {
  const FreeResourceScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DetailScaffold<FreeResource>(
      value: ref.watch(freeResourceProvider(slug)),
      onRetry: () => ref.invalidate(freeResourceProvider(slug)),
      notFoundLabel: 'resource',
      saveKind: SavedKind.freeResources,
      saveSlug: slug,
      sharePath: '/free-resources/$slug',
      shareTitle: (r) => r.title,
      builder: (context, r) => _OfferingLayout(
        badges: const [_Pill('FREE RESOURCE', background: Color(0xFF0D9488))],
        title: r.title,
        healerId: r.healerId,
        imageUrl: r.imageUrl,
        description: r.description,
        ctaLabel: 'Get It Free →',
        ctaUrl: r.url,
        missingCta: 'access',
        subjects: r.subjectSlugs,
      ),
    );
  }
}

class _OfferingLayout extends ConsumerWidget {
  const _OfferingLayout({
    required this.badges,
    required this.title,
    required this.healerId,
    required this.imageUrl,
    required this.description,
    required this.ctaLabel,
    required this.ctaUrl,
    required this.missingCta,
    required this.subjects,
  });

  final List<Widget> badges;
  final String title;
  final int? healerId;
  final String? imageUrl;
  final String? description;
  final String ctaLabel;
  final String? ctaUrl;
  final String missingCta;
  final List<String> subjects;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final healer = ref.watch(healerDirectoryProvider).value?.byId(healerId);
    return ListView(
      padding: detailPadding,
      children: [
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 10,
          runSpacing: 8,
          children: badges,
        ),
        const SizedBox(height: 16),
        DetailTitle(title, center: true),
        const SizedBox(height: 8),
        Center(child: ByLine(healerId: healerId)),
        const SizedBox(height: 22),
        ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: imageUrl == null
              ? Container(
                  height: 220,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF4C1D95), SpColors.background],
                    ),
                  ),
                )
              : ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 360),
                  child: NetImage(url: imageUrl, fallbackLabel: title),
                ),
        ),
        if (description != null) ...[
          const SizedBox(height: 22),
          Expandable(description!),
        ],
        const SizedBox(height: 24),
        if (ctaUrl != null)
          OutboundButton(label: ctaLabel, url: ctaUrl!)
        else
          Text(
            'Contact ${healer?.name ?? 'the healer'} directly for $missingCta information.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14, color: SpColors.textMuted),
          ),
        if (subjects.isNotEmpty) ...[
          const SizedBox(height: 26),
          SubjectChips(subjects),
        ],
      ],
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill(this.text, {required this.background, this.border});

  final String text;
  final Color background;
  final Color? border;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: background,
      borderRadius: BorderRadius.circular(999),
      border: border == null ? null : Border.all(color: border!),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.6,
          color: Colors.white,
        ),
      ),
    ),
  );
}

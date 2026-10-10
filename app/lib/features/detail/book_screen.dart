import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/affiliate/amazon.dart';
import '../../core/config.dart';
import '../../core/links/open_link.dart';
import '../../data/models.dart';
import '../../shared/widgets/net_image.dart';
import '../../theme/colors.dart';
import '../library/saved_items.dart';
import 'detail_providers.dart';
import 'detail_widgets.dart';

/// The words the Associates Operating Agreement and FTC / UK ASA rules
/// require wherever a tagged link appears — the website's wording.
const amazonDisclosure =
    'As an Amazon Associate, Spiritpedia earns from qualifying purchases. '
    'It never changes what we recommend.';

/// A book (web/app/books/[slug]/page.js).
class BookScreen extends ConsumerWidget {
  const BookScreen({super.key, required this.slug, this.amazonTags});

  final String slug;

  /// Injected by tests; the build's own tags otherwise.
  final Map<String, String>? amazonTags;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DetailScaffold<Book>(
      value: ref.watch(bookProvider(slug)),
      onRetry: () => ref.invalidate(bookProvider(slug)),
      notFoundLabel: 'book',
      saveKind: SavedKind.books,
      saveSlug: slug,
      sharePath: '/books/$slug',
      shareTitle: (b) => b.title,
      builder: (context, book) => ListView(
        padding: detailPadding,
        children: [
          Center(
            child: SizedBox(
              width: 210,
              child: book.coverUrl == null
                  ? Container(
                      height: 300,
                      decoration: BoxDecoration(
                        color: SpColors.surface,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      alignment: Alignment.center,
                      child: const Text(
                        'No cover available',
                        style: TextStyle(
                          fontSize: 13,
                          color: SpColors.textFaint,
                        ),
                      ),
                    )
                  : ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: NetImage(
                        url: book.coverUrl,
                        fit: BoxFit.contain,
                        fallbackLabel: book.title,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 22),
          DetailTitle(book.title),
          const SizedBox(height: 8),
          ByLine(healerSlug: book.healerSlug, fallback: book.author),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _ShelfToggle(
                  kind: SavedKind.books,
                  slug: book.slug,
                  on: '✓ On Your List',
                  off: '+ Want to Read',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ShelfToggle(
                  kind: SavedKind.readBooks,
                  slug: book.slug,
                  on: '✓ Read',
                  off: 'Mark as Read',
                ),
              ),
            ],
          ),
          if (book.description != null) ...[
            const SizedBox(height: 24),
            Expandable(book.description!),
          ],
          const SizedBox(height: 24),
          PurchaseLinks(
            book: book,
            amazonTags: amazonTags ?? amazonTagsFromConfig,
          ),
          if (book.subjectSlugs.isNotEmpty) ...[
            const SizedBox(height: 26),
            SubjectChips(book.subjectSlugs),
          ],
        ],
      ),
    );
  }
}

/// Buy links, each only when its URL is present. The Amazon disclosure sits
/// at the BOTTOM of this section — below every button, not directly under
/// Amazon's — and only when the Amazon link actually carries a tag.
class PurchaseLinks extends StatelessWidget {
  const PurchaseLinks({
    super.key,
    required this.book,
    required this.amazonTags,
  });

  final Book book;
  final Map<String, String> amazonTags;

  @override
  Widget build(BuildContext context) {
    final amazon = amazonAffiliateUrl(book.amazonUrl, tags: amazonTags);
    final buttons = [
      if (amazon != null)
        OutboundButton(
          label: 'Buy on Amazon',
          url: amazon.url,
          background: const Color(0xFFFF9900),
          foreground: Colors.black,
        ),
      if (book.goodreadsUrl != null)
        OutboundButton(
          label: 'View on Goodreads',
          url: book.goodreadsUrl!,
          background: const Color(0xFFF4F1EA),
          foreground: const Color(0xFF372213),
          border: const Color(0xFF372213),
        ),
      if (book.worldOfBooksUrl != null)
        OutboundButton(
          label: 'Find at World of Books',
          url: book.worldOfBooksUrl!,
          background: const Color(0xFF2D6A4F),
          border: SpColors.border,
        ),
    ];
    if (buttons.isEmpty) {
      return const Text(
        'Purchase links coming soon.',
        style: TextStyle(fontSize: 14, color: SpColors.textFaint),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < buttons.length; i++) ...[
          if (i > 0) const SizedBox(height: 12),
          buttons[i],
        ],
        if (amazon?.tagged ?? false)
          Padding(
            padding: const EdgeInsets.only(top: 14),
            child: GestureDetector(
              onTap: () => openExternal(
                context,
                '${AppConfig.siteUrl}/affiliate-disclosure',
              ),
              child: const Text(
                amazonDisclosure,
                key: ValueKey('amazon-disclosure'),
                style: TextStyle(
                  fontSize: 12,
                  height: 1.5,
                  color: SpColors.textFaint,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _ShelfToggle extends ConsumerWidget {
  const _ShelfToggle({
    required this.kind,
    required this.slug,
    required this.on,
    required this.off,
  });

  final SavedKind kind;
  final String slug;
  final String on;
  final String off;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final active = ref.watch(savedItemsProvider)[kind]?.contains(slug) ?? false;
    return SizedBox(
      height: 46,
      child: FilledButton(
        onPressed: () =>
            ref.read(savedItemsProvider.notifier).toggle(kind, slug),
        style: FilledButton.styleFrom(
          backgroundColor: active ? SpColors.primary : SpColors.surface,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(
              color: active ? SpColors.primary : SpColors.border,
            ),
          ),
        ),
        child: Text(active ? on : off, style: const TextStyle(fontSize: 14)),
      ),
    );
  }
}

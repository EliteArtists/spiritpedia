import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/links/open_link.dart';
import '../../core/links/share.dart';
import '../../data/providers.dart';
import '../../theme/colors.dart';
import '../library/saved_items.dart';
import '../star/star_layer.dart';

/// Every detail page's frame: an app bar with share and the save heart, the
/// star floating where the tab bar would be, and the loading, error and
/// not-found states, so each page only draws its content.
class DetailScaffold<T> extends ConsumerWidget {
  const DetailScaffold({
    super.key,
    required this.value,
    required this.onRetry,
    required this.notFoundLabel,
    required this.builder,
    this.saveKind,
    this.saveSlug,
    this.sharePath,
    this.shareTitle,
  });

  final AsyncValue<T?> value;
  final VoidCallback onRetry;
  final String notFoundLabel;
  final Widget Function(BuildContext context, T item) builder;
  final SavedKind? saveKind;
  final String? saveSlug;

  /// The page's path, shared as its spiritpedia.co link ("/books/slug").
  final String? sharePath;
  final String Function(T item)? shareTitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final item = value.value;
    return Scaffold(
      appBar: AppBar(
        actions: [
          if (sharePath != null && item != null)
            ShareIconButton(
              path: sharePath!,
              title: shareTitle?.call(item) ?? 'Spiritpedia',
            ),
          if (saveKind != null && saveSlug != null && item != null)
            SaveHeart(kind: saveKind!, slug: saveSlug!),
        ],
      ),
      body: WithHomeStar(
        child: value.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: SpColors.link),
          ),
          error: (_, _) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'This page could not be loaded.',
                  style: TextStyle(color: SpColors.textMuted),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: onRetry,
                  child: const Text('Try again'),
                ),
              ],
            ),
          ),
          data: (item) => item == null
              ? Center(
                  child: Text(
                    'This $notFoundLabel is no longer on Spiritpedia.',
                    style: const TextStyle(color: SpColors.textMuted),
                  ),
                )
              : builder(context, item),
        ),
      ),
    );
  }
}

/// A page with the floating home star at its foot.
class WithHomeStar extends StatelessWidget {
  const WithHomeStar({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) =>
      Stack(fit: StackFit.expand, children: [child, const FloatingHomeStar()]);
}

/// Save to My Library — on this device only.
class SaveHeart extends ConsumerWidget {
  const SaveHeart({super.key, required this.kind, required this.slug});

  final SavedKind kind;
  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(savedItemsProvider)[kind]?.contains(slug) ?? false;
    return IconButton(
      tooltip: saved ? 'Remove from My Library' : 'Save to My Library',
      onPressed: () => ref.read(savedItemsProvider.notifier).toggle(kind, slug),
      icon: Icon(
        saved ? Icons.favorite : Icons.favorite_border,
        color: saved ? const Color(0xFFEF4444) : SpColors.text,
      ),
    );
  }
}

/// The bottom leaves room to scroll the last content clear of the star.
const detailPadding = EdgeInsets.fromLTRB(
  20,
  4,
  20,
  40 + FloatingHomeStar.clearance,
);

class DetailTitle extends StatelessWidget {
  const DetailTitle(this.text, {super.key, this.center = false});

  final String text;
  final bool center;

  @override
  Widget build(BuildContext context) => Text(
    text,
    textAlign: center ? TextAlign.center : TextAlign.start,
    style: const TextStyle(
      fontSize: 27,
      fontWeight: FontWeight.w700,
      height: 1.2,
    ),
  );
}

/// "By {teacher}" — a link to their page when the teacher is on Spiritpedia,
/// plain text (the stored author) otherwise.
class ByLine extends ConsumerWidget {
  const ByLine({super.key, this.healerSlug, this.healerId, this.fallback});

  final String? healerSlug;
  final int? healerId;
  final String? fallback;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final directory = ref.watch(healerDirectoryProvider).value;
    final healer = directory?.bySlug(healerSlug) ?? directory?.byId(healerId);
    if (healer == null) {
      return fallback == null
          ? const SizedBox.shrink()
          : Text(
              'By $fallback',
              style: const TextStyle(fontSize: 14, color: SpColors.textMuted),
            );
    }
    return GestureDetector(
      onTap: () => context.push('/healers/${healer.slug}'),
      child: Text(
        'By ${healer.name}',
        style: const TextStyle(fontSize: 14.5, color: SpColors.link),
      ),
    );
  }
}

/// A full-width button that leaves the app — every outbound link does.
class OutboundButton extends StatelessWidget {
  const OutboundButton({
    super.key,
    required this.label,
    required this.url,
    this.background = SpColors.primary,
    this.foreground = Colors.white,
    this.border,
  });

  final String label;
  final String url;
  final Color background;
  final Color foreground;
  final Color? border;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    height: 50,
    child: FilledButton(
      onPressed: () => openExternal(context, url),
      style: FilledButton.styleFrom(
        backgroundColor: background,
        foregroundColor: foreground,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: border == null ? BorderSide.none : BorderSide(color: border!),
        ),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
      ),
    ),
  );
}

/// Subject chips that open the subject page.
class SubjectChips extends ConsumerWidget {
  const SubjectChips(this.slugs, {super.key});

  final List<String> slugs;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (slugs.isEmpty) return const SizedBox.shrink();
    final subjects = ref.watch(subjectsProvider).value;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final slug in slugs)
          ActionChip(
            label: Text(subjectName(subjects, slug)),
            onPressed: () => context.push('/subject/$slug'),
            backgroundColor: SpColors.surface,
            side: const BorderSide(color: SpColors.border),
            labelStyle: const TextStyle(
              fontFamily: 'Geist',
              fontSize: 12.5,
              color: SpColors.textMuted,
            ),
          ),
      ],
    );
  }
}

/// Long text split into real paragraphs on every newline, as the website does.
class Paragraphs extends StatelessWidget {
  const Paragraphs(
    this.text, {
    super.key,
    this.color = const Color(0xFFD1D5DB),
  });

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final paras = [
      for (final p in text.split('\n'))
        if (p.trim().isNotEmpty) p.trim(),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < paras.length; i++)
          Padding(
            padding: EdgeInsets.only(bottom: i == paras.length - 1 ? 0 : 14),
            child: Text(
              paras[i],
              style: TextStyle(fontSize: 15.5, height: 1.6, color: color),
            ),
          ),
      ],
    );
  }
}

/// A bio or description that folds after a few lines, with "Read more".
class Expandable extends StatefulWidget {
  const Expandable(this.text, {super.key, this.foldAt = 600});

  final String text;
  final int foldAt;

  @override
  State<Expandable> createState() => _ExpandableState();
}

class _ExpandableState extends State<Expandable> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final long = widget.text.length > widget.foldAt;
    if (!long) return Paragraphs(widget.text);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AnimatedSize(
          duration: const Duration(milliseconds: 200),
          alignment: Alignment.topCenter,
          child: _open
              ? Paragraphs(widget.text)
              : ShaderMask(
                  shaderCallback: (r) => const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: [0.6, 1],
                    colors: [Colors.white, Colors.transparent],
                  ).createShader(r),
                  blendMode: BlendMode.dstIn,
                  child: SizedBox(
                    height: 210,
                    child: ClipRect(
                      child: OverflowBox(
                        alignment: Alignment.topCenter,
                        maxHeight: double.infinity,
                        child: Paragraphs(widget.text),
                      ),
                    ),
                  ),
                ),
        ),
        TextButton(
          onPressed: () => setState(() => _open = !_open),
          style: TextButton.styleFrom(
            padding: EdgeInsets.zero,
            foregroundColor: SpColors.link,
          ),
          child: Text(_open ? 'Show less' : 'Read more'),
        ),
      ],
    );
  }
}

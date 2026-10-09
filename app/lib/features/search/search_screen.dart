import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/links/open_link.dart';
import '../../core/safety/emotion_safety.dart';
import '../../core/supabase_providers.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/widgets/net_image.dart';
import '../../theme/colors.dart';
import 'emotion_search_controller.dart';
import 'search_repository.dart';

/// The shared safety data, from the bundled web/shared/emotion-safety.json.
final emotionSafetyProvider = FutureProvider<EmotionSafety>(
  (ref) => loadEmotionSafety(rootBundle),
);

final searchRepositoryProvider = Provider<SearchRepository>(
  (ref) => SupabaseSearchRepository(ref.watch(supabaseProvider)),
);

/// The full-screen emotional search. [standalone] is the version pushed from
/// Home's "How are you feeling today?", with its own close button; the Search
/// tab shows the same screen in place.
class SearchScreen extends ConsumerWidget {
  const SearchScreen({super.key, this.standalone = false});

  final bool standalone;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final safety = ref.watch(emotionSafetyProvider);
    return Scaffold(
      body: SafeArea(
        child: safety.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: SpColors.link),
          ),
          // The safety data ships inside the app; this cannot fail on a good
          // build. If it ever does, the search does not run at all — it never
          // runs without its crisis gate.
          error: (_, _) => const Center(
            child: Text(
              'Search is unavailable.',
              style: TextStyle(color: SpColors.textMuted),
            ),
          ),
          data: (s) => _Search(
            safety: s,
            repository: ref.watch(searchRepositoryProvider),
            standalone: standalone,
          ),
        ),
      ),
    );
  }
}

class _Search extends ConsumerStatefulWidget {
  const _Search({
    required this.safety,
    required this.repository,
    required this.standalone,
  });

  final EmotionSafety safety;
  final SearchRepository repository;
  final bool standalone;

  @override
  ConsumerState<_Search> createState() => _SearchState();
}

class _SearchState extends ConsumerState<_Search> {
  late final EmotionSearchController _search = EmotionSearchController(
    safety: widget.safety,
    repository: widget.repository,
  )..addListener(_changed);
  final _field = TextEditingController();
  final _focus = FocusNode();

  void _changed() => setState(() {});

  @override
  void initState() {
    super.initState();
    if (widget.standalone) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _focus.requestFocus(),
      );
    }
  }

  @override
  void dispose() {
    _search.dispose();
    _field.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _fill(String text) {
    _field.value = TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
    _search.onChanged(text);
  }

  void _clear() {
    _field.clear();
    _search.reset();
  }

  void _openSubject(String slug) => context.push('/subject/$slug');

  Future<void> _submit() async {
    final slug = await _search.submit();
    if (slug != null && mounted) _openSubject(slug);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(
            children: [
              if (widget.standalone)
                IconButton(
                  tooltip: 'Close',
                  onPressed: () => context.pop(),
                  icon: const Icon(Icons.close),
                ),
              Expanded(
                child: TextField(
                  controller: _field,
                  focusNode: _focus,
                  onChanged: _search.onChanged,
                  onSubmitted: (_) => _submit(),
                  textInputAction: TextInputAction.search,
                  autocorrect: true,
                  style: const TextStyle(fontSize: 17),
                  decoration: InputDecoration(
                    hintText: 'How are you feeling today?',
                    hintStyle: const TextStyle(color: SpColors.textMuted),
                    filled: true,
                    fillColor: SpColors.surface,
                    prefixIcon: const Icon(
                      Icons.search,
                      color: SpColors.textMuted,
                    ),
                    suffixIcon: _search.text.isEmpty
                        ? null
                        : IconButton(
                            tooltip: 'Clear',
                            icon: const Icon(Icons.close),
                            onPressed: _clear,
                          ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(999),
                      borderSide: const BorderSide(color: SpColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(999),
                      borderSide: const BorderSide(color: SpColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(999),
                      borderSide: const BorderSide(
                        color: SpColors.primary,
                        width: 1.5,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 160),
            child: KeyedSubtree(key: ValueKey(_search.view), child: _body()),
          ),
        ),
      ],
    );
  }

  Widget _body() => switch (_search.view) {
    SearchView.idle => _Idle(onPick: _fill),
    SearchView.crisis => _CrisisPanel(
      content: widget.safety.crisisInterstitial,
      onBack: _clear,
    ),
    SearchView.dualPath => _DualPathPanel(
      content: widget.safety.dualPath,
      onAnswer: _search.answerDualPath,
    ),
    SearchView.loading => const Center(
      child: Text('Searching…', style: TextStyle(color: SpColors.textMuted)),
    ),
    SearchView.results => _Results(
      subjects: _search.subjects,
      medicalDisclaimer: _search.medicalDisclaimer,
      softTier: _search.softTier,
      onOpen: _openSubject,
    ),
    SearchView.universal => _Universal(results: _search.universal),
    SearchView.noMatch => _NoMatch(
      softTier: _search.softTier,
      onPick: _fill,
      onOpen: _openSubject,
    ),
  };
}

// ── Views ────────────────────────────────────────────────────────────────────

class _Idle extends StatelessWidget {
  const _Idle({required this.onPick});

  final ValueChanged<String> onPick;

  static const _examples = [
    'Lost',
    'Anxious',
    'Overwhelmed',
    'Heartbroken',
    'Disconnected',
    'Stuck',
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
      children: [
        const Text(
          'Tell us how you feel, in your own words.',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            height: 1.25,
          ),
        ),
        const SizedBox(height: 10),
        const Text(
          'We will find teachers, books and practices that meet you there.',
          style: TextStyle(color: SpColors.textMuted, height: 1.5),
        ),
        const SizedBox(height: 24),
        Wrap(
          spacing: 8,
          runSpacing: 10,
          children: [
            for (final e in _examples)
              ActionChip(
                label: Text(e),
                onPressed: () => onPick(e.toLowerCase()),
                backgroundColor: SpColors.surface,
                side: const BorderSide(color: SpColors.border),
                labelStyle: const TextStyle(fontFamily: 'Geist'),
              ),
          ],
        ),
      ],
    );
  }
}

/// Warm, human, not clinical. No content, no warning icons, no red; a real,
/// unshamed way back (CRISIS_INTERSTITIAL's presentation requirements).
class _CrisisPanel extends StatelessWidget {
  const _CrisisPanel({required this.content, required this.onBack});

  final CrisisInterstitial content;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
      children: [
        Text(
          content.heading,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            height: 1.3,
          ),
        ),
        for (final paragraph in content.body) ...[
          const SizedBox(height: 14),
          Text(
            paragraph,
            style: const TextStyle(
              fontSize: 15.5,
              color: Color(0xFFD1D5DB),
              height: 1.55,
            ),
          ),
        ],
        const SizedBox(height: 26),
        SizedBox(
          height: 52,
          child: FilledButton(
            onPressed: () => openExternal(context, content.primaryHref),
            child: Text(
              content.primaryLabel,
              style: const TextStyle(fontSize: 16),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          content.primaryNote,
          style: const TextStyle(fontSize: 13, color: SpColors.textFaint),
        ),
        const SizedBox(height: 20),
        SizedBox(
          height: 52,
          child: OutlinedButton(
            onPressed: onBack,
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: const BorderSide(color: Color(0x33FFFFFF)),
              shape: const StadiumBorder(),
            ),
            child: Text(
              content.secondaryLabel,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          content.closing,
          style: const TextStyle(fontSize: 14, color: SpColors.textMuted),
        ),
      ],
    );
  }
}

/// Both options carry identical weight — same style, same size, no clinical
/// vocabulary (DUAL_PATH's presentation requirements).
class _DualPathPanel extends StatelessWidget {
  const _DualPathPanel({required this.content, required this.onAnswer});

  final DualPath content;
  final ValueChanged<String> onAnswer;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
      children: [
        Text(
          content.heading,
          style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 10),
        Text(
          content.body,
          style: const TextStyle(
            fontSize: 15,
            color: Color(0xFFD1D5DB),
            height: 1.5,
          ),
        ),
        const SizedBox(height: 20),
        for (final option in content.options) ...[
          Material(
            color: const Color(0x0DFFFFFF),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: const BorderSide(color: Color(0x26FFFFFF)),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => onAnswer(option.key),
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Text(
                  option.label,
                  style: const TextStyle(fontSize: 15.5, height: 1.35),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
      ],
    );
  }
}

String _subjectLabel(List<Subject>? subjects, String slug) {
  const special = {
    'eft-tapping': 'EFT / Tapping',
    'non-duality': 'Non-Duality',
    'qi-gong': 'Qi Gong',
    'tai-chi': 'Tai Chi',
    'nde': 'Near Death Experiences',
  };
  final known =
      special[slug] ?? subjects?.where((s) => s.slug == slug).firstOrNull?.name;
  // formatSlug(): the slug, title-cased, for a subject not loaded (yet).
  return known ??
      slug
          .split('-')
          .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
          .join(' ');
}

class _Results extends ConsumerWidget {
  const _Results({
    required this.subjects,
    required this.onOpen,
    this.medicalDisclaimer,
    this.softTier,
  });

  final List<MappingRow> subjects;
  final String? medicalDisclaimer;
  final String? softTier;
  final ValueChanged<String> onOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final names = ref.watch(subjectsProvider).value;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        for (final row in subjects)
          ListTile(
            title: Text(
              _subjectLabel(names, row.subjectSlug),
              style: const TextStyle(fontSize: 16.5),
            ),
            trailing: const Icon(
              Icons.arrow_forward,
              color: SpColors.textFaint,
              size: 20,
            ),
            onTap: () => onOpen(row.subjectSlug),
          ),
        // Beneath the results it qualifies, never above them.
        if (medicalDisclaimer != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Text(
              medicalDisclaimer!,
              style: const TextStyle(fontSize: 13, color: SpColors.textFaint),
            ),
          ),
        // Quiet: small, muted, after the results.
        if (softTier != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
            child: Text(
              softTier!,
              style: const TextStyle(
                fontSize: 13,
                color: SpColors.textFaint,
                height: 1.5,
              ),
            ),
          ),
      ],
    );
  }
}

class _Universal extends StatelessWidget {
  const _Universal({required this.results});

  final UniversalResults results;

  @override
  Widget build(BuildContext context) {
    Widget header(String label) => Padding(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 6),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.1,
          color: SpColors.textFaint,
        ),
      ),
    );
    Widget thumb(
      String? url,
      String label, {
      bool round = false,
      double w = 44,
      double h = 44,
    }) => ClipRRect(
      borderRadius: BorderRadius.circular(round ? 999 : 6),
      child: SizedBox(
        width: w,
        height: h,
        child: NetImage(url: url, fallbackLabel: label),
      ),
    );

    return ListView(
      padding: const EdgeInsets.only(bottom: 32),
      children: [
        if (results.healers.isNotEmpty) header('HEALERS'),
        for (final h in results.healers)
          ListTile(
            leading: thumb(
              (h['image_urls'] as List?)?.whereType<String>().firstOrNull,
              '${h['name']}',
              round: true,
            ),
            title: Text('${h['name']}'),
            onTap: () => context.push('/healers/${h['healer_slug']}'),
          ),
        if (results.books.isNotEmpty) header('BOOKS'),
        for (final b in results.books)
          ListTile(
            leading: thumb(
              b['mock_cover_url'] as String?,
              '${b['title']}',
              w: 34,
              h: 50,
            ),
            title: Text(
              '${b['title']}',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            onTap: () => context.push('/books/${b['slug']}'),
          ),
        if (results.videos.isNotEmpty) header('VIDEOS'),
        for (final v in results.videos)
          ListTile(
            leading: thumb(
              Video(
                id: 0,
                slug: '',
                title: '',
                platformUrl: v['platform_url'] as String?,
              ).thumbnailUrl,
              '${v['title']}',
              w: 64,
              h: 36,
            ),
            title: Text(
              '${v['title']}',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            onTap: () => context.push('/videos/${v['slug']}'),
          ),
        if (results.subjects.isNotEmpty) header('SUBJECTS'),
        for (final s in results.subjects)
          ListTile(
            title: Text('${s['name']}'),
            trailing: const Icon(
              Icons.arrow_forward,
              color: SpColors.textFaint,
              size: 20,
            ),
            onTap: () => context.push('/subject/${s['slug']}'),
          ),
      ],
    );
  }
}

/// The gentle dead end: the shortfall is ours, the words are examples, not
/// instructions — and the support line still shows when it applies.
class _NoMatch extends ConsumerWidget {
  const _NoMatch({required this.onPick, required this.onOpen, this.softTier});

  final ValueChanged<String> onPick;
  final ValueChanged<String> onOpen;
  final String? softTier;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subjects = ref.watch(subjectsProvider).value ?? const <Subject>[];
    Widget word(String w) => GestureDetector(
      onTap: () => onPick(w),
      child: Text(
        w,
        style: const TextStyle(color: Color(0xFFC4B5FD), fontSize: 15),
      ),
    );
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
      children: [
        const Text(
          "We haven't found a match for that yet.",
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 10),
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          runSpacing: 4,
          children: [
            const Text(
              'A few words often works best here — something like ',
              style: TextStyle(fontSize: 15, color: SpColors.textMuted),
            ),
            word('overwhelmed'),
            const Text(
              ', ',
              style: TextStyle(fontSize: 15, color: SpColors.textMuted),
            ),
            word('disconnected'),
            const Text(
              ' or ',
              style: TextStyle(fontSize: 15, color: SpColors.textMuted),
            ),
            word('lost'),
            const Text(
              '. Or browse by subject below.',
              style: TextStyle(fontSize: 15, color: SpColors.textMuted),
            ),
          ],
        ),
        if (softTier != null) ...[
          const SizedBox(height: 12),
          Text(
            softTier!,
            style: const TextStyle(
              fontSize: 13,
              color: SpColors.textFaint,
              height: 1.5,
            ),
          ),
        ],
        const SizedBox(height: 26),
        Wrap(
          spacing: 8,
          runSpacing: 10,
          children: [
            for (final s in subjects)
              ActionChip(
                label: Text(s.name),
                onPressed: () => onOpen(s.slug),
                backgroundColor: SpColors.surface,
                side: const BorderSide(color: SpColors.border),
                labelStyle: const TextStyle(fontFamily: 'Geist'),
              ),
          ],
        ),
      ],
    );
  }
}

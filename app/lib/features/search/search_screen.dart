import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/links/open_link.dart';
import '../../core/safety/emotion_safety.dart';
import '../../core/supabase_providers.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/widgets/cards.dart';
import '../../shared/widgets/net_image.dart';
import '../../theme/colors.dart';
import '../interests/interests.dart';
import '../star/star_layer.dart';
import '../star/star_page.dart';
import '../star/slipstream.dart';
import '../star/twinkle.dart';
import 'content_search.dart';
import 'emotion_search_controller.dart';
import 'feeling_placeholder.dart';
import 'search_repository.dart';

/// The shared safety data, from the bundled web/shared/emotion-safety.json.
final emotionSafetyProvider = FutureProvider<EmotionSafety>(
  (ref) => loadEmotionSafety(rootBundle),
);

final searchRepositoryProvider = Provider<SearchRepository>(
  (ref) => SupabaseSearchRepository(ref.watch(supabaseProvider)),
);

/// The plain engine, on the same connection as the feelings engine. A
/// stand-in repository (in tests) gets its universal search instead.
final contentSearchProvider = Provider<ContentSearch>((ref) {
  final repository = ref.watch(searchRepositoryProvider);
  return repository is SupabaseSearchRepository
      ? SupabaseContentSearch(repository.client)
      : UniversalContentSearch(repository);
});

/// The full-screen search: feelings and names in one box. [standalone] is the
/// version pushed from a tab's search box, with its own close button. [scope]
/// is which box: Discover searches everything, Videos and Books their own.
class SearchScreen extends ConsumerWidget {
  const SearchScreen({
    super.key,
    this.standalone = false,
    this.scope = SearchScope.all,
    this.initialQuery,
  });

  final bool standalone;
  final SearchScope scope;

  /// Words to search for at once ("Search everywhere" from Videos or
  /// Books). They go through the box like typing — the crisis intercept
  /// first.
  final String? initialQuery;

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
            scope: scope,
            initialQuery: initialQuery,
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
    required this.scope,
    this.initialQuery,
  });

  final EmotionSafety safety;
  final SearchRepository repository;
  final bool standalone;
  final SearchScope scope;
  final String? initialQuery;

  @override
  ConsumerState<_Search> createState() => _SearchState();
}

class _SearchState extends ConsumerState<_Search> {
  late final EmotionSearchController _search = EmotionSearchController(
    safety: widget.safety,
    repository: widget.repository,
    plain: ref.read(contentSearchProvider),
    scope: widget.scope,
    interests: () => mounted ? ref.read(interestSubjectsProvider) : const {},
    hidden: () => mounted ? ref.read(hiddenSubjectsProvider) : const {},
  )..addListener(_changed);

  /// "See all": which group, and its fuller list.
  (ResultKind, Future<List<Object>>)? _seeAll;
  final _field = TextEditingController();
  final _focus = FocusNode();

  void _changed() => setState(() {
    // A new search (or none) leaves any "See all" behind.
    if (_search.view != SearchView.results) _seeAll = null;
  });

  @override
  void initState() {
    super.initState();
    _focus.addListener(_changed); // the placeholder changes on focus
    final query = widget.initialQuery?.trim() ?? '';
    if (query.isNotEmpty) {
      // As if typed: through the gates, then the search.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _fill(query);
      });
    } else if (widget.standalone) {
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
                    // Example feelings typed out until someone taps in; then
                    // the question, until they type.
                    hint: _focus.hasFocus
                        ? Text(
                            switch (widget.scope) {
                              SearchScope.all => feelingQuestion,
                              SearchScope.videos =>
                                'Search videos, or say how you feel',
                              SearchScope.books =>
                                'Search books, or say how you feel',
                            },
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 17,
                              color: SpColors.textMuted,
                            ),
                          )
                        : const FeelingTypewriter(
                            style: TextStyle(
                              fontSize: 17,
                              color: SpColors.textMuted,
                            ),
                          ),
                    filled: true,
                    fillColor: SpColors.surface,
                    // The star, where the magnifying glass was: home.
                    prefixIcon: Padding(
                      padding: const EdgeInsets.only(left: 6, right: 2),
                      // It twinkles while the results load.
                      child: StarAnchor(
                        size: 26,
                        thinking: _search.view == SearchView.loading,
                        pageStar: true,
                      ),
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
          child: _TabBarClearance(
            // The Search tab: every view can scroll clear of the tab bar.
            value: widget.standalone ? 0 : StarPage.tabBarClearance,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 160),
              child: KeyedSubtree(key: ValueKey(_search.view), child: _body()),
            ),
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
    // The star thinks while results load.
    SearchView.loading => Center(
      child: Semantics(
        label: 'Searching',
        child: const SizedBox(width: 56, height: 56, child: TwinklingStar()),
      ),
    ),
    SearchView.results when _seeAll != null => _SeeAll(
      kind: _seeAll!.$1,
      items: _seeAll!.$2,
      onBack: () => setState(() => _seeAll = null),
    ),
    SearchView.results => _Results(
      search: _search,
      onOpenSubject: _openSubject,
      onSeeAll: (kind) => setState(() => _seeAll = (kind, _search.more(kind))),
    ),
    SearchView.noMatch => _NoMatch(
      softTier: _search.softTier,
      onPick: _fill,
      onOpen: _openSubject,
    ),
  };
}

// ── Views ────────────────────────────────────────────────────────────────────

/// Extra room under each view's last item, so the floating tab bar never
/// covers it — scroll padding, so nothing above it moves.
class _TabBarClearance extends InheritedWidget {
  const _TabBarClearance({required this.value, required super.child});

  final double value;

  static double of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_TabBarClearance>()?.value ??
      0;

  @override
  bool updateShouldNotify(_TabBarClearance old) => old.value != value;
}

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
      padding: EdgeInsets.fromLTRB(
        24,
        28,
        24,
        24 + _TabBarClearance.of(context),
      ),
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
      padding: EdgeInsets.fromLTRB(
        24,
        24,
        24,
        32 + _TabBarClearance.of(context),
      ),
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
      padding: EdgeInsets.fromLTRB(
        24,
        24,
        24,
        32 + _TabBarClearance.of(context),
      ),
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

/// Everything a search found, in one list: Spiritpedia Suggests, then the
/// feeling's matches and the name-and-title matches — titles first when the
/// words name something ([EmotionSearchController.titlesFirst]) — each group
/// with "See all".
class _Results extends ConsumerWidget {
  const _Results({
    required this.search,
    required this.onOpenSubject,
    required this.onSeeAll,
  });

  final EmotionSearchController search;
  final ValueChanged<String> onOpenSubject;
  final ValueChanged<ResultKind> onSeeAll;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final names = ref.watch(subjectsProvider).value;
    final suggestions = search.suggestions;

    final feeling = <Widget>[
      if (search.scope == SearchScope.all && search.subjects.isNotEmpty) ...[
        const _GroupHeader('FOR HOW YOU FEEL'),
        for (final row in search.subjects)
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
            onTap: () => onOpenSubject(row.subjectSlug),
          ),
      ],
      // On Videos and Books: the feeling's videos or books themselves.
      if (search.scope != SearchScope.all && !search.feelings.isEmpty) ...[
        const _GroupHeader('FOR HOW YOU FEEL'),
        for (final item in <Object>[
          ...search.feelings.videos,
          ...search.feelings.books,
        ].take(search.perKind))
          ResultTile(item: item),
      ],
      // Beneath the results it qualifies, never above them.
      if (search.medicalDisclaimer != null)
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: Text(
            search.medicalDisclaimer!,
            style: const TextStyle(fontSize: 13, color: SpColors.textFaint),
          ),
        ),
      // Quiet: small, muted, after the results.
      if (search.softTier != null)
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
          child: Text(
            search.softTier!,
            style: const TextStyle(
              fontSize: 13,
              color: SpColors.textFaint,
              height: 1.5,
            ),
          ),
        ),
    ];

    // Teachers and channels found by name: their profile cards, first, in
    // every box.
    final profiles = <Healer>[
      ...search.content.of<Healer>(ResultKind.teachers),
      ...search.content.of<Healer>(ResultKind.channels),
    ];

    final named = <Widget>[
      for (final kind in search.content.kinds.where((k) => !k.isProfile)) ...[
        _GroupHeader(
          kind.label.toUpperCase(),
          // A full group may have more behind it.
          onSeeAll: search.content.byKind[kind]!.length >= search.perKind
              ? () => onSeeAll(kind)
              : null,
        ),
        for (final item in search.content.byKind[kind]!) ResultTile(item: item),
      ],
    ];

    final ownKind = search.scope == SearchScope.videos
        ? ResultKind.videos
        : ResultKind.books;
    final nothingHere =
        search.scope != SearchScope.all &&
        profiles.isEmpty &&
        named.isEmpty &&
        search.feelings.isEmpty &&
        search.heldBack.isEmpty;

    return ListView(
      padding: EdgeInsets.only(bottom: 32 + _TabBarClearance.of(context)),
      children: [
        if (!search.heldBack.isEmpty) _HiddenNote(onShow: search.showHidden),
        if (profiles.isNotEmpty) ...[
          const _GroupHeader('TEACHERS & CHANNELS'),
          SizedBox(
            height: 240,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: profiles.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (_, i) =>
                  SizedBox(width: 172, child: HealerCard(healer: profiles[i])),
            ),
          ),
        ],
        if (!suggestions.isEmpty) _Suggests(suggestions: suggestions),
        if (search.titlesFirst) ...[
          ...named,
          ...feeling,
        ] else ...[
          ...feeling,
          ...named,
        ],
        if (nothingHere)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
            child: Text(
              'No ${ownKind.many} match that.',
              style: const TextStyle(fontSize: 15, color: SpColors.textMuted),
            ),
          ),
        if (search.alsoFound.isNotEmpty)
          _AlsoFound(
            counts: search.alsoFound,
            onSearchEverywhere: () =>
                context.push('/feel', extra: search.text.trim()),
          ),
      ],
    );
  }
}

/// Never show (docs/personalisation.md): what was found by name but carries
/// a hidden subject waits behind one gentle line, and one tap.
class _HiddenNote extends StatelessWidget {
  const _HiddenNote({required this.onShow});

  final VoidCallback onShow;

  @override
  Widget build(BuildContext context) => Padding(
    key: const ValueKey('search-hidden-note'),
    padding: const EdgeInsets.fromLTRB(16, 10, 8, 2),
    child: Row(
      children: [
        const Icon(
          Icons.visibility_off_outlined,
          size: 18,
          color: SpColors.textFaint,
        ),
        const SizedBox(width: 8),
        const Expanded(
          child: Text(
            'You’ve hidden this subject.',
            style: TextStyle(fontSize: 14, color: SpColors.textMuted),
          ),
        ),
        TextButton(
          onPressed: onShow,
          style: TextButton.styleFrom(foregroundColor: SpColors.link),
          child: const Text('Show anyway?'),
        ),
      ],
    ),
  );
}

/// One quiet line under a Videos or Books search: what the same words find
/// elsewhere, and the way to see it all — Discover's search, which runs the
/// crisis intercept first like every search.
class _AlsoFound extends StatelessWidget {
  const _AlsoFound({required this.counts, required this.onSearchEverywhere});

  final Map<ResultKind, int> counts;
  final VoidCallback onSearchEverywhere;

  @override
  Widget build(BuildContext context) {
    final found = [
      for (final k in ResultKind.values)
        if (counts[k] case final n?) k.count(n),
    ].join(', ');
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
      child: Semantics(
        button: true,
        label: 'Also found: $found. Search everywhere',
        excludeSemantics: true,
        child: InkWell(
          onTap: onSearchEverywhere,
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(text: 'Also found: $found · '),
                  const TextSpan(
                    text: 'Search everywhere',
                    style: TextStyle(
                      color: SpColors.link,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              style: const TextStyle(
                fontSize: 13.5,
                color: SpColors.textMuted,
                height: 1.45,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _GroupHeader extends StatelessWidget {
  const _GroupHeader(this.label, {this.onSeeAll});

  final String label;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 18, 4, 2),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              header: true,
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.1,
                  color: SpColors.textFaint,
                ),
              ),
            ),
          ),
          if (onSeeAll != null)
            TextButton(
              onPressed: onSeeAll,
              style: TextButton.styleFrom(foregroundColor: SpColors.link),
              child: const Text('See all'),
            ),
        ],
      ),
    );
  }
}

/// One video and one book, picked by relevance alone.
class _Suggests extends StatelessWidget {
  const _Suggests({required this.suggestions});

  final Suggestions suggestions;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
      // Material, not a painted box, so its rows' taps still ripple.
      child: Material(
        color: SpColors.surface,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: SpColors.gold.withValues(alpha: 0.35)),
        ),
        child: Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 14, 16, 2),
                child: Row(
                  children: [
                    SizedBox(width: 18, height: 18, child: StarSprite()),
                    SizedBox(width: 8),
                    Text(
                      'Spiritpedia Suggests',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: SpColors.gold,
                      ),
                    ),
                  ],
                ),
              ),
              if (suggestions.video != null)
                ResultTile(item: suggestions.video!),
              if (suggestions.book != null) ResultTile(item: suggestions.book!),
            ],
          ),
        ),
      ),
    );
  }
}

/// "See all" for one group: more of it, with the way back to every result.
class _SeeAll extends StatelessWidget {
  const _SeeAll({
    required this.kind,
    required this.items,
    required this.onBack,
  });

  final ResultKind kind;
  final Future<List<Object>> items;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 0, 16, 0),
          child: Row(
            children: [
              IconButton(
                tooltip: 'All results',
                onPressed: onBack,
                icon: const Icon(Icons.arrow_back),
              ),
              Expanded(
                child: Text(
                  kind.label,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: FutureBuilder<List<Object>>(
            future: items,
            builder: (context, snap) {
              if (!snap.hasData && !snap.hasError) {
                return const Center(
                  child: SizedBox(
                    width: 48,
                    height: 48,
                    child: TwinklingStar(),
                  ),
                );
              }
              final list = snap.data ?? const <Object>[];
              if (list.isEmpty) {
                return const Center(
                  child: Text(
                    'Nothing more to show.',
                    style: TextStyle(color: SpColors.textMuted),
                  ),
                );
              }
              return ListView(
                padding: EdgeInsets.only(
                  bottom: 32 + _TabBarClearance.of(context),
                ),
                children: [for (final item in list) ResultTile(item: item)],
              );
            },
          ),
        ),
      ],
    );
  }
}

/// One result, whatever it is: a picture, a name or title, a quiet line
/// saying what it is, and where it leads.
class ResultTile extends ConsumerWidget {
  const ResultTile({super.key, required this.item});

  final Object item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final directory = ref.watch(healerDirectoryProvider).value;
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
    final (
      Widget? leading,
      String title,
      String? line,
      String path,
    ) = switch (item) {
      Healer h => (
        thumb(h.imageUrls.firstOrNull, h.name, round: true),
        h.name,
        h.isPlatform ? (h.entityType == 'app' ? 'App' : 'Channel') : 'Teacher',
        '/healers/${h.slug}',
      ),
      Video v => (
        thumb(v.thumbnailUrl, v.title, w: 64, h: 36),
        v.title,
        directory?.bySlug(v.healerSlug)?.name,
        '/videos/${v.slug}',
      ),
      Book b => (
        thumb(b.coverUrl, b.title, w: 34, h: 50),
        b.title,
        b.author ?? directory?.bySlug(b.healerSlug)?.name,
        '/books/${b.slug}',
      ),
      Offering o => (
        thumb(o.imageUrl, o.title, w: 56, h: 40),
        o.title,
        directory?.byId(o.healerId)?.name,
        '/offerings/${o.slug}',
      ),
      FreeResource r => (
        thumb(r.imageUrl, r.title, w: 56, h: 40),
        r.title,
        'Free · ${r.typeLabel}',
        '/free-resources/${r.slug}',
      ),
      Subject s => (null, s.name, 'Subject', '/subject/${s.slug}'),
      _ => (null, '', null, '/'),
    };
    return ListTile(
      leading: leading,
      title: Text(title, maxLines: 2, overflow: TextOverflow.ellipsis),
      subtitle: line == null
          ? null
          : Text(
              line,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: SpColors.textMuted),
            ),
      trailing: item is Subject
          ? const Icon(Icons.arrow_forward, color: SpColors.textFaint, size: 20)
          : null,
      onTap: () => context.push(path),
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
      padding: EdgeInsets.fromLTRB(
        24,
        20,
        24,
        32 + _TabBarClearance.of(context),
      ),
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

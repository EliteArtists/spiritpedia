import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/safety/emotion_safety.dart';
import '../../data/models.dart';
import '../../data/shelf_rules.dart';
import 'content_search.dart';
import 'search_repository.dart';

/// What the search screen shows.
enum SearchView { idle, crisis, dualPath, loading, results, noMatch }

/// The search's behaviour, as the website's EmotionSearch.js — kept apart from
/// the screen so it can be tested without one.
///
/// THE TWO SAFETY GATES RUN ON EVERY KEYSTROKE, BEFORE THE 300 ms DEBOUNCE
/// AND BEFORE ANY REQUEST. A crisis phrase shows the crisis screen at once and
/// sends nothing — not the emotion lookup, not the plain search. Words
/// typed before a phrase is complete can already have gone out as an ordinary
/// search (the Privacy Policy says so); the complete phrase never does.
class EmotionSearchController extends ChangeNotifier {
  EmotionSearchController({
    required this.safety,
    required this.repository,
    ContentSearch? plain,
    this.scope = SearchScope.all,
    this.debounce = const Duration(milliseconds: 300),
    Set<String> Function()? interests,
    Map<String, double> Function()? learned,
    Hiding Function()? hidden,
    this.onSettled,
    this.settleAfter = const Duration(milliseconds: 1500),
  }) : plain = plain ?? UniversalContentSearch(repository),
       interests = interests ?? _none,
       learned = learned ?? _nothingLearned,
       hidden = hidden ?? _nothingHidden;

  static Set<String> _none() => const {};
  static Map<String, double> _nothingLearned() => const {};
  static Hiding _nothingHidden() => Hiding.none;

  final EmotionSafety safety;

  /// The feelings engine's reads (the emotion mapping).
  final SearchRepository repository;

  /// The plain engine: names and titles.
  final ContentSearch plain;

  /// Which box this is: Discover (everything), Videos or Books.
  final SearchScope scope;
  final Duration debounce;

  /// The subjects the person chose — a small boost in Spiritpedia Suggests.
  final Set<String> Function() interests;

  /// What Spiritpedia has learned they explore (level 2 of the ranking) — a
  /// smaller boost in Suggests.
  final Map<String, double> Function() learned;

  /// A search that has settled (activity learning, migration 0021): a
  /// moment after its results, with the subjects it led to — or, when
  /// nothing at all was found, its words. Only ever after both safety
  /// gates: a crisis search never reaches it.
  final void Function({List<String> subjects, String? term})? onSettled;
  final Duration settleAfter;
  Timer? _settle;

  /// What the person never wants shown (docs/personalisation.md). Name and
  /// title matches it hides are held back behind "Show anyway?"; what a
  /// feeling finds simply leaves them out. The safety gates never look at it.
  final Hiding Function() hidden;

  /// Matches shown per group before "See all".
  int get perKind => scope == SearchScope.all ? 3 : 12;

  String _text = '';
  String? _dualPathAnswer;
  SearchView _view = SearchView.idle;
  String? _crisisCategory;
  List<MappingRow> _rows = const [];
  String? _softTier;
  String? _medicalDisclaimer;
  ContentResults _content = ContentResults.empty;
  ContentResults _heldBack = ContentResults.empty;
  bool _showHidden = false;
  FeelingMatches _feelings = FeelingMatches.empty;
  Suggestions _suggestions = Suggestions.none;
  Map<ResultKind, int> _alsoFound = const {};
  Timer? _timer;
  int _generation = 0;

  String get text => _text;
  SearchView get view => _view;
  String? get crisisCategory => _crisisCategory;
  String? get softTier => _softTier;
  String? get medicalDisclaimer => _medicalDisclaimer;

  /// The plain engine's matches, by group.
  ContentResults get content => _content;

  /// Name and title matches held back because they carry a hidden subject —
  /// "You've hidden this subject. Show anyway?" while there are any.
  ContentResults get heldBack => _heldBack;

  /// "Show anyway": the held-back matches join the rest, for this search.
  void showHidden() {
    if (_heldBack.isEmpty) return;
    _showHidden = true;
    _content = ContentResults({
      for (final kind in ResultKind.values)
        if ([...?_content.byKind[kind], ...?_heldBack.byKind[kind]]
            case final items when items.isNotEmpty)
          kind: items,
    });
    _heldBack = ContentResults.empty;
    notifyListeners();
  }

  /// On Videos and Books: what the feeling found there.
  FeelingMatches get feelings => _feelings;

  /// Spiritpedia Suggests: one video and one book, by relevance alone.
  Suggestions get suggestions => _suggestions;

  /// On Videos and Books: how many of each other kind the same words find
  /// everywhere — "Also found: 6 books, 2 courses · Search everywhere".
  Map<ResultKind, int> get alsoFound => _alsoFound;

  /// Whether name and title matches lead, above the feeling's subjects: when
  /// something is called what was typed, and the words are more than a
  /// feeling ("September Astrology Forecast 2026"), or no feeling matched.
  bool get titlesFirst {
    final q = _text.trim().toLowerCase();
    if (_rows.isEmpty) return true;
    if (searchWords(q).length < 3) return false;
    bool named(Object o) => switch (o) {
      Video v => v.title.toLowerCase().contains(q),
      Book b => b.title.toLowerCase().contains(q),
      Healer h => h.name.toLowerCase().contains(q),
      Offering o => o.title.toLowerCase().contains(q),
      FreeResource r => r.title.toLowerCase().contains(q),
      Subject s => s.name.toLowerCase().contains(q),
      _ => false,
    };
    return _content.byKind.values.any((items) => items.any(named));
  }

  /// Up to six distinct subjects, strongest first (uniqueSubjects()) — none
  /// the person hid.
  List<MappingRow> get subjects {
    final never = hidden();
    final seen = <String>{};
    final out = <MappingRow>[];
    for (final r in _rows) {
      if (never.subjects.contains(r.subjectSlug)) continue;
      if (seen.add(r.subjectSlug)) out.add(r);
      if (out.length == 6) break;
    }
    return out;
  }

  /// The first subject to open on "search" — the strongest match.
  String? get topSubject =>
      _rows.isEmpty ? null : (subjects.firstOrNull ?? _rows.first).subjectSlug;

  void _set(SearchView view) {
    _view = view;
    notifyListeners();
  }

  void _clearResults() {
    _rows = const [];
    _softTier = null;
    _medicalDisclaimer = null;
    _content = ContentResults.empty;
    _heldBack = ContentResults.empty;
    _feelings = FeelingMatches.empty;
    _suggestions = Suggestions.none;
    _alsoFound = const {};
    _crisisCategory = null;
  }

  /// Every change of the text, typed or tapped in.
  void onChanged(String value) {
    _text = value;
    _showHidden = false; // "Show anyway" was for the last search
    _dualPathAnswer = null; // a new query is a new question
    _evaluate();
  }

  /// The visitor answered the dual-path question.
  void answerDualPath(String key) {
    _dualPathAnswer = key;
    _evaluate();
  }

  /// "Take me back to Spiritpedia": empty, calm, ready to search again.
  void reset() {
    _text = '';
    _showHidden = false;
    _dualPathAnswer = null;
    _timer?.cancel();
    _settle?.cancel();
    _generation++;
    _clearResults();
    _set(SearchView.idle);
  }

  void _evaluate() {
    _timer?.cancel();
    _settle?.cancel();
    _generation++; // any search still in flight is now stale
    _clearResults();

    final term = _text.trim();
    if (term.isEmpty) return _set(SearchView.idle);

    final normalised = safety.normaliseQuery(_text);

    // GATE 1 — crisis. Synchronous; nothing is sent.
    final crisis = safety.checkCrisis(normalised);
    if (crisis != null) {
      _crisisCategory = crisis;
      return _set(SearchView.crisis);
    }

    // GATE 2 — the dual path, and the crisis branch of its answer.
    if (_dualPathAnswer == 'distressing') {
      _crisisCategory = 'acute_crisis';
      return _set(SearchView.crisis);
    }
    if (_dualPathAnswer == null && safety.checkAmbiguous(normalised)) {
      return _set(SearchView.dualPath);
    }

    _set(SearchView.loading);
    final generation = _generation;
    _timer = Timer(debounce, () => _search(generation, term, normalised));
  }

  Future<void> _search(int generation, String term, String normalised) async {
    try {
      final results = await Future.wait<Object>([
        safety.resolve(
          _text,
          repository.exactEmotion,
          dualPathAnswer: _dualPathAnswer,
          vocabularyLookup: repository.vocabulary,
        ),
        plain.search(term, scope: scope, perKind: perKind),
        if (scope != SearchScope.all)
          plain.counts(term, [
            for (final k in ResultKind.values)
              if (!scope.kinds.contains(k)) k,
          ]),
      ]);
      if (generation != _generation) return;
      var resolved = results[0] as EmotionSearchResult;
      _content = results[1] as ContentResults;
      final never = hidden();
      if (!never.isEmpty && !_showHidden) {
        final (shown, held) = _split(_content, never);
        _content = shown;
        _heldBack = held;
      }
      if (results.length > 2) _alsoFound = results[2] as Map<ResultKind, int>;

      var rows = resolved.type == 'results'
          ? resolved.rows
          : const <MappingRow>[];

      // The website's own fallbacks, once the module's cascade and containment
      // have both missed: the longest stored emotion contained in the query,
      // then stored emotions containing the whole query.
      if (rows.isEmpty) rows = await _reverseContained(normalised);
      if (generation != _generation) return;

      // The visitor said they are exploring: honour that answer.
      if (rows.isEmpty && _dualPathAnswer == 'exploring') {
        final option = safety.dualPath.options.firstWhere(
          (o) => o.key == 'exploring',
        );
        rows = [
          for (var i = 0; i < option.subjects.length; i++)
            MappingRow(option.subjects[i], option.subjects.length - i),
        ];
      }

      // The feeling's strongest subjects: their videos and books, for the
      // Videos and Books boxes and for Suggests.
      if (rows.isNotEmpty) {
        final top = <String>{};
        for (final r in rows) {
          if (top.length == 3) break;
          top.add(r.subjectSlug);
        }
        final found = await plain.forSubjects(top.toList(), scope: scope);
        if (generation != _generation) return;
        // A feeling did not ask for anything by name: hidden is just left out.
        final never = hidden();
        _feelings = FeelingMatches(
          videos: never.items(found.videos, (v) => v.subjectSlugs),
          books: never.items(found.books, (b) => b.subjectSlugs),
        );
      }
      final videos = [
        ..._content.of<Video>(ResultKind.videos),
        ..._feelings.videos,
      ];
      final books = [
        ..._content.of<Book>(ResultKind.books),
        ..._feelings.books,
      ];
      // A small signal, never a reason to fail: no counts, no bonus.
      Future<Map<String, int>> saves(String type, List<String> slugs) => plain
          .saveCounts(type, slugs)
          .catchError((_) => const <String, int>{});
      final (videoSaves, bookSaves) = await (
        saves('video', [for (final v in videos) v.slug]),
        saves('book', [for (final b in books) b.slug]),
      ).wait;
      if (generation != _generation) return;
      _suggestions = suggest(
        term: term,
        rows: rows,
        videos: videos,
        books: books,
        videoSaves: videoSaves,
        bookSaves: bookSaves,
        interests: interests(),
        learned: learned(),
        hidden: hidden().subjects,
      );

      _softTier = safety.checkSoftTier(normalised) ? safety.softTierLine : null;
      if (rows.isNotEmpty) {
        _rows = rows;
        _medicalDisclaimer = safety.needsMedicalDisclaimer(rows)
            ? safety.medicalDisclaimer
            : null;
      }
      final found =
          rows.isNotEmpty ||
          !_content.isEmpty ||
          !_heldBack.isEmpty || // "Show anyway?"
          !_feelings.isEmpty ||
          _alsoFound.isNotEmpty; // a way out to everything else
      _settleLater(generation, found ? subjects : const [], term, found);
      return _set(found ? SearchView.results : SearchView.noMatch);
    } catch (_) {
      if (generation != _generation) return;
      return _set(SearchView.noMatch);
    }
  }

  void _settleLater(
    int generation,
    List<MappingRow> found,
    String term,
    bool anything,
  ) {
    final settled = onSettled;
    if (settled == null) return;
    _settle?.cancel();
    _settle = Timer(settleAfter, () {
      if (generation != _generation) return;
      if (found.isNotEmpty) {
        settled(subjects: [for (final r in found.take(3)) r.subjectSlug]);
      } else if (!anything) {
        settled(term: term);
      }
    });
  }

  /// EmotionSearch.js → lookupReverseContained().
  Future<List<MappingRow>> _reverseContained(String normalised) async {
    final words = safety.contentTokens(normalised);
    if (words.isNotEmpty) {
      final vocabulary = {...await repository.vocabulary(words)}.toList()
        ..sort((a, b) => b.length - a.length);
      final hit = vocabulary.where(normalised.contains).firstOrNull;
      if (hit != null) {
        final rows = await repository.exactEmotion(hit);
        if (rows.isNotEmpty) return rows;
      }
    }
    return repository.forwardSubstring(normalised);
  }

  /// "See all" for one group: more of it, for the text already shown —
  /// which has passed the gates. Nothing is sent from any other view.
  Future<List<Object>> more(ResultKind kind) async {
    if (_view != SearchView.results) return const [];
    // The gates again — "See all" must never bypass them.
    final normalised = safety.normaliseQuery(_text);
    if (safety.checkCrisis(normalised) != null) return const [];
    final items = await plain.more(_text.trim(), kind);
    final never = hidden();
    if (_showHidden || never.isEmpty) return items;
    return never.visible(items);
  }

  /// Matches carrying a hidden subject, apart from the rest.
  static (ContentResults, ContentResults) _split(
    ContentResults results,
    Hiding never,
  ) {
    final shown = <ResultKind, List<Object>>{};
    final held = <ResultKind, List<Object>>{};
    for (final MapEntry(key: kind, value: items) in results.byKind.entries) {
      for (final item in items) {
        (never(item) ? held : shown).putIfAbsent(kind, () => []).add(item);
      }
    }
    return (ContentResults(shown), ContentResults(held));
  }

  /// Pressing search on the keyboard: open the best subject if there is one
  /// (routeToTop in EmotionSearch.js). Returns the subject slug to open.
  Future<String?> submit() async {
    if (_view == SearchView.crisis || _view == SearchView.dualPath) return null;
    if (_view == SearchView.results) return topSubject;

    final normalised = safety.normaliseQuery(_text);
    if (normalised.isEmpty) return null;
    // The gates again — submit must never bypass them.
    if (safety.checkCrisis(normalised) != null ||
        (_dualPathAnswer == null && safety.checkAmbiguous(normalised))) {
      return null;
    }

    _timer?.cancel();
    final generation = ++_generation;
    try {
      final resolved = await safety.resolve(
        _text,
        repository.exactEmotion,
        dualPathAnswer: _dualPathAnswer,
        vocabularyLookup: repository.vocabulary,
      );
      if (generation != _generation) return null;
      if (resolved.type == 'results' && resolved.rows.isNotEmpty) {
        return resolved.rows.first.subjectSlug;
      }
      final partial = await _reverseContained(normalised);
      if (generation != _generation) return null;
      if (partial.isNotEmpty) return partial.first.subjectSlug;
    } catch (_) {
      // fall through to the gentle dead end
    }
    _clearResults();
    _set(SearchView.noMatch);
    return null;
  }

  @override
  void dispose() {
    _timer?.cancel();
    _settle?.cancel();
    super.dispose();
  }
}

import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/safety/emotion_safety.dart';
import 'search_repository.dart';

/// What the search screen shows.
enum SearchView { idle, crisis, dualPath, loading, results, universal, noMatch }

/// The search's behaviour, as the website's EmotionSearch.js — kept apart from
/// the screen so it can be tested without one.
///
/// THE TWO SAFETY GATES RUN ON EVERY KEYSTROKE, BEFORE THE 300 ms DEBOUNCE
/// AND BEFORE ANY REQUEST. A crisis phrase shows the crisis screen at once and
/// sends nothing — not the emotion lookup, not the universal search. Words
/// typed before a phrase is complete can already have gone out as an ordinary
/// search (the Privacy Policy says so); the complete phrase never does.
class EmotionSearchController extends ChangeNotifier {
  EmotionSearchController({
    required this.safety,
    required this.repository,
    this.debounce = const Duration(milliseconds: 300),
  });

  final EmotionSafety safety;
  final SearchRepository repository;
  final Duration debounce;

  String _text = '';
  String? _dualPathAnswer;
  SearchView _view = SearchView.idle;
  String? _crisisCategory;
  List<MappingRow> _rows = const [];
  String? _softTier;
  String? _medicalDisclaimer;
  UniversalResults _universal = UniversalResults.empty;
  Timer? _timer;
  int _generation = 0;

  String get text => _text;
  SearchView get view => _view;
  String? get crisisCategory => _crisisCategory;
  String? get softTier => _softTier;
  String? get medicalDisclaimer => _medicalDisclaimer;
  UniversalResults get universal => _universal;

  /// Up to six distinct subjects, strongest first (uniqueSubjects()).
  List<MappingRow> get subjects {
    final seen = <String>{};
    final out = <MappingRow>[];
    for (final r in _rows) {
      if (seen.add(r.subjectSlug)) out.add(r);
      if (out.length == 6) break;
    }
    return out;
  }

  /// The first subject to open on "search" — the strongest match.
  String? get topSubject => _rows.isEmpty ? null : _rows.first.subjectSlug;

  void _set(SearchView view) {
    _view = view;
    notifyListeners();
  }

  void _clearResults() {
    _rows = const [];
    _softTier = null;
    _medicalDisclaimer = null;
    _universal = UniversalResults.empty;
    _crisisCategory = null;
  }

  /// Every change of the text, typed or tapped in.
  void onChanged(String value) {
    _text = value;
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
    _dualPathAnswer = null;
    _timer?.cancel();
    _generation++;
    _clearResults();
    _set(SearchView.idle);
  }

  void _evaluate() {
    _timer?.cancel();
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
        repository.universal(term),
      ]);
      if (generation != _generation) return;
      var resolved = results[0] as EmotionSearchResult;
      _universal = results[1] as UniversalResults;

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

      _softTier = safety.checkSoftTier(normalised) ? safety.softTierLine : null;
      if (rows.isNotEmpty) {
        _rows = rows;
        _medicalDisclaimer = safety.needsMedicalDisclaimer(rows)
            ? safety.medicalDisclaimer
            : null;
        return _set(SearchView.results);
      }
      return _set(
        _universal.isEmpty ? SearchView.noMatch : SearchView.universal,
      );
    } catch (_) {
      if (generation != _generation) return;
      return _set(SearchView.noMatch);
    }
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
    super.dispose();
  }
}

import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/data/models.dart';
import 'package:spiritpedia/features/search/subject_search.dart';

// The website's own cases (web/utils/subjectSearch.test.mjs).
void main() {
  const subjects = [
    Subject(slug: 'breathwork', name: 'Breathwork'),
    Subject(slug: 'eft-tapping', name: 'EFT / Tapping'),
    Subject(slug: 'energy-medicine', name: 'Energy Medicine'),
    Subject(slug: 'qi-gong', name: 'Qi Gong'),
    Subject(slug: 'quantum-healing', name: 'Quantum Healing'),
    Subject(slug: 'quantum-touch', name: 'Quantum Touch'),
    Subject(slug: 'reiki', name: 'Reiki'),
    Subject(slug: 'tai-chi', name: 'Tai Chi'),
  ];
  List<String> names(String term) => [
    for (final s in matchSubjectsByName(subjects, term)) s.name,
  ];

  test(
    'squashing drops spaces, hyphens, punctuation, capitals and accents',
    () {
      expect(squashName('Quantum-Touch'), 'quantumtouch');
      expect(squashName('  EFT / Tapping '), 'efttapping');
      expect(squashName('Réiki'), 'reiki');
      expect(squashName(null), '');
    },
  );

  test('spaces, hyphens and capitals do not matter', () {
    for (final t in [
      'Quantum-Touch',
      'quantumtouch',
      'quantum touch',
      'QUANTUM TOUCH',
    ]) {
      expect(names(t), ['Quantum Touch'], reason: t);
    }
    expect(names('breath work'), ['Breathwork']);
    expect(names('breathwork'), ['Breathwork']);
    for (final t in ['tai-chi', 'taichi', 'tai chi', 'Tai Chi']) {
      expect(names(t), ['Tai Chi'], reason: t);
    }
    for (final t in ['qigong', 'qi gong', 'qi-gong']) {
      expect(names(t), ['Qi Gong'], reason: t);
    }
    expect(names('reiki'), ['Reiki']);
  });

  test('a part of a name still finds it; an exact name comes first; three at '
      'most', () {
    expect(names('quantum'), ['Quantum Healing', 'Quantum Touch']);
    expect(names('tapping'), ['EFT / Tapping']);
    expect(matchSubjectsByName(subjects, 'e'), hasLength(3));
    expect(names('quantum healing'), ['Quantum Healing']);
  });

  test('nothing to match: nothing back', () {
    expect(names(''), isEmpty);
    expect(names(' - '), isEmpty);
    expect(names('soundbath'), isEmpty);
    expect(matchSubjectsByName(const [], 'reiki'), isEmpty);
  });

  test('the list is fetched once; a failed fetch is tried again', () async {
    var calls = 0;
    var fail = true;
    final list = SubjectList(() async {
      calls++;
      if (fail) throw Exception('offline');
      return subjects;
    });
    expect(await list.match('reiki'), isEmpty);
    fail = false;
    expect(
      [for (final s in await list.match('breath work')) s.name],
      ['Breathwork'],
    );
    expect([for (final s in await list.match('tai-chi')) s.name], ['Tai Chi']);
    expect(calls, 2);
  });
}

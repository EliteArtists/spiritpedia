import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/data/models.dart';
import 'package:spiritpedia/data/shelf_rules.dart';

import '../support/fake_content.dart';

// A subject page's teachers (owner, 10 Nov 2026): tier order, then by name;
// nearest first within each tier once an area is set. The website's
// SubjectHealersShelf.jsx and utils/listings.js → byTier.
void main() {
  const london = FakeContentRepository.london;
  const croydon = FakeContentRepository.croydon;
  const manchester = FakeContentRepository.manchester;
  final places = {
    for (final p in [london, croydon, manchester]) p.id: p,
  };
  Healer h(int id, String name, String? tier, {int? place}) =>
      FakeContentRepository.healer(id, 'h$id', name, tier, place: place);

  final zoeLocal = h(1, 'Zoe', 'local_hero', place: london.id);
  final amyLocal = h(2, 'amy', 'local_hero', place: manchester.id);
  final noTier = h(3, 'Bea', null);
  final luminaryFar = h(4, 'Lu Far', 'luminary', place: manchester.id);
  final luminaryNear = h(5, 'Lu Near', 'luminary', place: croydon.id);
  final master = h(6, 'Master', 'ascended_master');
  final hero = h(7, 'Hero', 'superhero', place: manchester.id);
  final all = [zoeLocal, amyLocal, noTier, luminaryFar, luminaryNear, master];
  List<Healer> people(List<({Healer healer, double? km})> r) => [
    for (final s in r) s.healer,
  ];

  test('tier order: Superhero, Ascended Master, Luminary, then the rest; '
      'by name within a tier, capitals aside', () {
    expect(tierRank(hero), 0);
    expect(tierRank(master), 1);
    expect(tierRank(luminaryFar), 2);
    expect(tierRank(zoeLocal), 3);
    expect(tierRank(noTier), 3);
    expect(byTier([...all, hero]), [
      hero,
      master,
      luminaryFar,
      luminaryNear,
      amyLocal,
      noTier,
      zoeLocal,
    ]);
  });

  test('no area: tier order, then by name, no distances', () {
    final r = subjectTeachers([...all, hero], null, places);
    expect(people(r), byTier([...all, hero]));
    expect(r.every((s) => s.km == null), isTrue);
  });

  test('in London: still tier first, then nearest first within each tier, '
      'no town last within its tier; nobody left out', () {
    final r = subjectTeachers([...all, hero], london, places);
    expect(people(r), [
      hero,
      master,
      luminaryNear,
      luminaryFar,
      zoeLocal,
      amyLocal,
      noTier,
    ]);
    expect(r[1].km, isNull);
    expect(r[2].km, closeTo(15, 2));
    expect(r[4].km, 0);
    expect(r.last.km, isNull);
  });
}

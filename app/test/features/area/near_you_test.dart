import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/data/models.dart';
import 'package:spiritpedia/data/shelf_rules.dart';
import 'package:spiritpedia/features/account/display_name.dart';
import 'package:spiritpedia/features/star/conductor.dart';

import '../../support/fake_content.dart';

void main() {
  const london = FakeContentRepository.london;
  const croydon = FakeContentRepository.croydon;
  const manchester = FakeContentRepository.manchester;
  final places = {
    for (final p in [london, croydon, manchester]) p.id: p,
  };

  group('Practitioners Near You', () {
    test('distances between town centres', () {
      expect(distanceKm(london, london), 0);
      expect(distanceKm(london, croydon), closeTo(15, 2));
      expect(distanceKm(london, manchester), closeTo(262, 5));
    });

    final inCroydon = FakeContentRepository.healer(
      1,
      'croydon-local',
      'Croydon Local',
      'local_hero',
      place: croydon.id,
      availability: 'Local Only (In-Person)',
    );
    final inLondon = FakeContentRepository.healer(
      2,
      'london-local',
      'London Local',
      'local_hero',
      place: london.id,
      availability: 'Local & Online Sessions',
    );
    final manchesterLocal = FakeContentRepository.healer(
      3,
      'manchester-local',
      'Manchester Local',
      'local_hero',
      place: manchester.id,
      availability: 'Local Only (In-Person)',
    );
    final manchesterOnline = FakeContentRepository.healer(
      4,
      'manchester-online',
      'Manchester Online',
      'local_hero',
      place: manchester.id,
      availability: 'Worldwide (Online Sessions)',
    );
    final nowhere = FakeContentRepository.healer(
      5,
      'no-town',
      'No Town',
      'local_hero',
      availability: 'Worldwide (Online Sessions)',
    );
    final all = [
      manchesterLocal,
      inCroydon,
      manchesterOnline,
      inLondon,
      nowhere,
    ];

    List<Healer> people(List<({Healer healer, double? km})> r) => [
      for (final s in r) s.healer,
    ];

    test('no area: everyone, as they were, with no distances', () {
      final r = nearYou(all, null, places);
      expect(people(r), all);
      expect(r.every((s) => s.km == null), isTrue);
    });

    test('in London: everyone stays; towns nearest first, then no town', () {
      final r = nearYou(all, london, places);
      expect(people(r), [
        inLondon,
        inCroydon,
        manchesterLocal,
        manchesterOnline,
        nowhere,
      ]);
      expect(r.first.km, 0);
      expect(r.last.km, isNull);
      expect(anyNear(r), isTrue);
    });

    test('the same in Manchester: local-only people elsewhere are kept, '
        'further down', () {
      expect(people(nearYou(all, manchester, places)), [
        manchesterLocal,
        manchesterOnline,
        inLondon,
        inCroydon,
        nowhere,
      ]);
    });

    // The website's own cases (web/utils/area.test.mjs).
    const edinburgh = Place(
      id: 2650225,
      name: 'Edinburgh',
      region: 'Scotland',
      country: 'United Kingdom',
      lat: 55.9521,
      lng: -3.1965,
    );
    const paris = Place(
      id: 2988507,
      name: 'Paris',
      country: 'France',
      lat: 48.8534,
      lng: 2.3488,
    );

    const newYork = Place(
      id: 5128581,
      name: 'New York',
      region: 'New York',
      country: 'United States',
      lat: 40.7143,
      lng: -74.006,
    );

    test('closest to you: nobody within 50 km, so the same full list, '
        'nearest first, with distances', () {
      final r = nearYou(all, edinburgh, places);
      expect(anyNear(r), isFalse);
      expect(people(r), [
        manchesterLocal,
        manchesterOnline,
        inLondon,
        inCroydon,
        nowhere,
      ]);
      expect(r.first.km, closeTo(282, 5));
      // No longer capped at ten.
      final many = [
        for (var i = 0; i < 14; i++)
          FakeContentRepository.healer(
            100 + i,
            'l$i',
            'L$i',
            'local_hero',
            place: london.id,
          ),
      ];
      expect(nearYou(many, paris, places), hasLength(14));
      // Nobody with a town: still everyone, none with a distance.
      final alone = nearYou([nowhere], paris, places);
      expect(people(alone), [nowhere]);
      expect(alone.single.km, isNull);
    });

    test('someone 5,000 km away and someone with no base both stay, after '
        'nearer people', () {
      final far = FakeContentRepository.healer(
        6,
        'far',
        'Far',
        'local_hero',
        place: newYork.id,
        availability: 'Local Only (In-Person)',
      );
      final noBase = FakeContentRepository.healer(
        7,
        'no-base',
        'No Base',
        'local_hero',
        availability: 'Local Only (In-Person)',
      );
      final r = nearYou([noBase, far, inCroydon, inLondon], london, {
        ...places,
        newYork.id: newYork,
      });
      expect(people(r), [inLondon, inCroydon, far, noBase]);
      expect(r[2].km, greaterThan(5000));
      expect(r[3].km, isNull);
    });

    test('byDistance groups by rank first, then nearest, then no town, ties '
        'in the order given', () {
      int rank(Healer h) => h.id == 1 || h.id == 5 ? 0 : 1;
      expect(people(byDistance(all, london, places, rank: rank)), [
        inCroydon,
        nowhere,
        inLondon,
        manchesterLocal,
        manchesterOnline,
      ]);
    });

    test('schools and organisations: nearest first, nobody hidden, no town '
        'last', () {
      expect(nearestFirst(all, null, places), all);
      expect(nearestFirst(all, edinburgh, places), [
        manchesterLocal,
        manchesterOnline,
        inLondon,
        inCroydon,
        nowhere,
      ]);
      expect(nearestFirst(all, london, places), [
        inLondon,
        inCroydon,
        manchesterLocal,
        manchesterOnline,
        nowhere,
      ]);
    });

    test('miles in the United Kingdom and the United States, kilometres '
        'elsewhere', () {
      expect(distanceLabel(320, 'France'), '320 km away');
      expect(distanceLabel(1240.4, 'Germany'), '1,240 km away');
      expect(distanceLabel(321.9, 'United Kingdom'), '200 miles away');
      expect(distanceLabel(1, 'United States'), '1 mile away');
    });
  });

  group('the conductor', () {
    final now = DateTime(2026, 11, 1);
    const never = (times: 0, lastVisit: 0, lastAt: null);

    test('the area from the 5th visit, the name from the 7th', () {
      StarAsk? at(int visit, {bool area = false, bool name = false}) => nextAsk(
        visit: visit,
        hasArea: area,
        hasName: name,
        records: const {},
        now: now,
      );
      expect(at(1), isNull);
      expect(at(4), isNull);
      expect(at(5), StarAsk.area);
      expect(at(6, area: true), isNull);
      expect(at(7, area: true), StarAsk.name);
      // Both due: the area first; the name waits for another session.
      expect(at(7), StarAsk.area);
      expect(at(9, area: true, name: true), isNull);
    });

    test('"Not now": once more, 15+ visits and 3+ weeks later, then never', () {
      final once = (times: 1, lastVisit: 5, lastAt: now);
      expect(mayAsk(StarAsk.area, 5, never, now), isTrue);
      expect(
        mayAsk(StarAsk.area, 19, once, now.add(const Duration(days: 30))),
        isFalse,
      );
      expect(
        mayAsk(StarAsk.area, 20, once, now.add(const Duration(days: 20))),
        isFalse,
      );
      expect(
        mayAsk(StarAsk.area, 20, once, now.add(const Duration(days: 21))),
        isTrue,
      );
      final twice = (times: 2, lastVisit: 20, lastAt: now);
      expect(
        mayAsk(StarAsk.area, 200, twice, now.add(const Duration(days: 400))),
        isFalse,
      );
    });
  });

  test('names: tidied, and the first name for greetings', () {
    expect(cleanName('  Ross   Baiken '), 'Ross Baiken');
    expect(cleanName('   '), isNull);
    expect(firstNameOf('Ross Baiken'), 'Ross');
    expect(cleanName('x' * 60)!.length, maxNameLength);
  });
}

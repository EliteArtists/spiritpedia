import 'package:flutter_test/flutter_test.dart';
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

    test('no area: everyone, as they were', () {
      final r = nearYou(all, null, places);
      expect(r.near, all);
      expect(r.online, isEmpty);
    });

    test('in London: within 50 km nearest first, then online from anywhere; '
        'local-only elsewhere left out', () {
      final r = nearYou(all, london, places);
      expect(r.near, [inLondon, inCroydon]);
      expect(r.online, [manchesterOnline, nowhere]);
      expect([...r.near, ...r.online], isNot(contains(manchesterLocal)));
    });

    test('in Manchester: nobody near but the Manchester ones', () {
      final r = nearYou(all, manchester, places);
      expect(r.near, [manchesterLocal, manchesterOnline]);
      expect(r.online, [inLondon, nowhere]);
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

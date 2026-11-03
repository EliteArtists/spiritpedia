import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/data/badges.dart';
import 'package:spiritpedia/data/models.dart';
import 'package:spiritpedia/data/shelf_rules.dart';
import 'package:spiritpedia/shared/widgets/cards.dart';

// Schools and organisations (README §17.11): the website's rules
// (web/utils/listings.test.mjs), case for case, plus the app's shelves.

Healer _h(
  int id, {
  String? type,
  String? tier,
  bool official = false,
  String? name,
  int? founded,
}) => Healer(
  id: id,
  slug: 'h$id',
  name: name ?? 'H$id',
  entityType: type,
  tier: tier,
  official: official,
  foundedYear: founded,
);

void main() {
  test('channels, apps and organisations are platforms; people and NULL are '
      'not', () {
    expect(_h(1, type: 'channel').isPlatform, isTrue);
    expect(_h(1, type: 'app').isPlatform, isTrue);
    expect(_h(1, type: 'organisation').isPlatform, isTrue);
    expect(_h(1, type: 'individual').isPlatform, isFalse);
    expect(_h(1).isPlatform, isFalse);
  });

  test('a school is not a person, and is a school (0029)', () {
    expect(_h(1, type: 'school').isPlatform, isTrue);
    expect(_h(1, type: 'school').isSchool, isTrue);
    expect(_h(1, type: 'channel').isSchool, isFalse);
    expect(_h(1).isSchool, isFalse);
    expect(_h(1, type: 'school').platformLabel, 'School');
  });

  test("a school's teacher count counts only its own links", () {
    const links = [
      HubLink(hubId: 1, teacherId: 10),
      HubLink(hubId: 1, teacherId: 11),
      HubLink(hubId: 2, teacherId: 10),
    ];
    expect(teacherCount(_h(1), links), 2);
    expect(teacherCount(_h(3), links), 0);
    expect(teacherCount(_h(1), const []), 0);
  });

  test('organisations get their own shelf only at the minimum (never a '
      'one-card row)', () {
    Healer org(int id) => _h(id, type: 'organisation', tier: 'luminary');
    final channel = _h(99, type: 'channel');
    final four = [org(1), org(2), org(3), org(4), channel];
    expect(organisationShelfMinimum, 5);
    final below = splitOrganisations(four, const []);
    expect(below.organisations, isEmpty);
    expect(below.platforms, four);

    final five = [...four.take(4), org(5), channel];
    final split = splitOrganisations(five, const []);
    expect(split.organisations.length, 5);
    expect(split.platforms, [channel]);
    final none = splitOrganisations(const [], const []);
    expect(none.organisations, isEmpty);
    expect(none.platforms, isEmpty);
  });

  test('the organisations shelf: Official first, then tier, then most '
      'teachers', () {
    const links = [
      HubLink(hubId: 3, teacherId: 10),
      HubLink(hubId: 3, teacherId: 11),
      HubLink(hubId: 4, teacherId: 10),
    ];
    final list = [
      _h(1, type: 'organisation', tier: 'luminary'),
      _h(2, type: 'organisation', tier: 'luminary', official: true),
      _h(3, type: 'organisation', tier: 'superhero'),
      _h(4, type: 'organisation', tier: 'superhero'),
      _h(5, type: 'organisation'),
      _h(6, type: 'app'),
    ];
    expect(splitOrganisations(list, links).organisations.map((h) => h.id), [
      2,
      3,
      4,
      1,
      5,
    ]);
  });

  test('schools and organisations are hubs; channels and people are not', () {
    expect(_h(1, type: 'school').isHub, isTrue);
    expect(_h(1, type: 'organisation').isHub, isTrue);
    expect(_h(1, type: 'channel').isHub, isFalse);
    expect(_h(1, type: 'individual').isHub, isFalse);
    expect(_h(1).isHub, isFalse);
  });

  test('a teacher teaches at a school, on an organisation; a founder founds '
      'either', () {
    final school = _h(1, type: 'school');
    final org = _h(2, type: 'organisation');
    expect(hubLinkPrefix('instructor', school), 'Teaches at');
    expect(hubLinkPrefix('instructor', org), 'Teaches on');
    expect(hubLinkPrefix('founder', org), 'Founder of');
    expect(hubLinkPrefix('founder', school), 'Founder of');
  });

  test('Spiritpedia Official comes first, the rest keep their order', () {
    final list = [_h(1), _h(2), _h(3, official: true), _h(4)];
    expect(officialFirst(list).map((h) => h.id), [3, 1, 2, 4]);
    expect(officialFirst(const []), isEmpty);
  });

  test('School is a type badge, with the platform tier names', () {
    expect(typeLabel('school'), 'School');
    expect(
      listingBadges(
        name: 'White Tiger Qigong',
        tier: 'luminary',
        entityType: 'school',
      ).map((b) => b.label),
      ['Shining Star', 'School'],
    );
  });

  group('Discover', () {
    final school = _h(10, type: 'school', tier: 'superhero');
    final teacher = _h(11, tier: 'superhero');
    final local = _h(12, tier: 'local_hero');
    final channel = _h(13, type: 'channel', tier: 'superhero');

    test('a school is on Schools & Academies only: never a practitioner '
        'shelf, the billboard, Near You or Explore These Channels', () {
      final s = HealerShelves([
        school,
        teacher,
        local,
        channel,
        _h(14, type: 'school', tier: 'local_hero'),
      ]);
      expect(s.schools.map((h) => h.id), [10, 14]);
      expect(s.superheroes, [teacher]);
      expect(s.billboard, [teacher]);
      expect(s.localHeroes, [local]);
      expect(s.platforms, [channel]);
      expect(s.organisations, isEmpty);
    });

    test('five organisations leave Explore These Channels for their own '
        'shelf; four stay', () {
      final orgs = [
        for (var i = 20; i < 25; i++)
          _h(i, type: 'organisation', tier: 'luminary'),
      ];
      const links = [HubLink(hubId: 23, teacherId: 11)];
      final five = HealerShelves([channel, ...orgs], links: links);
      expect(five.organisations.map((h) => h.id), [23, 20, 21, 22, 24]);
      expect(five.platforms, [channel]);

      final four = HealerShelves([channel, ...orgs.take(4)], links: links);
      expect(four.organisations, isEmpty);
      expect(four.platforms.map((h) => h.id), [13, 20, 21, 22, 23]);
    });
  });

  test('Our Teachers: the founder first, then by tier, then by name', () {
    final teachers = ourTeachers([
      (role: 'instructor', teacher: _h(1, tier: 'local_hero', name: 'Ariel')),
      (role: 'instructor', teacher: _h(2, tier: 'luminary', name: 'Vince')),
      (role: 'instructor', teacher: _h(3, tier: 'luminary', name: 'Sarah')),
      (role: 'founder', teacher: _h(4, tier: 'local_hero', name: 'Tevia')),
      (role: 'instructor', teacher: _h(5, name: 'Joanne')),
    ]);
    expect(teachers.map((h) => h.name), [
      'Tevia',
      'Sarah',
      'Vince',
      'Ariel',
      'Joanne',
    ]);
  });

  group("a teacher's hubs line", () {
    final wtq = _h(1, type: 'school', name: 'White Tiger Qigong');
    final flora = _h(2, type: 'school', name: 'Skies and Flora');
    final shift = _h(3, type: 'organisation', name: 'The Shift Network');
    final timer = _h(4, type: 'organisation', name: 'Insight Timer');

    String line(List<({String role, Healer hub})> links) =>
        [for (final p in hubLine(links)) '${p.lead}${p.hub.name}'].join();

    test('founders first, then schools, then organisations; the words only '
        'when they change', () {
      expect(
        line([
          (role: 'instructor', hub: shift),
          (role: 'instructor', hub: flora),
          (role: 'founder', hub: wtq),
          (role: 'instructor', hub: timer),
        ]),
        'Founder of White Tiger Qigong, teaches at Skies and Flora, teaches '
        'on The Shift Network and Insight Timer',
      );
    });

    test('one hub, and two of a kind', () {
      expect(
        line([(role: 'instructor', hub: shift)]),
        'Teaches on The Shift Network',
      );
      expect(
        line([
          (role: 'instructor', hub: wtq),
          (role: 'instructor', hub: flora),
        ]),
        'Teaches at White Tiger Qigong and Skies and Flora',
      );
      expect(hubLine(const []), isEmpty);
    });
  });

  test('the card always has one meta line', () {
    final wtq = _h(1, type: 'school', founded: 2008);
    expect(schoolMeta(wtq, 5), '5 teachers · Founded 2008');
    expect(schoolMeta(_h(2, type: 'school'), 1), '1 teacher');
    expect(schoolMeta(_h(3, type: 'school'), 0), 'School');
    expect(
      schoolMeta(_h(4, type: 'organisation'), 0, kind: 'Organisation'),
      'Organisation',
    );
  });

  test('founded_year and hub_teachers rows parse', () {
    expect(Healer.fromJson({'id': 1, 'founded_year': 2008}).foundedYear, 2008);
    expect(Healer.fromJson({'id': 2}).foundedYear, isNull);
    final link = HubLink.fromJson({
      'hub_id': 1,
      'teacher_id': 2,
      'role': 'founder',
    });
    expect((link.hubId, link.teacherId, link.isFounder), (1, 2, true));
    expect(HubLink.fromJson({'hub_id': 1, 'teacher_id': 3}).isFounder, false);
  });
}

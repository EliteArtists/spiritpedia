import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/data/models.dart';
import 'package:spiritpedia/data/shelf_rules.dart';

import '../support/fake_content.dart';

void main() {
  group(
    'pickPortrait — same answers as the website (computed with its JavaScript)',
    () {
      const imgs = ['a', 'b', 'c'];
      final cases = <(String?, String, String)>[
        (null, 'eckhart-tolle', 'b'),
        ('breathwork', 'eckhart-tolle', 'c'),
        ('self-healing', 'wim-hof', 'b'),
        (null, 'wim-hof', 'c'),
        ('meditation', 'mooji', 'b'),
      ];
      for (final (subject, seed, expected) in cases) {
        test(
          '$subject / $seed → $expected',
          () => expect(pickPortrait(imgs, subject, seed), expected),
        );
      }
      test(
        'no photos → the placeholder',
        () => expect(pickPortrait(const [], null, 'x'), defaultAvatar),
      );
    },
  );

  test('healer shelves split by tier and entity, like the homepage', () {
    final s = HealerShelves(FakeContentRepository().allHealers);
    expect(s.superheroes.map((h) => h.slug), ['eckhart-tolle', 'wim-hof']);
    expect(s.luminaries.map((h) => h.slug), [
      'rising-one',
    ]); // the channel is not here
    expect(s.ascendedMasters.map((h) => h.slug), ['alan-watts']);
    // Local Hero is the safe fallback: unknown and NULL tiers land here.
    expect(s.localHeroes.map((h) => h.slug), ['local-one', 'no-tier']);
    expect(s.platforms.map((h) => h.slug), ['a-channel']);
  });

  test(
    'billboard: three Superheroes, then one Ascended Master, nobody dropped',
    () {
      Healer h(int i, String tier) =>
          FakeContentRepository.healer(i, '$tier-$i', '$tier $i', tier);
      final s = HealerShelves([
        for (var i = 0; i < 7; i++) h(i, 'superhero'),
        for (var i = 10; i < 13; i++) h(i, 'ascended_master'),
      ]);
      expect(
        s.billboard.map((x) => x.tier == 'superhero' ? 'S' : 'A').join(),
        'SSSASSSASA',
      );
    },
  );

  test('video shelves hold at most two videos per teacher', () {
    final shelf = capPerTeacher(FakeContentRepository().allVideos);
    final perTeacher = <String?, int>{};
    for (final v in shelf) {
      perTeacher[v.healerSlug] = (perTeacher[v.healerSlug] ?? 0) + 1;
    }
    expect(perTeacher.values.every((n) => n <= 2), isTrue);
    expect(shelf.length, 4); // two of eight, two of three
  });

  test(
    'offerings split into courses (incl. unset type), retreats and downloads',
    () {
      final split = splitOfferings(const [
        Offering(id: '1', slug: 'a', title: 'a'),
        Offering(id: '2', slug: 'b', title: 'b', productType: 'course'),
        Offering(id: '3', slug: 'c', title: 'c', productType: 'retreat'),
        Offering(id: '4', slug: 'd', title: 'd', productType: 'download'),
        Offering(id: '5', slug: 'e', title: 'e', productType: 'membership'),
      ]);
      expect(split.courses.map((o) => o.id), ['1', '2']);
      expect(split.retreats.map((o) => o.id), ['3']);
      expect(split.downloads.map((o) => o.id), ['4']);
    },
  );

  test('truncateBio matches the website (120 characters, cut at a word)', () {
    expect(
      truncateBio(
        'Michael Harner (1929–2018) was the anthropologist who brought shamanism home to the modern West — the scholar who wrote the classic',
      ),
      'Michael Harner (1929–2018) was the anthropologist who brought shamanism home to the modern West — the scholar who wrote…',
    );
    expect(truncateBio('Short.'), 'Short.');
  });

  test('lifespan', () {
    expect(
      formatLifespan(
        FakeContentRepository.healer(1, 'a', 'A', null, born: 1915, died: 1973),
      ),
      '1915 — 1973',
    );
    expect(
      formatLifespan(
        FakeContentRepository.healer(1, 'a', 'A', null, born: 1931),
      ),
      'b. 1931',
    );
    expect(
      formatLifespan(FakeContentRepository.healer(1, 'a', 'A', null)),
      isNull,
    );
  });

  test(
    'YouTube ids parse as on the website; anything else is not a YouTube video',
    () {
      expect(
        youtubeIdFrom('https://www.youtube.com/watch?v=JHeePe3NeZk&t=1'),
        'JHeePe3NeZk',
      );
      expect(youtubeIdFrom('https://youtu.be/JHeePe3NeZk'), 'JHeePe3NeZk');
      expect(youtubeIdFrom('https://vimeo.com/123'), isNull);
      expect(youtubeIdFrom(null), isNull);
    },
  );

  test('pillars', () {
    expect(pillarOf('breathwork'), 'Emotional Healing');
    expect(pillarOf('yoga'), 'Body & Energy');
    expect(pillarOf('unknown'), isNull);
    expect(subjectPillars.values.expand((s) => s).length, 34);
  });
}

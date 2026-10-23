import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/data/models.dart';
import 'package:spiritpedia/shared/widgets/cards.dart';

Publisher _pub({int authors = 0, int? founded, String? logo}) => Publisher(
  id: '1',
  slug: 'awaken-village-press',
  name: 'Awaken Village Press',
  authorCount: authors,
  foundedYear: founded,
  logoUrl: logo,
);

void main() {
  test('the card always has one meta line', () {
    expect(
      publisherMeta(_pub(authors: 18, founded: 1984)),
      '18 authors · Founded 1984',
    );
    expect(publisherMeta(_pub(authors: 1)), '1 author');
    expect(publisherMeta(_pub(founded: 1985)), 'Founded 1985');
    expect(publisherMeta(_pub()), 'Independent press');
  });

  testWidgets('no logo shows the initial on the white panel', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 192,
            height: 112,
            child: PublisherLogo(publisher: _pub()),
          ),
        ),
      ),
    );
    expect(find.text('A'), findsOneWidget);
  });
}

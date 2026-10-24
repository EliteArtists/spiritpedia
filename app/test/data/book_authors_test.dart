import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/data/book_authors.dart';
import 'package:spiritpedia/data/models.dart';

void main() {
  test('co-authors follow the main author, without repeats or blanks', () {
    expect(
      bookAuthorSlugs('amron-bevels', ['amy-belair', 'amron-bevels', '']),
      ['amron-bevels', 'amy-belair'],
    );
    expect(bookAuthorSlugs(null, []), isEmpty);
  });

  test('a book reads its co-authors, and an older row has none', () {
    final co = Book.fromJson({
      'id': 1,
      'healer_slug': 'amron-bevels',
      'co_healer_slugs': ['amy-belair'],
    });
    expect(co.authorSlugs, ['amron-bevels', 'amy-belair']);
    final old = Book.fromJson({'id': 2, 'healer_slug': 'napoleon-hill'});
    expect(old.coHealerSlugs, isEmpty);
    expect(old.authorSlugs, ['napoleon-hill']);
  });

  test('the filter matches main authors and co-authors (as the website)', () {
    expect(
      booksByAuthorsFilter(['amy-belair', 'amron-bevels']),
      'healer_slug.in.(amy-belair,amron-bevels),'
      'co_healer_slugs.ov.{amy-belair,amron-bevels}',
    );
    expect(booksByAuthorsFilter([]), isNull);
    expect(booksByAuthorsFilter(['a,b)', 'X']), isNull);
  });

  test('names join the way the page reads', () {
    expect(joinNames(['Eva Dalak']), 'Eva Dalak');
    expect(
      joinNames(['Amron Bevels', 'Amy Belair']),
      'Amron Bevels and Amy Belair',
    );
    expect(joinNames(['A', 'B', 'C']), 'A, B and C');
  });
}

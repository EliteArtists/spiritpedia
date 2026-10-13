// Offering dates: the format, where an event stands, and retreats soonest
// first.

import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/core/format/dates.dart';
import 'package:spiritpedia/data/models.dart';
import 'package:spiritpedia/data/shelf_rules.dart';

DateTime d(int y, int m, int day) => DateTime(y, m, day);

Offering retreat(String slug, {String? start, String? end, String? type}) =>
    Offering(
      id: slug,
      slug: slug,
      title: slug,
      productType: type ?? 'retreat',
      startDate: start,
      endDate: end,
    );

void main() {
  test('ranges read as the design says', () {
    expect(dateRange(d(2026, 7, 16), d(2026, 7, 16)), '16 Jul 2026');
    expect(dateRange(d(2026, 9, 18), d(2026, 9, 20)), '18–20 Sep 2026');
    expect(dateRange(d(2026, 7, 23), d(2026, 8, 2)), '23 Jul – 2 Aug 2026');
    expect(
      dateRange(d(2026, 12, 30), d(2027, 1, 2)),
      '30 Dec 2026 – 2 Jan 2027',
    );
    expect(dateRange(d(2026, 1, 11), null), 'From 11 Jan 2026');
    expect(dateRange(null, d(2026, 4, 24)), 'Until 24 Apr 2026');
    expect(dateRange(null, null), isNull);
    // A typo'd end before the start is read as one day, never "20–18".
    expect(dateRange(d(2026, 9, 20), d(2026, 9, 18)), '20 Sep 2026');
  });

  test('a database date is that calendar day, wherever the phone is', () {
    expect(parseDay('2026-09-18'), d(2026, 9, 18));
    expect(parseDay('2026-09-18T00:00:00+00:00'), d(2026, 9, 18));
    expect(parseDay(null), isNull);
    expect(parseDay('soon'), isNull);
  });

  test('where it stands: upcoming, on now, ended (the website\'s rule)', () {
    final now = DateTime(2026, 10, 13, 15, 30);
    expect(
      datePhase(d(2026, 11, 1), d(2026, 11, 3), now: now),
      DatePhase.upcoming,
    );
    expect(
      datePhase(d(2026, 1, 11), d(2026, 10, 13), now: now),
      DatePhase.onNow,
    ); // ends today: still on
    expect(
      datePhase(d(2026, 10, 13), d(2026, 10, 13), now: now),
      DatePhase.onNow,
    );
    expect(
      datePhase(d(2026, 9, 18), d(2026, 9, 20), now: now),
      DatePhase.ended,
    );
    expect(datePhase(null, d(2026, 10, 12), now: now), DatePhase.ended);
    expect(datePhase(d(2026, 1, 11), null, now: now), DatePhase.upcoming);
    expect(datePhase(null, null, now: now), DatePhase.undated);
  });

  test('which offerings show dates, and the card line', () {
    expect(
      retreat('a', start: '2099-09-18', end: '2099-09-20').whenLine,
      '18–20 Sep 2099',
    );
    expect(
      retreat('b', start: '2020-07-23', end: '2020-08-02').whenLine,
      'Ended · 23 Jul – 2 Aug 2020',
    );
    expect(
      retreat('c', start: '2020-01-11', end: '2099-10-11').whenLine,
      'On now · until 11 Oct 2099',
    );
    // A course that starts on a day shows it; a course's end date alone is
    // its listing's expiry, not an event.
    expect(
      retreat('d', start: '2099-03-01', type: 'course').whenLine,
      'From 1 Mar 2099',
    );
    expect(retreat('e', end: '2099-03-01', type: 'course').whenLine, isNull);
    expect(retreat('f', end: '2099-03-01').whenLine, 'Until 1 Mar 2099');
    expect(retreat('g').whenLine, isNull);
  });

  test('retreat shelves: soonest first, undated last, ties kept in order', () {
    final split = splitOfferings([
      retreat('undated-1'),
      retreat('december', start: '2099-12-01', end: '2099-12-03'),
      retreat('course', type: 'course', start: '2099-01-01'),
      retreat('on-now', start: '2020-01-01', end: '2099-12-31'),
      retreat('undated-2'),
      retreat('june-a', start: '2099-06-01'),
      retreat('june-b', start: '2099-06-01'),
      retreat('end-only', end: '2099-05-01'),
    ]);
    expect(
      [for (final o in split.retreats) o.slug],
      [
        'on-now',
        'end-only',
        'june-a',
        'june-b',
        'december',
        'undated-1',
        'undated-2',
      ],
    );
    expect([for (final o in split.courses) o.slug], ['course']);
  });
}

/// Dates as the website writes them: "13 Oct 2026" (en-GB, short month).
library;

const _months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

String shortDate(DateTime d) => '${d.day} ${_months[d.month - 1]} ${d.year}';

/// A Postgres `date` ("2026-09-18") as a calendar day, with no time zone to
/// shift it: an event on the 18th is on the 18th wherever the phone is.
DateTime? parseDay(String? value) {
  final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(value ?? '');
  if (m == null) return null;
  return DateTime(int.parse(m[1]!), int.parse(m[2]!), int.parse(m[3]!));
}

/// Today as a calendar day.
DateTime today([DateTime? now]) {
  final n = now ?? DateTime.now();
  return DateTime(n.year, n.month, n.day);
}

/// "16 Jul 2026", "18–20 Sep 2026", "23 Jul – 2 Aug 2026",
/// "30 Dec 2026 – 2 Jan 2027", "From 11 Jan 2026", "Until 24 Apr 2026", or
/// null when there are no dates.
String? dateRange(DateTime? start, DateTime? end) {
  if (start != null && end != null && end.isBefore(start)) end = start;
  if (start != null && end != null) {
    if (start == end) return shortDate(start);
    final month = _months[end.month - 1];
    if (start.year == end.year && start.month == end.month) {
      return '${start.day}–${end.day} $month ${end.year}';
    }
    if (start.year == end.year) {
      return '${start.day} ${_months[start.month - 1]} – ${end.day} $month ${end.year}';
    }
    return '${shortDate(start)} – ${shortDate(end)}';
  }
  if (start != null) return 'From ${shortDate(start)}';
  if (end != null) return 'Until ${shortDate(end)}';
  return null;
}

enum DatePhase { undated, upcoming, onNow, ended }

/// Where a dated offering stands today. Ended is the website's rule — the end
/// date has passed (lists hide those). On now: it has started and has an end
/// still to come.
DatePhase datePhase(DateTime? start, DateTime? end, {DateTime? now}) {
  final day = today(now);
  if (start == null && end == null) return DatePhase.undated;
  if (end != null && end.isBefore(day)) return DatePhase.ended;
  if (start != null && end != null && !start.isAfter(day)) {
    return DatePhase.onNow;
  }
  return DatePhase.upcoming;
}

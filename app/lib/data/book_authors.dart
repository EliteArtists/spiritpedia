/// Co-authors (migration 0027). A book has one main author (healer_slug) and
/// any number of co-authors (co_healer_slugs). A co-written book shows on every
/// author's teacher page and publisher shelf, and its page names them all.
/// Mirrors web/utils/bookAuthors.js.
library;

final _safeSlug = RegExp(r'^[a-z0-9-]+$');

/// Every author's slug, main author first, no repeats, no blanks.
List<String> bookAuthorSlugs(String? healerSlug, List<String> coHealerSlugs) {
  final seen = <String>{};
  return [
    for (final s in [?healerSlug, ...coHealerSlugs])
      if (s.isNotEmpty && seen.add(s)) s,
  ];
}

/// PostgREST `or` filter: books where any of these healers is an author.
/// Null when there's no usable slug (the caller skips the query). Anything
/// that isn't a plain slug is dropped so it can't break the filter.
String? booksByAuthorsFilter(List<String> healerSlugs) {
  final slugs = healerSlugs.where(_safeSlug.hasMatch).toList();
  if (slugs.isEmpty) return null;
  final list = slugs.join(',');
  return 'healer_slug.in.($list),co_healer_slugs.ov.{$list}';
}

/// "A", "A and B", "A, B and C".
String joinNames(List<String> names) => names.length <= 1
    ? names.join()
    : '${names.sublist(0, names.length - 1).join(', ')} and ${names.last}';

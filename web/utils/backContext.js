// Build the `?from=&fromTitle=` query string that threads contextual back
// navigation into a detail-page link. Both values are encodeURIComponent-escaped
// so paths and titles with spaces, slashes, or punctuation survive the round trip.
// Returns an empty string when there is no origin path, so callers can append the
// result unconditionally and a context-less link stays clean (→ "Back to Spiritpedia").
export function backContextQuery(from, fromTitle) {
  if (!from) return '';
  let qs = `?from=${encodeURIComponent(from)}`;
  if (fromTitle) qs += `&fromTitle=${encodeURIComponent(fromTitle)}`;
  return qs;
}

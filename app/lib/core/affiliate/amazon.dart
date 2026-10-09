// Amazon Associates — web/utils/affiliate.js, ported line for line. The tests
// in test/core/affiliate/amazon_test.dart are the website's own cases.
//
// THE TAG IS ADDED HERE, NEVER STORED. books.amazon_url records what the
// product is; a store earns only when its tag is in the build config
// (AMAZON_TAG_US, AMAZON_TAG_UK, … — the same names as the website's env vars,
// passed with --dart-define-from-file). A store without one gets a clean,
// untagged link, and no disclosure is shown for it.

const _stores = {
  'amazon.com': 'AMAZON_TAG_US',
  'amazon.co.uk': 'AMAZON_TAG_UK',
  'amazon.es': 'AMAZON_TAG_ES',
  'amazon.de': 'AMAZON_TAG_DE',
  'amazon.fr': 'AMAZON_TAG_FR',
  'amazon.it': 'AMAZON_TAG_IT',
  'amazon.ca': 'AMAZON_TAG_CA',
  'amazon.com.au': 'AMAZON_TAG_AU',
};

/// Subdomains that are the same storefront. us.amazon.com is amazon.com.
final _hostPrefix = RegExp(r'^(?:www|us|smile|m)\.');

/// The ASIN must END at a path or query boundary, so a malformed nine-character
/// ASIN cannot borrow the next character of a longer path.
final _asinPath = RegExp(
  r'/(?:dp|gp/product|product|ASIN)/([A-Z0-9]{10})(?=[/?#]|$)',
  caseSensitive: false,
);

/// The tags compiled into this build, by env var name.
const amazonTagsFromConfig = {
  'AMAZON_TAG_US': String.fromEnvironment('AMAZON_TAG_US'),
  'AMAZON_TAG_UK': String.fromEnvironment('AMAZON_TAG_UK'),
  'AMAZON_TAG_ES': String.fromEnvironment('AMAZON_TAG_ES'),
  'AMAZON_TAG_DE': String.fromEnvironment('AMAZON_TAG_DE'),
  'AMAZON_TAG_FR': String.fromEnvironment('AMAZON_TAG_FR'),
  'AMAZON_TAG_IT': String.fromEnvironment('AMAZON_TAG_IT'),
  'AMAZON_TAG_CA': String.fromEnvironment('AMAZON_TAG_CA'),
  'AMAZON_TAG_AU': String.fromEnvironment('AMAZON_TAG_AU'),
};

typedef AmazonLink = ({String url, bool tagged});

/// rawUrl → (url, tagged), or null for anything that is not a usable Amazon
/// product link (a Goodreads URL in amazon_url, a malformed ASIN) — the caller
/// hides the button rather than send someone somewhere misleading.
///
/// The link is rebuilt canonically as https://www.{host}/dp/{ASIN}, dropping
/// every stored query parameter.
AmazonLink? amazonAffiliateUrl(
  String? rawUrl, {
  Map<String, String> tags = amazonTagsFromConfig,
}) {
  if (rawUrl == null || rawUrl.trim().isEmpty) return null;
  final parsed = Uri.tryParse(rawUrl.trim());
  if (parsed == null || !parsed.hasScheme || parsed.host.isEmpty) return null;

  final host = parsed.host.toLowerCase().replaceFirst(_hostPrefix, '');
  final envName = _stores[host];
  if (envName == null) return null;

  final match = _asinPath.firstMatch(parsed.path);
  if (match == null) return null;

  final url = 'https://www.$host/dp/${match.group(1)!.toUpperCase()}';
  final tag = tags[envName]?.trim() ?? '';
  return tag.isEmpty
      ? (url: url, tagged: false)
      : (url: '$url?tag=${Uri.encodeQueryComponent(tag)}', tagged: true);
}

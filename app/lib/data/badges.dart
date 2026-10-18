// Badges on every listing (migration 0023): the website's rules
// (web/utils/badges.js), word for word. README → "Badges explained".
//
//   Type      what it is: Practitioner, Channel, App, Organisation, Publisher.
//   Tier      how big it is; set by the admin, never for sale. The same three
//             stored values for everyone, named for people or for platforms:
//               superhero  → Superhero   / Superstar      (gold)
//               luminary   → Luminary    / Shining Star   (purple)
//               local_hero → Local Hero  / Rising Star    (green)
//             ascended_master stays as it is, for people only.
//   Verified  the owner has confirmed it is theirs. Automatic.
//   Official  Spiritpedia's own listing. Automatic. It shows no tier.

/// A publisher has its own table, not an entity_type: it is passed as this.
const publisherType = 'publisher';

/// A person: entity_type 'individual', or NULL as it always was.
bool isPerson(String? entityType) =>
    entityType == null || entityType.isEmpty || entityType == 'individual';

const _people = {
  'superhero': 'Superhero',
  'luminary': 'Luminary',
  'local_hero': 'Local Hero',
  'ascended_master': 'Ascended Master',
};

const _platforms = {
  'superhero': 'Superstar',
  'luminary': 'Shining Star',
  'local_hero': 'Rising Star',
};

/// The tier's name for this kind of listing, or null when it has none.
String? tierName(String? tier, String? entityType) =>
    (isPerson(entityType) ? _people : _platforms)[tier];

/// What it is, for a channel, an app or an organisation. A publisher's card
/// and page already say what it is, so it shows none.
String? typeLabel(String? entityType) => switch (entityType) {
  'channel' => 'Channel',
  'app' => 'App',
  'organisation' => 'Organisation',
  _ => null,
};

/// What the star says when a tier badge is tapped, by the tier's name. The
/// top two tiers say the same for people and platforms.
const worldwideTip =
    'A worldwide reach, with over a million followers across social media.';
const futureTip =
    'Hundreds of thousands of followers: the superstars of the future.';

const tierTips = {
  'Superhero': worldwideTip,
  'Luminary': futureTip,
  'Local Hero': 'A practitioner available in your area.',
  'Ascended Master': 'A timeless teacher whose legacy lives on.',
  'Superstar': worldwideTip,
  'Shining Star': futureTip,
  'Rising Star':
      'A rising voice, and worth finding early: under a hundred thousand '
      'followers, for now.',
};

String verifiedTip(String name) =>
    'This page is run by ${name.isEmpty ? 'its owner' : name} themselves. '
    'They’ve confirmed it’s theirs, so what you see here comes straight '
    'from them.';

const officialTip =
    'This is my home: Spiritpedia’s own page. Our videos, our reviews, and '
    'where you can always find us.';

enum BadgeKind { tier, type, verified, official }

/// One badge a listing wears: its [label], and what the star says ([tip]).
class ListingBadge {
  const ListingBadge(this.kind, this.label, {this.tier, this.tip});

  final BadgeKind kind;
  final String label;

  /// The stored tier, for a tier badge's colour.
  final String? tier;
  final String? tip;
}

/// Every badge a listing wears, in order: the tier (never for Official), the
/// type, then Verified — or Official alone. Ascended Masters wear their
/// lifespan instead of a tier badge; the cards draw that.
List<ListingBadge> listingBadges({
  required String name,
  required String? tier,
  required String? entityType,
  bool verified = false,
  bool official = false,
}) {
  if (official) {
    return const [
      ListingBadge(BadgeKind.official, '✦ Official', tip: officialTip),
    ];
  }
  final named = tier == 'ascended_master' ? null : tierName(tier, entityType);
  final type = typeLabel(entityType);
  return [
    if (named != null)
      ListingBadge(BadgeKind.tier, named, tier: tier, tip: tierTips[named]),
    if (type != null) ListingBadge(BadgeKind.type, type),
    if (verified)
      ListingBadge(BadgeKind.verified, '✓ Verified', tip: verifiedTip(name)),
  ];
}

/// "Book with Eckhart →" for a practitioner; "Visit {name} →" for everyone
/// else, Spiritpedia included.
String actionLabel({
  required String name,
  required String? entityType,
  bool official = false,
}) {
  if (isPerson(entityType) && !official) {
    return 'Book with ${name.split(' ').first} →';
  }
  return 'Visit $name →';
}

/// Where that button goes: a practitioner's booking link; for everyone else
/// their booking link or, failing that, their website.
String? actionUrl({
  required String? entityType,
  required String? bookingUrl,
  required String? websiteUrl,
  bool official = false,
}) => withScheme(
  isPerson(entityType) && !official ? bookingUrl : bookingUrl ?? websiteUrl,
);

/// "www.example.com" typed without https:// still opens in the browser.
String? withScheme(String? url) {
  final value = url?.trim() ?? '';
  if (value.isEmpty) return null;
  if (RegExp(
    r'^(https?:|mailto:|tel:)',
    caseSensitive: false,
  ).hasMatch(value)) {
    return value;
  }
  return 'https://${value.replaceFirst(RegExp(r'^/+'), '')}';
}

/// "Spiritpedia", whatever the capitals, spaces or punctuation: a name only
/// Spiritpedia's own account may review under (review_name_reserved, 0023).
bool reviewNameReserved(String? name) => (name ?? '')
    .toLowerCase()
    .replaceAll(RegExp('[^a-z]'), '')
    .contains('spiritpedia');

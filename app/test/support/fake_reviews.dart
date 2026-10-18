import 'package:spiritpedia/data/badges.dart';
import 'package:spiritpedia/features/reviews/reviews_service.dart';

/// An in-memory reviews backend that keeps the server's rules: approved
/// reviews only for others, one review per person per item (a second is an
/// edit, back to pending), reports once each, blocks hiding a reviewer.
class FakeReviewsService implements ReviewsService {
  final calls = <String>[];

  /// Approved reviews by item, newest first, and who wrote each.
  final approvedByItem = <ReviewTarget, List<Review>>{};
  final authorOf = <int, String>{};

  /// Each person's own review, whatever its status.
  final mineByUser = <(String, ReviewTarget), Review>{};
  final profileNames = <String, String>{};

  /// Accounts that are Spiritpedia's own (its listing is Official).
  final officialUsers = <String>{};
  final reported = <(int, ReportReason, String?)>[];
  final blocks = <String, List<BlockedReviewer>>{}; // blocker → blocked
  bool banned = false;
  bool failRead = false;
  String? signedInUser;
  int _nextId = 1000;

  void addApproved(ReviewTarget t, Review r, {String author = 'someone'}) {
    approvedByItem.putIfAbsent(t, () => []).add(r);
    authorOf[r.id] = author;
  }

  @override
  Future<List<Review>> approved(ReviewTarget target) async {
    calls.add('approved:${target.type}:${target.slug}');
    if (failRead) throw Exception('offline');
    final hidden = {
      for (final b in blocks[signedInUser] ?? const <BlockedReviewer>[]) b.id,
    };
    return [
      for (final r in approvedByItem[target] ?? const <Review>[])
        if (!hidden.contains(authorOf[r.id])) r,
    ];
  }

  @override
  Future<Review?> mine(String userId, ReviewTarget target) async =>
      mineByUser[(userId, target)];

  @override
  Future<String?> profileName(String userId) async => profileNames[userId];

  @override
  Future<bool> postingBanned() async => banned;

  @override
  Future<bool> postsAsOfficial(String userId) async =>
      officialUsers.contains(userId);

  @override
  Future<void> save(
    String userId,
    ReviewTarget target, {
    required int rating,
    String? body,
    String? authorName,
  }) async {
    calls.add('save:${target.type}:${target.slug}:$rating');
    if (banned) {
      throw const ReviewError('Reviews are not available for this account.');
    }
    final before = mineByUser[(userId, target)];
    // The trigger (migration 0023): Spiritpedia's own account is named
    // Spiritpedia and Official; anyone else using that name gets none.
    final official = officialUsers.contains(userId);
    final name = authorName?.trim() ?? '';
    mineByUser[(userId, target)] = Review(
      id: before?.id ?? _nextId++,
      rating: rating,
      body: body?.trim().isEmpty ?? true ? null : body!.trim(),
      authorName: official
          ? 'Spiritpedia'
          : name.isEmpty || reviewNameReserved(name)
          ? null
          : name,
      authorOfficial: official,
      createdAt: DateTime(2026, 10, 13),
      // The trigger: new reviews are pending; an edit keeps its status.
      status: before?.status ?? 'pending',
    );
  }

  @override
  Future<void> notifyReceived(ReviewTarget target) async =>
      calls.add('notifyReceived:${target.type}:${target.slug}');

  @override
  Future<ReportOutcome> report(
    int reviewId,
    ReportReason reason,
    String? note,
  ) async {
    calls.add('report:$reviewId:${reason.code}');
    if (reported.any((r) => r.$1 == reviewId)) {
      return ReportOutcome.alreadyReported;
    }
    reported.add((reviewId, reason, note));
    return ReportOutcome.sent;
  }

  @override
  Future<void> block(int reviewId) async {
    calls.add('block:$reviewId');
    final author = authorOf[reviewId]!;
    final name = [
      for (final list in approvedByItem.values)
        for (final r in list)
          if (r.id == reviewId) r.displayName,
    ].first;
    blocks
        .putIfAbsent(signedInUser!, () => [])
        .add(BlockedReviewer(id: author, name: name));
  }

  @override
  Future<List<BlockedReviewer>> blocked(String userId) async => [
    ...?blocks[userId],
  ];

  @override
  Future<void> unblock(String userId, String blockedId) async {
    calls.add('unblock:$blockedId');
    blocks[userId]?.removeWhere((b) => b.id == blockedId);
  }
}

import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

/// What a review is about: the `reviews` table's content_type and the item's
/// slug — the website's vocabulary. Every row of the courses table (retreats,
/// memberships, downloads…) is 'course'.
typedef ReviewTarget = ({String type, String slug});

ReviewTarget bookReviews(String slug) => (type: 'book', slug: slug);
ReviewTarget videoReviews(String slug) => (type: 'video', slug: slug);
ReviewTarget offeringReviews(String slug) => (type: 'course', slug: slug);
ReviewTarget freeResourceReviews(String slug) =>
    (type: 'free_resource', slug: slug);

/// One review as the website's ReviewSection reads it.
class Review {
  const Review({
    required this.id,
    required this.rating,
    this.body,
    this.authorName,
    this.authorHealerSlug,
    this.authorOfficial = false,
    this.createdAt,
    this.status = 'approved',
  });

  factory Review.fromRow(Map<String, dynamic> r) => Review(
    id: (r['id'] as num).toInt(),
    rating: (r['rating'] as num).toInt(),
    body: r['body'] as String?,
    authorName: r['author_name'] as String?,
    authorHealerSlug: r['author_healer_slug'] as String?,
    authorOfficial: r['author_official'] == true,
    createdAt: DateTime.tryParse(r['created_at'] as String? ?? ''),
    status: r['status'] as String? ?? 'approved',
  );

  final int id;
  final int rating;
  final String? body;
  final String? authorName;
  final String? authorHealerSlug;

  /// Posted by Spiritpedia's own account (reviews.author_official, set by the
  /// database, migration 0023): shown as Spiritpedia OFFICIAL.
  final bool authorOfficial;
  final DateTime? createdAt;

  /// pending, approved or rejected. Only the author ever sees anything but
  /// approved: the read policy returns nothing else to anyone else.
  final String status;

  /// The website's fallback for a review posted without a name.
  String get displayName {
    if (authorOfficial) return 'Spiritpedia';
    final name = authorName?.trim() ?? '';
    return name.isEmpty ? 'A Spiritpedia member' : name;
  }
}

/// Someone the signed-in person blocked (user_blocks).
class BlockedReviewer {
  const BlockedReviewer({required this.id, required this.name});

  /// Their account id: what unblocking deletes by. Only ever the blocker's
  /// own rows — row-level security returns nothing else.
  final String id;
  final String name;
}

/// The reasons review_reports accepts, with the words the app shows.
enum ReportReason {
  spam('spam', 'Spam or advertising'),
  offensive('offensive', 'Offensive or hateful'),
  harassment('harassment', 'Harassment or bullying'),
  misleading('misleading', 'False or misleading'),
  other('other', 'Something else');

  const ReportReason(this.code, this.label);

  final String code;
  final String label;
}

enum ReportOutcome { sent, alreadyReported }

class ReviewError implements Exception {
  const ReviewError(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Everything reviews need from Supabase — an interface so tests can run
/// without a network.
///
/// Reads and writes are exactly the website's (web/components/ReviewSection
/// .jsx), under the same row-level security: approved reviews for everyone,
/// the person's own review whatever its status, writes to their own row only.
/// Reporting and blocking go through the definer functions of migration 0015,
/// which take a review and never a user id.
abstract class ReviewsService {
  /// Approved reviews, newest first (at most 50). Never a blocked reviewer's.
  Future<List<Review>> approved(ReviewTarget target);

  /// The person's own review of this item, whatever its status.
  Future<Review?> mine(String userId, ReviewTarget target);

  /// The name the form starts with (user_profiles.full_name).
  Future<String?> profileName(String userId);

  /// True if the admin has stopped this account posting reviews.
  Future<bool> postingBanned();

  /// True for Spiritpedia's own account: its reviews post as Spiritpedia
  /// OFFICIAL (the database decides; this only shapes the form).
  Future<bool> postsAsOfficial(String userId);

  /// Write or edit the person's review. The database makes it pending.
  Future<void> save(
    String userId,
    ReviewTarget target, {
    required int rating,
    String? body,
    String? authorName,
  });

  /// "We have your review" — the website's email to the reviewer.
  Future<void> notifyReceived(ReviewTarget target);

  Future<ReportOutcome> report(int reviewId, ReportReason reason, String? note);

  Future<void> block(int reviewId);

  Future<List<BlockedReviewer>> blocked(String userId);

  Future<void> unblock(String userId, String blockedId);
}

class SupabaseReviewsService implements ReviewsService {
  SupabaseReviewsService(
    this._db, {
    required this.apiBaseUrl,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  final SupabaseClient _db;
  final String apiBaseUrl;
  final http.Client _http;

  static const _pageLimit = 50;
  static const _columns =
      'id, rating, body, author_name, author_healer_slug, author_official, '
      'created_at';

  @override
  Future<List<Review>> approved(ReviewTarget target) async {
    final rows = await _db
        .from('reviews')
        .select(_columns)
        .eq('content_type', target.type)
        .eq('content_slug', target.slug)
        .eq('status', 'approved')
        .order('created_at', ascending: false)
        .limit(_pageLimit);
    return [for (final r in rows) Review.fromRow(r)];
  }

  @override
  Future<Review?> mine(String userId, ReviewTarget target) async {
    final row = await _db
        .from('reviews')
        .select('$_columns, status')
        .eq('user_id', userId)
        .eq('content_type', target.type)
        .eq('content_slug', target.slug)
        .maybeSingle();
    return row == null ? null : Review.fromRow(row);
  }

  @override
  Future<String?> profileName(String userId) async {
    final row = await _db
        .from('user_profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();
    return row?['full_name'] as String?;
  }

  @override
  Future<bool> postsAsOfficial(String userId) async {
    final profile = await _db
        .from('user_profiles')
        .select('linked_healer_slug')
        .eq('id', userId)
        .maybeSingle();
    final slug = profile?['linked_healer_slug'] as String?;
    if (slug == null) return false;
    final listing = await _db
        .from('healers')
        .select('official')
        .eq('healer_slug', slug)
        .maybeSingle();
    return listing?['official'] == true;
  }

  @override
  Future<bool> postingBanned() async =>
      (await _db.rpc('review_posting_banned')) == true;

  @override
  Future<void> save(
    String userId,
    ReviewTarget target, {
    required int rating,
    String? body,
    String? authorName,
  }) async {
    // status and author_healer_slug are left out on purpose, as on the
    // website: the trigger owns them, so an edit can never approve itself.
    try {
      await _db.from('reviews').upsert({
        'user_id': userId,
        'content_type': target.type,
        'content_slug': target.slug,
        'rating': rating,
        'body': _orNull(body),
        'author_name': _orNull(authorName),
      }, onConflict: 'user_id,content_type,content_slug');
    } on PostgrestException catch (e) {
      throw ReviewError(
        e.code == '42501'
            ? 'Reviews are not available for this account.'
            : 'Your review could not be saved just now. Please try again.',
      );
    }
  }

  @override
  Future<void> notifyReceived(ReviewTarget target) => _post(
    '/api/email/review-received',
    {'contentType': target.type, 'contentSlug': target.slug},
  );

  @override
  Future<ReportOutcome> report(
    int reviewId,
    ReportReason reason,
    String? note,
  ) async {
    final Object? id;
    try {
      id = await _db.rpc(
        'report_review',
        params: {
          'p_review_id': reviewId,
          'p_reason': reason.code,
          'p_note': _orNull(note),
        },
      );
    } on PostgrestException catch (e) {
      throw ReviewError(
        e.code == 'P0002'
            ? 'This review is no longer on Spiritpedia.'
            : 'Your report could not be sent just now. Please try again.',
      );
    }
    if (id == null) return ReportOutcome.alreadyReported;
    // Tells the admin at once (Apple asks that reports are acted on within a
    // day). The report is already saved and in the Inbox, so a failed email
    // is not the reporter's problem.
    unawaited(
      _post('/api/email/review-reported', {'reportId': id}).catchError((_) {}),
    );
    return ReportOutcome.sent;
  }

  @override
  Future<void> block(int reviewId) async {
    try {
      await _db.rpc('block_review_author', params: {'p_review_id': reviewId});
    } on PostgrestException catch (e) {
      throw ReviewError(
        e.code == 'P0002'
            ? 'This review is no longer on Spiritpedia.'
            : 'That could not be done just now. Please try again.',
      );
    }
  }

  @override
  Future<List<BlockedReviewer>> blocked(String userId) async {
    final rows = await _db
        .from('user_blocks')
        .select('blocked_id, blocked_name')
        .eq('blocker_id', userId)
        .order('created_at', ascending: false);
    return [
      for (final r in rows)
        BlockedReviewer(
          id: r['blocked_id'] as String,
          name: (r['blocked_name'] as String?)?.trim().isNotEmpty == true
              ? r['blocked_name'] as String
              : 'A Spiritpedia member',
        ),
    ];
  }

  @override
  Future<void> unblock(String userId, String blockedId) async {
    await _db
        .from('user_blocks')
        .delete()
        .eq('blocker_id', userId)
        .eq('blocked_id', blockedId);
  }

  static String? _orNull(String? s) {
    final t = s?.trim() ?? '';
    return t.isEmpty ? null : t;
  }

  Future<void> _post(String path, Map<String, Object?> body) async {
    final token = _db.auth.currentSession?.accessToken;
    if (token == null) return;
    await _http.post(
      Uri.parse('$apiBaseUrl$path'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(body),
    );
  }
}

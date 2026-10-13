import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config.dart';
import '../../core/supabase_providers.dart';
import '../account/account_providers.dart';
import 'reviews_service.dart';

final reviewsServiceProvider = Provider<ReviewsService>(
  (ref) => SupabaseReviewsService(
    ref.watch(supabaseProvider),
    apiBaseUrl: AppConfig.apiBaseUrl,
  ),
);

/// One item's reviews, and what the reader may do with them.
class ReviewsData {
  const ReviewsData({
    this.approved = const [],
    this.mine,
    this.signedIn = false,
    this.profileName,
    this.banned = false,
  });

  final List<Review> approved;

  /// The reader's own review, whatever its status.
  final Review? mine;
  final bool signedIn;
  final String? profileName;
  final bool banned;

  int get count => approved.length;

  double get average => approved.isEmpty
      ? 0
      : approved.fold<int>(0, (sum, r) => sum + r.rating) / approved.length;

  /// An approved review of the reader's own is already in the list; showing it
  /// twice, once with a badge, would read as two reviews (as on the website).
  Review? get ownUnapproved =>
      mine != null && mine!.status != 'approved' ? mine : null;
}

/// A failure is an empty list, never an error on screen: reviews are an
/// addition to a page that works without them (the website's rule).
final reviewsProvider = FutureProvider.autoDispose
    .family<ReviewsData, ReviewTarget>((ref, target) async {
      final userId = ref.watch(signedInUserIdProvider);
      final ReviewsService service;
      try {
        service = ref.watch(reviewsServiceProvider);
      } catch (_) {
        return const ReviewsData();
      }
      final approved = await service
          .approved(target)
          .catchError((_) => <Review>[]);
      if (userId == null) return ReviewsData(approved: approved);
      final (mine, name, banned) = await (
        service.mine(userId, target).catchError((_) => null),
        service.profileName(userId).catchError((_) => null),
        service.postingBanned().catchError((_) => false),
      ).wait;
      return ReviewsData(
        approved: approved,
        mine: mine,
        signedIn: true,
        profileName: name,
        banned: banned,
      );
    });

/// The people the signed-in reader has blocked, for My Account. Unreadable
/// is the same as none: the list only appears when there is something in it.
final blockedReviewersProvider =
    FutureProvider.autoDispose<List<BlockedReviewer>>((ref) async {
      final userId = ref.watch(signedInUserIdProvider);
      if (userId == null) return const [];
      try {
        return await ref.read(reviewsServiceProvider).blocked(userId);
      } catch (_) {
        return const [];
      }
    });

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/badges.dart';
import '../../shared/widgets/tier_badge.dart';
import '../../core/config.dart';
import '../../core/format/dates.dart';
import '../../core/links/open_link.dart';
import '../../theme/colors.dart';
import '../account/account_providers.dart';
import 'reviews_providers.dart';
import 'reviews_service.dart';
import '../learning/learning.dart';

// Community reviews, as on the website's content pages: a summary line under
// the title and the block at the foot. Approved reviews only; writing needs an
// account and goes to the admin's approval queue. Every review someone else
// wrote has a "⋯" menu to report it or block its author (App Store 1.2).

const _amber = Color(0xFFFBBF24); // text-amber-400
const _unlit = Color(0xFF4B5563); // text-gray-600

/// Five stars, lit up to [value], rounded as the website does.
class Stars extends StatelessWidget {
  const Stars({super.key, required this.value, this.size = 18});

  final double value;
  final double size;

  @override
  Widget build(BuildContext context) {
    final lit = value.round();
    return ExcludeSemantics(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < 5; i++)
            Icon(
              Icons.star_rounded,
              size: size,
              color: i < lit ? _amber : _unlit,
            ),
        ],
      ),
    );
  }
}

String _ratings(int n) => '$n rating${n == 1 ? '' : 's'}';
String _reviews(int n) => '$n review${n == 1 ? '' : 's'}';

/// The line under the title: "★★★★☆ 4.5 · 3 reviews" or "Be the first to
/// review". Fills in when loaded; never a spinner.
class ReviewSummary extends ConsumerWidget {
  const ReviewSummary(this.target, {super.key});

  final ReviewTarget target;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data =
        ref.watch(reviewsProvider(target)).value ?? const ReviewsData();
    return Semantics(
      label: data.count == 0
          ? 'No reviews yet'
          : 'Rated ${data.average.toStringAsFixed(1)} out of 5 from ${_reviews(data.count)}',
      child: ExcludeSemantics(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stars(value: data.average),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                data.count == 0
                    ? 'Be the first to review'
                    : '${data.average.toStringAsFixed(1)} · ${_reviews(data.count)}',
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13.5,
                  color: SpColors.textMuted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The block at the foot of the page.
class ReviewSection extends ConsumerWidget {
  const ReviewSection(this.target, {super.key});

  final ReviewTarget target;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(reviewsProvider(target)).value;
    final list = data?.approved ?? const <Review>[];
    final own = data?.ownUnapproved;
    return Column(
      key: const ValueKey('reviews'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 28),
        const Divider(height: 1),
        const SizedBox(height: 24),
        const Text(
          'Community Reviews',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Stars(value: data?.average ?? 0, size: 22),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                list.isEmpty
                    ? '0 ratings'
                    : '${data!.average.toStringAsFixed(1)} from ${_ratings(list.length)}',
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13.5,
                  color: SpColors.textFaint,
                ),
              ),
            ),
          ],
        ),
        if (own != null)
          Container(
            margin: const EdgeInsets.only(top: 16),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: SpColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: SpColors.border),
            ),
            child: ReviewCard(review: own, own: true, target: target),
          ),
        for (final (i, review) in list.indexed) ...[
          if (i > 0) const Divider(height: 1),
          ReviewCard(
            review: review,
            own: data?.mine?.id == review.id,
            target: target,
          ),
        ],
        if (list.isEmpty && own == null)
          Container(
            margin: const EdgeInsets.only(top: 16),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: SpColors.surface,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Column(
              children: [
                Icon(Icons.star_rounded, size: 40, color: _unlit),
                SizedBox(height: 10),
                Text(
                  'Be the first to review',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                SizedBox(height: 6),
                Text(
                  'Reviews from the Spiritpedia community will appear here.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13.5, color: SpColors.textFaint),
                ),
              ],
            ),
          ),
        const SizedBox(height: 16),
        if (data != null) _WriteOrSignIn(target: target, data: data),
      ],
    );
  }
}

/// One review. [own]: the reader wrote it — a status badge instead of the
/// "⋯" menu (nobody reports or blocks themselves).
class ReviewCard extends ConsumerWidget {
  const ReviewCard({
    super.key,
    required this.review,
    required this.target,
    this.own = false,
  });

  final Review review;
  final ReviewTarget target;
  final bool own;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final slug = review.authorHealerSlug;
    final name = Text(
      review.displayName,
      style: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: slug != null ? SpColors.link : SpColors.textMuted,
      ),
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Semantics(
                label: '${review.rating} out of 5 stars',
                child: Stars(value: review.rating.toDouble(), size: 16),
              ),
              if (own && review.status != 'approved') ...[
                const SizedBox(width: 10),
                _StatusBadge(review.status),
              ],
              const Spacer(),
              if (!own)
                SizedBox(
                  height: 32,
                  width: 40,
                  child: IconButton(
                    key: ValueKey('review-menu-${review.id}'),
                    tooltip: 'Report or block',
                    padding: EdgeInsets.zero,
                    iconSize: 20,
                    color: SpColors.textFaint,
                    onPressed: () => _showReviewMenu(context, ref, review),
                    icon: const Icon(Icons.more_horiz),
                  ),
                ),
            ],
          ),
          if (review.body?.trim().isNotEmpty == true) ...[
            const SizedBox(height: 10),
            Text(
              review.body!.trim(),
              style: const TextStyle(
                fontSize: 14,
                height: 1.55,
                color: Color(0xFFD1D5DB),
              ),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Flexible(
                child: slug != null
                    ? GestureDetector(
                        onTap: () => context.push('/healers/$slug'),
                        child: name,
                      )
                    : name,
              ),
              // Spiritpedia's own reviews wear ✦ OFFICIAL, so they are never
              // taken for an ordinary reader's.
              if (review.authorOfficial) ...[
                const SizedBox(width: 8),
                const ListingBadgeRow(
                  name: 'Spiritpedia',
                  tier: null,
                  official: true,
                ),
              ],
              if (review.createdAt != null)
                Text(
                  ' · ${shortDate(review.createdAt!.toLocal())}',
                  style: const TextStyle(
                    fontSize: 13,
                    color: SpColors.textFaint,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge(this.status);

  final String status;

  @override
  Widget build(BuildContext context) {
    final rejected = status == 'rejected';
    final color = rejected ? const Color(0xFFFCA5A5) : const Color(0xFFFCD34D);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        rejected ? 'NOT APPROVED' : 'AWAITING APPROVAL',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.8,
          color: color,
        ),
      ),
    );
  }
}

// ── Writing ──────────────────────────────────────────────────────────────────

class _WriteOrSignIn extends StatelessWidget {
  const _WriteOrSignIn({required this.target, required this.data});

  final ReviewTarget target;
  final ReviewsData data;

  @override
  Widget build(BuildContext context) {
    if (!data.signedIn) {
      return _Panel(
        text: 'Sign in to leave a review.',
        action: 'Sign in',
        onAction: () => context.push('/account'),
      );
    }
    if (data.banned) {
      return const _Panel(text: 'Reviews are not available for this account.');
    }
    final editing = data.mine != null;
    return Align(
      alignment: Alignment.centerLeft,
      child: FilledButton.icon(
        key: const ValueKey('write-review'),
        onPressed: () => showModalBottomSheet<void>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          backgroundColor: SpColors.background,
          builder: (_) => ReviewForm(
            target: target,
            existing: data.mine,
            profileName: data.profileName,
            official: data.official,
          ),
        ),
        icon: Icon(editing ? Icons.edit_outlined : Icons.rate_review_outlined),
        label: Text(editing ? 'Edit your review' : 'Write a review'),
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({required this.text, this.action, this.onAction});

  final String text;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(18, 14, 10, 14),
    decoration: BoxDecoration(
      color: SpColors.surface,
      borderRadius: BorderRadius.circular(16),
    ),
    child: Row(
      children: [
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 14, color: SpColors.textMuted),
          ),
        ),
        if (action != null)
          TextButton(
            onPressed: onAction,
            style: TextButton.styleFrom(foregroundColor: SpColors.link),
            child: Text(action!),
          ),
      ],
    ),
  );
}

/// The website's ReviewForm, as a sheet: stars, name, words, and the terms.
class ReviewForm extends ConsumerStatefulWidget {
  const ReviewForm({
    super.key,
    required this.target,
    this.existing,
    this.profileName,
    this.official = false,
  });

  final ReviewTarget target;
  final Review? existing;
  final String? profileName;

  /// Spiritpedia's own account: no name to type, it posts as Spiritpedia
  /// ✦ OFFICIAL.
  final bool official;

  @override
  ConsumerState<ReviewForm> createState() => _ReviewFormState();
}

class _ReviewFormState extends ConsumerState<ReviewForm> {
  static const maxLength = 4000;

  late int _rating = widget.existing?.rating ?? 0;
  late final _name = TextEditingController(
    text: widget.existing?.authorName ?? widget.profileName ?? '',
  );
  late final _body = TextEditingController(text: widget.existing?.body ?? '');
  bool _saving = false;
  String? _error;

  bool get _editing => widget.existing != null;

  @override
  void dispose() {
    _name.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final userId = ref.read(signedInUserIdProvider);
    if (_rating == 0 || _saving) return;
    if (userId == null) {
      setState(() => _error = 'Your session has ended. Please sign in again.');
      return;
    }
    // "Spiritpedia" is reserved for our own reviews. The database would save
    // the review with no name; saying so here is kinder.
    if (!widget.official && reviewNameReserved(_name.text)) {
      setState(
        () => _error =
            '“Spiritpedia” is reserved for our own reviews. Please use your '
            'own name.',
      );
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final service = ref.read(reviewsServiceProvider);
    try {
      await service.save(
        userId,
        widget.target,
        rating: _rating,
        body: _body.text,
        authorName: _name.text,
      );
    } on ReviewError catch (e) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = e.message;
        });
      }
      return;
    } catch (_) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = 'Your review could not be saved just now. Please try again.';
        });
      }
      return;
    }
    unawaited(service.notifyReceived(widget.target).catchError((_) {}));
    // A new review (activity learning, migration 0021); an edit is not a
    // second one.
    if (!_editing) {
      ref
          .read(activityLogProvider)
          .content('review', widget.target.type, widget.target.slug);
    }
    ref.invalidate(reviewsProvider(widget.target));
    if (!mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    Navigator.of(context).pop();
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            'Your review has been ${_editing ? 'updated' : 'submitted'} and is awaiting approval.',
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    _editing ? 'Edit your review' : 'Write a review',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Close',
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _StarPicker(
              value: _rating,
              onChanged: (n) => setState(() => _rating = n),
            ),
            const SizedBox(height: 18),
            if (widget.official)
              const Wrap(
                key: ValueKey('review-as-official'),
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    'Posting as ',
                    style: TextStyle(fontSize: 13, color: SpColors.textMuted),
                  ),
                  Text(
                    'Spiritpedia',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                  SizedBox(width: 8),
                  ListingBadgeRow(
                    name: 'Spiritpedia',
                    tier: null,
                    official: true,
                  ),
                ],
              )
            else ...[
              const _Label('YOUR NAME'),
              TextField(
                key: const ValueKey('review-name'),
                controller: _name,
                maxLength: 80,
                textCapitalization: TextCapitalization.words,
                decoration: _decoration('How your name appears on the review')
                    .copyWith(counterText: ''),
              ),
            ],
            const SizedBox(height: 12),
            const _Label('YOUR REVIEW (OPTIONAL)'),
            TextField(
              key: const ValueKey('review-body'),
              controller: _body,
              maxLength: maxLength,
              minLines: 4,
              maxLines: 8,
              textCapitalization: TextCapitalization.sentences,
              decoration: _decoration('What did you take from this?'),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  _error!,
                  style: const TextStyle(
                    color: Color(0xFFFCA5A5),
                    fontSize: 14,
                  ),
                ),
              ),
            const SizedBox(height: 12),
            SizedBox(
              height: 50,
              child: FilledButton(
                key: const ValueKey('submit-review'),
                onPressed: _rating == 0 || _saving ? null : _submit,
                child: Text(
                  _saving
                      ? 'Submitting…'
                      : _editing
                      ? 'Save changes'
                      : 'Submit review',
                ),
              ),
            ),
            if (_rating == 0)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  'Choose a rating first.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12.5, color: SpColors.textFaint),
                ),
              ),
            const SizedBox(height: 14),
            Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                const Text(
                  'By posting, you agree to our ',
                  style: TextStyle(fontSize: 12.5, color: SpColors.textFaint),
                ),
                GestureDetector(
                  onTap: () =>
                      openExternal(context, '${AppConfig.siteUrl}/terms'),
                  child: const Text(
                    'Terms of Use',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: SpColors.link,
                      decoration: TextDecoration.underline,
                      decorationColor: SpColors.link,
                    ),
                  ),
                ),
                const Text(
                  '. Reviews are read by a moderator before they appear; yours is visible to you in the meantime.',
                  style: TextStyle(
                    fontSize: 12.5,
                    height: 1.5,
                    color: SpColors.textFaint,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StarPicker extends StatelessWidget {
  const _StarPicker({required this.value, required this.onChanged});

  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      for (var n = 1; n <= 5; n++)
        IconButton(
          key: ValueKey('rate-$n'),
          tooltip: '$n star${n == 1 ? '' : 's'}',
          isSelected: value == n,
          onPressed: () => onChanged(n),
          icon: Icon(
            Icons.star_rounded,
            size: 34,
            color: n <= value ? _amber : const Color(0xFF374151),
          ),
        ),
    ],
  );
}

class _Label extends StatelessWidget {
  const _Label(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(
      text,
      style: const TextStyle(
        fontSize: 11.5,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
        color: SpColors.textFaint,
      ),
    ),
  );
}

InputDecoration _decoration(String hint) => InputDecoration(
  hintText: hint,
  hintStyle: const TextStyle(color: SpColors.textFaint),
  filled: true,
  fillColor: SpColors.surface,
  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
  border: OutlineInputBorder(
    borderRadius: BorderRadius.circular(14),
    borderSide: const BorderSide(color: SpColors.border),
  ),
  enabledBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(14),
    borderSide: const BorderSide(color: SpColors.border),
  ),
  focusedBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(14),
    borderSide: const BorderSide(color: SpColors.primary, width: 1.5),
  ),
);

// ── Report and block ─────────────────────────────────────────────────────────

Future<void> _showReviewMenu(
  BuildContext context,
  WidgetRef ref,
  Review review,
) async {
  final signedIn = ref.read(signedInUserIdProvider) != null;
  final choice = await showModalBottomSheet<String>(
    context: context,
    useSafeArea: true,
    backgroundColor: SpColors.surface,
    builder: (sheet) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!signedIn)
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 18, 20, 4),
              child: Text(
                'Sign in to report a review or block a reviewer.',
                style: TextStyle(fontSize: 14, color: SpColors.textMuted),
              ),
            ),
          ListTile(
            leading: const Icon(Icons.flag_outlined),
            title: const Text('Report review'),
            onTap: () =>
                Navigator.of(sheet).pop(signedIn ? 'report' : 'sign-in'),
          ),
          ListTile(
            leading: const Icon(Icons.block),
            title: Text('Block ${review.displayName}'),
            subtitle: const Text("You won't see their reviews"),
            onTap: () =>
                Navigator.of(sheet).pop(signedIn ? 'block' : 'sign-in'),
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
  if (!context.mounted) return;
  switch (choice) {
    case 'sign-in':
      unawaited(context.push('/account'));
    case 'report':
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: SpColors.background,
        builder: (_) => ReportForm(review: review),
      );
    case 'block':
      await _confirmBlock(context, ref, review);
  }
}

Future<void> _confirmBlock(
  BuildContext context,
  WidgetRef ref,
  Review review,
) async {
  final name = review.displayName;
  final yes = await showDialog<bool>(
    context: context,
    builder: (dialog) => AlertDialog(
      backgroundColor: SpColors.surface,
      title: Text('Block $name?'),
      content: const Text(
        "You won't see their reviews on Spiritpedia any more — here, or on the website when you're signed in. You can unblock them in My Account.",
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialog).pop(false),
          child: const Text('Cancel'),
        ),
        TextButton(
          key: const ValueKey('confirm-block'),
          onPressed: () => Navigator.of(dialog).pop(true),
          style: TextButton.styleFrom(foregroundColor: const Color(0xFFFCA5A5)),
          child: const Text('Block'),
        ),
      ],
    ),
  );
  if (yes != true || !context.mounted) return;
  final messenger = ScaffoldMessenger.of(context);
  try {
    await ref.read(reviewsServiceProvider).block(review.id);
  } on ReviewError catch (e) {
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(e.message)));
    return;
  } catch (_) {
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text('That could not be done just now. Please try again.'),
        ),
      );
    return;
  }
  // Every page's reviews: they may appear on other items too.
  ref.invalidate(reviewsProvider);
  ref.invalidate(blockedReviewersProvider);
  messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text('$name is blocked.')));
}

/// Why this review should go: a reason, and a note if they like.
class ReportForm extends ConsumerStatefulWidget {
  const ReportForm({super.key, required this.review});

  final Review review;

  @override
  ConsumerState<ReportForm> createState() => _ReportFormState();
}

class _ReportFormState extends ConsumerState<ReportForm> {
  ReportReason? _reason;
  final _note = TextEditingController();
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final reason = _reason;
    if (reason == null || _sending) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    final ReportOutcome outcome;
    try {
      outcome = await ref
          .read(reviewsServiceProvider)
          .report(widget.review.id, reason, _note.text);
    } on ReviewError catch (e) {
      if (mounted) {
        setState(() {
          _sending = false;
          _error = e.message;
        });
      }
      return;
    } catch (_) {
      if (mounted) {
        setState(() {
          _sending = false;
          _error = 'Your report could not be sent just now. Please try again.';
        });
      }
      return;
    }
    if (!mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    Navigator.of(context).pop();
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            outcome == ReportOutcome.sent
                ? "Thank you. We'll look at this review within 24 hours."
                : "You've already reported this review. We're looking at it.",
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Report review',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                  ),
                ),
                IconButton(
                  tooltip: 'Close',
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const Text(
              "What's wrong with it? Reports are private: the reviewer isn't told who sent one.",
              style: TextStyle(
                fontSize: 14,
                height: 1.5,
                color: SpColors.textMuted,
              ),
            ),
            const SizedBox(height: 8),
            RadioGroup<ReportReason>(
              groupValue: _reason,
              onChanged: (r) => setState(() => _reason = r),
              child: Column(
                children: [
                  for (final r in ReportReason.values)
                    RadioListTile<ReportReason>(
                      key: ValueKey('reason-${r.code}'),
                      value: r,
                      contentPadding: EdgeInsets.zero,
                      title: Text(r.label),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            TextField(
              key: const ValueKey('report-note'),
              controller: _note,
              maxLength: 500,
              minLines: 2,
              maxLines: 4,
              textCapitalization: TextCapitalization.sentences,
              decoration: _decoration('Anything we should know? (optional)'),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  _error!,
                  style: const TextStyle(
                    color: Color(0xFFFCA5A5),
                    fontSize: 14,
                  ),
                ),
              ),
            const SizedBox(height: 12),
            SizedBox(
              height: 50,
              child: FilledButton(
                key: const ValueKey('send-report'),
                onPressed: _reason == null || _sending ? null : _send,
                child: Text(_sending ? 'Sending…' : 'Send report'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

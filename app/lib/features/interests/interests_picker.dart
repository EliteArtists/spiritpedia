import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../data/shelf_rules.dart';
import '../../theme/colors.dart';
import '../star/slipstream.dart';
import '../star/star_layer.dart';
import '../area/area.dart';
import '../area/area_sheet.dart';
import 'interests.dart';
import 'tailor_star.dart';
import '../learning/learning_switch.dart';

/// Under the question, in onboarding and in Account → Tailor Spiritpedia.
const interestsNote =
    'Optional. We use your choices only to tailor what you see; never shared. '
    'Change or clear them anytime in Account.';

/// Each pillar's soft accent — the app's colours. No icons or symbols: the
/// pills read exactly as the Discover pills do.
const _pillarAccent = <String, Color>{
  'Emotional Healing': Color(0xFFF9A8D4),
  'Consciousness': SpColors.link,
  'Manifestation & Creation': SpColors.gold,
  'Mystical & Spiritual Exploration': Color(0xFF93C5FD),
  'Body & Energy': Color(0xFF6EE7B7),
};

/// What the picker chooses (docs/personalisation.md).
enum PickerMode {
  /// "More of": violet, as the Discover pills.
  moreOf('interest', SpColors.primary, 'Hidden'),

  /// "Never show": a muted rose.
  neverShow('never', Color(0xFF8E2A4F), 'In More of');

  const PickerMode(this.keyPrefix, this.fill, this.otherLabel);

  /// Keeps the two pickers' chips apart on one screen.
  final String keyPrefix;
  final Color fill;

  /// Beside a subject that is in the other list, and so cannot be chosen.
  final String otherLabel;
}

/// The five pillars as the Discover pills; tapping one opens its subjects
/// underneath as chips, "All of [pillar]" first. Several can be open at
/// once, and any combination chosen. A subject in [other] — the other
/// list — is shown but cannot be chosen: nothing is "More of" and "Never
/// show" at once.
class InterestsPicker extends ConsumerStatefulWidget {
  const InterestsPicker({
    super.key,
    required this.selected,
    required this.onChanged,
    this.mode = PickerMode.moreOf,
    this.other = const {},
  });

  final Set<String> selected;
  final ValueChanged<Set<String>> onChanged;
  final PickerMode mode;
  final Set<String> other;

  @override
  ConsumerState<InterestsPicker> createState() => _InterestsPickerState();
}

class _InterestsPickerState extends ConsumerState<InterestsPicker> {
  // Pillars with something chosen start open, so a return visit shows it.
  late final Set<String> _open = {
    for (final p in subjectPillars.keys)
      if (subjectPillars[p]!.any(widget.selected.contains)) p,
  };

  void _toggle(Iterable<String> slugs, bool on) {
    final next = {...widget.selected};
    on ? next.addAll(slugs) : next.removeAll(slugs);
    widget.onChanged(next);
  }

  @override
  Widget build(BuildContext context) {
    final subjects = ref.watch(subjectsProvider).value ?? const <Subject>[];
    final still = reduceMotion(context);
    final mode = widget.mode;
    final prefix = mode.keyPrefix;
    String name(String slug) {
      for (final s in subjects) {
        if (s.slug == slug) return s.name;
      }
      return slug
          .split('-')
          .map((w) => w.isEmpty ? w : w[0].toUpperCase() + w.substring(1))
          .join(' ');
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final pillar in subjectPillars.keys) ...[
          _PillarPill(
            key: ValueKey('$prefix-pillar-$pillar'),
            label: pillar,
            accent: _pillarAccent[pillar]!,
            fill: mode.fill,
            open: _open.contains(pillar),
            chosen: subjectPillars[pillar]!
                .where(widget.selected.contains)
                .length,
            onTap: () => setState(
              () => _open.contains(pillar)
                  ? _open.remove(pillar)
                  : _open.add(pillar),
            ),
          ),
          AnimatedSize(
            duration: still ? Duration.zero : const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            alignment: Alignment.topLeft,
            child: !_open.contains(pillar)
                ? const SizedBox(width: double.infinity, height: 12)
                : Padding(
                    padding: const EdgeInsets.fromLTRB(4, 12, 0, 20),
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 10,
                      children: [
                        // "All of" takes every subject it can — not those
                        // in the other list.
                        if ([
                              for (final s in subjectPillars[pillar]!)
                                if (!widget.other.contains(s)) s,
                            ]
                            case final open when open.isNotEmpty)
                          _chip(
                            key: ValueKey('$prefix-all-$pillar'),
                            label: 'All of $pillar',
                            selected: open.every(widget.selected.contains),
                            accent: _pillarAccent[pillar]!,
                            onSelected: (on) => _toggle(open, on),
                          ),
                        for (final slug in subjectPillars[pillar]!)
                          _chip(
                            key: ValueKey('$prefix-$slug'),
                            label: name(slug),
                            selected: widget.selected.contains(slug),
                            accent: _pillarAccent[pillar]!,
                            taken: widget.other.contains(slug),
                            onSelected: (on) => _toggle([slug], on),
                          ),
                      ],
                    ),
                  ),
          ),
        ],
      ],
    );
  }

  Widget _chip({
    required Key key,
    required String label,
    required bool selected,
    required Color accent,
    required ValueChanged<bool> onSelected,
    bool taken = false,
  }) {
    if (taken) {
      // In the other list: shown, so nothing seems missing, but not here.
      return Semantics(
        label: '$label, ${widget.mode.otherLabel}',
        excludeSemantics: true,
        child: Chip(
          key: key,
          label: Text.rich(
            TextSpan(
              children: [
                TextSpan(text: label),
                TextSpan(
                  text: '  ${widget.mode.otherLabel}',
                  style: const TextStyle(
                    fontSize: 11.5,
                    color: SpColors.textFaint,
                  ),
                ),
              ],
            ),
          ),
          backgroundColor: SpColors.background,
          side: const BorderSide(color: SpColors.border),
          labelStyle: const TextStyle(
            fontFamily: 'Geist',
            fontWeight: FontWeight.w500,
            color: SpColors.textFaint,
          ),
        ),
      );
    }
    return FilterChip(
      key: key,
      label: Text(label),
      selected: selected,
      showCheckmark: false,
      selectedColor: widget.mode.fill,
      backgroundColor: SpColors.surface,
      side: BorderSide(
        color: selected ? Colors.transparent : accent.withValues(alpha: 0.35),
      ),
      labelStyle: const TextStyle(
        fontFamily: 'Geist',
        fontWeight: FontWeight.w500,
        color: SpColors.text,
      ),
      onSelected: onSelected,
    );
  }
}

/// A pillar, drawn exactly as the Discover pills are: a stadium outline,
/// filled once something in it is chosen (violet for More of, rose for Never
/// show), tinted with its accent while open. Just its name.
class _PillarPill extends StatelessWidget {
  const _PillarPill({
    super.key,
    required this.label,
    required this.accent,
    required this.fill,
    required this.open,
    required this.chosen,
    required this.onTap,
  });

  final String label;
  final Color accent;
  final Color fill;
  final bool open;
  final int chosen;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final active = chosen > 0;
    return Semantics(
      button: true,
      expanded: open,
      label: chosen > 0 ? '$label, $chosen chosen' : label,
      excludeSemantics: true,
      child: Material(
        color: active ? fill : Colors.transparent,
        shape: StadiumBorder(
          side: BorderSide(
            color: active
                ? Colors.transparent
                : open
                ? accent.withValues(alpha: 0.7)
                : const Color(0x4DFFFFFF),
          ),
        ),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: onTap,
          child: SizedBox(
            height: 42,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              child: Align(
                widthFactor: 1,
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// "What interests you most?" — once, straight after the first-launch intro.
/// Choosing saves at once (phone, and the account if signed in); skipping,
/// or exploring with nothing chosen, saves no More of and changes nothing.
/// "Anything you'd rather not see?" opens the same picker for Never show.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key, required this.onDone});

  final VoidCallback onDone;

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  late Set<String> _selected = {...ref.read(interestsProvider).subjects};

  /// "Anything you'd rather not see?" is open. A panel of its own, not a
  /// sheet: onboarding plays above the app's navigator.
  bool _never = false;

  void _explore() {
    if (_selected.isNotEmpty) {
      ref.read(interestsProvider.notifier).choose(_selected);
    }
    widget.onDone();
  }

  Future<void> _neverDone(Set<String>? hidden) async {
    setState(() => _never = false);
    if (hidden == null) return;
    await ref.read(interestsProvider.notifier).hide(hidden);
  }

  @override
  Widget build(BuildContext context) {
    final hidden = {...ref.watch(interestsProvider).hidden};
    return Material(
      key: const ValueKey('onboarding'),
      color: SpColors.background,
      child: SafeArea(
        child: _never
            ? _NeverShowPanel(
                hidden: hidden,
                moreOf: _selected,
                onDone: _neverDone,
              )
            : Column(
                children: [
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                      children: [
                        const Center(
                          child: SizedBox(
                            width: 64,
                            height: 64,
                            child: StarSprite(),
                          ),
                        ),
                        const SizedBox(height: 22),
                        const Text(
                          'Welcome to Spiritpedia.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 27,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'A universe of wisdom is waiting to be explored.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 16,
                            height: 1.45,
                            color: SpColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 30),
                        const Text(
                          'What interests you most?',
                          style: TextStyle(
                            fontSize: 21,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          interestsNote,
                          style: TextStyle(
                            fontSize: 13,
                            height: 1.45,
                            color: SpColors.textFaint,
                          ),
                        ),
                        const SizedBox(height: 20),
                        InterestsPicker(
                          selected: _selected,
                          other: hidden,
                          onChanged: (v) => setState(() => _selected = v),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 4),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: FilledButton(
                        key: const ValueKey('onboarding-explore'),
                        onPressed: _explore,
                        style: FilledButton.styleFrom(
                          backgroundColor: SpColors.primary,
                          shape: const StadiumBorder(),
                        ),
                        child: const Text(
                          'Explore Spiritpedia →',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                  TextButton(
                    key: const ValueKey('onboarding-skip'),
                    onPressed: widget.onDone,
                    style: TextButton.styleFrom(
                      foregroundColor: SpColors.textMuted,
                    ),
                    child: const Text('Skip for now'),
                  ),
                  TextButton(
                    key: const ValueKey('onboarding-never-show'),
                    onPressed: () => setState(() => _never = true),
                    style: TextButton.styleFrom(
                      foregroundColor: SpColors.textFaint,
                      textStyle: const TextStyle(fontSize: 13),
                      visualDensity: VisualDensity.compact,
                    ),
                    child: Text(
                      hidden.isEmpty
                          ? 'Anything you’d rather not see?'
                          : 'Hidden: ${hidden.length} · Change',
                    ),
                  ),
                  const SizedBox(height: 2),
                ],
              ),
      ),
    );
  }
}

/// Onboarding's "Anything you'd rather not see?": the picker in Never show
/// mode. [onDone] gets what is hidden on "Done", or null on "Back". [moreOf]
/// cannot be hidden.
class _NeverShowPanel extends StatefulWidget {
  const _NeverShowPanel({
    required this.hidden,
    required this.moreOf,
    required this.onDone,
  });

  final Set<String> hidden;
  final Set<String> moreOf;
  final ValueChanged<Set<String>?> onDone;

  @override
  State<_NeverShowPanel> createState() => _NeverShowPanelState();
}

class _NeverShowPanelState extends State<_NeverShowPanel> {
  late Set<String> _hidden = {...widget.hidden};

  @override
  Widget build(BuildContext context) {
    return Column(
      key: const ValueKey('never-show-sheet'),
      children: [
        Align(
          alignment: Alignment.centerLeft,
          // No tooltip: onboarding has no overlay to show one in.
          child: Semantics(
            label: 'Back',
            button: true,
            excludeSemantics: true,
            child: IconButton(
              key: const ValueKey('never-show-back'),
              onPressed: () => widget.onDone(null),
              icon: const Icon(Icons.arrow_back_rounded),
            ),
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 4, 24, 16),
            children: [
              const Text(
                'Anything you’d rather not see?',
                style: TextStyle(fontSize: 21, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              const Text(
                _neverNote,
                style: TextStyle(
                  fontSize: 13,
                  height: 1.45,
                  color: SpColors.textFaint,
                ),
              ),
              const SizedBox(height: 20),
              InterestsPicker(
                mode: PickerMode.neverShow,
                selected: _hidden,
                other: widget.moreOf,
                onChanged: (v) => setState(() => _hidden = v),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
          child: SizedBox(
            width: double.infinity,
            height: 52,
            child: FilledButton(
              key: const ValueKey('never-show-done'),
              onPressed: () => widget.onDone(_hidden),
              style: FilledButton.styleFrom(
                backgroundColor: SpColors.primary,
                shape: const StadiumBorder(),
              ),
              child: const Text(
                'Done',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

const _neverNote =
    'Optional. Anything with these subjects stays out of Discover, Videos '
    'and Books. You can still find it by searching for it.';

/// Account → Tailor Spiritpedia (and the menu's): More of and Never show,
/// the same picker twice, saved together on "Save". Clearing everything and
/// saving is a choice too.
class TailorScreen extends ConsumerStatefulWidget {
  const TailorScreen({super.key});

  @override
  ConsumerState<TailorScreen> createState() => _TailorScreenState();
}

class _TailorScreenState extends ConsumerState<TailorScreen> {
  late Set<String> _more = {...ref.read(interestsProvider).subjects};
  late Set<String> _never = {...ref.read(interestsProvider).hidden};

  Future<void> _save() async {
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final opened = ref.read(exploreMoreOpenedProvider.notifier);
    await ref
        .read(interestsProvider.notifier)
        .tailor(subjects: _more, hidden: _never);
    // A fresh start: Explore More's shelves close again.
    opened.closeAll();
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            _more.isEmpty && _never.isEmpty
                ? 'Spiritpedia is back to how everyone sees it'
                : 'Saved: Spiritpedia is tailored to you',
          ),
        ),
      );
    if (navigator.canPop()) navigator.pop();
  }

  @override
  Widget build(BuildContext context) {
    const heading = TextStyle(fontSize: 21, fontWeight: FontWeight.w700);
    const note = TextStyle(
      fontSize: 13,
      height: 1.45,
      color: SpColors.textFaint,
    );
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tailor Spiritpedia'),
        actions: [
          if (_more.isNotEmpty || _never.isNotEmpty)
            TextButton(
              key: const ValueKey('tailor-clear'),
              onPressed: () => setState(() {
                _more = {};
                _never = {};
              }),
              style: TextButton.styleFrom(foregroundColor: SpColors.link),
              child: const Text('Clear all'),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              // The star's space: it speaks at the top while this scrolls
              // underneath it.
              child: TailorStarFrame(
                builder: (context, top) => ListView(
                  padding: EdgeInsets.fromLTRB(20, 8 + top, 20, 24),
                  children: [
                    const YourArea(),
                    const SizedBox(height: 18),
                    const Divider(),
                    const SizedBox(height: 18),
                    const Text('More of', style: heading),
                    const SizedBox(height: 4),
                    const Text(
                      'Shown first on Discover, Videos and Books, and in '
                      'Spiritpedia Suggests.',
                      style: note,
                    ),
                    const SizedBox(height: 16),
                    InterestsPicker(
                      key: const ValueKey('tailor-more-of'),
                      selected: _more,
                      other: _never,
                      onChanged: (v) => setState(() => _more = v),
                    ),
                    const SizedBox(height: 18),
                    const Divider(),
                    const SizedBox(height: 18),
                    const Text('Never show', style: heading),
                    const SizedBox(height: 16),
                    InterestsPicker(
                      key: const ValueKey('tailor-never-show'),
                      mode: PickerMode.neverShow,
                      selected: _never,
                      other: _more,
                      onChanged: (v) => setState(() => _never = v),
                    ),
                    const SizedBox(height: 18),
                    const Divider(),
                    const SizedBox(height: 18),
                    const LearningSwitch(),
                    // Clear of the star once it rests at the foot.
                    const SizedBox(height: FloatingHomeStar.clearance - 24),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  key: const ValueKey('tailor-save'),
                  onPressed: _save,
                  style: FilledButton.styleFrom(
                    backgroundColor: SpColors.primary,
                    shape: const StadiumBorder(),
                  ),
                  child: const Text(
                    'Save',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Tailor Spiritpedia's "Your area": the town Practitioners Near You uses.
/// Saved as soon as it is chosen, apart from the Save button below.
class YourArea extends ConsumerWidget {
  const YourArea({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final place = ref.watch(areaProvider).place;
    return Column(
      key: const ValueKey('tailor-your-area'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Your area',
          style: TextStyle(fontSize: 21, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 4),
        Text(
          place == null
              ? 'Not set. Practitioners Near You shows everyone until it is.'
              : place.fullLabel,
          style: TextStyle(
            fontSize: place == null ? 13 : 16,
            height: 1.45,
            color: place == null ? SpColors.textFaint : SpColors.text,
          ),
        ),
        Row(
          children: [
            TextButton(
              key: const ValueKey('tailor-area-change'),
              onPressed: () => showAreaSheet(context),
              style: TextButton.styleFrom(
                foregroundColor: SpColors.link,
                padding: EdgeInsets.zero,
              ),
              child: Text(place == null ? 'Set your area' : 'Change'),
            ),
            if (place != null) ...[
              const SizedBox(width: 16),
              TextButton(
                key: const ValueKey('tailor-area-clear'),
                onPressed: () => ref.read(areaProvider.notifier).set(null),
                style: TextButton.styleFrom(
                  foregroundColor: SpColors.textMuted,
                  padding: EdgeInsets.zero,
                ),
                child: const Text('Clear'),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

/// A short summary of a list, for Account and the menu: "Meditation, Yoga
/// and 3 more", or null if nothing is chosen.
String? interestsSummary(List<String> slugs, List<Subject>? subjects) {
  if (slugs.isEmpty) return null;
  final names = [for (final s in slugs) subjectName(subjects, s)];
  if (names.length <= 2) return names.join(' and ');
  return '${names.take(2).join(', ')} and ${names.length - 2} more';
}

/// Both lists in one line: "More of: Yoga · Hidden: Shamanism", or null.
String? tailoringSummary(Interests interests, List<Subject>? subjects) {
  final more = interestsSummary(interests.subjects, subjects);
  final never = interestsSummary(interests.hidden, subjects);
  return [
    if (more != null) 'More of: $more',
    if (never != null) 'Hidden: $never',
  ].join(' · ').nullIfEmpty;
}

extension on String {
  String? get nullIfEmpty => isEmpty ? null : this;
}

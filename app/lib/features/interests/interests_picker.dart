import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../data/shelf_rules.dart';
import '../../theme/colors.dart';
import '../star/slipstream.dart';
import 'interests.dart';

/// Under the question, in onboarding and in Account → Your interests.
const interestsNote =
    'Optional. We use your choices only to tailor what you see; never shared. '
    'Change or clear them anytime in Account.';

/// Each pillar's outline icon and soft accent — the app's colours, no emoji.
const _pillarLook = <String, (IconData, Color)>{
  'Emotional Healing': (Icons.favorite_border_rounded, Color(0xFFF9A8D4)),
  'Consciousness': (Icons.self_improvement_rounded, SpColors.link),
  'Manifestation & Creation': (Icons.auto_awesome_outlined, SpColors.gold),
  'Mystical & Spiritual Exploration': (
    Icons.nightlight_outlined,
    Color(0xFF93C5FD),
  ),
  'Body & Energy': (Icons.spa_outlined, Color(0xFF6EE7B7)),
};

/// The five pillars as the Discover pills; tapping one opens its subjects
/// underneath as chips, "All of [pillar]" first. Several can be open at
/// once, and any combination chosen.
class InterestsPicker extends ConsumerStatefulWidget {
  const InterestsPicker({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  final Set<String> selected;
  final ValueChanged<Set<String>> onChanged;

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
            key: ValueKey('interest-pillar-$pillar'),
            label: pillar,
            look: _pillarLook[pillar]!,
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
                        _chip(
                          key: ValueKey('interest-all-$pillar'),
                          label: 'All of $pillar',
                          selected: subjectPillars[pillar]!.every(
                            widget.selected.contains,
                          ),
                          accent: _pillarLook[pillar]!.$2,
                          onSelected: (on) =>
                              _toggle(subjectPillars[pillar]!, on),
                        ),
                        for (final slug in subjectPillars[pillar]!)
                          _chip(
                            key: ValueKey('interest-$slug'),
                            label: name(slug),
                            selected: widget.selected.contains(slug),
                            accent: _pillarLook[pillar]!.$2,
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
  }) => FilterChip(
    key: key,
    label: Text(label),
    selected: selected,
    showCheckmark: true,
    checkmarkColor: Colors.white,
    selectedColor: SpColors.primary,
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

/// A pillar, drawn as the Discover pills are: a stadium outline, filled
/// violet once something in it is chosen.
class _PillarPill extends StatelessWidget {
  const _PillarPill({
    super.key,
    required this.label,
    required this.look,
    required this.open,
    required this.chosen,
    required this.onTap,
  });

  final String label;
  final (IconData, Color) look;
  final bool open;
  final int chosen;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final active = chosen > 0;
    final (icon, accent) = look;
    return Semantics(
      button: true,
      expanded: open,
      label: chosen > 0 ? '$label, $chosen chosen' : label,
      excludeSemantics: true,
      child: Material(
        color: active ? SpColors.primary : Colors.transparent,
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
            height: 44,
            child: Padding(
              padding: const EdgeInsets.only(left: 14, right: 12),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 19, color: active ? Colors.white : accent),
                  const SizedBox(width: 9),
                  Flexible(
                    child: Text(
                      label,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (active) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 1,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.22),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        '$chosen',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(width: 4),
                  Icon(
                    open
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.keyboard_arrow_down_rounded,
                    size: 20,
                    color: SpColors.textMuted,
                  ),
                ],
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
/// or exploring with nothing chosen, saves nothing and changes nothing.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key, required this.onDone});

  final VoidCallback onDone;

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  late Set<String> _selected = {...ref.read(interestsProvider).subjects};

  void _explore() {
    if (_selected.isNotEmpty) {
      ref.read(interestsProvider.notifier).choose(_selected);
    }
    widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      key: const ValueKey('onboarding'),
      color: SpColors.background,
      child: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                children: [
                  const Center(
                    child: SizedBox(width: 64, height: 64, child: StarSprite()),
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
                    style: TextStyle(fontSize: 21, fontWeight: FontWeight.w700),
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
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ),
            TextButton(
              key: const ValueKey('onboarding-skip'),
              onPressed: widget.onDone,
              style: TextButton.styleFrom(foregroundColor: SpColors.textMuted),
              child: const Text('Skip for now'),
            ),
            const SizedBox(height: 4),
          ],
        ),
      ),
    );
  }
}

/// Account → Your interests (and the menu's): the same picker, saved on
/// "Save". Clearing everything and saving is a choice too.
class InterestsScreen extends ConsumerStatefulWidget {
  const InterestsScreen({super.key});

  @override
  ConsumerState<InterestsScreen> createState() => _InterestsScreenState();
}

class _InterestsScreenState extends ConsumerState<InterestsScreen> {
  late Set<String> _selected = {...ref.read(interestsProvider).subjects};

  Future<void> _save() async {
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    await ref.read(interestsProvider.notifier).choose(_selected);
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            _selected.isEmpty
                ? 'Your interests are cleared'
                : 'Your interests are saved',
          ),
        ),
      );
    if (navigator.canPop()) navigator.pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Your interests'),
        actions: [
          if (_selected.isNotEmpty)
            TextButton(
              key: const ValueKey('interests-clear'),
              onPressed: () => setState(() => _selected = {}),
              style: TextButton.styleFrom(foregroundColor: SpColors.link),
              child: const Text('Clear all'),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                children: [
                  const Text(
                    'What interests you most?',
                    style: TextStyle(fontSize: 21, fontWeight: FontWeight.w700),
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
                    onChanged: (v) => setState(() => _selected = v),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  key: const ValueKey('interests-save'),
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

/// A short summary of the choice, for Account and the menu: "Meditation,
/// Yoga and 3 more", or null if nothing is chosen.
String? interestsSummary(List<String> slugs, List<Subject>? subjects) {
  if (slugs.isEmpty) return null;
  final names = [for (final s in slugs) subjectName(subjects, s)];
  if (names.length <= 2) return names.join(' and ');
  return '${names.take(2).join(', ')} and ${names.length - 2} more';
}

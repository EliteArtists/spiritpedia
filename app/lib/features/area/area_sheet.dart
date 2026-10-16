import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../theme/colors.dart';
import '../star/slipstream.dart';
import 'area.dart';
import 'location_source.dart';

/// "Your area": Use my location, or Type my city — a town, never a
/// position. From the Practitioners Near You shelf ("Set your area"), Tailor
/// Spiritpedia, and the star's question. [typing] opens straight on the
/// search; [locate] starts on "Use my location" at once (the star's
/// question, where they already chose it). True if an area was set.
Future<bool> showAreaSheet(
  BuildContext context, {
  bool typing = false,
  bool locate = false,
}) async {
  final set = await showModalBottomSheet<bool>(
    context: context,
    useRootNavigator: true,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: SpColors.surface,
    showDragHandle: true,
    builder: (_) => AreaSheet(typing: typing, locate: locate),
  );
  return set ?? false;
}

class AreaSheet extends ConsumerStatefulWidget {
  const AreaSheet({super.key, this.typing = false, this.locate = false});

  final bool typing;
  final bool locate;

  @override
  ConsumerState<AreaSheet> createState() => _AreaSheetState();
}

class _AreaSheetState extends ConsumerState<AreaSheet> {
  late bool _typing = widget.typing;
  final _query = TextEditingController();
  Timer? _debounce;
  List<Place> _results = const [];
  bool _busy = false;
  String? _message;
  bool _offerSettings = false;
  int _search = 0;

  @override
  void initState() {
    super.initState();
    if (widget.locate) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _useLocation();
      });
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _query.dispose();
    super.dispose();
  }

  Future<void> _choose(Place? place) async {
    await ref.read(areaProvider.notifier).set(place);
    if (mounted) Navigator.of(context).pop(place != null);
  }

  Future<void> _useLocation() async {
    setState(() {
      _busy = true;
      _message = null;
      _offerSettings = false;
    });
    final source = ref.read(locationSourceProvider);
    final repo = ref.read(contentRepositoryProvider);
    final where = await source.approximatePosition();
    if (!mounted) return;
    if (where.problem != null || where.lat == null || where.lng == null) {
      setState(() {
        _busy = false;
        _offerSettings = where.problem == LocationProblem.blocked;
        _message = switch (where.problem) {
          LocationProblem.off => 'Location Services are off on this phone. You can type your town instead.',
          LocationProblem.denied || LocationProblem.blocked => 'Spiritpedia can’t see your location. You can type your town instead.',
          _ => 'Your location didn’t come through. You can type your town instead.',
        };
      });
      return;
    }
    Place? town;
    try {
      town = await repo.nearestPlace(where.lat!, where.lng!);
    } catch (_) {}
    if (!mounted) return;
    if (town == null) {
      setState(() {
        _busy = false;
        _message = 'No town found near you. You can type your town instead.';
      });
      return;
    }
    await _choose(town);
  }

  void _onQuery(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), () async {
      final mine = ++_search;
      List<Place> found = const [];
      try {
        found = await ref.read(contentRepositoryProvider).searchPlaces(q);
      } catch (_) {}
      if (mounted && mine == _search) setState(() => _results = found);
    });
  }

  @override
  Widget build(BuildContext context) {
    final current = ref.watch(areaProvider).place;
    return Padding(
      key: const ValueKey('area-sheet'),
      padding: EdgeInsets.fromLTRB(
        24,
        0,
        24,
        24 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Center(
              child: SizedBox.square(dimension: 36, child: StarSprite()),
            ),
            const SizedBox(height: 12),
            const Text(
              'Your area',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 21, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            const Text(
              'To show practitioners near you. Only your town is kept, never '
              'your exact location.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                height: 1.45,
                color: SpColors.textMuted,
              ),
            ),
            if (current != null) ...[
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Flexible(
                    child: Text(
                      current.label,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  TextButton(
                    key: const ValueKey('area-clear'),
                    onPressed: () => _choose(null),
                    style: TextButton.styleFrom(
                      foregroundColor: SpColors.textMuted,
                    ),
                    child: const Text('Clear'),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 18),
            if (!_typing) ...[
              SizedBox(
                height: 50,
                child: FilledButton(
                  key: const ValueKey('area-use-location'),
                  onPressed: _busy ? null : _useLocation,
                  style: FilledButton.styleFrom(
                    backgroundColor: SpColors.primary,
                    shape: const StadiumBorder(),
                  ),
                  child: Text(
                    _busy ? 'Finding your town…' : 'Use my location',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 50,
                child: OutlinedButton(
                  key: const ValueKey('area-type-city'),
                  onPressed: () => setState(() => _typing = true),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: SpColors.text,
                    side: const BorderSide(color: SpColors.border),
                    shape: const StadiumBorder(),
                  ),
                  child: const Text('Type my city'),
                ),
              ),
            ] else ...[
              TextField(
                key: const ValueKey('area-search'),
                controller: _query,
                autofocus: true,
                autocorrect: false,
                textCapitalization: TextCapitalization.words,
                onChanged: _onQuery,
                decoration: InputDecoration(
                  hintText: 'Your town or city',
                  filled: true,
                  fillColor: SpColors.background,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: SpColors.border),
                  ),
                ),
              ),
              const SizedBox(height: 6),
              for (final p in _results)
                ListTile(
                  key: ValueKey('area-result-${p.id}'),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 6),
                  title: Text(p.name),
                  subtitle: Text(
                    [if (p.region != null) p.region!, p.country].join(', '),
                    style: const TextStyle(color: SpColors.textMuted),
                  ),
                  onTap: () => _choose(p),
                ),
              if (_query.text.trim().length >= 2 && _results.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 10),
                  child: Text(
                    'No town by that name yet. Try the nearest larger town.',
                    style: TextStyle(color: SpColors.textMuted),
                  ),
                ),
            ],
            if (_message != null) ...[
              const SizedBox(height: 12),
              Text(
                _message!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: SpColors.textMuted, height: 1.45),
              ),
              if (_offerSettings)
                TextButton(
                  onPressed: () =>
                      ref.read(locationSourceProvider).openSettings(),
                  style: TextButton.styleFrom(foregroundColor: SpColors.link),
                  child: const Text('Open Settings'),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

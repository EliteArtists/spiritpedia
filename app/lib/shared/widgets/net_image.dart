import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../theme/colors.dart';

/// A network image that never shows a broken-image icon.
///
/// Many covers and portraits are hot-linked from other sites (Amazon, Google's
/// image cache) and some fail — the daily broken-images audit exists for
/// exactly that. When one does, the card shows a calm dark panel with the
/// item's initial instead, as the website's CardImage does.
class NetImage extends StatelessWidget {
  const NetImage({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.fallbackLabel,
    this.alignment = Alignment.center,
  });

  final String? url;
  final BoxFit fit;
  final String? fallbackLabel;
  final Alignment alignment;

  @override
  Widget build(BuildContext context) {
    final u = url;
    if (u == null ||
        u.isEmpty ||
        !(u.startsWith('http://') || u.startsWith('https://'))) {
      return _Fallback(label: fallbackLabel);
    }
    return CachedNetworkImage(
      imageUrl: u,
      fit: fit,
      alignment: alignment,
      fadeInDuration: const Duration(milliseconds: 180),
      placeholder: (_, _) => const ColoredBox(color: SpColors.surface),
      errorWidget: (_, _, _) => _Fallback(label: fallbackLabel),
    );
  }
}

class _Fallback extends StatelessWidget {
  const _Fallback({this.label});

  final String? label;

  @override
  Widget build(BuildContext context) {
    final initial = (label ?? '').trim().isEmpty
        ? ''
        : label!.trim().characters.first.toUpperCase();
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1E1B4B), SpColors.surface],
        ),
      ),
      child: Center(
        child: initial.isEmpty
            ? Image.asset(
                'assets/images/star.png',
                width: 36,
                height: 36,
                opacity: const AlwaysStoppedAnimation(0.5),
              )
            : Text(
                initial,
                style: const TextStyle(
                  fontSize: 34,
                  fontWeight: FontWeight.w700,
                  color: SpColors.textFaint,
                ),
              ),
      ),
    );
  }
}

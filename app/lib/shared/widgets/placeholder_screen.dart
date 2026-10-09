import 'package:flutter/material.dart';

import '../../theme/colors.dart';

/// A tab that is not built yet. Says plainly which phase brings it, so an
/// empty screen is never mistaken for a broken one.
class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({
    super.key,
    required this.title,
    required this.icon,
    required this.comingIn,
  });

  final String title;
  final IconData icon;
  final String comingIn;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700))),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 40, color: SpColors.textFaint),
              const SizedBox(height: 16),
              Text(
                comingIn,
                textAlign: TextAlign.center,
                style: const TextStyle(color: SpColors.textMuted, fontSize: 15, height: 1.5),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

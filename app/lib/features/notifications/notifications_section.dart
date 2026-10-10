import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../theme/colors.dart';
import 'notifications_controller.dart';
import 'push_messaging.dart';

/// The friendly screen shown BEFORE the one-time system prompt. The system
/// prompt can only be shown once, so the person decides here first; "Not now"
/// leaves the system prompt unused for later. Pops with true on "Yes".
class NotificationsIntroScreen extends StatelessWidget {
  const NotificationsIntroScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 12, 28, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: IconButton(
                  tooltip: 'Close',
                  onPressed: () => Navigator.of(context).pop(false),
                  icon: const Icon(Icons.close),
                ),
              ),
              const Spacer(),
              Center(
                child: Image.asset(
                  'assets/images/star.png',
                  width: 72,
                  height: 72,
                  errorBuilder: (_, _, _) => const Icon(
                    Icons.auto_awesome,
                    size: 64,
                    color: SpColors.gold,
                  ),
                ),
              ),
              const SizedBox(height: 28),
              const Text(
                'Would you like notifications?',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Now and then, Spiritpedia can send you a gentle note — a welcome, and news about the '
                'teachers and practices you care about. Never more than you would want, and you can '
                'turn them off at any time in Account.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  height: 1.55,
                  color: SpColors.textMuted,
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Your phone will ask you to confirm next.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13.5, color: SpColors.textFaint),
              ),
              const Spacer(),
              SizedBox(
                height: 54,
                child: FilledButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text(
                    'Yes, notify me',
                    style: TextStyle(fontSize: 16),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                style: TextButton.styleFrom(
                  foregroundColor: SpColors.textMuted,
                  minimumSize: const Size.fromHeight(48),
                ),
                child: const Text('Not now'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Notifications in the Account screen — signed-in people only.
class NotificationsSection extends ConsumerWidget {
  const NotificationsSection({super.key});

  Future<void> _turnOn(BuildContext context, WidgetRef ref) async {
    final yes = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => const NotificationsIntroScreen(),
      ),
    );
    if (yes != true) return;
    final on = await ref.read(notificationsProvider.notifier).turnOn();
    if (on && context.mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Notifications are on.')));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final n = ref.watch(notificationsProvider);
    if (n.loading) return const SizedBox.shrink();

    final children = <Widget>[];
    if (n.onThisPhone) {
      children.addAll([
        SwitchListTile(
          key: const ValueKey('pref-general'),
          contentPadding: EdgeInsets.zero,
          title: const Text('General'),
          subtitle: const Text(
            'A welcome, and news from Spiritpedia',
            style: TextStyle(color: SpColors.textFaint),
          ),
          value: n.prefs.general,
          onChanged: n.busy
              ? null
              : (v) => ref.read(notificationsProvider.notifier).setGeneral(v),
        ),
        const SwitchListTile(
          key: ValueKey('pref-iam'),
          contentPadding: EdgeInsets.zero,
          title: Text('IAM affirmations'),
          subtitle: Text(
            'Coming later',
            style: TextStyle(color: SpColors.textFaint),
          ),
          value: false,
          onChanged: null,
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton(
            onPressed: n.busy
                ? null
                : () => ref.read(notificationsProvider.notifier).turnOff(),
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              foregroundColor: SpColors.textMuted,
            ),
            child: const Text('Turn off notifications on this phone'),
          ),
        ),
      ]);
    } else if (n.permission == PushPermission.denied) {
      children.addAll([
        Text(
          Platform.isIOS
              ? 'Notifications are switched off for Spiritpedia in your iPhone’s Settings.'
              : 'Notifications are switched off for Spiritpedia. To turn them on, open Settings → Apps → Spiritpedia → Notifications.',
          style: const TextStyle(
            fontSize: 14,
            height: 1.5,
            color: SpColors.textMuted,
          ),
        ),
        if (Platform.isIOS)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: () => launchUrl(Uri.parse('app-settings:')),
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                foregroundColor: SpColors.link,
              ),
              child: const Text('Open Settings'),
            ),
          ),
      ]);
    } else {
      children.addAll([
        const Text(
          'Off on this phone.',
          style: TextStyle(fontSize: 14, color: SpColors.textMuted),
        ),
        const SizedBox(height: 10),
        Align(
          alignment: Alignment.centerLeft,
          child: OutlinedButton(
            onPressed: n.busy ? null : () => _turnOn(context, ref),
            style: OutlinedButton.styleFrom(
              foregroundColor: SpColors.text,
              side: const BorderSide(color: SpColors.border),
              shape: const StadiumBorder(),
            ),
            child: Text(n.busy ? 'Turning on…' : 'Turn on notifications'),
          ),
        ),
      ]);
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: SpColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Notifications',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          ...children,
          if (n.error != null)
            Padding(
              padding: const EdgeInsets.only(top: 6, bottom: 6),
              child: Text(
                n.error!,
                style: const TextStyle(
                  color: Color(0xFFFCA5A5),
                  fontSize: 13.5,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

/// The website's address — web/utils/seo.js → SITE_URL. Every shared link is
/// the matching page on it, so it opens in a browser for anyone.
const siteUrl = 'https://www.spiritpedia.co';

/// The spiritpedia.co link for an in-app path ("/books/slug"); "/" is the site.
Uri siteLink(String path) => Uri.parse(path == '/' ? siteUrl : '$siteUrl$path');

/// Opens the phone's share sheet. Overridden in tests to record the link.
typedef ShareLauncher = Future<void> Function(
  Uri link,
  String title,
  Rect? origin,
);

final shareLauncherProvider = Provider<ShareLauncher>(
  (ref) =>
      (link, title, origin) => SharePlus.instance.share(
        ShareParams(uri: link, subject: title, sharePositionOrigin: origin),
      ),
);

/// Share this page — the native share sheet with its spiritpedia.co link.
class ShareIconButton extends ConsumerWidget {
  const ShareIconButton({super.key, required this.path, required this.title});

  final String path;
  final String title;

  @override
  Widget build(BuildContext context, WidgetRef ref) => IconButton(
    tooltip: 'Share',
    icon: const Icon(Icons.ios_share),
    onPressed: () => share(context, ref, path, title),
  );
}

Future<void> share(
  BuildContext context,
  WidgetRef ref,
  String path,
  String title,
) async {
  final box = context.findRenderObject() as RenderBox?;
  final origin = box == null || !box.hasSize
      ? null
      : box.localToGlobal(Offset.zero) & box.size;
  try {
    await ref.read(shareLauncherProvider)(siteLink(path), title, origin);
  } catch (_) {
    // The sheet could not open; nothing to undo.
  }
}

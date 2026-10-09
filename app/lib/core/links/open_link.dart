import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

/// Every outbound link opens OUTSIDE the app — in the browser or the store's
/// own app (Amazon, YouTube) — never in an in-app web view. That keeps Amazon's
/// affiliate attribution intact and the app clear of store rules about
/// in-app purchasing of third-party goods and services. A teacher's email
/// and phone open the mail and phone apps the same way.
Future<void> openExternal(BuildContext context, String url) async {
  final uri = Uri.tryParse(url);
  final ok =
      uri != null &&
      const {'https', 'http', 'mailto', 'tel'}.contains(uri.scheme) &&
      await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!ok && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('That link could not be opened.')),
    );
  }
}

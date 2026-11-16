import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';

// A tap on Buy on Amazon, counted by the website's /api/amazon-click
// (migration 0046) — the same anonymous count the website's AmazonBuyLink
// sends: the item, the platform and the link (of which the server keeps only
// the store). No user, no token.

/// Sends one count and never waits for it or fails the tap: the trip to
/// Amazon must not depend on our server. The future is only for tests.
Future<void> countAmazonTap({
  required String contentType,
  required String contentSlug,
  required String url,
  http.Client? client,
  String baseUrl = AppConfig.apiBaseUrl,
}) async {
  if (baseUrl.isEmpty) return; // no website to tell
  final c = client ?? http.Client();
  try {
    await c
        .post(
          Uri.parse('$baseUrl/api/amazon-click'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'platform': 'app',
            'content_type': contentType,
            'content_slug': contentSlug,
            'url': url,
          }),
        )
        .timeout(const Duration(seconds: 10));
  } catch (_) {
    // Counting must never stop the link.
  } finally {
    if (client == null) c.close();
  }
}

import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:spiritpedia/core/affiliate/amazon_clicks.dart';

void main() {
  test('sends the same anonymous count as the website', () async {
    late http.Request sent;
    final client = MockClient((req) async {
      sent = req;
      return http.Response('{"ok":true,"counted":true}', 200);
    });
    await countAmazonTap(
      contentType: 'book',
      contentSlug: 'the-untethered-soul',
      url: 'https://www.amazon.com/dp/1572245379?tag=spiritpedia-20',
      client: client,
      baseUrl: 'https://www.spiritpedia.co',
    );
    expect(sent.url.toString(), 'https://www.spiritpedia.co/api/amazon-click');
    expect(sent.headers.containsKey('authorization'), isFalse);
    expect(jsonDecode(sent.body), {
      'platform': 'app',
      'content_type': 'book',
      'content_slug': 'the-untethered-soul',
      'url': 'https://www.amazon.com/dp/1572245379?tag=spiritpedia-20',
    });
  });

  test('a failing server never throws', () async {
    final client = MockClient((_) async => throw Exception('offline'));
    await countAmazonTap(
      contentType: 'book',
      contentSlug: 'x',
      url: 'https://www.amazon.com/dp/1572245379',
      client: client,
      baseUrl: 'https://www.spiritpedia.co',
    );
  });

  test('no website configured: nothing is sent', () async {
    var calls = 0;
    final client = MockClient((_) async {
      calls++;
      return http.Response('', 200);
    });
    await countAmazonTap(
      contentType: 'book',
      contentSlug: 'x',
      url: 'u',
      client: client,
      baseUrl: '',
    );
    expect(calls, 0);
  });
}

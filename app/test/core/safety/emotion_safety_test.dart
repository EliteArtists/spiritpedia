// The app's emotional search must behave EXACTLY like the website's. These are
// the same cases the website's `npm test` runs, from
// web/shared/emotion-safety.cases.json. If one fails, the Dart port has
// drifted from web/utils/emotionSearchPatterns.js — fix the port; never
// regenerate the cases to make this pass.

import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/core/safety/emotion_safety.dart';

// flutter test runs from app/, so the website is one level up.
final _sharedJson = File('../web/shared/emotion-safety.json');
final _casesFile = File('../web/shared/emotion-safety.cases.json');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late EmotionSafety safety;
  late Map<String, dynamic> cases;
  late Map<String, List<MappingRow>> byEmotion;
  late List<String> fixtureEmotions;

  setUpAll(() {
    safety = EmotionSafety.parse(_sharedJson.readAsStringSync());
    cases = jsonDecode(_casesFile.readAsStringSync()) as Map<String, dynamic>;
    byEmotion = {};
    for (final row in cases['vocabulary'] as List) {
      final r = row as List;
      byEmotion.putIfAbsent(r[0] as String, () => []).add(MappingRow(r[1] as String, r[2] as int));
    }
    fixtureEmotions = byEmotion.keys.toList()..sort();
  });

  Future<List<MappingRow>> lookup(String e) async => [...?byEmotion[e]];
  Future<List<String>> vocabularyLookup(List<String> words) async =>
      fixtureEmotions.where((e) => e.split(' ').any(words.contains)).toList();

  test('the app bundles the shared file itself, byte for byte (via the symlink)', () async {
    final bundled = await rootBundle.loadString(emotionSafetyAsset);
    expect(bundled, _sharedJson.readAsStringSync());
  });

  test('function cases', () {
    final list = cases['functionCases'] as List;
    expect(list.length, greaterThan(1000));
    for (final raw in list) {
      final c = raw as Map<String, dynamic>;
      final where = jsonEncode(c['input']);
      final n = safety.normaliseQuery(c['input'] as String);
      expect(n, c['normalised'], reason: 'normaliseQuery $where');
      expect(safety.buildLookupCandidates(n), c['candidates'], reason: 'candidates $where');
      expect(safety.stripOnce(n), c['stripOnce'], reason: 'stripOnce $where');
      expect(safety.stripAll(n), c['stripAll'], reason: 'stripAll $where');
      expect(safety.contentTokens(n), c['tokens'], reason: 'tokens $where');
      expect(safety.contentTokens(n, relaxed: true), c['tokensRelaxed'], reason: 'tokensRelaxed $where');
      expect(safety.bestContainedEmotion(n, fixtureEmotions), c['contained'], reason: 'contained $where');
      expect(safety.bestContainedEmotion(n, fixtureEmotions, relaxed: true), c['containedRelaxed'],
          reason: 'containedRelaxed $where');
      expect(safety.checkCrisis(n), c['crisis'], reason: 'crisis $where');
      expect(safety.checkAmbiguous(n), c['ambiguous'], reason: 'ambiguous $where');
      expect(safety.checkSoftTier(n), c['softTier'], reason: 'softTier $where');
    }
  });

  test('full-search cases', () async {
    for (final raw in cases['searchCases'] as List) {
      final c = raw as Map<String, dynamic>;
      final r = await safety.resolve(
        c['input'] as String,
        lookup,
        dualPathAnswer: c['dualPathAnswer'] as String?,
        vocabularyLookup: vocabularyLookup,
      );
      expect(r.toComparable(), c['expected'], reason: 'resolve ${jsonEncode(c['input'])} / ${c['dualPathAnswer']}');
    }
  });

  test('medical disclaimer cases', () {
    for (final raw in cases['medicalCases'] as List) {
      final c = raw as Map<String, dynamic>;
      final rows = [
        for (final r in c['rows'] as List)
          MappingRow((r as Map)['subject_slug'] as String, r['weight'] as int),
      ];
      expect(safety.needsMedicalDisclaimer(rows), c['needsDisclaimer'], reason: c['emotion'] as String);
      expect(safety.medicalDisclaimerSubjects(rows), c['subjects'], reason: c['emotion'] as String);
    }
  });

  test('a crisis phrase never reaches the lookup — nothing is sent', () async {
    final crisisCases = (cases['searchCases'] as List)
        .cast<Map<String, dynamic>>()
        .where((c) => (c['expected'] as Map)['type'] == 'crisis')
        .toList();
    expect(crisisCases.length, greaterThan(50));
    for (final c in crisisCases) {
      var called = false;
      Future<List<MappingRow>> spy(String _) async {
        called = true;
        return [];
      }

      Future<List<String>> spyVocab(List<String> _) async {
        called = true;
        return [];
      }

      await safety.resolve(c['input'] as String, spy,
          dualPathAnswer: c['dualPathAnswer'] as String?, vocabularyLookup: spyVocab);
      expect(called, isFalse, reason: 'lookup ran for crisis input ${jsonEncode(c['input'])}');
    }
  });

  test('the crisis screen and dual path copy come from the shared file', () {
    final json = jsonDecode(_sharedJson.readAsStringSync()) as Map<String, dynamic>;
    expect(safety.crisisInterstitial.heading, (json['crisisInterstitial'] as Map)['heading']);
    expect(safety.crisisInterstitial.primaryHref, 'https://findahelpline.com/');
    expect(safety.dualPath.options.map((o) => o.key), ['exploring', 'distressing']);
    expect(safety.crisisCategories.length, 7);
  });
}

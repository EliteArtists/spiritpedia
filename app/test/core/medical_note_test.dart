import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spiritpedia/core/safety/emotion_safety.dart';
import 'package:spiritpedia/core/safety/medical_note.dart';
import 'package:spiritpedia/features/search/search_screen.dart';

final _safety = EmotionSafety.parse(
  File('assets/safety/emotion-safety.json').readAsStringSync(),
);

void main() {
  test('homeopathy carries the note; other subjects do not', () {
    expect(needsMedicalNote(['homeopathy']), isTrue);
    expect(needsMedicalNote(['meditation', 'homeopathy']), isTrue);
    expect(needsMedicalNote(['meditation', 'reiki']), isFalse);
    expect(needsMedicalNote(const []), isFalse);
  });

  testWidgets('the note reads as search words it', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [emotionSafetyProvider.overrideWithValue(AsyncData(_safety))],
        child: const MaterialApp(home: Scaffold(body: MedicalNote())),
      ),
    );
    expect(
      find.text('Complementary to, not a replacement for, medical care.'),
      findsOneWidget,
    );
  });
}

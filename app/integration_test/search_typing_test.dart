// On a simulator or phone: each tab's search box opens the search with the
// field focused and the real keyboard up. Run with
//   flutter test integration_test/search_typing_test.dart -d <device>
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:spiritpedia/app.dart';
import 'package:spiritpedia/core/safety/emotion_safety.dart';
import 'package:spiritpedia/data/providers.dart';
import 'package:spiritpedia/features/account/account_providers.dart';
import 'package:spiritpedia/features/library/saved_items.dart';
import 'package:spiritpedia/features/search/feeling_placeholder.dart';
import 'package:spiritpedia/features/search/search_repository.dart';
import 'package:spiritpedia/features/search/search_screen.dart';

import '../test/support/fake_account.dart';
import '../test/support/fake_content.dart';

class _NoSearch implements SearchRepository {
  @override
  Future<List<MappingRow>> exactEmotion(String emotion) async => const [];
  @override
  Future<List<String>> vocabulary(List<String> words) async => const [];
  @override
  Future<List<MappingRow>> forwardSubstring(String normalised) async =>
      const [];
  @override
  Future<UniversalResults> universal(String term) async =>
      UniversalResults.empty;
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  for (final tab in ['Discover', 'Videos', 'Books']) {
    testWidgets('$tab: the search box focuses and the keyboard comes up', (
      tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            accountServiceProvider.overrideWithValue(FakeAccountService()),
            contentRepositoryProvider.overrideWithValue(
              FakeContentRepository(),
            ),
            savedStoreProvider.overrideWithValue(MemorySavedStore()),
            searchRepositoryProvider.overrideWithValue(_NoSearch()),
          ],
          child: const SpiritpediaApp(playIntro: false),
        ),
      );
      await tester.pump(const Duration(seconds: 1));
      if (tab != 'Discover') {
        await tester.tap(find.text(tab).last);
        await tester.pump(const Duration(seconds: 1));
      }
      await tester.tap(find.byType(FeelingTypewriter).hitTestable().first);
      // Real time: the page slides in, the field asks for the keyboard.
      for (var i = 0; i < 30; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      final editable = tester.state<EditableTextState>(
        find.byType(EditableText),
      );
      // The screen's own inset: a page's Scaffold hides it from its body.
      final keyboard = tester.view.viewInsets.bottom;
      expect(editable.widget.focusNode.hasFocus, isTrue, reason: 'focus');
      expect(keyboard, greaterThan(0), reason: 'the keyboard is up');
      // Hold, so a screenshot can show it.
      if (tab == 'Videos') {
        for (var i = 0; i < 40; i++) {
          await tester.pump(const Duration(milliseconds: 100));
        }
      }
    });
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/search/search_screen.dart' show emotionSafetyProvider;
import '../../theme/colors.dart';

/// The subjects whose subject page and teachers' profiles carry the
/// "Complementary to, not a replacement for, medical care." note. Mirrors
/// web/utils/medicalNote.js; homeopathy for now (README §18.4).
const medicalNoteSubjects = ['homeopathy'];

bool needsMedicalNote(Iterable<String> subjectSlugs) =>
    subjectSlugs.any(medicalNoteSubjects.contains);

/// The note itself, in the wording search uses (emotion-safety.json), so the
/// two can't drift apart. Nothing until that file has loaded.
class MedicalNote extends ConsumerWidget {
  const MedicalNote({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = ref.watch(emotionSafetyProvider).value?.medicalDisclaimer;
    if (text == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Text(
        text,
        style: const TextStyle(fontSize: 13, color: SpColors.textMuted),
      ),
    );
  }
}

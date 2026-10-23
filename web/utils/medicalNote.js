// The "Complementary to, not a replacement for, medical care." note on the
// subject pages and the teachers' profiles of the subjects below. Search
// already shows it for its own list (SAFETY.medicalSubjects); the wording is
// the same string, so the two can never drift apart. The app mirrors this in
// app/lib/core/safety/medical_note.dart.
import SAFETY from '../shared/emotion-safety.json' with { type: 'json' };

export const MEDICAL_NOTE = SAFETY.medicalDisclaimer;

// Homeopathy for now (README §18.4).
export const MEDICAL_NOTE_SUBJECTS = ['homeopathy'];

export function needsMedicalNote(subjectSlugs) {
  return Array.isArray(subjectSlugs) && subjectSlugs.some((s) => MEDICAL_NOTE_SUBJECTS.includes(s));
}

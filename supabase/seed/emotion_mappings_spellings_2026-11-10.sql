-- Search spellings added on 10 Nov 2026 (owner's gap-check Fix 3), already applied
-- on dev and live through the API. Kept here so a rebuild from the seed has them:
-- run after emotion_mappings.sql. Joined-up and hyphenated spellings copy the
-- rows of their spaced form, with the matching subject on top (weight 4) so
-- Enter opens it; Quantum Touch and Reiki are raised to 4 for their own names.
-- Safe to run again.

INSERT INTO public.emotion_mappings (emotion, subject_slug, weight)
SELECT v.emotion, v.subject_slug, v.weight FROM (VALUES
  ('quantum-touch', 'quantum-touch', 4),
  ('quantum-touch', 'energy-medicine', 3),
  ('quantum-touch', 'reiki', 3),
  ('quantum-touch', 'chakra-healing', 2),
  ('quantum-touch', 'self-healing', 1),
  ('quantumtouch', 'quantum-touch', 4),
  ('quantumtouch', 'energy-medicine', 3),
  ('quantumtouch', 'reiki', 3),
  ('quantumtouch', 'chakra-healing', 2),
  ('quantumtouch', 'self-healing', 1),
  ('tai-chi', 'tai-chi', 4),
  ('tai-chi', 'qi-gong', 3),
  ('tai-chi', 'meditation', 1),
  ('tai-chi', 'breathwork', 1),
  ('tai-chi', 'energy-medicine', 1),
  ('taichi', 'tai-chi', 4),
  ('taichi', 'qi-gong', 3),
  ('taichi', 'meditation', 1),
  ('taichi', 'breathwork', 1),
  ('taichi', 'energy-medicine', 1),
  ('qigong', 'qi-gong', 4),
  ('qigong', 'tai-chi', 3),
  ('qigong', 'breathwork', 1),
  ('qigong', 'energy-medicine', 1),
  ('qigong', 'meditation', 1),
  ('soundbath', 'sound-healing', 3),
  ('soundbath', 'energy-medicine', 2),
  ('soundbath', 'meditation', 2),
  ('soundbath', 'chakra-healing', 1),
  ('soundbath', 'breathwork', 1),
  ('breath work', 'breathwork', 3),
  ('yoga nidra', 'yoga', 3)
) AS v(emotion, subject_slug, weight)
WHERE NOT EXISTS (SELECT 1 FROM public.emotion_mappings m WHERE m.emotion = v.emotion AND m.subject_slug = v.subject_slug);

UPDATE public.emotion_mappings SET weight = 4
WHERE (emotion, subject_slug) IN (('quantum touch', 'quantum-touch'), ('reiki', 'reiki'));

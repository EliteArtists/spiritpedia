// The health rule (owner, 12 Nov 2026; README §18.4), as a word check for a
// human look. Wellbeing language in the teacher's own words is allowed
// (stress, anxiety, sleep, pain relief through practice, relaxation, emotional
// and spiritual healing); a claim to cure or treat a disease or medical
// condition, or advice to replace medical care, is not. Words alone don't
// decide it: "Jupiter in Cancer" is astrology, and a memoir of surviving
// cancer claims nothing. The same list is in night-sprint-2026-11-09/review.py.

export const DISEASE_WORDS = /\b(cure[sd]?|curing|incurable|treat(?:s|ed|ing|ment)?|reverse[sd]?|heal(?:s|ed|ing)? (?:your |the )?(?:body|disease|illness)|cancer\w*|tumou?r\w*|immun\w*|autoimmun\w*|diabet\w*|thyroid|lyme|covid\w*|corona ?virus|pandemic|vaccin\w*|arthrit\w*|alzheimer\w*|parkinson\w*|dementia|asthma|autis\w*|hypertension|blood pressure|cholesterol|infertil\w*|disease\w*|chronic (?:illness|fatigue|disease)|fibromyalgia|lupus|multiple sclerosis|ibs|crohn\w*|inflammat\w*|medication|instead of (?:a |your )?doctor|stop (?:your|taking) \w+)\b/i;

// [where, title, words] for each place the words appear in a plan.
export function healthHits(plan) {
  const out = [];
  const look = (where, title, text) => {
    const words = [...new Set((String(text || '').match(new RegExp(DISEASE_WORDS, 'gi')) || []).map((w) => w.toLowerCase()))];
    if (words.length) out.push([where, title, words]);
  };
  const create = plan.healer?.create;
  if (create) look('bio', create.name, create.bio);
  for (const [key, label] of [['videos', 'video'], ['books', 'book'], ['courses', 'offering'], ['free_resources', 'free resource']]) {
    for (const it of plan[key] || []) look(label, it.title, `${it.title} ${it.description || ''}`);
  }
  return out;
}

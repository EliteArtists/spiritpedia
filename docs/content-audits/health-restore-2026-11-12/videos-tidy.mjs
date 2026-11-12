// Second pass over the video restore plans (after videos.mjs): drops news,
// political or conspiracy-leaning titles (those were left out for another
// reason, not health), repeats of the same title, and items under the health
// rule's cure/treat words; keeps only subjects the title supports, or the
// listing's first two when it supports none. A plan left with no videos is
// deleted.
//
//   node docs/content-audits/health-restore-2026-11-12/videos-tidy.mjs <live-healers.json>

import fs from 'node:fs';
import { DISEASE_WORDS } from '../../../scripts/lib/health.mjs';

const DIR = 'docs/content-audits/health-restore-2026-11-12';
const healers = new Map(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).map((h) => [h.healer_slug, h]));
// Also out: psychedelics (owner, 6 Nov 2026), medical intuition and symptom
// diagnosis, corporate or promo sessions, dated updates, and bare titles
// ("Day 6") that say nothing about the content.
const OUT_TOO = /psychedel|ayahuasca|psilocybin|ketamine|mdma|plant medicine|medical intuit|diagnos|symptom|corporate|\bupdate\b|welcome to|true crime|murder|suicide/i;
const BARE = /^\W*(day|week|part|episode|ep\.?|session)\s*\d+\W*$/i;
const OFF_TOPIC = /\bnews\b|election|politic|trump|biden|harris|disclosure|\bufo|alien|vaccin|pandemic|covid|corona ?virus|lockdown|\bwar\b|israel|gaza|ukraine|russia|climate|el ni[ñn]o|\bAI\b|artificial intelligence|court|elon|government|economy|stock|crypto|podcast trailer|trailer|teaser|promo|announcement|giveaway|live stream test/i;
const SUBJECTS = [
  [/meditat|guided|sleep|relax|body scan|nidra/i, 'meditation'],
  [/mindful/i, 'mindfulness'],
  [/breath|pranayama/i, 'breathwork'],
  [/bowl|sound bath|sound heal|frequenc|\bhz\b|binaural/i, 'sound-healing'],
  [/yoga/i, 'yoga'],
  [/qi ?gong|chi kung/i, 'qi-gong'],
  [/tai chi/i, 'tai-chi'],
  [/tapping|\beft\b/i, 'eft-tapping'],
  [/reiki/i, 'reiki'],
  [/chakra/i, 'chakra-healing'],
  [/grief|griev|death|dying/i, 'death-the-afterlife'],
  [/heal/i, 'self-healing'],
];

const out = { plans: 0, kept: 0, dropped: [] };
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('-videos.json'))) {
  const p = `${DIR}/${f}`;
  const plan = JSON.parse(fs.readFileSync(p, 'utf8'));
  const own = healers.get(plan.healer.healer_slug)?.subject_slugs || [];
  const seen = new Set();
  plan.videos = plan.videos.filter((v) => {
    const t = v.title.toLowerCase().replace(/\s+/g, ' ').trim();
    const why = OFF_TOPIC.test(v.title) ? 'news, politics or promo' : OUT_TOO.test(v.title) ? 'out of scope' : BARE.test(v.title) || v.title.trim().length < 12 ? 'title says nothing' : DISEASE_WORDS.test(v.title) ? 'health rule words' : seen.has(t) ? 'repeat title' : null;
    seen.add(t);
    if (why) out.dropped.push(`${plan.healer.healer_slug}: ${v.title} (${why})`);
    return !why;
  });
  for (const v of plan.videos) {
    const s = SUBJECTS.filter(([re]) => re.test(v.title)).map(([, slug]) => slug);
    v.subjects = [...new Set(s.length ? s : own.slice(0, 2))].slice(0, 3);
  }
  if (!plan.videos.length) { fs.unlinkSync(p); continue; }
  fs.writeFileSync(p, `${JSON.stringify(plan, null, 2)}\n`);
  out.plans++; out.kept += plan.videos.length;
}
fs.writeFileSync(`${DIR}/videos-tidy.log.json`, `${JSON.stringify(out, null, 1)}\n`);
console.log(`${out.plans} plans, ${out.kept} videos kept, ${out.dropped.length} dropped`);

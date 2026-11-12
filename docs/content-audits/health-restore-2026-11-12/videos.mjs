// Health restore, videos (owner, 12 Nov 2026). For each live listing that had
// videos left out under the old health rule, writes a top-up plan with the
// videos to put back: first those whose titles match the left-out notes, then
// the channel's most-viewed wellbeing titles, up to as many as were left out
// (at most 10). Never a title with a cure or treatment word
// (scripts/lib/health.mjs), a Short, or anything under 2 minutes. The ingest
// then checks each with oEmbed and skips duplicates.
//
//   node docs/content-audits/health-restore-2026-11-12/videos.mjs <work.json> <live-healers.json> <live-videos.json>
//
// work.json: { video: { <slug>: [{ text, n, t }] } } from the audit.
// Reads channels through the YouTube Data API only (scripts/lib/youtube.mjs).

import fs from 'node:fs';
import { getChannel, getTopUploads } from '../../../scripts/lib/youtube.mjs';
import { DISEASE_WORDS } from '../../../scripts/lib/health.mjs';

const [workPath, healersPath, videosPath] = process.argv.slice(2);
const DIR = 'docs/content-audits/health-restore-2026-11-12';
const work = JSON.parse(fs.readFileSync(workPath, 'utf8')).video;
const healers = new Map(JSON.parse(fs.readFileSync(healersPath, 'utf8')).map((h) => [h.healer_slug, h]));
const ours = new Map();
for (const v of JSON.parse(fs.readFileSync(videosPath, 'utf8'))) {
  const id = (/[?&]v=([\w-]{11})/.exec(v.platform_url || '') || [])[1];
  if (!id) continue;
  if (!ours.has(v.healer_slug)) ours.set(v.healer_slug, new Set());
  ours.get(v.healer_slug).add(id);
}

const WELLBEING = /stress|anxi|sleep|insomnia|heal|pain|relax|calm|grief|griev|trauma|depress|nervous system|vagus|burnout|panic|worry|overwhelm|rest\b|soothe|letting go|emotion/i;
const words = (s) => new Set(String(s).toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, ' ').split(/\s+/).filter((w) => w.length > 2));
const overlap = (a, b) => {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
};
// Quoted titles and comma-separated lists in a left-out note.
const titlesIn = (text) => {
  const out = [];
  for (const m of String(text).matchAll(/["“'‘]([^"”'’]{8,140})["”'’]/g)) out.push(m[1]);
  const after = /(?:youtube|videos?)[^:]*:\s*(.+)$/i.exec(text);
  if (after) out.push(...after[1].split(/[,;]| and /).map((s) => s.trim()).filter((s) => s.length > 6));
  return out;
};

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
const subjectsFor = (title, healerSubjects) => {
  const s = [];
  for (const [re, slug] of SUBJECTS) if (re.test(title) && !s.includes(slug)) s.push(slug);
  for (const slug of healerSubjects || []) if (s.length < 3 && !s.includes(slug)) s.push(slug);
  return s.slice(0, 3);
};

const summary = [];
for (const [slug, entries] of Object.entries(work)) {
  const h = healers.get(slug);
  const wanted = Math.min(10, entries.reduce((a, e) => a + (e.t === 'video' ? (e.n || 1) : Math.ceil((e.n || 1) / 2)), 0));
  if (!h?.youtube_url) { summary.push({ slug, wanted, added: 0, why: 'no YouTube channel on the listing' }); continue; }
  let channel;
  try { channel = await getChannel(h.youtube_url); } catch (e) { summary.push({ slug, wanted, added: 0, why: e.message }); continue; }
  if (!channel) { summary.push({ slug, wanted, added: 0, why: 'channel not found' }); continue; }
  const top = (await getTopUploads(channel, 250, 250)).filter((v) =>
    (v.seconds ?? 0) >= 120 && !/#shorts/i.test(v.title) && !DISEASE_WORDS.test(`${v.title}`) && !ours.get(slug)?.has(v.id));
  const leftTitles = entries.flatMap((e) => titlesIn(e.text));
  const pick = [];
  for (const lt of leftTitles) {
    const best = top.filter((v) => !pick.includes(v)).map((v) => [overlap(lt, v.title), v]).sort((a, b) => b[0] - a[0])[0];
    if (best && best[0] >= 0.6) pick.push(best[1]);
  }
  const matched = pick.length;
  for (const v of top) {
    if (pick.length >= wanted) break;
    if (!pick.includes(v) && WELLBEING.test(v.title)) pick.push(v);
  }
  const chosen = pick.slice(0, Math.min(10, Math.max(wanted, matched)));
  if (!chosen.length) { summary.push({ slug, wanted, added: 0, why: 'no matching or wellbeing titles among its most-viewed uploads' }); continue; }
  const plan = {
    healer: { healer_slug: slug },
    videos: chosen.map((v) => ({ title: v.title, url: v.url, subjects: subjectsFor(v.title, h.subject_slugs) })),
    books: [], courses: [], free_resources: [],
    sprint: {
      sprint: 'health-restore-2026-11-12',
      kind: 'videos',
      note: 'Videos left out under the old health rule, put back under the new one (owner, 12 Nov 2026): titles matching the left-out notes first, then the channel\'s most-viewed wellbeing titles (YouTube Data API views).',
      views: Object.fromEntries(chosen.map((v) => [v.id, v.views])),
      left_out_notes: entries.map((e) => e.text),
    },
  };
  fs.writeFileSync(`${DIR}/${slug}-videos.json`, `${JSON.stringify(plan, null, 2)}\n`);
  summary.push({ slug, wanted, added: chosen.length, matched: Math.min(matched, chosen.length) });
}
fs.writeFileSync(`${DIR}/videos-summary.json`, `${JSON.stringify(summary, null, 1)}\n`);
const tot = summary.reduce((a, s) => ({ wanted: a.wanted + s.wanted, added: a.added + s.added, matched: a.matched + (s.matched || 0) }), { wanted: 0, added: 0, matched: 0 });
console.log(summary.length, 'listings', tot, summary.filter((s) => !s.added).length, 'with none');

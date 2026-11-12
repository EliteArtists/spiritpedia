// Health restore, videos, second pass (owner, 12 Nov 2026). The first pass
// (videos.mjs) never took a title with a health word in it. The owner has since
// ruled that practice routines naming a condition stay in (arthritis, immune,
// blood pressure qigong, Tai Chi for Diabetes); only a cure or treatment claim,
// COVID and the like stay out. For each listing in the first pass's work, this
// takes the channel's most-viewed titles that (a) carry a health word, (b) are
// a practice (qigong, yoga, breathing, meditation, tapping, routine...), and
// (c) make no claim: left-out titles first, then most-viewed, up to as many as
// were left out, at most 10 videos restored per listing across both passes.
// Writes <slug>-videos-2.json plans for review; inserts nothing.
//
//   node docs/content-audits/health-restore-2026-11-12/videos-2.mjs <work.json> <live-healers.json>
//
// Reads channels through the YouTube Data API only (scripts/lib/youtube.mjs).

import fs from 'node:fs';
import { getChannel, getTopUploads } from '../../../scripts/lib/youtube.mjs';
import { DISEASE_WORDS } from '../../../scripts/lib/health.mjs';

const [workPath, healersPath] = process.argv.slice(2);
const DIR = 'docs/content-audits/health-restore-2026-11-12';
const work = JSON.parse(fs.readFileSync(workPath, 'utf8')).video;
const healers = new Map(JSON.parse(fs.readFileSync(healersPath, 'utf8')).map((h) => [h.healer_slug, h]));

const envFile = fs.readFileSync('web/.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
const liveIds = async (slug) => {
  const rows = await (await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/videos?select=platform_url&healer_slug=eq.${slug}`, { headers: H })).json();
  return new Set(rows.map((v) => (/[?&]v=([\w-]{11})/.exec(v.platform_url || '') || [])[1]).filter(Boolean));
};

const PRACTICE = /qi ?gong|chi kung|tai chi|taiji|yoga|breath|pranayama|meditat|nidra|tapping|\beft\b|reiki|routine|exercise|practice|flow|stretch|sequence|session|massage|movement|relax|visuali[sz]|healing sounds?|sound bath|bowl|frequenc|\bhz\b|mudra|mantra|prayer|self.?care|acupressure/i;
// A claim, or out for another reason (owner, 12 Nov 2026: COVID videos removed).
const CLAIM = /\b(cure[sd]?|curing|incurable|treat(?:s|ed|ing|ment)?|reverse[sd]?|reversing|eliminat\w*|get rid of|beat(?:s|ing)?\b|fight(?:s|ing)? (?:cancer|disease|illness)|prevent\w* (?:cancer|disease|illness)|cancer\w*|tumou?r\w*|covid\w*|corona ?virus|pandemic|vaccin\w*|medication|drug.?free|instead of (?:a |your )?doctor|stop (?:your|taking) \w+|miracle|instant(?:ly)? (?:heal|relief)|autis\w*|alzheimer\w*|dementia|psychedel\w*|ayahuasca)\b/i;
const OFF = /\bnews\b|election|politic|trump|biden|government|trailer|teaser|promo|announcement|giveaway|#shorts/i;
const words = (s) => new Set(String(s).toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, ' ').split(/\s+/).filter((w) => w.length > 2));
const overlap = (a, b) => {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
};
const titlesIn = (text) => {
  const out = [];
  for (const m of String(text).matchAll(/["“'‘]([^"”'’]{8,140})["”'’]/g)) out.push(m[1]);
  const after = /(?:youtube|videos?)[^:]*:\s*(.+)$/i.exec(text);
  if (after) out.push(...after[1].split(/[,;]| and /).map((s) => s.trim()).filter((s) => s.length > 6));
  return out;
};
const SUBJECTS = [
  [/meditat|guided|sleep|relax|body scan|nidra/i, 'meditation'],
  [/breath|pranayama/i, 'breathwork'],
  [/bowl|sound bath|sound heal|frequenc|\bhz\b|binaural/i, 'sound-healing'],
  [/yoga/i, 'yoga'],
  [/qi ?gong|chi kung/i, 'qi-gong'],
  [/tai chi|taiji/i, 'tai-chi'],
  [/tapping|\beft\b/i, 'eft-tapping'],
  [/reiki/i, 'reiki'],
  [/heal/i, 'self-healing'],
];
const subjectsFor = (title, own) => {
  const s = [];
  for (const [re, slug] of SUBJECTS) if (re.test(title) && !s.includes(slug)) s.push(slug);
  for (const slug of own || []) if (s.length < 2 && !s.includes(slug)) s.push(slug);
  return s.slice(0, 3);
};
const firstPass = (slug) => {
  const p = `${DIR}/${slug}-videos.json`;
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')).videos.length : 0;
};

const summary = [];
for (const [slug, entries] of Object.entries(work)) {
  const h = healers.get(slug);
  if (!h?.youtube_url) continue;
  const wanted = Math.min(10, entries.reduce((a, e) => a + (e.t === 'video' ? (e.n || 1) : Math.ceil((e.n || 1) / 2)), 0));
  const room = Math.min(wanted, 10 - firstPass(slug));
  if (room <= 0) { summary.push({ slug, added: 0, why: 'first pass already filled it' }); continue; }
  let channel;
  try { channel = await getChannel(h.youtube_url); } catch (e) { summary.push({ slug, added: 0, why: e.message }); if (/quota/i.test(e.message)) break; continue; }
  if (!channel) { summary.push({ slug, added: 0, why: 'channel not found' }); continue; }
  let top;
  try { top = await getTopUploads(channel, 250, 250); } catch (e) { summary.push({ slug, added: 0, why: e.message }); if (/quota/i.test(e.message)) break; continue; }
  const have = await liveIds(slug);
  const cands = top.filter((v) => (v.seconds ?? 0) >= 120 && DISEASE_WORDS.test(v.title) && PRACTICE.test(v.title)
    && !CLAIM.test(v.title) && !OFF.test(v.title) && !have.has(v.id));
  const pick = [];
  for (const lt of entries.flatMap((e) => titlesIn(e.text))) {
    const best = cands.filter((v) => !pick.includes(v)).map((v) => [overlap(lt, v.title), v]).sort((a, b) => b[0] - a[0])[0];
    if (best && best[0] >= 0.6) pick.push(best[1]);
  }
  for (const v of cands) { if (pick.length >= room) break; if (!pick.includes(v)) pick.push(v); }
  const chosen = pick.slice(0, room);
  if (!chosen.length) { summary.push({ slug, added: 0, why: 'no practice titles with a health word' }); continue; }
  fs.writeFileSync(`${DIR}/${slug}-videos-2.json`, `${JSON.stringify({
    healer: { healer_slug: slug },
    videos: chosen.map((v) => ({ title: v.title, url: v.url, subjects: subjectsFor(v.title, h.subject_slugs) })),
    books: [], courses: [], free_resources: [],
    sprint: {
      sprint: 'health-restore-2026-11-12', kind: 'videos-2',
      note: 'Second pass (owner, 12 Nov 2026): practice routines that name a condition, with no cure or treatment claim; most-viewed first (YouTube Data API views).',
      views: Object.fromEntries(chosen.map((v) => [v.id, v.views])),
    },
  }, null, 2)}\n`);
  summary.push({ slug, added: chosen.length });
}
fs.writeFileSync(`${DIR}/videos-2-summary.json`, `${JSON.stringify(summary, null, 1)}\n`);
console.log(summary.length, 'listings,', summary.reduce((a, s) => a + s.added, 0), 'videos,', summary.filter((s) => s.added).length, 'plans');

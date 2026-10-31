// Insight Timer sprint 1: progress, checks and inserts for a range of ranks.
//
//   node docs/content-audits/insight-timer-sprint-1/sprint.mjs status
//   node docs/content-audits/insight-timer-sprint-1/sprint.mjs check  <from> <to> --env dev|live
//   node docs/content-audits/insight-timer-sprint-1/sprint.mjs insert <from> <to> --env dev|live
//   node docs/content-audits/insight-timer-sprint-1/sprint.mjs summary
//
// progress.json is the queue (ranked from insight-timer-faculty.json). A
// teacher's state comes from the files: a plan docs/content-audits/<slug>.json
// with sprint.hub "insight-timer" and sprint.rank, a skipped/<slug>.json, and the plan's .<env>.inserted.json.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DIR = 'docs/content-audits/insight-timer-sprint-1';
const HUB = 'insight-timer';
const AUDITS = 'docs/content-audits';
const [cmd, from, to] = process.argv.slice(2);
const envName = process.argv[process.argv.indexOf('--env') + 1];

const progress = JSON.parse(fs.readFileSync(`${DIR}/progress.json`, 'utf8'));
const plans = {};
for (const f of fs.readdirSync(AUDITS)) {
  if (!f.endsWith('.json') || f.includes('.inserted') || f.includes('rolled-back')) continue;
  try {
    const p = JSON.parse(fs.readFileSync(`${AUDITS}/${f}`, 'utf8'));
    if (p.sprint?.rank && p.sprint.hub === HUB) plans[p.sprint.rank] = { file: `${AUDITS}/${f}`, plan: p };
  } catch { /* not a plan */ }
}
const skipped = {};
for (const f of fs.existsSync(`${DIR}/skipped`) ? fs.readdirSync(`${DIR}/skipped`) : []) {
  const s = JSON.parse(fs.readFileSync(`${DIR}/skipped/${f}`, 'utf8'));
  skipped[s.rank] = s;
}

function state(q) {
  if (skipped[q.rank]) return 'skipped';
  const p = plans[q.rank];
  if (!p) return 'todo';
  if (fs.existsSync(p.file.replace(/\.json$/, '.live.inserted.json'))) return 'live';
  if (fs.existsSync(p.file.replace(/\.json$/, '.dev.inserted.json'))) return 'dev';
  return 'planned';
}

function save() {
  for (const q of progress.queue) {
    q.status = state(q);
    q.plan = plans[q.rank]?.file || null;
    q.skip_reason = skipped[q.rank]?.reason || null;
  }
  progress.updated = new Date().toISOString();
  fs.writeFileSync(`${DIR}/progress.json`, `${JSON.stringify(progress, null, 1)}\n`);
}

const inRange = (q) => q.rank >= Number(from) && q.rank <= Number(to);

if (cmd === 'status') {
  save();
  const counts = {};
  progress.queue.forEach((q) => { counts[q.status] = (counts[q.status] || 0) + 1; });
  console.log(counts);
  const listed = progress.queue.filter((q) => ['planned', 'dev', 'live'].includes(q.status)).length;
  console.log(`Teachers with a plan: ${listed} of target ${progress.target}`);
} else if (cmd === 'check' || cmd === 'insert') {
  for (const q of progress.queue.filter(inRange)) {
    const p = plans[q.rank];
    if (!p) { console.log(`\n#${q.rank} ${q.name}: ${skipped[q.rank] ? `skipped (${skipped[q.rank].reason})` : 'no plan yet'}`); continue; }
    console.log(`\n#${q.rank} ${q.name} (${path.basename(p.file)})`);
    const args = ['scripts/ingest.mjs', p.file, '--env', envName];
    if (cmd === 'insert') args.push('--insert');
    try {
      const out = execFileSync('node', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      console.log(out.split('\n').filter((l) => /^(To add|UNSOLVED|PROBLEMS|Decided|Notes|  - |Inserted|Healer|Teaches)/.test(l)).join('\n'));
    } catch (e) {
      console.log(`FAILED:\n${(e.stdout || '').split('\n').slice(-25).join('\n')}${e.stderr || ''}`);
    }
  }
  save();
} else if (cmd === 'summary') {
  save();
  const rows = [];
  const flagged = [];
  let email = { yes: 0, 'contact form': 0, none: 0 };
  for (const q of progress.queue) {
    const p = plans[q.rank];
    if (!p) continue;
    const { plan } = p;
    const c = plan.healer.create;
    const e = plan.sprint.email || (c.contact_email ? 'yes' : 'none');
    email[e] = (email[e] || 0) + 1;
    rows.push(`| ${q.rank} | ${c.name} | ${c.tier}: ${plan.sprint.tier_evidence} | ${plan.videos.length} | ${plan.books.length} | ${plan.courses.length} | ${plan.free_resources.length} | ${e} |`);
    for (const f of plan.sprint.flags || []) flagged.push(`- ${c.name} (http://localhost:3000/healers/${plan.healer.healer_slug}): ${f}`);
  }
  console.log('| # | Name | Tier + evidence | Videos | Books | Offerings | Free | Email |\n| -- | -- | -- | -- | -- | -- | -- | -- |');
  console.log(rows.join('\n'));
  console.log(`\nEmail coverage: ${JSON.stringify(email)} of ${rows.length}`);
  console.log('\nSkipped:');
  Object.values(skipped).sort((a, b) => a.rank - b.rank).forEach((s) => console.log(`- #${s.rank} ${s.name}: ${s.reason}`));
  console.log('\nFLAGGED:');
  console.log(flagged.join('\n'));
} else {
  console.error('Usage: sprint.mjs status | check <from> <to> --env dev|live | insert <from> <to> --env dev|live | summary');
  process.exit(1);
}

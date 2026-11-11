// Copies what the content work leaves waiting into ops_items (migration 0045),
// for Admin → Ops: plans held for the owner, listings on dev that aren't on
// live, README §18.7's retry list, and the sprint reports. The repo is the
// source of truth; every sync replaces the table whole.
//
//   node scripts/ops-sync.mjs [--env dev|live] [--dry]   (default live)
//
// --env is the database written to. Dev-only listings always compare dev with
// live, so both env files are read. --dry prints the counts and writes nothing.
// Keys are read from the env files, never printed. Run from the repo root.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { devOnly, heldPlanRow, isLivePlanPath, isSprintReport, parseRetryList } from './lib/ops.mjs';

const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };

const args = process.argv.slice(2);
const target = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'live';
const dry = args.includes('--dry');
if (!PROJECTS[target]) {
  console.error('Usage: node scripts/ops-sync.mjs [--env dev|live] [--dry]');
  process.exit(1);
}

function connect(envName) {
  const env = Object.fromEntries(
    fs.readFileSync(ENV_FILES[envName], 'utf8').split('\n')
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
  );
  const base = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base?.includes(PROJECTS[envName]) || !key) {
    console.error(`${ENV_FILES[envName]} does not point at the ${envName} project, or has no service key.`);
    process.exit(1);
  }
  return { base, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } };
}
const db = { dev: connect('dev'), live: connect('live') };

// Paged by id: PostgREST returns at most 1,000 rows a request.
async function allListings(envName) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${db[envName].base}/rest/v1/healers?select=healer_slug,name,entity_type,created_at&order=id`,
      { headers: { ...db[envName].headers, Range: `${from}-${from + 999}` } });
    if (!r.ok) { console.error(`${envName} listings: HTTP ${r.status}`); process.exit(1); }
    const page = await r.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

// The last commit date of a file, or its modified date when it isn't committed.
function fileDate(rel) {
  try {
    const d = execFileSync('git', ['log', '-1', '--format=%cs', '--', rel], { encoding: 'utf8' }).trim();
    if (d) return d;
  } catch { /* not a git checkout */ }
  return fs.statSync(rel).mtime.toISOString().slice(0, 10);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith('.json') ? [p] : [];
  });
}

const rows = [];

// 1. Held plans.
const plansBySlug = new Map();
for (const rel of walk('docs/content-audits')) {
  let plan;
  try { plan = JSON.parse(fs.readFileSync(rel, 'utf8')); } catch { continue; }
  if (!plan?.healer || !isLivePlanPath(rel)) continue;
  if (plan.healer.healer_slug && !rel.endsWith('-teachers.json')) plansBySlug.set(plan.healer.healer_slug, rel);
  const row = heldPlanRow(plan, rel);
  if (row) rows.push({ ...row, source_date: fileDate(rel) });
}

// 2. Listings on dev and not on live.
const [devRows, liveRows] = await Promise.all([allListings('dev'), allListings('live')]);
for (const r of devOnly(devRows, liveRows.map((x) => x.healer_slug))) {
  const plan = plansBySlug.get(r.healer_slug) || null;
  const held = rows.find((x) => x.kind === 'held_plan' && x.slug === r.healer_slug);
  rows.push({
    kind: 'dev_only_plan',
    item_key: r.healer_slug,
    title: r.name || r.healer_slug,
    slug: r.healer_slug,
    reason: held ? `Held: ${held.reason}` : plan ? 'On dev, not on live' : 'On dev, not on live; no plan file found',
    path: plan,
    source_date: r.created_at ? r.created_at.slice(0, 10) : null,
    detail: { entity_type: r.entity_type || 'individual' },
  });
}

// 3. The README's retry list.
for (const r of parseRetryList(fs.readFileSync('README.md', 'utf8'))) {
  rows.push({ kind: 'retry', item_key: r.name, title: r.name, slug: null, reason: r.reason, path: 'README.md §18.7', source_date: null, detail: {} });
}

// 4. Sprint reports.
for (const name of fs.readdirSync('docs/reports').filter(isSprintReport).sort()) {
  const rel = `docs/reports/${name}`;
  const text = fs.readFileSync(rel, 'utf8');
  const title = (text.match(/^#\s+(.+)$/m)?.[1] || name).trim();
  const first = text.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim() || null;
  rows.push({ kind: 'sprint_report', item_key: rel, title, slug: null, reason: first ? first.slice(0, 300) : null, path: rel, source_date: name.slice(0, 10), detail: {} });
}

const counts = Object.fromEntries(['held_plan', 'dev_only_plan', 'retry', 'sprint_report'].map((k) => [k, rows.filter((r) => r.kind === k).length]));
rows.push({ kind: 'sync_run', item_key: 'last', title: 'Last sync', slug: null, reason: JSON.stringify(counts), path: null, source_date: null, detail: { counts, target } });

console.log(`To ${target}: ${counts.held_plan} held plans, ${counts.dev_only_plan} on dev only, ${counts.retry} to retry, ${counts.sprint_report} sprint reports`);
if (dry) process.exit(0);

// Replace whole: the repo is the source of truth.
const { base, headers } = db[target];
const del = await fetch(`${base}/rest/v1/ops_items?id=gte.0`, { method: 'DELETE', headers });
if (!del.ok) {
  const text = await del.text();
  console.error(/ops_items/.test(text) && del.status === 404
    ? `ops_items isn't on ${target} yet: run migration 0045 there first.`
    : `DELETE ops_items: HTTP ${del.status} ${text}`);
  process.exit(1);
}
const now = new Date().toISOString();
const ins = await fetch(`${base}/rest/v1/ops_items`, {
  method: 'POST', headers: { ...headers, Prefer: 'return=minimal' },
  body: JSON.stringify(rows.map((r) => ({ ...r, synced_at: now }))),
});
if (!ins.ok) { console.error(`INSERT ops_items: HTTP ${ins.status} ${await ins.text()}`); process.exit(1); }
console.log(`Synced ${rows.length - 1} items to ${target} at ${now}.`);

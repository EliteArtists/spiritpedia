// The item-link fragment cleanup (owner, 11 Nov 2026): strip the made-up
// #fragments the report found, keep the real anchors, and keep Jon
// Kabat-Zinn's three free resources as they are (owner's decision).
//
//   node scripts/fragment-apply.mjs [--env dev|live]                  dry run (default live)
//   node scripts/fragment-apply.mjs --env live --apply --after-0047   change the rows
//
// The strip list comes from docs/reports/2026-11-11-item-link-fragments.md
// (scripts/fragment-report.mjs), never from fetching a website: the only
// network calls are to Supabase. A dry run prints exactly what would change
// and writes nothing.
//
// ONLY AFTER 0047. Before migration 0047 several items on one page would
// clash on the old key. PostgREST can't read pg_constraint, and every probe
// that could tell the keys apart would risk a write, so --apply also needs
// --after-0047: pass it once 0047's check row on that database reads 2, 0.
//
// A row is skipped and reported when stripping would make it the same item as
// another (same link and title; for an offering, on the same listing), or
// when it is no longer in the database with its fragment. Each PATCH is
// guarded by the old link, so a row changed since the report is left alone.
// With --apply, a before-and-after log goes to
// docs/reports/2026-11-11-item-link-fragments-applied.md. Keys are read from
// the env file, never printed.
import fs from 'node:fs';
import { parseReportTable, planStrips, stripFragment, wantsStrip } from './lib/fragments.mjs';

const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };
const REPORT = 'docs/reports/2026-11-11-item-link-fragments.md';
const LOG = 'docs/reports/2026-11-11-item-link-fragments-applied.md';
const URL_COL = { courses: 'course_url', free_resources: 'resource_url' };

const args = process.argv.slice(2);
const envName = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'live';
const apply = args.includes('--apply');
if (!PROJECTS[envName]) {
  console.error('Usage: node scripts/fragment-apply.mjs [--env dev|live] [--apply --after-0047]');
  process.exit(1);
}
if (apply && !args.includes('--after-0047')) {
  console.error(`Refusing to apply: pass --after-0047 once migration 0047's check row on ${envName} reads 2, 0 (new keys in, old keys gone). The constraints can't be read over the REST API.`);
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(ENV_FILES[envName], 'utf8').split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE?.includes(PROJECTS[envName]) || !KEY) {
  console.error(`${ENV_FILES[envName]} does not point at the ${envName} project, or has no service key.`);
  process.exit(1);
}
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
async function get(p) {
  const r = await fetch(`${BASE}/rest/v1/${p}`, { headers: { ...headers, Range: '0-9999' } });
  if (!r.ok) throw new Error(`GET ${p.split('?')[0]}: HTTP ${r.status}`);
  return r.json();
}

const reportRows = parseReportTable(fs.readFileSync(REPORT, 'utf8'));

// The rows with a fragment now, and every row on each link they'd become.
const dbRows = [];
for (const table of Object.keys(URL_COL)) {
  const col = URL_COL[table];
  const rows = await get(`${table}?select=id,title,${col},healer_id,healers(healer_slug)&${col}=like.*%23*`);
  for (const r of rows) dbRows.push({ table, id: r.id, title: r.title, url: r[col], listing: r.healers?.healer_slug || null, healer_id: r.healer_id });
}
const onStripped = new Map();
for (const d of dbRows) {
  const after = stripFragment(d.url);
  const k = `${d.table}:${after}`;
  if (onStripped.has(k)) continue;
  onStripped.set(k, await get(`${d.table}?select=id,title,healer_id&${URL_COL[d.table]}=eq.${encodeURIComponent(after)}`));
}

const { changes, skipped } = planStrips(reportRows, dbRows, onStripped);
const kind = (t) => (t === 'courses' ? 'offering' : 'free resource');

console.log(`${apply ? 'APPLYING' : 'DRY RUN'} on ${envName}. From the report: ${reportRows.length} items, ${reportRows.filter(wantsStrip).length} proposed to strip.`);
console.log(`\nWould strip ${changes.length}:`);
for (const c of changes) console.log(`  ${kind(c.table)} ${c.listing} — ${c.title}\n    ${c.before}\n  → ${c.after}`);
console.log(`\nSkipped ${skipped.length}:`);
for (const s of skipped) console.log(`  ${kind(s.table)} ${s.listing} — ${s.title}: ${s.why}`);
if (!apply) { console.log('\nNothing changed (dry run).'); process.exit(0); }

const done = [];
const failed = [];
for (const c of changes) {
  const col = URL_COL[c.table];
  const r = await fetch(`${BASE}/rest/v1/${c.table}?id=eq.${c.id}&${col}=eq.${encodeURIComponent(c.before)}`, {
    method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ [col]: c.after }),
  });
  const body = r.ok ? await r.json() : await r.text();
  if (r.ok && body.length === 1) done.push(c);
  else failed.push({ ...c, why: r.ok ? 'changed since the report; left alone' : `HTTP ${r.status} ${body}` });
}

const row = (c, extra = '') => `| ${c.title.replace(/\|/g, '/')} | ${kind(c.table)} | ${c.listing || '—'} | ${c.before} | ${c.after}${extra} |`;
const log = [
  `# Item-link fragments applied on ${envName} (${new Date().toISOString()})`,
  '',
  `From \`${REPORT}\`, after migration 0047. The owner's decision (11 Nov 2026): keep the real anchors, strip the rest, and keep Jon Kabat-Zinn's three free resources as they are.`,
  '',
  `- **Stripped:** ${done.length}.`,
  `- **Skipped:** ${skipped.length}.`,
  `- **Failed:** ${failed.length}.`,
  '',
  '## Stripped', '', '| Item | Kind | Listing | Before | After |', '| :-- | :-- | :-- | :-- | :-- |', ...done.map((c) => row(c)), '',
  '## Skipped', '', '| Item | Kind | Listing | Why |', '| :-- | :-- | :-- | :-- |',
  ...skipped.map((s) => `| ${s.title} | ${kind(s.table)} | ${s.listing || '—'} | ${s.why} |`), '',
  ...(failed.length ? ['## Failed', '', '| Item | Kind | Listing | Before | After / why |', '| :-- | :-- | :-- | :-- | :-- |', ...failed.map((c) => row(c, ` (${c.why})`)), ''] : []),
  'To undo a row, set its link back to the Before value.', '',
];
fs.writeFileSync(LOG, log.join('\n'));
console.log(`\nStripped ${done.length}, failed ${failed.length}. Log: ${LOG}`);

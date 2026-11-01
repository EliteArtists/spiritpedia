// Fixes for the 100-teacher content run (1 Nov 2026), for rows already on dev.
//   - seeking-the-heart-of-wisdom-the-path-of-insight-meditation: Joseph Goldstein
//     added as co-author (the book is Jack Kornfield's listing; Goldstein's plan
//     left it out to avoid a duplicate).
//
//   node docs/content-audits/content-run-fixes-2026-11-01.mjs --env dev|live [--apply | --rollback]
//
// Healer fields are copied from the teacher's plan (create.<field>). --apply saves
// the old values to content-run-fixes-2026-11-01.<env>.log.json first;
// --rollback puts them back. Keys are read, never printed.
import fs from 'node:fs';

const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };
const FIXES = {};
const CO_AUTHORS = { 'seeking-the-heart-of-wisdom-the-path-of-insight-meditation': ['joseph-goldstein'] };

const args = process.argv.slice(2);
const envName = args[args.indexOf('--env') + 1];
if (!PROJECTS[envName]) { console.error('Usage: content-run-fixes-2026-11-01.mjs --env dev|live [--apply | --rollback]'); process.exit(1); }
const env = Object.fromEntries(
  fs.readFileSync(ENV_FILES[envName], 'utf8').split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE?.includes(PROJECTS[envName]) || !KEY) { console.error(`${ENV_FILES[envName]} does not point at ${envName}`); process.exit(1); }
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const logPath = `docs/content-audits/content-run-fixes-2026-11-01.${envName}.log.json`;

async function call(method, p, body) {
  const r = await fetch(`${BASE}/rest/v1/${p}`, { method, headers: { ...headers, Prefer: 'return=representation' }, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error(`${method} ${p.split('?')[0]}: ${r.status} ${await r.text()}`);
  return r.json();
}

if (args.includes('--rollback')) {
  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  for (const [slug, old] of Object.entries(log.old)) await call('PATCH', `healers?healer_slug=eq.${slug}`, old);
  for (const [slug, old] of Object.entries(log.books || {})) await call('PATCH', `books?slug=eq.${slug}`, old);
  fs.unlinkSync(logPath);
  console.log(`Put back ${Object.keys(log.old).length} listings and ${Object.keys(log.books || {}).length} books on ${envName}.`);
  process.exit(0);
}

const log = { env: envName, old: {}, books: {} };
const changes = [];
for (const [slug, fields] of Object.entries(FIXES)) {
  const want = JSON.parse(fs.readFileSync(`docs/content-audits/${slug}.json`, 'utf8')).healer.create;
  const [row] = await call('GET', `healers?select=${fields.join(',')}&healer_slug=eq.${slug}`);
  if (!row) { console.log(`${slug}: not on ${envName}, skipped`); continue; }
  const patch = Object.fromEntries(fields.filter((f) => JSON.stringify(row[f]) !== JSON.stringify(want[f])).map((f) => [f, want[f]]));
  if (!Object.keys(patch).length) { console.log(`${slug}: already up to date`); continue; }
  log.old[slug] = Object.fromEntries(Object.keys(patch).map((f) => [f, row[f]]));
  changes.push(['healers', slug, patch]);
  console.log(`${slug}: ${Object.keys(patch).map((f) => (f === 'tier' ? `tier ${row[f]} → ${patch[f]}` : f)).join(', ')}`);
}
for (const [slug, add] of Object.entries(CO_AUTHORS)) {
  const [book] = await call('GET', `books?select=title,healer_slug,co_healer_slugs&slug=eq.${slug}`);
  if (!book) { console.log(`${slug}: not on ${envName}, skipped`); continue; }
  const before = book.co_healer_slugs || [];
  const missing = add.filter((x) => x !== book.healer_slug && !before.includes(x));
  for (const x of missing) {
    if (!(await call('GET', `healers?select=id&healer_slug=eq.${x}`)).length) { console.log(`${slug}: ${x} not on ${envName} yet, skipped`); process.exit(1); }
  }
  if (!missing.length) { console.log(`${slug}: already up to date`); continue; }
  log.books[slug] = { co_healer_slugs: before };
  changes.push(['books', slug, { co_healer_slugs: [...before, ...missing] }]);
  console.log(`${book.title}: co-authors + ${missing.join(', ')}`);
}
if (!args.includes('--apply') || !changes.length) process.exit(0);
fs.writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`);
for (const [table, slug, patch] of changes) await call('PATCH', `${table}?${table === 'books' ? 'slug' : 'healer_slug'}=eq.${slug}`, patch);
console.log(`Applied ${changes.length} fixes on ${envName}. Log: ${logPath}`);

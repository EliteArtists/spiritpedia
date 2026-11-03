// Location audit (owner, 3 Nov 2026): the published base of living listings
// that had no city or country. audit.json holds every finding with its
// source; only "found, high confidence" rows carry `apply` and are written.
// Doubtful and unpublished ones are left blank for the owner (report:
// docs/reports/2026-11-03-location-audit.md). place_id follows by trigger
// (resolve_place, migration 0033).
//
//   node docs/content-audits/location-audit-2026-11-03/apply.mjs --env dev|live [--apply | --rollback]
//
// A listing that already has a city or country is never touched. --apply
// logs each row as it was to apply.<env>.log.json; --rollback puts them back.
// Keys are read, never printed.
import fs from 'node:fs';

const DIR = 'docs/content-audits/location-audit-2026-11-03';
const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };
const args = process.argv.slice(2);
const envName = args[args.indexOf('--env') + 1];
if (!PROJECTS[envName]) { console.error('Usage: apply.mjs --env dev|live [--apply | --rollback]'); process.exit(1); }
const env = Object.fromEntries(
  fs.readFileSync(ENV_FILES[envName], 'utf8').split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE?.includes(PROJECTS[envName]) || !KEY) { console.error(`${ENV_FILES[envName]} does not point at ${envName}`); process.exit(1); }
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const logPath = `${DIR}/apply.${envName}.log.json`;

async function call(method, p, body) {
  const r = await fetch(`${BASE}/rest/v1/${p}`, { method, headers: { ...headers, Prefer: 'return=representation' }, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error(`${method} ${p.split('?')[0]}: ${r.status} ${await r.text()}`);
  return r.json();
}

if (args.includes('--rollback')) {
  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  for (const row of log.rows) await call('PATCH', `healers?id=eq.${row.id}`, { city: row.city, country: row.country });
  fs.unlinkSync(logPath);
  console.log(`Rolled back ${log.rows.length} listings on ${envName}.`);
  process.exit(0);
}

const audit = JSON.parse(fs.readFileSync(`${DIR}/audit.json`, 'utf8')).filter((x) => x.apply);
const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : { env: envName, rows: [] };
const done = new Set(log.rows.map((r) => r.slug));
let changed = 0, skipped = 0, placed = 0;
for (const x of audit) {
  const [h] = await call('GET', `healers?select=id,healer_slug,city,country,place_id&healer_slug=eq.${encodeURIComponent(x.slug)}`);
  if (!h) { console.log(`  ? ${x.slug}: not on ${envName}`); skipped += 1; continue; }
  if (done.has(x.slug)) { if (h.place_id) placed += 1; continue; }
  if (h.city || h.country) { console.log(`  = ${x.slug}: already has ${h.city || ''} ${h.country || ''}`); skipped += 1; continue; }
  if (!args.includes('--apply')) { console.log(`  would set ${x.slug}: ${x.apply.city || '(no town)'}, ${x.apply.country}`); changed += 1; continue; }
  log.rows.push({ id: h.id, slug: x.slug, city: h.city, country: h.country });
  fs.writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`);
  const [after] = await call('PATCH', `healers?id=eq.${h.id}`, { city: x.apply.city, country: x.apply.country });
  if (after.place_id) placed += 1;
  changed += 1;
}
console.log(`${args.includes('--apply') ? 'Set' : 'Would set'} ${changed} on ${envName}; skipped ${skipped}; with a place now: ${placed}.`);

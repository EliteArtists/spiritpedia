// Owner decisions on the Omega + Commune sprint report (31 Oct 2026), for rows
// already on dev. Live gets the same values from the updated plans at insert.
//   - omega-institute: superhero by editorial stature.
//   - eoin-finn: luminary by published student count.
//   - janet-stone: her meditation teacher's name taken out of the bio.
//
//   node docs/content-audits/owner-fixes-omega-commune-2026-10-31.mjs --env dev|live [--apply | --rollback]
//
// Each field is copied from the teacher's plan (create.<field>). --apply saves
// the old values to owner-fixes-omega-commune-2026-10-31.<env>.log.json first;
// --rollback puts them back. Keys are read, never printed.
import fs from 'node:fs';

const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };
const FIXES = { 'omega-institute': ['tier'], 'eoin-finn': ['tier'], 'janet-stone': ['bio'] };

const args = process.argv.slice(2);
const envName = args[args.indexOf('--env') + 1];
if (!PROJECTS[envName]) { console.error('Usage: owner-fixes-omega-commune-2026-10-31.mjs --env dev|live [--apply | --rollback]'); process.exit(1); }
const env = Object.fromEntries(
  fs.readFileSync(ENV_FILES[envName], 'utf8').split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE?.includes(PROJECTS[envName]) || !KEY) { console.error(`${ENV_FILES[envName]} does not point at ${envName}`); process.exit(1); }
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const logPath = `docs/content-audits/owner-fixes-omega-commune-2026-10-31.${envName}.log.json`;

async function call(method, p, body) {
  const r = await fetch(`${BASE}/rest/v1/${p}`, { method, headers: { ...headers, Prefer: 'return=representation' }, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error(`${method} ${p.split('?')[0]}: ${r.status} ${await r.text()}`);
  return r.json();
}

if (args.includes('--rollback')) {
  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  for (const [slug, old] of Object.entries(log.old)) await call('PATCH', `healers?healer_slug=eq.${slug}`, old);
  fs.unlinkSync(logPath);
  console.log(`Put back ${Object.keys(log.old).length} listings on ${envName}.`);
  process.exit(0);
}

const log = { env: envName, old: {} };
const changes = [];
for (const [slug, fields] of Object.entries(FIXES)) {
  const want = JSON.parse(fs.readFileSync(`docs/content-audits/${slug}.json`, 'utf8')).healer.create;
  const [row] = await call('GET', `healers?select=${fields.join(',')}&healer_slug=eq.${slug}`);
  if (!row) { console.log(`${slug}: not on ${envName}, skipped`); continue; }
  const patch = Object.fromEntries(fields.filter((f) => row[f] !== want[f]).map((f) => [f, want[f]]));
  if (!Object.keys(patch).length) { console.log(`${slug}: already up to date`); continue; }
  log.old[slug] = Object.fromEntries(Object.keys(patch).map((f) => [f, row[f]]));
  changes.push([slug, patch]);
  console.log(`${slug}: ${Object.keys(patch).map((f) => (f === 'tier' ? `tier ${row[f]} → ${patch[f]}` : f)).join(', ')}`);
}
if (!args.includes('--apply') || !changes.length) process.exit(0);
fs.writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`);
for (const [slug, patch] of changes) await call('PATCH', `healers?healer_slug=eq.${slug}`, patch);
console.log(`Applied ${changes.length} fixes on ${envName}. Log: ${logPath}`);

// Owner decisions on Insight Timer sprint 1 (31 Oct 2026):
//   - Katherine Woodward Thomas (died 2026) moves to Ascended Master, as §18.4 says.
//   - Two free resources titled for conditions come off (health-claim rule).
//
//   node docs/content-audits/owner-fixes-2026-10-31.mjs --env dev|live [--apply | --rollback]
//
// --apply saves the rows as they were to owner-fixes-2026-10-31.<env>.log.json
// first; --rollback puts them back. Keys are read, never printed.
import fs from 'node:fs';

const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };
const args = process.argv.slice(2);
const envName = args[args.indexOf('--env') + 1];
if (!PROJECTS[envName]) { console.error('Usage: owner-fixes-2026-10-31.mjs --env dev|live [--apply | --rollback]'); process.exit(1); }
const env = Object.fromEntries(
  fs.readFileSync(ENV_FILES[envName], 'utf8').split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE?.includes(PROJECTS[envName]) || !KEY) { console.error(`${ENV_FILES[envName]} does not point at ${envName}`); process.exit(1); }
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const logPath = `docs/content-audits/owner-fixes-2026-10-31.${envName}.log.json`;

const HEALER = 'katherine-woodward-thomas';
const RESOURCES = ['3e608695-ef74-4bcd-8b5c-86e5f1a6dcdd', 'fdebbef6-fb8d-4162-bd0b-717822d4fbd5'];

async function call(method, p, body) {
  const r = await fetch(`${BASE}/rest/v1/${p}`, { method, headers: { ...headers, Prefer: 'return=representation' }, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error(`${method} ${p.split('?')[0]}: ${r.status} ${await r.text()}`);
  return r.json();
}

if (args.includes('--rollback')) {
  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  await call('PATCH', `healers?healer_slug=eq.${HEALER}`, { tier: log.tier_before });
  for (const row of log.resources) await call('POST', 'free_resources', row);
  fs.unlinkSync(logPath);
  console.log(`Put back on ${envName}: tier ${log.tier_before}, ${log.resources.length} free resources.`);
  process.exit(0);
}

const [h] = await call('GET', `healers?select=tier,death_year&healer_slug=eq.${HEALER}`);
const rows = await call('GET', `free_resources?select=*&id=in.(${RESOURCES.join(',')})`);
console.log(`${envName}: ${HEALER} tier ${h.tier} (died ${h.death_year}) → ascended_master; ${rows.length} free resources to remove: ${rows.map((r) => r.title).join(' | ')}`);
if (!args.includes('--apply')) process.exit(0);
if (fs.existsSync(logPath)) { console.error(`${logPath} exists: already applied`); process.exit(1); }
fs.writeFileSync(logPath, `${JSON.stringify({ env: envName, at: new Date().toISOString(), tier_before: h.tier, resources: rows }, null, 2)}\n`);
await call('PATCH', `healers?healer_slug=eq.${HEALER}`, { tier: 'ascended_master' });
for (const id of RESOURCES) await call('DELETE', `free_resources?id=eq.${id}`);
console.log(`Done on ${envName}. Log: ${logPath}`);

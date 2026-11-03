// Owner decisions on the location audit (3 Nov 2026):
//   - Michael Harner (died 2018) moves to Ascended Master, with his lifespan
//     (1929–2018), as §18.4 says. Ascended Masters have no base.
//
//   node docs/content-audits/location-audit-2026-11-03/owner-decisions.mjs --env dev|live [--apply | --rollback]
//
// --apply saves the row as it was to owner-decisions.<env>.log.json first;
// --rollback puts it back. Keys are read, never printed.
import fs from 'node:fs';

const DIR = 'docs/content-audits/location-audit-2026-11-03';
const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };
const args = process.argv.slice(2);
const envName = args[args.indexOf('--env') + 1];
if (!PROJECTS[envName]) { console.error('Usage: owner-decisions.mjs --env dev|live [--apply | --rollback]'); process.exit(1); }
const env = Object.fromEntries(
  fs.readFileSync(ENV_FILES[envName], 'utf8').split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE?.includes(PROJECTS[envName]) || !KEY) { console.error(`${ENV_FILES[envName]} does not point at ${envName}`); process.exit(1); }
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const logPath = `${DIR}/owner-decisions.${envName}.log.json`;

const HEALER = 'michael-harner';
const CHANGE = { tier: 'ascended_master', birth_year: 1929, death_year: 2018, city: null, country: null };

async function call(method, p, body) {
  const r = await fetch(`${BASE}/rest/v1/${p}`, { method, headers: { ...headers, Prefer: 'return=representation' }, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error(`${method} ${p.split('?')[0]}: ${r.status} ${await r.text()}`);
  return r.json();
}

if (args.includes('--rollback')) {
  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  await call('PATCH', `healers?healer_slug=eq.${HEALER}`, log.before);
  fs.unlinkSync(logPath);
  console.log(`Rolled back ${HEALER} on ${envName}.`);
  process.exit(0);
}

const [h] = await call('GET', `healers?select=${Object.keys(CHANGE).join(',')}&healer_slug=eq.${HEALER}`);
if (!h) throw new Error(`${HEALER} isn't on ${envName}`);
console.log(`${HEALER} now: ${JSON.stringify(h)}`);
if (h.tier === CHANGE.tier) { console.log('Already done.'); process.exit(0); }
if (!args.includes('--apply')) { console.log(`Would set: ${JSON.stringify(CHANGE)}`); process.exit(0); }
fs.writeFileSync(logPath, `${JSON.stringify({ env: envName, at: new Date().toISOString(), before: h }, null, 2)}\n`);
await call('PATCH', `healers?healer_slug=eq.${HEALER}`, CHANGE);
console.log(`Done: ${HEALER} is an Ascended Master (1929–2018) on ${envName}.`);

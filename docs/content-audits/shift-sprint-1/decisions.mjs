// The owner's decisions after the dev check (31 Oct 2026), applied to rows
// that are already in: six tiers raised to luminary (editorial-stature rule)
// and Devaa Haley Mitchell's Shift Network link changed to founder. Rows that
// go in later from the plans already carry these values.
//   node docs/content-audits/shift-sprint-1/decisions.mjs --env dev|live
import fs from 'node:fs';
const envName = process.argv[process.argv.indexOf('--env') + 1];
const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };
const env = Object.fromEntries(fs.readFileSync(ENV_FILES[envName], 'utf8').split('\n')
  .filter((l) => /^[A-Z_]+=/.test(l))
  .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
if (!env.NEXT_PUBLIC_SUPABASE_URL?.includes(PROJECTS[envName])) throw new Error(`${ENV_FILES[envName]} isn't the ${envName} project`);
const BASE = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const req = async (method, p, body) => {
  const r = await fetch(`${BASE}/${p}`, { method, headers, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error(`${method} ${p}: ${r.status} ${await r.text()}`);
  return r.json();
};
const log = { env: envName, at: new Date().toISOString(), changes: [] };
for (const slug of ['matthew-fox', 'richard-tarnas', 'cyndi-dale', 'philip-carr-gomm', 'robert-moss', 'stephen-dinan']) {
  const [h] = await req('GET', `healers?select=id,tier&healer_slug=eq.${slug}`);
  if (!h) { console.log(`  ${slug}: not in yet (the plan carries luminary)`); continue; }
  if (h.tier !== 'luminary') await req('PATCH', `healers?id=eq.${h.id}`, { tier: 'luminary' });
  log.changes.push({ table: 'healers', id: h.id, slug, field: 'tier', from: h.tier, to: 'luminary' });
  console.log(`  ${slug}: ${h.tier} → luminary`);
}
const [hub] = await req('GET', 'healers?select=id&healer_slug=eq.the-shift-network');
const [devaa] = await req('GET', 'healers?select=id&healer_slug=eq.devaa-haley-mitchell');
if (devaa) {
  const [link] = await req('GET', `hub_teachers?select=id,role&hub_id=eq.${hub.id}&teacher_id=eq.${devaa.id}`);
  if (link && link.role !== 'founder') await req('PATCH', `hub_teachers?id=eq.${link.id}`, { role: 'founder' });
  if (link) { log.changes.push({ table: 'hub_teachers', id: link.id, slug: 'devaa-haley-mitchell', field: 'role', from: link.role, to: 'founder' }); console.log(`  devaa-haley-mitchell: ${link.role} → founder`); }
}
fs.writeFileSync(`docs/content-audits/shift-sprint-1/decisions.${envName}.json`, `${JSON.stringify(log, null, 2)}\n`);

// Hub links: teachers already on Spiritpedia, linked to a School or an
// Organisation in hub_teachers (migration 0030), from a links file (README
// §18.7, the hub-by-hub method). New teachers come in through ingest.mjs with
// "teaches_at" instead, so they arrive with their content.
//
//   node scripts/link-hub.mjs docs/content-audits/<hub>-teachers.json --env dev             # check
//   node scripts/link-hub.mjs docs/content-audits/<hub>-teachers.json --env dev --insert    # check, then link
//   node scripts/link-hub.mjs docs/content-audits/<hub>-teachers.json --env dev --rollback  # undo the insert
//
// The links file: { "hub": "<hub-slug>", "links": [{ "teacher": "<slug>", "role": "founder" | "instructor" }] }.
// dev reads web/.env.development.local, live reads web/.env.local. Keys are
// read, never printed. Nothing is linked while anything is wrong. An insert
// writes <file>.<env>.inserted.json with every new row's id.

import fs from 'node:fs';
import path from 'node:path';

const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };
const HUB_ROLES = ['founder', 'instructor'];
const HUB_TYPES = ['school', 'organisation'];

const args = process.argv.slice(2);
const filePath = args.find((a) => a.endsWith('.json'));
const envName = args[args.indexOf('--env') + 1];
const doInsert = args.includes('--insert');
const doRollback = args.includes('--rollback');
if (!filePath || !PROJECTS[envName]) {
  console.error('Usage: node scripts/link-hub.mjs <links.json> --env dev|live [--insert | --rollback]');
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
const get = async (p) => {
  const r = await fetch(`${BASE}/rest/v1/${p}`, { headers });
  if (!r.ok) throw new Error(`GET ${p.split('?')[0]}: ${r.status} ${await r.text()}`);
  return r.json();
};
const logPath = filePath.replace(/\.json$/, `.${envName}.inserted.json`);

if (doRollback) {
  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  for (const row of log.rows) {
    const r = await fetch(`${BASE}/rest/v1/hub_teachers?id=eq.${row.id}`, { method: 'DELETE', headers });
    if (!r.ok) throw new Error(`DELETE hub_teachers ${row.id}: ${r.status} ${await r.text()}`);
  }
  fs.unlinkSync(logPath);
  console.log(`Unlinked ${log.rows.length} teacher(s) on ${envName}.`);
  process.exit(0);
}

const file = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const problems = [];
const [hub] = await get(`healers?select=id,name,entity_type&healer_slug=eq.${encodeURIComponent(file.hub)}`);
if (!hub) problems.push(`no listing "${file.hub}"`);
else if (!HUB_TYPES.includes(hub.entity_type)) problems.push(`"${hub.name}" isn't a school or organisation (it's ${hub.entity_type || 'individual'})`);

const todo = [];
const skipped = [];
for (const l of file.links || []) {
  const role = l.role || 'instructor';
  if (!HUB_ROLES.includes(role)) { problems.push(`${l.teacher}: role "${role}" isn't one of ${HUB_ROLES.join(', ')}`); continue; }
  const [teacher] = await get(`healers?select=id,name&healer_slug=eq.${encodeURIComponent(l.teacher)}`);
  if (!teacher) { problems.push(`no listing "${l.teacher}"`); continue; }
  if (!hub) continue;
  if (teacher.id === hub.id) { problems.push(`${teacher.name} can't teach at itself`); continue; }
  if ((await get(`hub_teachers?select=id&hub_id=eq.${hub.id}&teacher_id=eq.${teacher.id}`)).length) { skipped.push(teacher.name); continue; }
  todo.push({ teacher_id: teacher.id, name: teacher.name, role });
}

console.log(`Hub: ${hub ? `${hub.name} (${hub.entity_type})` : file.hub}`);
console.log(`To link on ${envName}: ${todo.length} teacher(s)`);
todo.forEach((t) => console.log(`  ${t.name} (${t.role})`));
if (skipped.length) console.log(`Already linked: ${skipped.join(', ')}`);
if (problems.length) {
  console.log('PROBLEMS (need a decision):');
  problems.forEach((p) => console.log(`  - ${p}`));
  process.exit(1);
}
if (!doInsert) process.exit(0);

const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : { env: envName, hub: file.hub, rows: [] };
for (const t of todo) {
  const r = await fetch(`${BASE}/rest/v1/hub_teachers`, {
    method: 'POST', headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ hub_id: hub.id, teacher_id: t.teacher_id, role: t.role }),
  });
  if (!r.ok) throw new Error(`INSERT hub_teachers ${t.name}: ${r.status} ${await r.text()}`);
  const [row] = await r.json();
  log.rows.push({ id: row.id, teacher: t.name, role: t.role });
  log.at = new Date().toISOString();
  fs.writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`);
  console.log(`  + ${t.name} (${t.role})`);
}
console.log(`Linked ${todo.length} teacher(s). Log: ${path.relative(process.cwd(), logPath)}`);

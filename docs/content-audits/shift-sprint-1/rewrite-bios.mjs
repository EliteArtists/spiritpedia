// Original-wording fix (README §18.4, owner 31 Oct 2026): replaces Shift sprint-1
// bios that shared 8+ word runs with the teacher's Shift page or own site.
//
//   node docs/content-audits/shift-sprint-1/rewrite-bios.mjs bios-rewritten.json --env dev|live [--apply | --rollback]
//
// The input is { "<healer_slug>": "<new bio>" }. --apply saves each old bio in
// bios-rewritten.<env>.log.json first, then updates the row and the teacher's
// plan file (create.bio). --rollback puts the old bios back. Keys are read,
// never printed.

import fs from 'node:fs';

const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };
const DIR = 'docs/content-audits/shift-sprint-1';

const args = process.argv.slice(2);
const file = args.find((a) => a.endsWith('.json'));
const envName = args[args.indexOf('--env') + 1];
if (!file || !PROJECTS[envName]) {
  console.error('Usage: rewrite-bios.mjs <bios.json> --env dev|live [--apply | --rollback]');
  process.exit(1);
}
const env = Object.fromEntries(
  fs.readFileSync(ENV_FILES[envName], 'utf8').split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE?.includes(PROJECTS[envName]) || !KEY) { console.error(`${ENV_FILES[envName]} does not point at ${envName}`); process.exit(1); }
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const logPath = `${DIR}/bios-rewritten.${envName}.log.json`;

async function setBio(slug, bio) {
  const r = await fetch(`${BASE}/rest/v1/healers?healer_slug=eq.${encodeURIComponent(slug)}`, {
    method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ bio }),
  });
  if (!r.ok) throw new Error(`${slug}: ${r.status} ${await r.text()}`);
  if (!(await r.json()).length) throw new Error(`${slug}: no such listing`);
}

if (args.includes('--rollback')) {
  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  for (const [slug, old] of Object.entries(log.old)) await setBio(slug, old);
  fs.unlinkSync(logPath);
  console.log(`Put back ${Object.keys(log.old).length} bios on ${envName}.`);
  process.exit(0);
}

const bios = JSON.parse(fs.readFileSync(file, 'utf8'));
const slugs = Object.keys(bios);
const rows = await (await fetch(`${BASE}/rest/v1/healers?select=healer_slug,bio&healer_slug=in.(${slugs.join(',')})`, { headers })).json();
const missing = slugs.filter((s) => !rows.find((r) => r.healer_slug === s));
const changes = rows.filter((r) => r.bio !== bios[r.healer_slug]);
console.log(`${envName}: ${changes.length} of ${slugs.length} bios to rewrite${missing.length ? `; not found: ${missing.join(', ')}` : ''}`);
if (missing.length || !args.includes('--apply')) process.exit(missing.length ? 1 : 0);

const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : { env: envName, old: {} };
for (const r of changes) {
  log.old[r.healer_slug] ??= r.bio;
  fs.writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`);
  await setBio(r.healer_slug, bios[r.healer_slug]);
}
log.at = new Date().toISOString();
fs.writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`);
// Keep each plan's create.bio in step, so the plan stays the record.
for (const slug of slugs) {
  const p = `docs/content-audits/${slug}.json`;
  if (!fs.existsSync(p)) continue;
  const plan = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (plan.healer?.create && plan.healer.create.bio !== bios[slug]) {
    plan.healer.create.bio = bios[slug];
    fs.writeFileSync(p, `${JSON.stringify(plan, null, 2)}\n`);
  }
}
console.log(`Rewrote ${changes.length} bios on ${envName}. Log: ${logPath}`);

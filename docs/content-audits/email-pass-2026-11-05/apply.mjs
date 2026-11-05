// Email pass (5 Nov 2026): write the published emails and contact forms found
// for living listings with no contact_email. Needs migration 0039 on that env.
//
//   python3 -I docs/content-audits/email-pass-2026-11-05/verify.py   # first: writes checked.json
//   node docs/content-audits/email-pass-2026-11-05/apply.mjs --env dev|live [--apply | --rollback]
//
// Only verified results are written, and doubtful ones only when listed in
// approved.json (the owner's OK, by slug). A row that has gained an email
// since the queue was made is left alone. Every change is logged with its
// before values; --rollback restores them.

import fs from 'node:fs';

const DIR = 'docs/content-audits/email-pass-2026-11-05';
const envName = process.argv[process.argv.indexOf('--env') + 1];
const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--rollback') ? 'rollback' : 'dry';
const envFile = { dev: 'web/.env.development.local', live: 'web/.env.local' }[envName];
const project = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' }[envName];
if (!envFile) throw new Error('--env dev|live');
const env = Object.fromEntries(fs.readFileSync(envFile, 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l))
  .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const K = env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE?.includes(project) || !K) throw new Error(`${envFile} does not point at ${envName}`);
const headers = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' };
// One log per run (a later run adds the doubtful ones the owner approves).
const LOG = `${DIR}/apply.${envName}.${Date.now()}.log.json`;
const logs = () => fs.readdirSync(DIR).filter((n) => n.startsWith(`apply.${envName}.`) && n.endsWith('.log.json')).sort();
const FIELDS = ['contact_email', 'contact_email_source', 'contact_form_url'];

async function patch(id, body) {
  const r = await fetch(`${BASE}/rest/v1/healers?id=eq.${id}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`PATCH ${id}: ${r.status} ${await r.text()}`);
}

if (mode === 'rollback') {
  // Newest run first, so each listing ends up as it was before the first.
  for (const name of logs().reverse()) {
    const log = JSON.parse(fs.readFileSync(`${DIR}/${name}`, 'utf8'));
    for (const row of log.rows) await patch(row.id, row.before);
    fs.renameSync(`${DIR}/${name}`, `${DIR}/${name.replace('.log.json', '.rolled-back.json')}`);
    console.log(`Rolled back ${log.rows.length} listing(s) on ${envName} (${name}).`);
  }
  process.exit(0);
}

const checked = JSON.parse(fs.readFileSync(`${DIR}/checked.json`, 'utf8'));
const approved = fs.existsSync(`${DIR}/approved.json`) ? JSON.parse(fs.readFileSync(`${DIR}/approved.json`, 'utf8')) : [];
const r = await fetch(`${BASE}/rest/v1/healers?select=id,healer_slug,${FIELDS.join(',')}&healer_slug=in.(${Object.keys(checked).join(',')})`, { headers: { ...headers, Range: '0-9999' } });
if (!r.ok) throw new Error(`GET healers: ${r.status} ${await r.text()} (has 0039 been run on ${envName}?)`);
const rows = Object.fromEntries((await r.json()).map((h) => [h.healer_slug, h]));

const changes = [];
const held = [];
for (const [slug, res] of Object.entries(checked)) {
  const row = rows[slug];
  if (!row) { held.push(`${slug}: not on ${envName}`); continue; }
  if (!res.verified) { held.push(`${slug}: not verified (${res.issues.join('; ')})`); continue; }
  if (res.doubtful && !approved.includes(slug)) { held.push(`${slug}: doubtful, waiting for the owner`); continue; }
  if ((row.contact_email || '').trim()) { held.push(`${slug}: already has an email on ${envName}`); continue; }
  const after = {};
  if (res.outcome === 'email') Object.assign(after, { contact_email: res.email.trim(), contact_email_source: res.email_source });
  if (res.contact_form_url) after.contact_form_url = res.contact_form_url;
  if (!Object.keys(after).length) continue;
  const before = Object.fromEntries(Object.keys(after).map((k) => [k, row[k] ?? null]));
  changes.push({ id: row.id, slug, outcome: res.outcome, before, after });
}

for (const c of changes) console.log(`${c.slug}: ${c.outcome} ${c.after.contact_email || c.after.contact_form_url}`);
console.log(`\n${changes.length} to write on ${envName}; ${held.length} not written:`);
held.forEach((h) => console.log(`  - ${h}`));
if (mode === 'apply') {
  const log = { env: envName, at: new Date().toISOString(), rows: [] };
  for (const c of changes) {
    await patch(c.id, c.after);
    log.rows.push(c);
    fs.writeFileSync(LOG, `${JSON.stringify(log, null, 1)}\n`);
  }
  console.log(`Wrote ${log.rows.length} listing(s) on ${envName}. Log: ${LOG}`);
} else console.log('(dry run; --apply to write)');

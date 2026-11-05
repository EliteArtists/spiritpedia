// Owner, 5 Nov 2026 (email pass): Nassim Haramein's website_url (resonancescience.org)
// no longer resolves, so it points at nassimharamein.com; Jake Mace's (jakemace.com) is a
// parked domain, so it is emptied. Logged with the before values.
//
//   node docs/content-audits/email-pass-2026-11-05/fix-websites.mjs --env dev|live [--apply | --rollback]

import fs from 'node:fs';

const FIXES = { 'nassim-haramein': 'https://nassimharamein.com/', 'jake-mace': null };
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
const LOG = `${DIR}/fix-websites.${envName}.log.json`;
const patch = async (slug, website_url) => {
  const r = await fetch(`${BASE}/rest/v1/healers?healer_slug=eq.${slug}`, { method: 'PATCH', headers, body: JSON.stringify({ website_url }) });
  if (!r.ok) throw new Error(`PATCH ${slug}: ${r.status} ${await r.text()}`);
};

if (mode === 'rollback') {
  const log = JSON.parse(fs.readFileSync(LOG, 'utf8'));
  for (const row of log.rows) await patch(row.slug, row.before);
  console.log(`Rolled back ${log.rows.length} on ${envName}.`);
  process.exit(0);
}
const rows = [];
for (const [slug, after] of Object.entries(FIXES)) {
  const [h] = await (await fetch(`${BASE}/rest/v1/healers?healer_slug=eq.${slug}&select=website_url`, { headers })).json();
  if (!h) { console.log(`${slug}: not on ${envName}`); continue; }
  rows.push({ slug, before: h.website_url, after });
  console.log(`${slug}: ${h.website_url} → ${after}`);
}
if (mode === 'apply') {
  for (const row of rows) await patch(row.slug, row.after);
  fs.writeFileSync(LOG, `${JSON.stringify({ env: envName, at: new Date().toISOString(), rows }, null, 1)}\n`);
  console.log(`Updated ${rows.length} on ${envName}. Log: ${LOG}`);
} else console.log('(dry run; --apply to write)');

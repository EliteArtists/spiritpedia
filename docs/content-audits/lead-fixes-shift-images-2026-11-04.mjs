// Lead fix, 4 Nov 2026: offering images that the ingest took from The Shift
// Network's pages after Shift began refusing us (403). The ingest's image lookup
// fetched the Shift course URLs copied from teachers' own sites; that broke the
// "never fetch theshiftnetwork.com" rule, so those images go. Each offering gets
// the teacher's own first photo instead (the ingest's usual default).
// scripts/lib/images.mjs now refuses off-limits hosts, so it can't recur.
//
//   node docs/content-audits/lead-fixes-shift-images-2026-11-04.mjs --env dev|live [--apply | --rollback]
//
// Plans are updated too (on --apply), so a later live insert uses the new image.

import fs from 'node:fs';

const PLANS = ['martha-jo-atkins', 'jamie-butler', 'laura-inserra', 'kathleen-booker', 'pea-horsley', 'jacob-israel-liberman', 'andrew-harvey'];
const SHIFT = /theshiftnetwork\.com|tsnshift\.s3\.amazonaws\.com|isrefer\.com/i;

const envName = process.argv[process.argv.indexOf('--env') + 1];
const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--rollback') ? 'rollback' : 'dry';
const envFile = { dev: 'web/.env.development.local', live: 'web/.env.local' }[envName];
if (!envFile) throw new Error('--env dev|live');
const env = Object.fromEntries(fs.readFileSync(envFile, 'utf8').split('\n').filter((l) => l.includes('='))
  .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const K = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const headers = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' };
const LOG = `docs/content-audits/lead-fixes-shift-images-2026-11-04.${envName}.log.json`;

async function patch(id, image_url) {
  const r = await fetch(`${BASE}/rest/v1/courses?id=eq.${id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ image_url }) });
  if (!r.ok) throw new Error(`PATCH ${id}: ${r.status} ${await r.text()}`);
}

if (mode === 'rollback') {
  const log = JSON.parse(fs.readFileSync(LOG, 'utf8'));
  for (const row of log.rows) await patch(row.id, row.before);
  console.log(`Rolled back ${log.rows.length} offering image(s) on ${envName}.`);
  process.exit(0);
}

const rows = [];
for (const slug of PLANS) {
  const file = `docs/content-audits/${slug}.json`;
  const plan = JSON.parse(fs.readFileSync(file, 'utf8'));
  const photo = plan.healer.create?.image_urls?.[0] || null;
  let changed = false;
  for (const item of plan.courses || []) {
    const r = await fetch(`${BASE}/rest/v1/courses?course_url=eq.${encodeURIComponent(item.url)}&select=id,image_url,healer_id`, { headers });
    for (const row of await r.json()) {
      if (row.image_url && SHIFT.test(row.image_url)) rows.push({ id: row.id, slug, url: item.url, before: row.image_url, after: photo });
    }
    if (item.image && SHIFT.test(item.image)) { item.image = photo; changed = true; }
  }
  if (changed && mode === 'apply') fs.writeFileSync(file, `${JSON.stringify(plan, null, 1)}\n`);
}
for (const row of rows) console.log(`${row.slug}: ${row.url}\n   ${row.before}\n → ${row.after}`);
if (mode === 'apply') {
  for (const row of rows) await patch(row.id, row.after);
  fs.writeFileSync(LOG, `${JSON.stringify({ env: envName, at: new Date().toISOString(), rows }, null, 1)}\n`);
  console.log(`Updated ${rows.length} offering image(s) on ${envName}. Log: ${LOG}`);
} else console.log(`${rows.length} to change on ${envName} (dry run; --apply to write)`);

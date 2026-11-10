// Profile subjects from a teacher's own content (owner, 10 Nov 2026, gap-check
// Fix 5): where 3 or more of a listing's own items (videos, books as author or
// co-author, offerings, free resources) carry a subject that isn't on the
// profile, add it to healers.subject_slugs. Official listings are left alone.
//
//   node scripts/backfill-subjects.mjs --env dev             # counts only
//   node scripts/backfill-subjects.mjs --env dev --apply     # write, with a log
//   node scripts/backfill-subjects.mjs --env dev --rollback  # restore from the log
//
// The log (docs/content-audits/subject-backfill.<env>.json) keeps each changed
// listing's subjects before and after, which is what a rollback restores.

import fs from 'node:fs';

const args = process.argv.slice(2);
const envName = args[args.indexOf('--env') + 1];
const file = { dev: 'web/.env.development.local', live: 'web/.env.local' }[envName];
if (!file) { console.error('Usage: node scripts/backfill-subjects.mjs --env dev|live [--apply | --rollback]'); process.exit(1); }
const env = Object.fromEntries(fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const BASE = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const LOG = `docs/content-audits/subject-backfill.${envName}.json`;
const MIN = 3;

async function all(path) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${BASE}${path}&order=id`, { headers: { ...headers, Range: `${from}-${from + 999}` } });
    if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
    const page = await r.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function patch(id, subjects) {
  const r = await fetch(`${BASE}healers?id=eq.${id}`, { method: 'PATCH', headers, body: JSON.stringify({ subject_slugs: subjects }) });
  if (!r.ok) throw new Error(`healer ${id}: ${r.status} ${await r.text()}`);
}

if (args.includes('--rollback')) {
  const log = JSON.parse(fs.readFileSync(LOG, 'utf8'));
  for (const c of log.changed) await patch(c.id, c.before);
  fs.renameSync(LOG, LOG.replace('.json', `.rolled-back-${Date.now()}.json`));
  console.log(`Restored ${log.changed.length} listings on ${envName}.`);
  process.exit(0);
}

const healers = await all('healers?select=id,healer_slug,name,subject_slugs,official');
const known = new Set((await all('subjects?select=slug,id')).map((s) => s.slug));
const bySlug = new Map(healers.map((h) => [h.healer_slug, h]));
const byId = new Map(healers.map((h) => [h.id, h]));
const counts = new Map(); // healer id -> Map(subject -> items)
const count = (h, subjects) => {
  if (!h) return;
  const m = counts.get(h.id) || new Map();
  for (const s of new Set(subjects || [])) m.set(s, (m.get(s) || 0) + 1);
  counts.set(h.id, m);
};

for (const v of await all('videos?select=id,healer_slug,subject_slugs')) count(bySlug.get(v.healer_slug), v.subject_slugs);
for (const b of await all('books?select=id,healer_slug,co_healer_slugs,subject_slugs')) {
  for (const slug of new Set([b.healer_slug, ...(b.co_healer_slugs || [])])) count(bySlug.get(slug), b.subject_slugs);
}
for (const t of ['courses', 'free_resources']) {
  for (const o of await all(`${t}?select=id,healer_id,subject_slugs`)) count(byId.get(o.healer_id), o.subject_slugs);
}

const changed = [];
const perSubject = {};
for (const [id, m] of counts) {
  const h = byId.get(id);
  if (h.official) continue;
  const have = new Set(h.subject_slugs || []);
  const add = [...m].filter(([s, n]) => n >= MIN && known.has(s) && !have.has(s)).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  if (!add.length) continue;
  for (const s of add) perSubject[s] = (perSubject[s] || 0) + 1;
  changed.push({ id, slug: h.healer_slug, name: h.name, before: h.subject_slugs || [], after: [...(h.subject_slugs || []), ...add], added: add });
}

const added = changed.reduce((n, c) => n + c.added.length, 0);
console.log(`${envName}: ${changed.length} listings gain ${added} subjects (threshold ${MIN} items).`);
console.log(Object.entries(perSubject).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} ${n}`).join(', '));

if (args.includes('--apply')) {
  if (fs.existsSync(LOG)) { console.error(`${LOG} exists: roll it back or move it first.`); process.exit(1); }
  for (const c of changed) await patch(c.id, c.after);
  fs.writeFileSync(LOG, JSON.stringify({ env: envName, at: new Date().toISOString(), threshold: MIN, listings: changed.length, subjects_added: added, per_subject: perSubject, changed }, null, 2) + '\n');
  console.log(`Applied. Log: ${LOG}`);
}

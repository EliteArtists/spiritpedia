// Every listing's name, slug, website and YouTube link, for helpers' duplicate
// checks before a sprint (README §20, the night sprint). Reading only.
//
//   node scripts/dev-names.mjs <out.json> [--env dev|live]   (default dev)
//
// Writes [{ name, healer_slug, website_url, youtube_url, entity_type }, …].
// Keys are read from the env file, never printed.
import fs from 'node:fs';

const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };

const args = process.argv.slice(2);
const out = args.find((a) => a.endsWith('.json'));
const envName = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'dev';
if (!out || !PROJECTS[envName]) {
  console.error('Usage: node scripts/dev-names.mjs <out.json> [--env dev|live]');
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

// Paged by id: PostgREST returns at most 1,000 rows a request.
const rows = [];
for (let from = 0; ; from += 1000) {
  const r = await fetch(
    `${BASE}/rest/v1/healers?select=name,healer_slug,website_url,youtube_url,entity_type&order=id`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` } },
  );
  if (!r.ok) { console.error(`HTTP ${r.status}`); process.exit(1); }
  const page = await r.json();
  rows.push(...page);
  if (page.length < 1000) break;
}
fs.writeFileSync(out, JSON.stringify(rows, null, 1));
console.log(`${rows.length} listings → ${out}`);

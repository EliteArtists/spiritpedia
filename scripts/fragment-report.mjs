// Item links with a #fragment: which are real anchors on their page, and what
// to do with each (owner, 11 Nov 2026: items are unique on link + title,
// migration 0047; no made-up fragments). READ-ONLY: it changes nothing.
//
//   node scripts/fragment-report.mjs [--env dev|live] [--out report.md]   (default live)
//
// Every offering and free resource whose link has a #fragment is listed. For
// each page: robots.txt is read first, in its own request (scripts/lib/
// images.mjs: blocked means skip, never retried under another identity), then
// the page is fetched ONCE, with our own honest user agent, and the fragment
// is looked for as an id= or name= in its HTML. A fragment that is there is a
// real anchor: keep it. One that isn't was made up: strip it, once 0047 has
// run (before that, several items on one page would clash on the old key).
// Keys are read from the env file, never printed.
import fs from 'node:fs';
import { UA, timed, offLimits, robotsBlock, polite } from './lib/images.mjs';

const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };

const args = process.argv.slice(2);
const envName = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'live';
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
if (!PROJECTS[envName]) {
  console.error('Usage: node scripts/fragment-report.mjs [--env dev|live] [--out report.md]');
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

async function get(p) {
  const r = await fetch(`${BASE}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: '0-9999' } });
  if (!r.ok) throw new Error(`GET ${p.split('?')[0]}: HTTP ${r.status}`);
  return r.json();
}

const items = [
  ...(await get('courses?select=id,slug,title,course_url,healers(healer_slug)&course_url=like.*%23*&order=course_url'))
    .map((c) => ({ table: 'courses', id: c.id, slug: c.slug, title: c.title, url: c.course_url, owner: c.healers?.healer_slug || null })),
  ...(await get('free_resources?select=id,slug,title,resource_url,healers(healer_slug)&resource_url=like.*%23*&order=resource_url'))
    .map((f) => ({ table: 'free_resources', id: f.id, slug: f.slug, title: f.title, url: f.resource_url, owner: f.healers?.healer_slug || null })),
];

const pageOf = (url) => url.split('#')[0];
const fragmentOf = (url) => decodeURIComponent(url.slice(url.indexOf('#') + 1));
const pages = [...new Set(items.map((i) => pageOf(i.url)))];

// Step 1: robots.txt for every host, each read in its own request.
const verdict = new Map();
for (const page of pages) {
  if (offLimits(page)) { verdict.set(page, { state: 'off-limits', why: 'on the never-fetch list' }); continue; }
  const blocked = await robotsBlock(page);
  if (blocked) verdict.set(page, { state: 'blocked', why: blocked });
}

// Step 2: each allowed page, fetched once.
const html = new Map();
for (const page of pages) {
  if (verdict.has(page)) continue;
  try {
    await polite(page);
    const r = await fetch(page, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: timed(), redirect: 'follow' });
    if (!r.ok) { verdict.set(page, { state: 'unreachable', why: `HTTP ${r.status}` }); continue; }
    html.set(page, await r.text());
    verdict.set(page, { state: 'read' });
  } catch (e) {
    verdict.set(page, { state: 'unreachable', why: e.cause?.code || e.name });
  }
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rows = items.map((item) => {
  const page = pageOf(item.url);
  const frag = fragmentOf(item.url);
  const v = verdict.get(page);
  let anchor = null;
  if (v.state === 'read') anchor = new RegExp(`\\b(id|name)\\s*=\\s*["']?${esc(frag)}["'\\s>]`, 'i').test(html.get(page));
  const fix = anchor === true
    ? 'keep (real anchor)'
    : anchor === false
      ? 'strip after 0047'
      : `unchecked (${v.why}); strip after 0047`;
  return { ...item, page, frag, anchor, state: v.state, fix };
});

const count = (f) => rows.filter(f).length;
const lines = [
  `# Item links with #fragments on ${envName} (${new Date().toISOString().slice(0, 10)})`,
  '',
  'Read-only report from `scripts/fragment-report.mjs`. Nothing was changed.',
  '',
  `- **${rows.length} items** (${count((r) => r.table === 'courses')} offerings, ${count((r) => r.table === 'free_resources')} free resources) on **${pages.length} pages**.`,
  `- **Real anchors (keep):** ${count((r) => r.anchor === true)}.`,
  `- **Not on the page (made up; strip after 0047):** ${count((r) => r.anchor === false)}.`,
  `- **Not checked:** ${count((r) => r.anchor === null)} (robots.txt, the never-fetch list, or the page didn't load). Stripping is still safe: a fragment only scrolls the page, and after 0047 the title keeps the items apart.`,
  '',
  'A page built in the browser (Wix, Squarespace and the like) can add its anchors after loading, so "not on the page" means not in the HTML the server sends.',
  '',
  '| Item | Kind | Listing | Fragment | Page checked | Proposed |',
  '| :-- | :-- | :-- | :-- | :-- | :-- |',
  ...rows.map((r) => `| ${r.title.replace(/\|/g, '/')} | ${r.table === 'courses' ? 'offering' : 'free resource'} | ${r.owner || '—'} | \`#${r.frag}\` | ${r.state === 'read' ? (r.anchor ? 'yes, anchor found' : 'yes, no anchor') : r.state} | ${r.fix} |`),
  '',
];
const text = lines.join('\n');
if (out) { fs.writeFileSync(out, text); console.log(`${rows.length} items → ${out}`); } else console.log(text);

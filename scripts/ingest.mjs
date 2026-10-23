// Content ingestion: one healer (new or existing) and their videos, books,
// offerings and free resources, from a plan file into Supabase (README §18).
//
//   node scripts/ingest.mjs docs/content-audits/<healer-slug>.json --env dev           # images + check
//   node scripts/ingest.mjs docs/content-audits/<healer-slug>.json --env dev --insert  # the same, then insert
//
// Every run finds the images (in parallel, 30 s per item) and writes them
// back into the plan, so the plan is the record of what went in. It applies
// the default decisions (below), prints them, and prints the short list of
// what it couldn't solve; only that list needs a person.
//
// dev reads web/.env.development.local, live reads web/.env.local. Keys are
// read, never printed. Nothing is inserted while anything is unsolved. An
// insert writes <plan>.<env>.inserted.json with every new row's id, row by
// row, which is what a rollback deletes.

import fs from 'node:fs';
import path from 'node:path';

const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };
const MAX_SUBJECTS = 3;
// When an item has more than 3 subjects, the broadest go first.
const BROADEST = ['spirituality', 'consciousness', 'spiritual-awakening', 'mindfulness', 'self-healing',
  'manifestation', 'life-coaching', 'meditation', 'energy-medicine', 'ancient-wisdom', 'mysticism'];
const PRODUCT_TYPES = ['course', 'retreat', 'download', 'membership'];
const RESOURCE_TYPES = ['practice', 'download', 'meditation', 'workshop', 'mini_course'];
const TIERS = ['superhero', 'luminary', 'local_hero', 'ascended_master'];
const ENTITY_TYPES = ['individual', 'channel', 'app', 'organisation'];
const AVAILABILITY = {
  worldwide: 'Worldwide (Famous Names)',
  local: 'Local Only (In-Person)',
  local_online: 'Local & Online Sessions',
};
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const TIMEOUT_MS = 30_000;
const MIN_IMAGE_PX = 300; // the longer side

const args = process.argv.slice(2);
const planPath = args.find((a) => a.endsWith('.json'));
const envName = args[args.indexOf('--env') + 1];
const doInsert = args.includes('--insert');
const doRollback = args.includes('--rollback');
if (!planPath || !PROJECTS[envName]) {
  console.error('Usage: node scripts/ingest.mjs <plan.json> --env dev|live [--insert | --rollback] [--verbose]');
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

// ── Database ─────────────────────────────────────────────────────────────
async function get(p) {
  const r = await fetch(`${BASE}/rest/v1/${p}`, { headers: { ...headers, Range: '0-9999' } });
  if (!r.ok) throw new Error(`GET ${p.split('?')[0]}: ${r.status} ${await r.text()}`);
  return r.json();
}
async function insert(table, row) {
  const post = (body) => fetch(`${BASE}/rest/v1/${table}`, {
    method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(body),
  });
  let r = await post(row);
  // Dev's id sequences lag behind the ids copied in with its data, so a
  // bigint id can collide. Then take the next id after the highest.
  if (r.status === 409) {
    const text = await r.text();
    if (!/_pkey/.test(text)) throw new Error(`INSERT ${table} "${row.title || row.name}": 409 ${text}`);
    const [top] = await get(`${table}?select=id&order=id.desc&limit=1`);
    r = await post({ ...row, id: Number(top.id) + 1 });
  }
  if (!r.ok) throw new Error(`INSERT ${table} "${row.title || row.name}": ${r.status} ${await r.text()}`);
  return (await r.json())[0];
}

// The same slug rules as Admin → Ingestion (ContentIngestion.jsx), with
// accents folded first ("día" → "dia", not "da") and dashes and slashes
// turned into hyphens ("1–6" → "1-6", not "16").
function slugify(v) {
  return (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2010-\u2015\/]/g, '-').toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}
const takenSlugs = {};
async function uniqueSlug(table, title) {
  const base = slugify(title) || table;
  if (!takenSlugs[table]) takenSlugs[table] = new Set();
  const rows = await get(`${table}?select=slug&or=(slug.eq.${encodeURIComponent(base)},slug.like.${encodeURIComponent(base)}-*)`);
  const taken = new Set([...rows.map((r) => r.slug), ...takenSlugs[table]]);
  let s = base;
  for (let n = 2; taken.has(s); n += 1) s = `${base}-${n}`;
  takenSlugs[table].add(s);
  return s;
}

const youtubeId = (u) => (u || '').match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/)?.[1] || null;
const asinOf = (u) => (u || '').match(/(?:\/dp\/|\/gp\/product\/|\/product\/|\/ASIN\/)([A-Z0-9]{10})/i)?.[1]?.toUpperCase() || null;
const normTitle = (t) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const shortTitle = (t) => normTitle((t || '').split(/[:(]/)[0]);

// ── Images ───────────────────────────────────────────────────────────────
const timed = () => AbortSignal.timeout(TIMEOUT_MS);
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"');

// Width and height from the first bytes of a JPEG, PNG, GIF or WebP.
function dimensions(b) {
  try {
    if (b[0] === 0x89 && b[1] === 0x50) return [b.readUInt32BE(16), b.readUInt32BE(20)];
    if (b.subarray(0, 3).toString() === 'GIF') return [b.readUInt16LE(6), b.readUInt16LE(8)];
    if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') {
      const kind = b.subarray(12, 16).toString();
      if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
      if (kind === 'VP8L') { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
      return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i < b.length - 9) {
        if (b[i] !== 0xff) { i += 1; continue; }
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch { /* unknown or truncated */ }
  return null;
}

// → { ok, why }. Good = loads, is an image, and is at least MIN_IMAGE_PX on
// its longer side (when the size can be read).
async function probeImage(url) {
  if (!url) return { ok: false, why: 'none' };
  if (/encrypted-tbn\d*\.gstatic\.com/.test(url)) return { ok: false, why: 'Google thumbnail' };
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' }, signal: timed() });
    if (!r.ok) return { ok: false, why: `HTTP ${r.status}` };
    const b = Buffer.from(await r.arrayBuffer());
    const type = r.headers.get('content-type') || '';
    const d = dimensions(b);
    if (!type.startsWith('image/') && !d) return { ok: false, why: `not an image (${type.split(';')[0] || 'unknown'})` };
    if (d && Math.max(...d) < MIN_IMAGE_PX) return { ok: false, why: `too small (${d[0]}×${d[1]})` };
    if (!d && b.length < 5000) return { ok: false, why: `too small (${b.length} bytes)` };
    return { ok: true };
  } catch (e) {
    return { ok: false, why: e.name === 'TimeoutError' ? 'timed out' : `unreachable (${e.cause?.code || e.message})` };
  }
}

// A page's share image, else its first large image. → url or null.
async function pageImage(pageUrl, { shareOnly = false } = {}) {
  let r;
  try {
    r = await fetch(pageUrl, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: timed() });
  } catch { return null; }
  if (!r.ok || !(r.headers.get('content-type') || '').includes('html')) return null;
  const html = await r.text();
  const meta = (prop) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)`, 'i'))?.[1]
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'))?.[1];
  const abs = (u) => { try { return new URL(decode(u), r.url).href; } catch { return null; } };
  for (const prop of ['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image']) {
    const u = meta(prop) && abs(meta(prop));
    if (u && (await probeImage(u)).ok) return u;
  }
  if (shareOnly) return null;
  const candidates = [...html.matchAll(/<img[^>]+(?:data-src|src)=["']([^"']+)["']/gi)]
    .map((m) => abs(m[1]))
    .filter((u) => u && /^https?:/.test(u) && !/\.svg(\?|$)|logo|icon|favicon|sprite|pixel|spacer|badge|facebook\.com\/tr|googleads/i.test(u));
  const unique = [...new Set(candidates)].slice(0, 15);
  const probes = await Promise.all(unique.map(probeImage));
  const i = probes.findIndex((p) => p.ok);
  return i >= 0 ? unique[i] : null;
}

// A book cover built from the ASIN (the publisher's cover, 500 px tall);
// Amazon answers a 1×1 GIF when there is none.
async function amazonCover(asin) {
  const u = `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`;
  return (await probeImage(u)).ok ? u : null;
}

// ── Rollback: delete exactly what the log says this plan inserted ────────
if (doRollback) {
  const logPath = planPath.replace(/\.json$/, `.${envName}.inserted.json`);
  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  for (const row of log.rows) {
    const r = await fetch(`${BASE}/rest/v1/${row.table}?id=eq.${row.id}`, { method: 'DELETE', headers });
    if (!r.ok) throw new Error(`DELETE ${row.table} ${row.id}: ${r.status} ${await r.text()}`);
  }
  if (log.healer_update) {
    const r = await fetch(`${BASE}/rest/v1/healers?id=eq.${log.healer_update.id}`, { method: 'PATCH', headers, body: JSON.stringify(log.healer_update.before) });
    if (!r.ok) throw new Error(`RESTORE healer: ${r.status} ${await r.text()}`);
  }
  if (log.publisher) {
    const r = await fetch(`${BASE}/rest/v1/publishers?id=eq.${log.publisher.id}`, { method: 'DELETE', headers });
    if (!r.ok) throw new Error(`DELETE publisher ${log.publisher.id}: ${r.status} ${await r.text()}`);
  }
  if (log.healer) {
    const r = await fetch(`${BASE}/rest/v1/healers?id=eq.${log.healer.id}`, { method: 'DELETE', headers });
    if (!r.ok) throw new Error(`DELETE healer ${log.healer.id}: ${r.status} ${await r.text()}`);
  }
  fs.renameSync(logPath, logPath.replace(/\.json$/, `.rolled-back-${Date.now()}.json`));
  console.log(`Rolled back ${log.rows.length} rows${log.healer ? ' and the healer' : ''}${log.publisher ? ' and the publisher' : ''} on ${envName}.`);
  process.exit(0);
}

// The product image on an Amazon page (the generic share image there is an
// Amazon promo banner, never the cover). → url or null.
async function amazonPageCover(asin) {
  for (const host of ['amazon.com', 'amazon.co.uk']) {
    let html;
    try {
      const r = await fetch(`https://www.${host}/dp/${asin}`, { headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en-GB,en;q=0.9' }, signal: timed() });
      if (!r.ok) continue;
      html = await r.text();
    } catch { continue; }
    const candidates = [
      html.match(/data-old-hires="([^"]+)"/)?.[1],
      html.match(/"hiRes":"([^"]+)"/)?.[1],
      html.match(/"large":"([^"]+)"/)?.[1],
      html.match(/id="(?:landingImage|imgBlkFront|ebooksImgBlkFront)"[^>]*data-a-dynamic-image="\{&quot;([^&]+)&quot;/)?.[1],
      html.match(/id="(?:landingImage|imgBlkFront|ebooksImgBlkFront)"[^>]*src="([^"]+)"/)?.[1],
    ].filter((u) => u && /\/images\/I\//.test(u));
    for (const u of candidates) if ((await probeImage(u)).ok) return u;
  }
  return null;
}

// ── Plan ─────────────────────────────────────────────────────────────────
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const problems = []; // the script can't decide these: stop
const unsolved = []; // couldn't solve: find it, or set the image to null for none
const decisions = []; // defaults the script applied
const notes = [];
const say = (m) => console.log(m);
const label = (kind, item) => `${kind} "${item.title || item.name}"`;

const subjects = new Set((await get('subjects?select=slug')).map((s) => s.slug));
const removed = new Set((await get('content_removals?select=url')).map((r) => r.url).filter(Boolean));

function fixSubjects(kind, item) {
  item.subjects = [...new Set((item.subjects || []).map((s) => s.trim().toLowerCase()))];
  for (const s of item.subjects) if (!subjects.has(s)) problems.push(`${label(kind, item)}: subject "${s}" doesn't exist`);
  if (item.subjects.length === 0) problems.push(`${label(kind, item)}: no subjects`);
  while (item.subjects.length > MAX_SUBJECTS) {
    const drop = BROADEST.find((b) => item.subjects.includes(b)) || item.subjects[item.subjects.length - 1];
    item.subjects = item.subjects.filter((s) => s !== drop);
    decisions.push(`${label(kind, item)}: dropped ${drop} (more than ${MAX_SUBJECTS} subjects)`);
  }
}

// ── A publishing house (README §18.5): its own plan, no healer ────────────
// { "publisher": { "slug", "name", "description", "website_url", "logo_url",
//   "founded_year", "tier", "subjects", "contact_email",
//   "authors": [{ "name", "healer_slug" | null, "note" }] } }
// Creates the publisher (or uses the existing one with that slug), finds its
// logo, links every author who has a healer_slug that exists, and lists the
// authors who aren't on Spiritpedia yet.
if (plan.publisher) {
  const pub = plan.publisher;
  const [existingPub] = await get(`publishers?select=*&slug=eq.${encodeURIComponent(pub.slug)}`);
  pub.subjects = [...new Set((pub.subjects || []).map((x) => x.trim().toLowerCase()))];
  for (const x of pub.subjects) if (!subjects.has(x)) problems.push(`publisher subject "${x}" doesn't exist`);
  if (!['superhero', 'luminary', 'local_hero'].includes(pub.tier)) problems.push(`publisher tier "${pub.tier}" isn't superhero, luminary or local_hero`);
  if (!existingPub) {
    const [byName] = await get(`publishers?select=slug&name=ilike.${encodeURIComponent(pub.name)}`);
    if (byName) problems.push(`a publisher named "${pub.name}" already exists as ${byName.slug}`);
  }
  if (!plan.images_final) {
    if (!(pub.logo_url && (await probeImage(pub.logo_url)).ok)) {
      const found = (pub.website_url && await pageImage(pub.website_url, { shareOnly: true }))
        || (pub.website_url && await pageImage(pub.website_url));
      if (found) { pub.logo_url = found; decisions.push(`publisher logo: ${found}`); }
      else unsolved.push(`publisher "${pub.name}": no logo on ${pub.website_url}`);
    }
  }
  const links = [];
  const missing = [];
  for (const a of pub.authors || []) {
    const [h] = a.healer_slug ? await get(`healers?select=id,healer_slug&healer_slug=eq.${encodeURIComponent(a.healer_slug)}`) : [];
    if (h) links.push({ ...a, id: h.id });
    else missing.push(a);
  }
  const already = existingPub ? new Set((await get(`publisher_healers?select=healer_id&publisher_id=eq.${existingPub.id}`)).map((r) => r.healer_id)) : new Set();
  const toLink = links.filter((a) => !already.has(a.id));
  fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
  say(`Publisher: ${pub.name} (${existingPub ? 'exists' : `new, suggested ${pub.tier}`})`);
  say(`Authors on Spiritpedia to link: ${toLink.length}${links.length > toLink.length ? ` (${links.length - toLink.length} already linked)` : ''}`);
  if (missing.length) { say(`Authors not on Spiritpedia yet (${missing.length}):`); missing.forEach((a) => say(`  - ${a.name}${a.note ? ` — ${a.note}` : ''}`)); }
  if (decisions.length) { say('Decided by default:'); decisions.forEach((d) => say(`  - ${d}`)); }
  if (unsolved.length) { say('UNSOLVED:'); unsolved.forEach((u) => say(`  - ${u}`)); }
  if (problems.length) { say('PROBLEMS:'); problems.forEach((x) => say(`  - ${x}`)); }
  if (!doInsert) process.exit(problems.length || unsolved.length ? 2 : 0);
  if (problems.length || unsolved.length) { say('Nothing inserted.'); process.exit(2); }
  const logPath = planPath.replace(/\.json$/, `.${envName}.inserted.json`);
  const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : { env: envName, publisher: null, rows: [] };
  let row = existingPub;
  if (!row) {
    row = await insert('publishers', {
      name: pub.name, slug: pub.slug, description: pub.description || null, website_url: pub.website_url || null,
      logo_url: pub.logo_url || null, founded_year: pub.founded_year || null, subject_slugs: pub.subjects,
      tier: pub.tier, contact_email: pub.contact_email || null,
    });
    log.publisher = { id: row.id, slug: pub.slug };
  }
  for (const a of toLink) {
    const r = await insert('publisher_healers', { publisher_id: row.id, healer_id: a.id });
    log.rows.push({ table: 'publisher_healers', id: r.id, healer_slug: a.healer_slug });
  }
  log.at = new Date().toISOString();
  fs.writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`);
  plan.images_final = true;
  fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
  say(`${existingPub ? 'Publisher existed' : 'Publisher created'}; ${toLink.length} authors linked. Log: ${path.relative(process.cwd(), logPath)}`);
  process.exit(0);
}

// ── The healer ───────────────────────────────────────────────────────────
const slug = plan.healer?.healer_slug;
let [healer] = await get(`healers?select=*&healer_slug=eq.${encodeURIComponent(slug)}`);
const create = !healer ? plan.healer.create : null;
if (!healer && !create) problems.push(`healer "${slug}" doesn't exist and the plan doesn't create it`);
if (create) {
  fixSubjects('healer', create);
  create.entity_type ||= 'individual';
  if (!TIERS.includes(create.tier)) problems.push(`healer tier "${create.tier}" isn't one of ${TIERS.join(', ')}`);
  if (!ENTITY_TYPES.includes(create.entity_type)) problems.push(`healer type "${create.entity_type}" isn't one of ${ENTITY_TYPES.join(', ')}`);
  if (create.tier === 'ascended_master' && create.entity_type !== 'individual') problems.push('an Ascended Master must be a person (entity_type individual)');
  if (create.tier === 'ascended_master' && !create.death_year) problems.push('an Ascended Master needs death_year (and birth_year if known)');
  if (create.tier !== 'ascended_master' && (create.birth_year || create.death_year)) problems.push('birth_year/death_year are only for Ascended Masters');
  const [byName] = await get(`healers?select=healer_slug&name=ilike.${encodeURIComponent(create.name)}`);
  if (byName) problems.push(`a healer named "${create.name}" already exists as ${byName.healer_slug}`);
}
const UPDATABLE = ['bio', 'image_urls', 'subject_slugs', 'booking_url', 'website_url', 'youtube_url', 'instagram_url',
  'facebook_url', 'twitter_url', 'tiktok_url', 'contact_email', 'birth_year', 'death_year', 'tier', 'entity_type'];
for (const k of Object.keys(plan.healer?.update || {})) if (!UPDATABLE.includes(k)) problems.push(`healer update: "${k}" can't be changed here`);
say(`Healer: ${healer ? `${healer.name} (id ${healer.id}, ${healer.tier})` : `${slug}: new, ${create?.name}, suggested ${create?.tier} / ${create?.entity_type}`}`);

// ── Images, all in parallel ──────────────────────────────────────────────
// After the first insert the plan's images are frozen (images_final), so
// live gets exactly what was checked on dev.
const jobs = [];
const frozen = plan.images_final === true;
// A new healer's photo: their YouTube channel's picture (nearly always their
// face), else their site's share image.
let healerPhoto = null;
const healerJob = (async () => {
  if (frozen) {
    healerPhoto = (plan.healer.update?.image_urls || create?.image_urls || healer?.image_urls || [])[0] || null;
    return;
  }
  if (!create) {
    // An existing healer: drop photos that are unusable (a Google thumbnail,
    // a dead link, too small); find one if none is left.
    const current = healer?.image_urls || [];
    const good = [];
    for (const u of current) if ((await probeImage(u)).ok) good.push(u);
    if (good.length === 0) {
      const found = (healer?.youtube_url && await pageImage(healer.youtube_url, { shareOnly: true }))
        || (healer?.website_url && await pageImage(healer.website_url, { shareOnly: true }));
      if (found) good.push(found);
    }
    if (good.length && good.join() !== current.join()) {
      plan.healer.update = { ...(plan.healer.update || {}), image_urls: good };
      decisions.push(`healer photos: removed ${current.length - good.filter((u) => current.includes(u)).length} unusable, ${good.length} kept`);
    }
    if (!good.length) unsolved.push(`healer "${healer?.name}": no usable profile photo`);
    healerPhoto = good[0] || null;
    return;
  }
  const kept = [];
  for (const u of create.image_urls || []) if ((await probeImage(u)).ok) kept.push(u);
  if (kept.length === 0) {
    const found = (create.youtube_url && await pageImage(create.youtube_url, { shareOnly: true }))
      || (create.website_url && await pageImage(create.website_url, { shareOnly: true }));
    if (found) { kept.push(found); decisions.push(`healer photo: ${found}`); }
  }
  create.image_urls = kept.slice(0, 3);
  healerPhoto = kept[0] || null;
  if (kept.length === 0) unsolved.push(`healer "${create.name}": no profile photo on their YouTube channel or site`);
})();
jobs.push(healerJob);
// Videos: still on YouTube (oEmbed), with their channel and, when the plan
// has none, their title.
for (const v of plan.videos || []) {
  if (frozen) continue;
  jobs.push((async () => {
    const id = youtubeId(v.url);
    if (!id) return; // reported below
    try {
      const r = await fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${id}`, { signal: timed() });
      if (r.status === 404 || r.status === 401 || r.status === 403) { v.skip = 'unavailable on YouTube'; return; }
      if (!r.ok) return;
      const j = await r.json();
      v.channel = j.author_name;
      if (!v.title) v.title = j.title;
    } catch { /* unknown: leave it in */ }
  })());
}

// Is the ASIN on amazon.com? A UK-only edition 404s there; then the book
// keeps its amazon.co.uk link (a default). Amazon's bot answers (503) count
// as found.
async function amazonStatus(host, asin) {
  try {
    const r = await fetch(`https://www.${host}/dp/${asin}`, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: timed() });
    return r.status;
  } catch { return 0; }
}
for (const b of plan.books || []) {
  b.asin = (b.asin || asinOf(b.amazon_url) || '').toUpperCase();
  if (!frozen && /^[A-Z0-9]{10}$/.test(b.asin) && !b.store) {
    jobs.push((async () => {
      if (await amazonStatus('amazon.com', b.asin) !== 404) { b.store = 'amazon.com'; return; }
      if (await amazonStatus('amazon.co.uk', b.asin) === 200) {
        b.store = 'amazon.co.uk';
        decisions.push(`${label('book', b)}: not on amazon.com, kept the amazon.co.uk link`);
        return;
      }
      unsolved.push(`${label('book', b)}: ASIN ${b.asin} found on neither amazon.com nor amazon.co.uk`);
    })());
  }
  jobs.push((async () => {
    if (frozen || !/^[A-Z0-9]{10}$/.test(b.asin)) return; // reported below
    const built = await amazonCover(b.asin);
    if (built) { b.cover = built; return; }
    if (b.cover && !/\/images\/G\//.test(b.cover) && (await probeImage(b.cover)).ok) return;
    const fromPage = await amazonPageCover(b.asin);
    if (fromPage) { b.cover = fromPage; decisions.push(`${label('book', b)}: cover from the Amazon page (none by ASIN)`); return; }
    // An ISBN-10 ASIN: Open Library's cover for that ISBN (404 when none).
    if (/^\d{9}[\dX]$/.test(b.asin)) {
      const ol = `https://covers.openlibrary.org/b/isbn/${b.asin}-L.jpg?default=false`;
      if ((await probeImage(ol)).ok) { b.cover = ol; decisions.push(`${label('book', b)}: cover from Open Library (none on Amazon)`); return; }
    }
    // Open Library by title and author: the same title, the author's surname.
    try {
      const surname = (b.author || '').split(',')[0].trim().split(' ').pop();
      const q = `title=${encodeURIComponent(b.title.split(/[:(]/)[0].trim())}&author=${encodeURIComponent(surname)}&fields=title,cover_i&limit=5`;
      const r = await fetch(`https://openlibrary.org/search.json?${q}`, { signal: timed() });
      const doc = (await r.json()).docs?.find((d) => d.cover_i && shortTitle(d.title) === shortTitle(b.title));
      const ol = doc && `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      if (ol && (await probeImage(ol)).ok) { b.cover = ol; decisions.push(`${label('book', b)}: cover from Open Library by title (none on Amazon)`); return; }
    } catch { /* not found */ }
    if (b.cover !== null) unsolved.push(`${label('book', b)}: no cover found (ASIN ${b.asin})`);
  })());
}
// Offerings and free resources: the page's share image, else its first large
// image, else the audit's own if usable, else (as defaults) the cover of a
// book in the plan that the title names, else the healer's photo.
const bookCovers = () => (plan.books || []).filter((b) => b.cover)
  .map((b) => ({ stem: normTitle(b.title.split(/[:(]/)[0]), cover: b.cover }))
  .sort((a, b) => b.stem.length - a.stem.length);
const offeringJobs = [];
for (const [kind, list] of [['offering', plan.courses || []], ['free resource', plan.free_resources || []]]) {
  for (const item of list) {
    offeringJobs.push((async () => {
      if (frozen || item.image === null) return; // frozen, or deliberately none
      const fromPage = (await pageImage(item.url)) || (item.page && await pageImage(item.page));
      if (fromPage) { item.image = fromPage; return; }
      if (item.image && (await probeImage(item.image)).ok) return;
      return () => { // after the book covers and the healer's photo are known
        const book = bookCovers().find((b) => b.stem.length > 6 && normTitle(item.title).includes(b.stem));
        if (book) { item.image = book.cover; decisions.push(`${label(kind, item)}: no image on its page, used the book's cover`); return; }
        if (healerPhoto) { item.image = healerPhoto; decisions.push(`${label(kind, item)}: no image on its page, used the healer's photo`); return; }
        unsolved.push(`${label(kind, item)}: no image on ${item.url}`);
      };
    })());
  }
}
const started = Date.now();
await Promise.all(jobs);
for (const fallback of await Promise.all(offeringJobs)) if (fallback) fallback();
say(`Images: ${jobs.length + offeringJobs.length} items in ${Math.round((Date.now() - started) / 1000)} s`);

// ── Check every item ─────────────────────────────────────────────────────
const existing = healer ? {
  books: await get(`books?select=title&healer_slug=eq.${slug}`),
  courses: await get(`courses?select=title&healer_id=eq.${healer.id}`),
} : { books: [], courses: [] };
const queue = [];

for (const v of plan.videos || []) {
  if (v.skip) { decisions.push(`${label('video', v)}: left out, ${v.skip}`); continue; }
  fixSubjects('video', v);
  const id = youtubeId(v.url);
  if (!id) { problems.push(`${label('video', v)}: no YouTube id in ${v.url}`); continue; }
  const platform_url = `https://www.youtube.com/watch?v=${id}`;
  const dupes = await get(`videos?select=id,healer_slug&platform_url=like.*${id}*`);
  if (dupes.length) { notes.push(`skip ${label('video', v)}: already in (id ${dupes[0].id}, ${dupes[0].healer_slug})`); continue; }
  if (removed.has(platform_url)) { notes.push(`skip ${label('video', v)}: the owner removed it`); continue; }
  queue.push({ table: 'videos', title: v.slug || v.title, row: { title: v.title, platform_url, healer_slug: slug, subject_slugs: v.subjects } });
}

for (const b of plan.books || []) {
  fixSubjects('book', b);
  if (!/^[A-Z0-9]{10}$/.test(b.asin)) { unsolved.push(`${label('book', b)}: no ASIN`); continue; }
  const amazon_url = `https://www.${b.store || 'amazon.com'}/dp/${b.asin}`;
  const byAsin = await get(`books?select=id&amazon_url=ilike.*${b.asin}*`);
  if (byAsin.length) { notes.push(`skip ${label('book', b)}: ASIN ${b.asin} already in (id ${byAsin[0].id})`); continue; }
  const sameTitle = existing.books.find((x) => shortTitle(x.title) === shortTitle(b.title));
  if (sameTitle) { notes.push(`skip ${label('book', b)}: another edition is already in ("${sameTitle.title}")`); continue; }
  if (removed.has(amazon_url)) { notes.push(`skip ${label('book', b)}: the owner removed it`); continue; }
  const stem = b.title.split(/[:(]/)[0].trim().replace(/[*,()]/g, '');
  const elsewhere = await get(`books?select=id,healer_slug&title=ilike.${encodeURIComponent(stem)}*`);
  if (elsewhere.length) notes.push(`${label('book', b)}: a book with this title is already in under ${elsewhere[0].healer_slug || 'no healer'} (id ${elsewhere[0].id}); added anyway`);
  queue.push({ table: 'books', title: b.slug || b.title, row: {
    title: b.title, amazon_url, author: b.author || null, mock_cover_url: b.cover || null,
    goodreads_url: b.goodreads_url || null, worldofbooks_url: b.worldofbooks_url || null,
    description: b.description || null, healer_slug: slug, subject_slugs: b.subjects,
  } });
}

for (const c of plan.courses || []) {
  fixSubjects('offering', c);
  if (!PRODUCT_TYPES.includes(c.product_type)) problems.push(`${label('offering', c)}: product_type "${c.product_type}" isn't one of ${PRODUCT_TYPES.join(', ')}`);
  const dupes = await get(`courses?select=id&course_url=eq.${encodeURIComponent(c.url)}`);
  if (dupes.length) { notes.push(`skip ${label('offering', c)}: its link is already in`); continue; }
  if (existing.courses.find((x) => normTitle(x.title) === normTitle(c.title))) { notes.push(`skip ${label('offering', c)}: same title already in`); continue; }
  if (removed.has(c.url)) { notes.push(`skip ${label('offering', c)}: the owner removed it`); continue; }
  queue.push({ table: 'courses', title: c.slug || c.title, row: {
    title: c.title, description: c.description || null, course_url: c.url, price: c.price || null,
    image_url: c.image || null, healer_id: healer?.id, subject_slugs: c.subjects, product_type: c.product_type,
    affiliate_status: 'none', start_date: c.start_date || null, end_date: c.end_date || null,
  } });
}

for (const f of plan.free_resources || []) {
  fixSubjects('free resource', f);
  if (!RESOURCE_TYPES.includes(f.resource_type)) problems.push(`${label('free resource', f)}: resource_type "${f.resource_type}" isn't one of ${RESOURCE_TYPES.join(', ')}`);
  const dupes = await get(`free_resources?select=id&resource_url=eq.${encodeURIComponent(f.url)}`);
  if (dupes.length) { notes.push(`skip ${label('free resource', f)}: its link is already in`); continue; }
  if (removed.has(f.url)) { notes.push(`skip ${label('free resource', f)}: the owner removed it`); continue; }
  queue.push({ table: 'free_resources', title: f.slug || f.title, row: {
    title: f.title, description: f.description || null, resource_url: f.url, resource_type: f.resource_type,
    image_url: f.image || null, healer_id: healer?.id, subject_slugs: f.subjects, is_featured: f.featured === true,
    start_date: f.start_date || null, end_date: f.end_date || null,
  } });
}

// The plan keeps what was found and decided.
const savePlan = () => fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
savePlan();

const count = (t) => queue.filter((q) => q.table === t).length;
say(`To add on ${envName}: ${count('videos')} videos, ${count('books')} books, ${count('courses')} offerings, ${count('free_resources')} free resources${create ? ', and the healer' : ''}`);
if (decisions.length) { say('Decided by default:'); decisions.forEach((d) => say(`  - ${d}`)); }
const already = notes.filter((n) => n.startsWith('skip '));
if (already.length) say(`Skipped ${already.length} already in or removed by their owner${args.includes('--verbose') ? ':' : ' (--verbose lists them)'}`);
if (args.includes('--verbose')) already.forEach((n) => say(`  - ${n}`));
const otherNotes = notes.filter((n) => !n.startsWith('skip '));
if (otherNotes.length) { say('Notes:'); otherNotes.forEach((n) => say(`  - ${n}`)); }
if (unsolved.length) { say('UNSOLVED (find these, or set the image to null for none):'); unsolved.forEach((u) => say(`  - ${u}`)); }
if (problems.length) { say('PROBLEMS (need a decision):'); problems.forEach((p) => say(`  - ${p}`)); }

if (plan.healer?.update && Object.keys(plan.healer.update).length) say(`Healer changes: ${Object.keys(plan.healer.update).join(', ')}`);
if (!doInsert) process.exit(problems.length || unsolved.length ? 2 : 0);
if (problems.length || unsolved.length) { say('Nothing inserted.'); process.exit(2); }

// ── Insert ───────────────────────────────────────────────────────────────
const logPath = planPath.replace(/\.json$/, `.${envName}.inserted.json`);
const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : { env: envName, healer: null, rows: [] };
log.at = new Date().toISOString();
const saveLog = () => fs.writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`);

if (create) {
  const isAscended = create.tier === 'ascended_master';
  const availability = create.entity_type === 'individual' ? (create.availability || 'worldwide') : 'worldwide';
  const isLocal = availability !== 'worldwide';
  healer = await insert('healers', {
    name: create.name, healer_slug: slug, bio: create.bio || null, tier: create.tier,
    entity_type: create.entity_type, image_urls: create.image_urls, subject_slugs: create.subjects,
    birth_year: isAscended ? create.birth_year || null : null, death_year: isAscended ? create.death_year : null,
    availability_type: AVAILABILITY[availability],
    city: isLocal ? create.city || null : null, country: isLocal ? create.country || null : null,
    contact_email: create.contact_email || null, booking_url: create.booking_url || null,
    website_url: create.website_url || null, youtube_url: create.youtube_url || null,
    instagram_url: create.instagram_url || null, facebook_url: create.facebook_url || null,
    twitter_url: create.twitter_url || null, tiktok_url: create.tiktok_url || null,
  });
  log.healer = { id: healer.id, healer_slug: slug };
  saveLog();
  for (const q of queue) if ('healer_id' in q.row) q.row.healer_id = healer.id;
}
const update = { ...(plan.healer.update || {}) };
if (!create && healer && Object.keys(update).length) {
  const before = Object.fromEntries(Object.keys(update).map((k) => [k, healer[k] ?? null]));
  const r = await fetch(`${BASE}/rest/v1/healers?id=eq.${healer.id}`, { method: 'PATCH', headers, body: JSON.stringify(update) });
  if (!r.ok) throw new Error(`UPDATE healer: ${r.status} ${await r.text()}`);
  log.healer_update = { id: healer.id, before };
  saveLog();
  say(`  ~ healers ${slug}: ${Object.keys(update).join(', ')}`);
}
for (const q of queue) {
  q.row.slug = await uniqueSlug(q.table, q.title);
  const r = await insert(q.table, q.row);
  log.rows.push({ table: q.table, id: r.id, slug: r.slug, title: r.title });
  saveLog();
}
plan.images_final = true;
savePlan();
say(`Inserted ${queue.length} rows${create ? ' and the healer' : ''}. Log: ${path.relative(process.cwd(), logPath)}`);

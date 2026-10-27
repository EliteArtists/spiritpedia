// The morning broken-image routine (README §19): read the queue, find a new
// image for what can be fixed, apply the swaps the standing OK covers, list
// the rest.
//
//   node scripts/fix-images.mjs --env live                         # plan: docs/image-fixes/<date>.json + a contact sheet
//   node scripts/fix-images.mjs docs/image-fixes/<date>.json --env live --apply
//   node scripts/fix-images.mjs docs/image-fixes/<date>.json --env live --rollback
//
// What each queue row becomes in the plan (`action`):
//   swap     books, offerings, free resources with a working new image. The
//            standing OK: --apply changes these and lists them.
//   suggest  teacher photos. Candidates only. Once the owner approves one, set
//            the row to `swap` with `new` and `approved: true`; --apply then
//            changes that photo (only that entry of image_urls) like the rest.
//   remove   a video YouTube no longer has. Listed for the owner to delete.
//   unsolved nothing usable found.
// Set a row's action to `skip` to leave it alone after checking the sheet.
//
// dev reads web/.env.development.local, live reads web/.env.local. Keys are
// read, never printed. --apply only changes a row whose image is still the
// one in the plan, clears its queue row, and writes <plan>.<env>.applied.json
// with before and after, which is what --rollback restores.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { UA, amazonCover, amazonPageCover, pageImage, probeImage } from './lib/images.mjs';
import { isPlaceholderImage, MIN_FAILURES } from '../web/utils/brokenImages.js';

const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };
// Where each table keeps its picture and the page that picture belongs to.
const TABLES = {
  books: { column: 'mock_cover_url', select: 'id, title, author, amazon_url, mock_cover_url' },
  courses: { column: 'image_url', page: 'course_url', select: 'id, title, course_url, image_url' },
  free_resources: { column: 'image_url', page: 'resource_url', select: 'id, title, resource_url, image_url' },
  healers: { select: 'id, name, healer_slug, image_urls, website_url, youtube_url' },
  videos: { select: 'id, title, slug, platform_url' },
};
const SWAPPABLE = new Set(['books', 'courses', 'free_resources']);

const args = process.argv.slice(2);
const planArg = args.find((a) => a.endsWith('.json'));
const envName = args[args.indexOf('--env') + 1];
const doApply = args.includes('--apply');
const doRollback = args.includes('--rollback');
if (!PROJECTS[envName] || ((doApply || doRollback) && !planArg)) {
  console.error('Usage: node scripts/fix-images.mjs [<plan.json>] --env dev|live [--apply | --rollback]');
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

async function get(p) {
  const r = await fetch(`${BASE}/rest/v1/${p}`, { headers });
  if (!r.ok) throw new Error(`GET ${p}: ${r.status} ${await r.text()}`);
  return r.json();
}

// Change one image, only if it is still `before`. → true when a row changed.
async function swap(table, id, column, before, after) {
  const r = await fetch(`${BASE}/rest/v1/${table}?id=eq.${id}&${column}=eq.${encodeURIComponent(before)}`, {
    method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ [column]: after }),
  });
  if (!r.ok) throw new Error(`PATCH ${table} ${id}: ${r.status} ${await r.text()}`);
  return (await r.json()).length === 1;
}

// A teacher photo: entry `index` of image_urls, only if it is still `before`.
async function swapPhoto(id, index, before, after) {
  const [healer] = await get(`healers?id=eq.${id}&select=image_urls`);
  const urls = healer?.image_urls || [];
  if (urls[index] !== before) return false;
  urls[index] = after;
  const r = await fetch(`${BASE}/rest/v1/healers?id=eq.${id}`, {
    method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ image_urls: urls }),
  });
  if (!r.ok) throw new Error(`PATCH healers ${id}: ${r.status} ${await r.text()}`);
  return (await r.json()).length === 1;
}

// ── Rollback ─────────────────────────────────────────────────────────────
if (doRollback) {
  const logPath = planArg.replace(/\.json$/, `.${envName}.applied.json`);
  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  for (const f of log.fixes) {
    const ok = f.table === 'healers'
      ? await swapPhoto(f.id, f.index, f.after, f.before)
      : await swap(f.table, f.id, f.column, f.after, f.before);
    console.log(`${ok ? 'restored' : 'NOT restored (changed since)'}: ${f.table} "${f.title}"`);
  }
  fs.renameSync(logPath, logPath.replace(/\.json$/, `.rolled-back-${Date.now()}.json`));
  process.exit(0);
}

// ── Apply ────────────────────────────────────────────────────────────────
if (doApply) {
  const plan = JSON.parse(fs.readFileSync(planArg, 'utf8'));
  const logPath = planArg.replace(/\.json$/, `.${envName}.applied.json`);
  const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : { env: envName, fixes: [] };
  const done = [];
  for (const row of plan.rows) {
    const photo = row.table === 'healers' && row.approved === true;
    if (row.action !== 'swap' || !(SWAPPABLE.has(row.table) || photo) || !row.new) continue;
    // Applied earlier from this plan (a second --apply after approving photos).
    if (log.fixes.some((f) => f.table === row.table && String(f.id) === String(row.record_id) && f.after === row.new)) continue;
    const column = photo ? 'image_urls' : TABLES[row.table].column;
    const changed = photo
      ? await swapPhoto(row.record_id, row.index, row.old, row.new)
      : await swap(row.table, row.record_id, column, row.old, row.new);
    if (!changed) {
      console.log(`NOT changed (the image is no longer the planned one): ${row.table} "${row.title}"`);
      continue;
    }
    // Cleared now rather than at the next check, as the admin's own save does.
    await fetch(`${BASE}/rest/v1/broken_images?table_name=eq.${row.table}&record_id=eq.${row.record_id}`, { method: 'DELETE', headers });
    log.fixes.push({ at: new Date().toISOString(), table: row.table, id: row.record_id, healer_slug: row.healer_slug, title: row.title, column, ...(photo && { index: row.index }), before: row.old, after: row.new });
    done.push(row);
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2) + '\n');
  }
  console.log(`Changed ${done.length} on ${envName}:`);
  for (const r of done) console.log(`  ${r.table} "${r.title}" (${r.healer_slug}) — ${r.source}`);
  process.exit(0);
}

// ── Plan ─────────────────────────────────────────────────────────────────
// A usable replacement: loads, is an image, big enough, not a stand-in, not
// the URL that failed, not a site's logo or icon (a page with no image of its
// own often shares its logo, e.g. chani.com). https when the host serves it
// (the site is https).
async function usable(url, old) {
  if (!url || url === old || isPlaceholderImage(url)) return null;
  if (/logo|icon|favicon/i.test(new URL(url).pathname.split('/').pop())) return null;
  if (url.startsWith('http://')) {
    const secure = url.replace(/^http:/, 'https:');
    if ((await probeImage(secure)).ok) return secure;
  }
  return (await probeImage(url)).ok ? url : null;
}

const asinOf = (u) => (u || '').match(/(?:\/dp\/|\/gp\/product\/|\/product\/|\/ASIN\/)([A-Z0-9]{10})/i)?.[1]?.toUpperCase() || null;

// A book: the cover by ASIN, then the Amazon page, then Open Library — the
// order ingestion uses (README §18.2).
async function bookCover(book, old) {
  const asin = asinOf(book.amazon_url);
  if (asin) {
    const tries = [
      ['Amazon cover by ASIN', () => amazonCover(asin)],
      ['the Amazon page', () => amazonPageCover(asin)],
      ['Open Library by ISBN', async () => (/^\d{9}[\dX]$/.test(asin) ? `https://covers.openlibrary.org/b/isbn/${asin}-L.jpg?default=false` : null)],
    ];
    for (const [source, find] of tries) {
      const url = await usable(await find(), old);
      if (url) return { url, source };
    }
  }
  try {
    const surname = (book.author || '').split(',')[0].trim().split(' ').pop();
    const q = `title=${encodeURIComponent(book.title.split(/[:(]/)[0].trim())}&author=${encodeURIComponent(surname)}&fields=title,cover_i&limit=5`;
    const r = await fetch(`https://openlibrary.org/search.json?${q}`, { signal: AbortSignal.timeout(30_000) });
    const doc = (await r.json()).docs?.find((d) => d.cover_i);
    const url = doc && (await usable(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`, old));
    if (url) return { url, source: 'Open Library by title' };
  } catch { /* not found */ }
  return null;
}

const queue = await get(`broken_images?select=*&failures=gte.${MIN_FAILURES}&order=first_seen_at.asc`);
const rows = [];
for (const q of queue) {
  const spec = TABLES[q.table_name];
  const [record] = await get(`${q.table_name}?id=eq.${q.record_id}&select=${spec.select.replace(/ /g, '')}`);
  const row = { table: q.table_name, record_id: q.record_id, healer_slug: q.healer_slug, title: q.title, problem: q.problem || 'broken', status: q.status_code, old: q.image_url };
  rows.push(row);
  if (!record) { Object.assign(row, { action: 'unsolved', why: 'the record no longer exists (the next check clears the row)' }); continue; }

  if (q.table_name === 'videos') {
    Object.assign(row, { action: 'remove', why: 'YouTube no longer has this video', link: record.platform_url, page: `https://www.spiritpedia.co/videos/${record.slug}` });
    continue;
  }

  if (q.table_name === 'healers') {
    // Candidates for the owner: the share image of their website and of their
    // YouTube channel (which is their channel photo).
    const candidates = [];
    for (const [source, page] of [['website', record.website_url], ['YouTube channel', record.youtube_url]]) {
      const url = page && (await usable(await pageImage(page, { shareOnly: true }), q.image_url));
      if (url && !(record.image_urls || []).includes(url)) candidates.push({ url, source });
    }
    Object.assign(row, {
      action: candidates.length ? 'suggest' : 'unsolved',
      index: (record.image_urls || []).indexOf(q.image_url),
      candidates,
      why: candidates.length ? 'teacher photo: for the owner to choose' : 'no photo found on their website or YouTube channel',
    });
    continue;
  }

  const found = q.table_name === 'books'
    ? await bookCover(record, q.image_url)
    : await (async () => {
      const page = record[spec.page];
      const url = page && (await usable(await pageImage(page), q.image_url));
      return url ? { url, source: 'its page' } : null;
    })();
  Object.assign(row, found
    ? { action: 'swap', new: found.url, source: found.source }
    : { action: 'unsolved', why: q.table_name === 'books' ? 'no cover on Amazon or Open Library' : 'no usable image on its page' });
}

const date = new Date().toISOString().slice(0, 10);
const planPath = planArg || `docs/image-fixes/${date}.json`;
fs.mkdirSync(path.dirname(planPath), { recursive: true });
fs.writeFileSync(planPath, JSON.stringify({ env: envName, made: new Date().toISOString(), rows }, null, 2) + '\n');

// A contact sheet of every swap and suggestion, numbered as listed below, to
// check by eye before --apply. Uses the website's own sharp.
const sheet = rows.flatMap((r) => (r.action === 'swap' ? [r.new] : r.action === 'suggest' ? r.candidates.map((c) => c.url) : []));
const sheetPath = planPath.replace(/\.json$/, '.sheet.png');
if (sheet.length) {
  const sharp = createRequire(path.resolve('web/package.json'))('sharp');
  const tiles = [];
  for (const [i, url] of sheet.entries()) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' }, signal: AbortSignal.timeout(30_000) });
      const buf = Buffer.from(await res.arrayBuffer());
      const input = await sharp(buf).resize(200, 200, { fit: 'contain', background: '#222' }).png().toBuffer();
      tiles.push({ input, left: (i % 6) * 210, top: Math.floor(i / 6) * 210 });
      // The number it has in the list printed below.
      const label = `<svg width="44" height="28"><rect width="44" height="28" rx="6" fill="#000" fill-opacity="0.75"/><text x="22" y="20" font-size="16" font-family="sans-serif" fill="#fff" text-anchor="middle">${i + 1}</text></svg>`;
      tiles.push({ input: Buffer.from(label), left: (i % 6) * 210 + 4, top: Math.floor(i / 6) * 210 + 4 });
    } catch { /* left blank */ }
  }
  await sharp({ create: { width: 6 * 210, height: Math.ceil(sheet.length / 6) * 210, channels: 3, background: '#000' } })
    .composite(tiles).png().toFile(sheetPath);
}

let n = 0;
const list = (action, title, line) => {
  const these = rows.filter((r) => r.action === action);
  if (!these.length) return;
  console.log(`\n${title} (${these.length})`);
  for (const r of these) console.log(`  ${line(r)}`);
};
console.log(`Queue on ${envName}: ${queue.length}. Plan: ${planPath}${sheet.length ? `; sheet: ${sheetPath}` : ''}`);
list('swap', 'To swap (books, offerings, free resources)', (r) => `[${++n}] ${r.table} "${r.title}" (${r.healer_slug}): ${r.source}`);
list('suggest', 'Teacher photos for the owner', (r) => `${r.healer_slug}, photo ${r.index + 1}: ${r.candidates.map((c) => `[${++n}] ${c.source} ${c.url}`).join('  ')}`);
list('remove', 'Videos to remove', (r) => `${r.healer_slug}: "${r.title}" ${r.link}`);
list('unsolved', 'Not fixed', (r) => `${r.table} "${r.title}" (${r.healer_slug}): ${r.why}`);

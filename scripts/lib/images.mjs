// Finding and testing images, shared by ingestion (scripts/ingest.mjs) and the
// broken-image fixer (scripts/fix-images.mjs). README §18.2 and §19.

// An honest name, never a browser's (owner's standing rule: no fake user
// agents). Like the website's image audit (web/utils/brokenImages.js), some
// hosts refuse a request with no User-Agent at all, so we send our own.
export const UA = 'Mozilla/5.0 (compatible; SpiritpediaIngest/1.0; +https://www.spiritpedia.co)';
export const TIMEOUT_MS = 30_000;
export const MIN_IMAGE_PX = 300; // the longer side

export const timed = () => AbortSignal.timeout(TIMEOUT_MS);

// Hosts we never fetch (owner's blocked-means-skip rule and README §18.7):
// they refuse us, their robots.txt blocks us, or their terms forbid reuse.
// isrefer.com carries The Shift Network's affiliate links, which redirect there.
const OFF_LIMITS = /(^|\.)(theshiftnetwork\.com|isrefer\.com|mindvalley\.com|humanitysteam\.org|evolvingwisdom\.com|spiritrock\.org|openlibrary\.org|linktr\.ee|instagram\.com|facebook\.com|substack\.com|amazon\.com|amzn\.to|eomega\.org|soundstrue\.com|hayhouse\.com|events\.dharma\.org|redwheelweiser\.com|x\.com|twitter\.com|linkedin\.com|tiktok\.com)$/i;
// YouTube channel pages redirect this machine to consent.youtube.com (9 Nov 2026),
// and consent pages are never answered: no channel page is requested at all.
// Video oEmbed and yt3 avatars are unaffected.
const CONSENT_GATED = (u) => u.hostname === 'consent.youtube.com'
  || (/(^|\.)youtube\.com$/i.test(u.hostname) && /^\/(@|channel\/|c\/|user\/)/.test(u.pathname));
export const offLimits = (url) => { try { const u = new URL(url); return OFF_LIMITS.test(u.hostname) || CONSENT_GATED(u); } catch { return true; } };

// robots.txt first, on every host (owner's blocked-means-skip rule; 6 Nov
// 2026, after a fallback image came from a host that had refused our
// robots.txt request). A host is blocked when its robots.txt is refused
// (401, 403, 406, 429, 5xx) or unreachable, when a group naming Claude's
// agents says "Disallow: /" (owner, 5 Nov 2026), or when the group that
// applies to us (SpiritpediaIngest, else *) disallows the path. No
// robots.txt (400, 404, 410) means allowed. One read per host per run.
const CLAUDE_AGENTS = ['claudebot', 'claude-user', 'claude-web', 'anthropic-ai'];
const robotsCache = new Map();
function robotsGroups(text) {
  const groups = []; let g = null; let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, key, value] = [m[0], m[1].toLowerCase(), m[2].trim()];
    if (key === 'user-agent') {
      if (!lastWasAgent) { g = { agents: [], rules: [] }; groups.push(g); }
      g.agents.push(value.toLowerCase()); lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (g && (key === 'allow' || key === 'disallow')) g.rules.push({ allow: key === 'allow', path: value });
      if (g && key === 'crawl-delay' && Number(value) > 0) g.delay = Number(value);
    }
  }
  return groups;
}
function ruleMatches(rule, path) {
  if (!rule.path) return false; // "Disallow:" with nothing allows all
  const re = new RegExp(`^${rule.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$')}`);
  return re.test(path);
}
async function robotsFor(origin) {
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  let result;
  try {
    const r = await fetch(`${origin}/robots.txt`, { headers: { 'User-Agent': UA }, signal: timed() });
    // 400 is how Google's image hosts (yt3.googleusercontent.com) say they have no robots.txt.
    if ([400, 404, 410].includes(r.status)) result = { groups: [] };
    else if (!r.ok) result = { refused: `robots.txt answered HTTP ${r.status}` };
    else result = { groups: robotsGroups(await r.text()) };
  } catch (e) {
    result = { refused: `robots.txt unreachable (${e.cause?.code || e.name})` };
  }
  // Crawl-delay from the group that applies to us (SpiritpediaIngest, else *).
  const ours = (result.groups || []).filter((g) => g.agents.includes('spiritpediaingest'));
  const applies = ours.length ? ours : (result.groups || []).filter((g) => g.agents.includes('*'));
  result.delay = Math.max(0, ...applies.map((g) => g.delay || 0));
  if (result.delay) nextSlot.set(origin, Date.now() + result.delay * 1000);
  robotsCache.set(origin, result);
  return result;
}

// Honour Crawl-delay (9 Nov 2026): requests to a host that sets one are spaced
// at least that far apart, counting the robots.txt request. Slots are taken in
// call order, so parallel probes of one host queue up rather than burst.
const nextSlot = new Map();
async function polite(url) {
  const { origin } = new URL(url);
  const { delay } = await robotsFor(origin);
  if (!delay) return;
  const now = Date.now();
  const at = Math.max(now, nextSlot.get(origin) || 0);
  nextSlot.set(origin, at + delay * 1000);
  if (at > now) await new Promise((res) => setTimeout(res, at - now));
}
// → null when we may fetch the URL, else the reason we may not.
export async function robotsBlock(url) {
  let u; try { u = new URL(url); } catch { return 'bad URL'; }
  const rb = await robotsFor(u.origin);
  if (rb.refused) return rb.refused;
  const named = rb.groups.filter((g) => g.agents.some((a) => CLAUDE_AGENTS.includes(a)));
  if (named.some((g) => g.rules.some((r) => !r.allow && r.path === '/'))) return "robots.txt blocks Claude's agents";
  const ours = rb.groups.filter((g) => g.agents.includes('spiritpediaingest'));
  const rules = (ours.length ? ours : rb.groups.filter((g) => g.agents.includes('*'))).flatMap((g) => g.rules);
  const path = u.pathname + u.search;
  const hits = rules.filter((r) => ruleMatches(r, path)).sort((a, b) => b.path.length - a.path.length || (a.allow ? -1 : 1));
  return hits.length && !hits[0].allow ? 'robots.txt disallows it' : null;
}
export const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"');

// Width and height from the first bytes of a JPEG, PNG, GIF or WebP.
export function dimensions(b) {
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
export async function probeImage(url, { minPx = MIN_IMAGE_PX } = {}) {
  if (!url) return { ok: false, why: 'none' };
  if (/encrypted-tbn\d*\.gstatic\.com/.test(url)) return { ok: false, why: 'Google thumbnail' };
  if (offLimits(url)) return { ok: false, why: 'off-limits host, not fetched' };
  const blocked = await robotsBlock(url);
  if (blocked) return { ok: false, why: `${blocked}, not fetched` };
  try {
    await polite(url);
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' }, signal: timed() });
    if (!r.ok) return { ok: false, why: `HTTP ${r.status}` };
    const b = Buffer.from(await r.arrayBuffer());
    const type = r.headers.get('content-type') || '';
    const d = dimensions(b);
    if (!type.startsWith('image/') && !d) return { ok: false, why: `not an image (${type.split(';')[0] || 'unknown'})` };
    if (d && Math.max(...d) < minPx) return { ok: false, why: `too small (${d[0]}×${d[1]})` };
    if (!d && b.length < 5000 && minPx >= MIN_IMAGE_PX) return { ok: false, why: `too small (${b.length} bytes)` };
    return { ok: true, w: d?.[0], h: d?.[1] };
  } catch (e) {
    return { ok: false, why: e.name === 'TimeoutError' ? 'timed out' : `unreachable (${e.cause?.code || e.message})` };
  }
}

// A page's share image, else its first large image. → url or null.
export async function pageImage(pageUrl, { shareOnly = false } = {}) {
  if (offLimits(pageUrl) || await robotsBlock(pageUrl)) return null;
  let r;
  try {
    await polite(pageUrl);
    r = await fetch(pageUrl, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'manual', signal: timed() });
    // Follow redirects ourselves, so an off-limits or robots-blocked host is never requested.
    for (let hops = 0; r.status >= 300 && r.status < 400 && r.headers.get('location') && hops < 5; hops += 1) {
      const next = new URL(r.headers.get('location'), pageUrl).href;
      if (offLimits(next) || await robotsBlock(next)) return null;
      pageUrl = next;
      await polite(next);
      r = await fetch(next, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'manual', signal: timed() });
    }
  } catch { return null; }
  if (!r.ok || !(r.headers.get('content-type') || '').includes('html')) return null;
  const html = await r.text();
  const meta = (prop) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)`, 'i'))?.[1]
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'))?.[1];
  const abs = (u) => { try { return new URL(decode(u), pageUrl).href; } catch { return null; } };
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
export async function amazonCover(asin) {
  const u = `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`;
  return (await probeImage(u)).ok ? u : null;
}

// Amazon's product pages (amazon.com, amazon.co.uk) are never fetched: their
// robots.txt disallows Claude's agents (3 Nov 2026), and blocked means skip.
// Covers come from the image server by ASIN (amazonCover), else Open Library.

// A publisher's logo (README §18.5): a square or near-square icon reads far
// better on the card's white panel than a wide, pale share banner. So the
// site's app icon and largest favicon (180 px is enough for an icon) come
// first, Wix and similar image services asked for a larger copy; the share
// image only when there is no usable icon. → url or null.
export async function publisherLogo(siteUrl) {
  if (offLimits(siteUrl) || await robotsBlock(siteUrl)) return null;
  let html; let base;
  try {
    await polite(siteUrl);
    const r = await fetch(siteUrl, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: timed() });
    html = await r.text(); base = r.url;
  } catch { return null; }
  const abs = (u) => { try { return new URL(decode(u), base).href; } catch { return null; } };
  const icons = [...html.matchAll(/<link[^>]+rel=["'](?:apple-touch-icon(?:-precomposed)?|icon|shortcut icon)["'][^>]*>/gi)]
    .map((m) => ({ href: m[0].match(/href=["']([^"']+)/i)?.[1], size: Number(m[0].match(/sizes=["'](\d+)/i)?.[1] || (/apple-touch/i.test(m[0]) ? 180 : 16)) }))
    .filter((i) => i.href && !/\.ico(\?|$)/i.test(i.href))
    .sort((a, b) => b.size - a.size)
    .map((i) => abs(i.href))
    .filter(Boolean)
    // Wix serves any size from the same URL: ask for 600 px.
    .map((u) => u.replace(/\/fill\/w_\d+%2Ch_\d+/, '/fill/w_600%2Ch_600'));
  for (const u of [...new Set(icons)]) {
    const p = await probeImage(u, { minPx: 150 });
    if (p.ok && (!p.w || !p.h || Math.max(p.w, p.h) / Math.min(p.w, p.h) <= 1.5)) return u;
  }
  return pageImage(siteUrl, { shareOnly: true });
}

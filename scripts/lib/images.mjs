// Finding and testing images, shared by ingestion (scripts/ingest.mjs) and the
// broken-image fixer (scripts/fix-images.mjs). README §18.2 and §19.

export const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
export const TIMEOUT_MS = 30_000;
export const MIN_IMAGE_PX = 300; // the longer side

export const timed = () => AbortSignal.timeout(TIMEOUT_MS);
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
  try {
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
export async function amazonCover(asin) {
  const u = `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`;
  return (await probeImage(u)).ok ? u : null;
}

// The product image on an Amazon page (the generic share image there is an
// Amazon promo banner, never the cover). → url or null.
export async function amazonPageCover(asin) {
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

// A publisher's logo (README §18.5): a square or near-square icon reads far
// better on the card's white panel than a wide, pale share banner. So the
// site's app icon and largest favicon (180 px is enough for an icon) come
// first, Wix and similar image services asked for a larger copy; the share
// image only when there is no usable icon. → url or null.
export async function publisherLogo(siteUrl) {
  let html; let base;
  try {
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

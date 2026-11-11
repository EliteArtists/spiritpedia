// A YouTube channel reference and the Data API's answer, in one shape for
// the sprint scripts (scripts/lib/youtube.mjs) and Admin → Ingestion
// (/api/admin/youtube). Pure: no key, no fetch. Plain ES module so
// `node --test` and the scripts can import it.

// What a channel reference is: a handle, a channel id, a legacy username, a
// custom /c/ name (no API lookup; resolve it through one of its videos), or a
// video (its channel).
export function parseRef(input) {
  const s = String(input || '').trim();
  if (/^UC[\w-]{22}$/.test(s)) return { id: s };
  if (/^@[\w.-]+$/.test(s)) return { handle: s };
  let u;
  try { u = new URL(/^https?:/i.test(s) ? s : `https://${s}`); } catch { return {}; }
  if (u.hostname === 'youtu.be') return { video: u.pathname.slice(1) };
  if (!/(^|\.)youtube\.com$/i.test(u.hostname)) return {};
  const [a, b] = u.pathname.split('/').filter(Boolean);
  if (a?.startsWith('@')) return { handle: decodeURIComponent(a) };
  if (a === 'channel' && b) return { id: b };
  if (a === 'user' && b) return { username: b };
  if (a === 'c' && b) return { custom: b };
  if (a === 'watch' && u.searchParams.get('v')) return { video: u.searchParams.get('v') };
  if ((a === 'shorts' || a === 'embed' || a === 'live') && b) return { video: b };
  return {};
}

export const CHANNEL_PARTS = 'snippet,statistics,contentDetails';

// One channels.list item → the fields we use; null for none.
export function shapeChannel(c) {
  if (!c) return null;
  const t = c.snippet?.thumbnails || {};
  return {
    id: c.id,
    title: c.snippet?.title,
    handle: c.snippet?.customUrl || null,
    url: c.snippet?.customUrl ? `https://www.youtube.com/${c.snippet.customUrl}` : `https://www.youtube.com/channel/${c.id}`,
    description: c.snippet?.description || '',
    country: c.snippet?.country || null,
    published: c.snippet?.publishedAt || null,
    subscribers: c.statistics?.hiddenSubscriberCount ? null : Number(c.statistics?.subscriberCount ?? NaN),
    subscribersHidden: Boolean(c.statistics?.hiddenSubscriberCount),
    videos: Number(c.statistics?.videoCount ?? 0),
    views: Number(c.statistics?.viewCount ?? 0),
    avatar: (t.high || t.medium || t.default)?.url || null,
    uploads: c.contentDetails?.relatedPlaylists?.uploads || null,
  };
}

// The tier the star's own measures suggest (utils/badges.js, README §17.1):
// a million or more → superhero, a hundred thousand or more → luminary, else
// local_hero. A suggestion only: other platforms' counts and stature (owner,
// 11 Nov 2026) can raise it. null when the count is hidden or unknown.
export function suggestTier(subscribers) {
  if (!Number.isFinite(subscribers)) return null;
  if (subscribers >= 1_000_000) return 'superhero';
  if (subscribers >= 100_000) return 'luminary';
  return 'local_hero';
}

// YouTube Data API v3 (owner, 10 Nov 2026): the only way scripts and helpers
// read a channel. Channel pages redirect this machine to the cookie-consent
// page, and consent pages are never answered, so they are never requested.
//
// The key is YOUTUBE_API_KEY in web/.env.local (live) or
// web/.env.development.local (dev); both hold the same key. It is read, never
// printed: every error message has it scrubbed out.
//
// Quota (10,000 units a day): channels.list, playlistItems.list and
// videos.list cost 1 unit each. search.list costs 100 and is not used.

import fs from 'node:fs';
import { CHANNEL_PARTS, parseRef, shapeChannel } from '../../web/utils/youtubeChannel.js';

const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };
const API = 'https://www.googleapis.com/youtube/v3/';

let KEY = null;
export function loadKey(envName = 'live') {
  if (KEY) return KEY;
  const line = fs.readFileSync(ENV_FILES[envName], 'utf8').split('\n').find((l) => l.startsWith('YOUTUBE_API_KEY='));
  KEY = line ? line.slice('YOUTUBE_API_KEY='.length).trim().replace(/^"|"$/g, '') : '';
  if (!KEY) throw new Error(`YOUTUBE_API_KEY is missing from ${ENV_FILES[envName]}`);
  return KEY;
}

async function call(endpoint, params) {
  const key = loadKey();
  const q = new URLSearchParams({ ...params, key });
  const r = await fetch(`${API}${endpoint}?${q}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`YouTube ${endpoint} ${r.status}: ${String(j.error?.message || 'error').split(key).join('[key]')}`);
  return j;
}

// The reference parser and the channel's shape are shared with Admin →
// Ingestion (web/utils/youtubeChannel.js).
const PARTS = CHANNEL_PARTS;
const shape = shapeChannel;
export { parseRef };

// One channel from any reference; null when there is none.
export async function getChannel(input) {
  const ref = typeof input === 'string' ? parseRef(input) : input;
  if (ref.video) {
    const v = await call('videos', { part: 'snippet', id: ref.video });
    const id = v.items?.[0]?.snippet?.channelId;
    return id ? getChannel({ id }) : null;
  }
  const params = ref.id ? { id: ref.id } : ref.handle ? { forHandle: ref.handle } : ref.username ? { forUsername: ref.username } : null;
  if (!params) return null;
  const j = await call('channels', { part: PARTS, ...params });
  return shape(j.items?.[0]);
}

// Several channels by id, 50 to a call.
export async function getChannels(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const j = await call('channels', { part: PARTS, id: ids.slice(i, i + 50).join(','), maxResults: '50' });
    out.push(...(j.items || []).map(shape));
  }
  return out;
}

const isoSeconds = (d) => {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(d || '');
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : null;
};

// Videos by id (title, date, length in seconds, views, channel), 50 to a call.
export async function getVideos(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const j = await call('videos', { part: 'snippet,contentDetails,statistics', id: ids.slice(i, i + 50).join(','), maxResults: '50' });
    for (const v of j.items || []) {
      out.push({
        id: v.id,
        url: `https://www.youtube.com/watch?v=${v.id}`,
        title: v.snippet?.title,
        channelId: v.snippet?.channelId,
        channelTitle: v.snippet?.channelTitle,
        published: v.snippet?.publishedAt,
        seconds: isoSeconds(v.contentDetails?.duration),
        views: Number(v.statistics?.viewCount ?? 0),
        description: v.snippet?.description || '',
        thumbnail: (v.snippet?.thumbnails?.high || v.snippet?.thumbnails?.medium)?.url || null,
      });
    }
  }
  return out;
}

// A channel's latest uploads (newest first), up to `n`, with lengths and views.
export async function getUploads(channel, n = 25) {
  if (!channel?.uploads) return [];
  const ids = [];
  let pageToken;
  while (ids.length < n) {
    const j = await call('playlistItems', { part: 'contentDetails', playlistId: channel.uploads, maxResults: String(Math.min(50, n - ids.length)), ...(pageToken ? { pageToken } : {}) });
    ids.push(...(j.items || []).map((x) => x.contentDetails.videoId));
    pageToken = j.nextPageToken;
    if (!pageToken) break;
  }
  return getVideos(ids);
}

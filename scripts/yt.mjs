// Read a YouTube channel or video through the Data API (scripts/lib/youtube.mjs).
// This is how helpers read channels: never the channel pages themselves.
//
//   node scripts/yt.mjs channel <@handle | UC… id | channel, user, @ or video URL> [--uploads 25] [--json]
//   node scripts/yt.mjs video <id or URL> [<id or URL> …] [--json]
//
// Prints the channel's title, handle, subscribers (null if hidden), video
// count, country, avatar (a yt3.googleusercontent.com URL the ingest accepts),
// description and, with --uploads, its latest uploads with date, length and
// views. Run from the repo root. The key is never printed.

import { getChannel, getUploads, getVideos, parseRef } from './lib/youtube.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const json = rest.includes('--json');
const ui = rest.indexOf('--uploads');
const nUploads = ui >= 0 ? Number(rest[ui + 1]) || 25 : 0;
const refs = rest.filter((a, i) => !a.startsWith('--') && !(ui >= 0 && i === ui + 1));

const mmss = (s) => (s == null ? '?' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);

try {
  if (cmd === 'channel' && refs[0]) {
    const c = await getChannel(refs[0]);
    if (!c) { console.log(`No channel found for ${refs[0]}`); process.exit(2); }
    const uploads = nUploads ? await getUploads(c, nUploads) : [];
    if (json) { console.log(JSON.stringify({ ...c, latest: uploads }, null, 2)); process.exit(0); }
    console.log(`${c.title} (${c.id}) ${c.handle || ''}\n${c.url}`);
    console.log(`Subscribers: ${c.subscribersHidden ? 'hidden' : c.subscribers.toLocaleString('en-GB')} | videos ${c.videos} | country ${c.country || '-'} | since ${c.published?.slice(0, 10)}`);
    console.log(`Avatar: ${c.avatar}`);
    console.log(`Description: ${c.description.replace(/\s+/g, ' ').slice(0, 600)}`);
    for (const v of uploads) console.log(`- ${v.published?.slice(0, 10)} ${mmss(v.seconds)} ${v.views.toLocaleString('en-GB')} views | ${v.title} | ${v.url}`);
  } else if (cmd === 'video' && refs.length) {
    const ids = refs.map((r) => parseRef(r).video || r);
    const vs = await getVideos(ids);
    if (json) { console.log(JSON.stringify(vs, null, 2)); process.exit(0); }
    for (const v of vs) console.log(`${v.published?.slice(0, 10)} ${mmss(v.seconds)} ${v.views.toLocaleString('en-GB')} views | ${v.title} | ${v.channelTitle} (${v.channelId}) | ${v.url}`);
  } else {
    console.error('Usage: node scripts/yt.mjs channel <ref> [--uploads N] [--json] | video <id|url> … [--json]');
    process.exit(1);
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

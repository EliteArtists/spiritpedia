import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/utils/supabaseAdmin';
import { CHANNEL_PARTS, parseRef, shapeChannel } from '@/utils/youtubeChannel';

export const dynamic = 'force-dynamic';

// GET /api/admin/youtube?ref=<handle | channel link | video link>
//
// Admin → Ingestion reads a channel through the YouTube Data API (owner,
// 10 Nov 2026: the API is the only way we read a channel; channel pages are
// never fetched). The key is YOUTUBE_API_KEY, read here on the server and
// never sent to the browser: every error has it scrubbed out. One lookup
// costs 1 or 2 units of the 10,000 a day.
const API = 'https://www.googleapis.com/youtube/v3/';

async function call(key, endpoint, params) {
  const res = await fetch(`${API}${endpoint}?${new URLSearchParams({ ...params, key })}`, { cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`YouTube ${endpoint} ${res.status}: ${String(json.error?.message || 'error').split(key).join('[key]')}`);
  return json;
}

export async function GET(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'youtube_key_missing', message: 'YOUTUBE_API_KEY is not set on this server, so channels cannot be read. Enter the details by hand.' },
      { status: 503 }
    );
  }

  let ref = parseRef(new URL(request.url).searchParams.get('ref'));
  if (ref.custom) {
    return NextResponse.json(
      { error: 'custom_url', message: 'A /c/ link has no API lookup. Use the channel’s @handle, its /channel/ link, or one of its videos.' },
      { status: 400 }
    );
  }
  try {
    if (ref.video) {
      const v = await call(key, 'videos', { part: 'snippet', id: ref.video });
      const id = v.items?.[0]?.snippet?.channelId;
      if (!id) return NextResponse.json({ error: 'not_found', message: 'No video with that link.' }, { status: 404 });
      ref = { id };
    }
    const params = ref.id ? { id: ref.id } : ref.handle ? { forHandle: ref.handle } : ref.username ? { forUsername: ref.username } : null;
    if (!params) {
      return NextResponse.json({ error: 'bad_ref', message: 'That isn’t a YouTube channel, handle or video link.' }, { status: 400 });
    }
    const json = await call(key, 'channels', { part: CHANNEL_PARTS, ...params });
    const channel = shapeChannel(json.items?.[0]);
    if (!channel) return NextResponse.json({ error: 'not_found', message: 'No channel found.' }, { status: 404 });
    // The description and uploads playlist aren't needed by the form.
    const { description: _d, uploads: _u, ...rest } = channel;
    return NextResponse.json({ channel: rest });
  } catch (err) {
    return NextResponse.json({ error: 'youtube_failed', message: err.message.split(key).join('[key]') }, { status: 502 });
  }
}

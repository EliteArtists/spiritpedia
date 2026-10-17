import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '@/utils/supabaseAdmin';
import { cleanBatch, needingSubjects, SUBJECT_SOURCES, withSubjects } from '@/utils/activityGuard';

export const dynamic = 'force-dynamic';

// POST /api/activity — where the website and the app send what people do
// (migration 0021). One call per batch:
//   { platform: 'web' | 'app', events: [ … up to 50 … ] }
// with the member's own access token as a Bearer header when signed in.
//
// Every batch adds to the anonymous totals. Only when the caller is signed in
// AND has "Let Spiritpedia learn from what I explore" on does log_activity()
// also keep their own events and scores; that is decided in the database, from
// the caller this route identifies — never from anything in the body.
//
// cleanBatch() drops bad events and, as a second guard behind the crisis
// intercept, any search whose words are a crisis phrase.

const MAX_BODY = 32 * 1024;

async function callerId(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const reader = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data } = await reader.auth.getUser(token);
  return data?.user?.id || null;
}

export async function POST(request) {
  const text = await request.text().catch(() => '');
  if (!text || text.length > MAX_BODY) return NextResponse.json({ error: 'bad_body' }, { status: 400 });

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'bad_body' }, { status: 400 });
  }
  const platform = body?.platform;
  if (platform !== 'web' && platform !== 'app') {
    return NextResponse.json({ error: 'unknown_platform' }, { status: 400 });
  }

  let events = cleanBatch(body.events);
  if (events.length === 0) return NextResponse.json({ ok: true, counted: 0 });

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  // A save knows its slug, not its subjects: one lookup per table.
  const wanted = needingSubjects(events);
  const found = {};
  await Promise.all(
    Object.entries(wanted).map(async ([type, slugs]) => {
      const source = SUBJECT_SOURCES[type];
      const { data } = await supabase.from(source.table).select(`${source.column}, subject_slugs`).in(source.column, slugs);
      for (const row of data || []) found[`${type}:${row[source.column]}`] = row.subject_slugs || [];
    })
  );
  events = withSubjects(events, found);

  const user = await callerId(request);
  const { data, error } = await supabase.rpc('log_activity', { p_platform: platform, p_events: events, p_user: user });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, counted: data });
}

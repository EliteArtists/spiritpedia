import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { pushConfig } from '@/utils/push';
import { composeAdminPush } from '@/utils/pushRun';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Admin → Notifications: a message to everyone with Discoveries on
// (utils/pushRun.js → composeAdminPush). {name} is their first name, or the
// no-name version for anyone who gave none. It counts toward the weekly
// discovery limit: anyone who had a discovery in the last 7 days is skipped,
// and anyone in quiet hours gets it at 08:00 their time.
//
// { test_email } sends it to that one account only, at once, unrecorded —
// to see it on a phone first. { dry: true } counts who would get it.
const LIMITS = { title: 60, body: 180 };

// What the package has sent in the last 7 days, by kind, and how many accounts
// can receive it. Counts only: never who.
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: rows, error }, { count: queued }, { data: tokens }, { count: discoveriesOn }] = await Promise.all([
    supabase.from('push_sends').select('kind').eq('status', 'sent').gte('sent_at', since).limit(10000),
    supabase.from('push_sends').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
    supabase.from('push_tokens').select('user_id').limit(10000),
    supabase.from('notification_preferences').select('user_id', { count: 'exact', head: true }).eq('discoveries', true),
  ]);
  if (error) return NextResponse.json({ error: 'query_failed', message: error.message });
  const sent = {};
  for (const r of rows || []) sent[r.kind] = (sent[r.kind] || 0) + 1;
  return NextResponse.json({
    sent,
    queued: queued || 0,
    devices: new Set((tokens || []).map((t) => t.user_id)).size,
    discoveries_on: discoveriesOn || 0,
  });
}

export async function POST(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });
  if (!pushConfig()) return NextResponse.json({ error: 'push_not_configured' }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const title = String(body?.title || '').trim();
  const text = String(body?.body || '').trim();
  const noName = String(body?.body_no_name || '').trim();
  const route = String(body?.route || '').trim();
  if (!text) return NextResponse.json({ error: 'missing_body', message: 'Write the message.' }, { status: 400 });
  if (title.length > LIMITS.title || text.length > LIMITS.body || noName.length > LIMITS.body) {
    return NextResponse.json({ error: 'too_long', message: 'Keep the title under 60 characters and the message under 180.' }, { status: 400 });
  }
  if (text.includes('{name}') && !noName) {
    return NextResponse.json(
      { error: 'missing_no_name', message: 'Write the version for people who gave no name.' },
      { status: 400 }
    );
  }
  // An in-app path only, e.g. /subject/reiki or /healers/tara-brach.
  if (route && (!route.startsWith('/') || route.startsWith('//') || route.length > 200)) {
    return NextResponse.json({ error: 'bad_route', message: 'The link must be an in-app path such as /subject/reiki.' }, { status: 400 });
  }

  let testUserId = null;
  const testEmail = String(body?.test_email || '').trim().toLowerCase();
  if (testEmail) {
    const { data: page } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = (page?.users || []).find((u) => (u.email || '').toLowerCase() === testEmail);
    if (!user) return NextResponse.json({ error: 'no_such_account' }, { status: 404 });
    testUserId = user.id;
  }

  try {
    const result = await composeAdminPush(
      supabase,
      { title, body: text, bodyNoName: noName, route },
      { testUserId, dry: Boolean(body?.dry) }
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[admin/push-compose] failed:', err?.message || err);
    return NextResponse.json({ error: 'send_failed' }, { status: 500 });
  }
}

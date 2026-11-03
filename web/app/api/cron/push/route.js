import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabaseAdmin';
import { runPushHour } from '@/utils/pushRun';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// The push notifications' hourly run (utils/pushRun.js → runPushHour): what
// was waiting for quiet hours to end, then the discovery or welcome due for
// anyone whose local time is 10:00 or 19:00.
//
// HOURLY, NOT FROM vercel.json. The Hobby plan allows daily crons only, so
// Supabase calls this at five past every hour (pg_cron + pg_net, live only;
// supabase/scheduled/push-hourly.sql). On dev it is run by hand.
//
// ?dry=1 decides and counts without sending or recording anything.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'cron_secret_not_set' }, { status: 503 });
  }

  // Same scheme as the other crons: a Bearer header, or x-cron-secret for a
  // run by hand.
  const auth = request.headers.get('authorization') || '';
  const header = request.headers.get('x-cron-secret') || '';
  const presented = auth.startsWith('Bearer ') ? auth.slice(7) : header;
  if (presented !== secret) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const dry = new URL(request.url).searchParams.get('dry') === '1';
  try {
    // Counts only: no names, no addresses, nothing about what was sent to whom.
    const summary = await runPushHour(supabase, { dry });
    return NextResponse.json({ ok: true, dry, ...summary });
  } catch (err) {
    console.error('[cron/push] failed:', err?.message || err);
    return NextResponse.json({ error: 'run_failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Activity retention (migration 0021). Vercel calls this daily at 05:00 UTC.
// purge_activity() deletes members' own learning events after 30 days,
// searches with no results after 90, and the anonymous daily totals after 25
// months — the figures the Privacy Policy gives. Change both together.
// Returns counts only.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'cron_secret_not_set' }, { status: 503 });

  // Same scheme as the other crons: Vercel's own Bearer header, or
  // x-cron-secret for a run by hand.
  const auth = request.headers.get('authorization') || '';
  const header = request.headers.get('x-cron-secret') || '';
  const presented = auth.startsWith('Bearer ') ? auth.slice(7) : header;
  if (presented !== secret) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const { data, error } = await supabase.rpc('purge_activity');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, deleted: data });
}

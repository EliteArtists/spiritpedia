import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabaseAdmin';
import { purgeDecidedClaimRequests } from '@/utils/claimRequests';

export const dynamic = 'force-dynamic';

// Daily retention. Vercel calls this at 05:00 UTC.
//
// 1. Activity (migration 0021): purge_activity() deletes members' own learning
//    events after 30 days, searches with no results after 90, and the
//    anonymous daily totals after 25 months.
// 2. Claim requests (migration 0020): every decided request 12 months after
//    the decision (utils/claimRequests.js). Pending ones are never touched.
//
// These are the figures the Privacy Policy gives — change both together. One
// step failing doesn't stop the other. Returns counts only.
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
  const claims = await purgeDecidedClaimRequests(supabase);

  const failed = Boolean(error || claims.error);
  return NextResponse.json(
    {
      ok: !failed,
      deleted: error ? null : data,
      claim_requests_deleted: claims.error ? null : claims.deleted,
      ...(error ? { activity_error: error.message } : {}),
      ...(claims.error ? { claim_requests_error: claims.error } : {}),
    },
    { status: failed ? 500 : 200 }
  );
}

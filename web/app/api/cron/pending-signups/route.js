import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Deletes unfinished sign-ups. Vercel calls this daily at 06:00 UTC.
//
// pending_user_types holds an email address and the explorer/practitioner
// choice between "send me a code" and "here is the code". A finished sign-up
// consumes and deletes its row (readPendingUserType in utils/onboarding.js);
// an abandoned one used to stay forever — an email address kept for no reason,
// which the Privacy Policy now promises not to do.
//
// 24 HOURS, and why that is safe. The row only has to outlive the code, which
// Supabase makes valid for one hour. Anyone who comes back later asks for a
// fresh code, and /api/pending-user-type re-stamps created_at on every write,
// so the age measured here is always "since the latest attempt". With one run a
// day, a row is gone within two days at most — the figure the Privacy Policy
// gives. Change both together.
//
// ?dry=1 counts what would go without deleting it.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'cron_secret_not_set' }, { status: 503 });
  }

  // Same scheme as the other crons: Vercel's own Bearer header, or
  // x-cron-secret for a run by hand.
  const auth = request.headers.get('authorization') || '';
  const header = request.headers.get('x-cron-secret') || '';
  const presented = auth.startsWith('Bearer ') ? auth.slice(7) : header;

  if (presented !== secret) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();
  const dryRun = new URL(request.url).searchParams.get('dry') === '1';

  // No addresses in the response or the logs — a count is all anyone needs.
  const query = dryRun
    ? supabase.from('pending_user_types').select('email', { count: 'exact', head: true })
    : supabase.from('pending_user_types').delete({ count: 'exact' });

  const { count, error } = await query.lt('created_at', cutoff);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, dryRun, cutoff, [dryRun ? 'wouldDelete' : 'deleted']: count ?? 0 });
}

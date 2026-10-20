import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabaseAdmin';
import { purgeDecidedClaimRequests } from '@/utils/claimRequests';
import { abandonedUploads, purgeDecidedSubmissions } from '@/utils/contentSubmissions';
import { HOLDING_BUCKET } from '@/utils/contentOwner';

export const dynamic = 'force-dynamic';

// Daily retention. Vercel calls this at 05:00 UTC.
//
// 1. Activity (migration 0021): purge_activity() deletes members' own learning
//    events after 30 days, searches with no results after 90, and the
//    anonymous daily totals after 25 months.
// 2. Claim requests (migration 0020): every decided request 12 months after
//    the decision (utils/claimRequests.js). Pending ones are never touched.
// 3. Content submissions (migration 0024): the same, 12 months after the
//    decision, with any image they held; and images uploaded to a form that
//    was never sent, after two days (utils/contentSubmissions.js).
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
  const submissions = await purgeDecidedSubmissions(supabase, new Date(), HOLDING_BUCKET);
  const abandoned = await purgeAbandonedUploads(supabase);

  const failed = Boolean(error || claims.error || submissions.error);
  return NextResponse.json(
    {
      ok: !failed,
      deleted: error ? null : data,
      claim_requests_deleted: claims.error ? null : claims.deleted,
      submissions_deleted: submissions.error ? null : submissions.deleted,
      abandoned_images_deleted: abandoned,
      ...(error ? { activity_error: error.message } : {}),
      ...(claims.error ? { claim_requests_error: claims.error } : {}),
      ...(submissions.error ? { submissions_error: submissions.error } : {}),
    },
    { status: failed ? 500 : 200 }
  );
}

// Every file in the holding bucket ({user id}/{file}) that no submission
// points at and is over two days old. → how many went (null if it couldn't look).
async function purgeAbandonedUploads(supabase) {
  try {
    const bucket = supabase.storage.from(HOLDING_BUCKET);
    const { data: folders, error } = await bucket.list('', { limit: 1000 });
    if (error) return null;
    const files = [];
    for (const folder of folders || []) {
      if (folder.id) continue; // a file at the top level; uploads are in folders
      const { data } = await bucket.list(folder.name, { limit: 1000 });
      for (const f of data || []) if (f.id) files.push({ path: `${folder.name}/${f.name}`, created_at: f.created_at });
    }
    if (!files.length) return 0;
    const { data: rows } = await supabase.from('content_submissions').select('image_path').not('image_path', 'is', null);
    const stale = abandonedUploads(files, (rows || []).map((r) => r.image_path));
    if (stale.length) await bucket.remove(stale);
    return stale.length;
  } catch {
    return null;
  }
}

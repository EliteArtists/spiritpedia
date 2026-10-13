import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Reported reviews and banned reviewers (migration 0015), for /admin/flags.
//
// Service role only, like every admin route: review_reports shows a reporter
// only their own rows, and review_bans has no policies at all.

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const [{ data: reports, error }, { data: bans }] = await Promise.all([
    supabase
      .from('review_reports')
      .select(
        'id, review_id, reporter_id, reported_user_id, reason, note, content_type, content_slug, review_rating, review_body, review_author_name, status, created_at, resolved_at'
      )
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('review_bans').select('user_id, reason, created_at').order('created_at', { ascending: false }),
  ]);
  if (error) {
    return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 200 });
  }

  // The review as it is NOW, beside the snapshot: it may since have been
  // edited, rejected or deleted (review_id is then null).
  const ids = [...new Set((reports || []).map((r) => r.review_id).filter(Boolean))];
  const current = new Map();
  if (ids.length) {
    const { data: rows } = await supabase.from('reviews').select('id, status, body, rating').in('id', ids);
    for (const row of rows || []) current.set(row.id, row);
  }

  // Emails for the people involved, so the admin knows who is who. One page
  // of users, as /api/admin/overview reads them.
  const emails = new Map();
  const { data: userPage } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of userPage?.users || []) emails.set(u.id, u.email);

  const banned = new Set((bans || []).map((b) => b.user_id));
  return NextResponse.json({
    reports: (reports || []).map((r) => ({
      ...r,
      current: r.review_id ? current.get(r.review_id) || null : null,
      reporter_email: emails.get(r.reporter_id) || null,
      reported_email: emails.get(r.reported_user_id) || null,
      reported_banned: banned.has(r.reported_user_id),
    })),
    bans: (bans || []).map((b) => ({ ...b, email: emails.get(b.user_id) || null })),
  });
}

// One decision on a report:
//   resolve        acted on (the admin did what was needed elsewhere)
//   dismiss        nothing wrong with the review
//   reject_review  take the review down, and resolve the report
//   ban            stop the reviewer posting (review_bans), take down every
//                  review of theirs that is up or waiting, and resolve every
//                  open report about them
//   unban          lift a ban (by userId); their old reviews stay down
//
// Taking a review down here sends the reviewer no email: the person is the
// subject of a report, and the rejection email invites them to argue.
const ACTIONS = ['resolve', 'dismiss', 'reject_review', 'ban', 'unban'];

export async function PATCH(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const { id, action, userId } = await request.json().catch(() => ({}));
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  }
  const now = new Date().toISOString();

  if (action === 'unban') {
    if (!userId) return NextResponse.json({ error: 'missing_user' }, { status: 400 });
    const { error } = await supabase.from('review_bans').delete().eq('user_id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  const { data: report, error: readError } = await supabase
    .from('review_reports')
    .select('id, review_id, reported_user_id, reason')
    .eq('id', id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!report) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (action === 'reject_review' && report.review_id) {
    const { error } = await supabase.from('reviews').update({ status: 'rejected' }).eq('id', report.review_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (action === 'ban') {
    const target = report.reported_user_id;
    if (!target) {
      return NextResponse.json(
        { error: 'gone', message: 'That account no longer exists — there is no one to ban.' },
        { status: 409 }
      );
    }
    const { error: banError } = await supabase
      .from('review_bans')
      .upsert({ user_id: target, reason: `Report ${report.id}: ${report.reason}` }, { onConflict: 'user_id' });
    if (banError) return NextResponse.json({ error: banError.message }, { status: 500 });
    const { error: downError } = await supabase
      .from('reviews')
      .update({ status: 'rejected' })
      .eq('user_id', target)
      .in('status', ['approved', 'pending']);
    if (downError) return NextResponse.json({ error: downError.message }, { status: 500 });
    await supabase
      .from('review_reports')
      .update({ status: 'resolved', resolved_at: now })
      .eq('reported_user_id', target)
      .eq('status', 'open');
  }

  const { error } = await supabase
    .from('review_reports')
    .update({ status: action === 'dismiss' ? 'dismissed' : 'resolved', resolved_at: now })
    .eq('id', report.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

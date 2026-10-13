import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '@/utils/supabaseAdmin';
import { contentUrl, sendReviewReported } from '@/utils/email';
import { getContentMeta } from '@/utils/contentMeta';
import { SITE_URL } from '@/utils/seo';

export const dynamic = 'force-dynamic';

// "A review was reported" — to the admin, at once. The app calls this, fire-
// and-forget, right after report_review() (migration 0015) has saved the
// report; the report is already in the Inbox whatever happens here.
//
// The body names a report id and nothing else, and the route only acts on a
// report the CALLER made: it is looked up by id AND reporter_id = the token's
// user. So it cannot be used to email the admin about anything else, and a
// replayed call finds a report that has already been emailed about — that
// costs one duplicate email at most, never a different one.
export async function POST(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'no_token' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: 'misconfigured' }, { status: 503 });

  const reader = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await reader.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });

  const { reportId } = await request.json().catch(() => ({}));
  if (!Number.isInteger(reportId)) {
    return NextResponse.json({ error: 'missing_report' }, { status: 400 });
  }

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const { data: report } = await supabase
    .from('review_reports')
    .select('id, reason, note, content_type, content_slug, review_rating, review_body, review_author_name, status')
    .eq('id', reportId)
    .eq('reporter_id', user.id)
    .maybeSingle();
  if (!report) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const meta = await getContentMeta(report.content_type, report.content_slug);
  const result = await sendReviewReported({
    report,
    title: meta.title,
    url: contentUrl(report.content_type, report.content_slug),
    adminUrl: `${SITE_URL}/admin/flags`,
  });

  return NextResponse.json({ ok: true, sent: result.sent });
}

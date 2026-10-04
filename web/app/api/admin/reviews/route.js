import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Every review, whatever its status.
//
// This cannot be read from the browser with the anonymous key: the public
// policy on reviews is `status = 'approved'`, which is the whole point of
// moderation — a pending review is not hidden by the UI, it is unreadable.
// The service role is the only thing that sees the queue.
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const { data, error } = await supabase
    .from('reviews')
    .select('id, content_type, content_slug, rating, body, author_name, author_healer_slug, status, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 200 });
  }

  return NextResponse.json({ reviews: data || [] });
}

import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { sendToUser } from '@/utils/push';

export const dynamic = 'force-dynamic';

// Admin only: send a test notification to every device of one account, found
// by email — for checking a phone receives push. It honours that account's
// preferences like any other General notification. Nothing is recorded.
export async function POST(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const email = String(body?.email || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'missing_email' }, { status: 400 });

  const { data: page } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = (page?.users || []).find((u) => (u.email || '').toLowerCase() === email);
  if (!user) return NextResponse.json({ error: 'no_such_account' }, { status: 404 });

  const result = await sendToUser(supabase, user.id, {
    title: 'Spiritpedia test ✨',
    body: 'If you can read this, notifications are working on this device.',
    data: { route: '/account' },
  });
  if (!result.configured) return NextResponse.json({ error: 'push_not_configured' }, { status: 503 });
  return NextResponse.json({ ok: true, ...result });
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '@/utils/supabaseAdmin';
import { sendWelcomePush } from '@/utils/push';

export const dynamic = 'force-dynamic';

// The welcome notification. The app calls this right after the person turns
// notifications on and its token is registered. Once ever per account: the
// duplicate guard is in sendWelcomePush (utils/push.js) and the unique
// constraint on notification_sends, so calling it again — from a second
// device, a retry, the welcome-email route — sends nothing.
//
// Identity comes only from the caller's own access token; the body is ignored.
// The response says what happened but never anything about other devices.
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

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const result = await sendWelcomePush(supabase, user.id);
  return NextResponse.json({ ok: true, status: result.status });
}

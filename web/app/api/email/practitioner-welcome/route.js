import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '@/utils/supabaseAdmin';
import { firstNameFrom, sendPractitionerWelcome } from '@/utils/email';

export const dynamic = 'force-dynamic';

// The practitioner half of the welcome. Same shape and same reasoning as
// /api/email/explorer-welcome: the browser knows an account was just created
// and cannot send anything itself, and identity comes from the caller's own
// access token rather than from the body, so this can only ever email the
// person holding it.
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
  if (userError || !user?.email) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_type, full_name')
    .eq('id', user.id)
    .maybeSingle();

  // Checked here rather than trusted from the caller, so a stale client cannot
  // send a practitioner welcome to an explorer.
  if (profile && profile.user_type !== 'practitioner') {
    return NextResponse.json({ ok: true, skipped: 'not_a_practitioner' });
  }

  const result = await sendPractitionerWelcome({
    email: user.email,
    firstName: firstNameFrom(profile?.full_name),
  });

  return NextResponse.json({ ok: true, sent: result.sent });
}

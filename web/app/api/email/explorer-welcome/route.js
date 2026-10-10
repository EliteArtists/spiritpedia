import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '@/utils/supabaseAdmin';
import { firstNameFrom, sendExplorerWelcome } from '@/utils/email';
import { sendWelcomePush } from '@/utils/push';

export const dynamic = 'force-dynamic';

// Sends the explorer welcome.
//
// WHY A ROUTE. The only place that knows an explorer account has just been
// created is ensureProfile, which runs in the browser — and RESEND_API_KEY has
// no NEXT_PUBLIC_ prefix, deliberately, so the browser cannot send anything.
//
// WHY IT TAKES NO USER ID. Identity comes from the caller's own access token,
// verified against Supabase here. A route that emailed whichever id it was
// handed would be a way to send mail to any account on the platform; this one
// can only ever write to the person holding the token.
//
// It is called fire-and-forget. Nothing waits on it, nothing surfaces its
// failure, and a welcome that does not arrive costs the new member nothing.
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

  // Explorers only. A practitioner gets a different email at a different
  // moment, and checking here rather than trusting the caller means a stale
  // client cannot send the wrong one.
  if (profile && profile.user_type !== 'explorer') {
    return NextResponse.json({ ok: true, skipped: 'not_an_explorer' });
  }

  const result = await sendExplorerWelcome({
    email: user.email,
    firstName: firstNameFrom(profile?.full_name),
  });

  // 200 either way. The caller is not waiting and has nothing to do with a
  // failure; the log is where a lost email is found.
  // The welcome notification goes alongside it — once ever per account, and
  // only if a device has already allowed notifications (usually it has not
  // yet; the app then sends it at the first opt-in). Never holds up the email.
  const push = await sendWelcomePush(supabase, user.id).catch(() => ({ status: 'failed' }));

  return NextResponse.json({ ok: true, sent: result.sent, push: push.status });
}

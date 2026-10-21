import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabaseAdmin';
import { isToken } from '@/utils/unsubscribe';

export const dynamic = 'force-dynamic';

// "Change what I receive", from the link in an email: the same switch as the
// account page, keyed by the email's token instead of a sign-in, so it works
// from any device. The token can only ever change its own account.
//   POST { token } → { on }              (read)
//   POST { token, on: boolean } → { on } (change)
// POST for both, so the token never sits in a GET request's logs; an unknown
// token reads as on and changes nothing, so tokens can't be tested here.
export async function POST(request) {
  const { token, on } = await request.json().catch(() => ({}));
  if (!isToken(token)) return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  if (typeof on === 'boolean') {
    const { error } = await supabase
      .from('email_preferences')
      .update({ unsubscribed_at: on ? null : new Date().toISOString() })
      .eq('unsubscribe_token', token);
    if (error) return NextResponse.json({ error: 'failed' }, { status: 500 });
    return NextResponse.json({ on });
  }

  const { data } = await supabase.from('email_preferences').select('unsubscribed_at').eq('unsubscribe_token', token).maybeSingle();
  return NextResponse.json({ on: !data?.unsubscribed_at });
}

import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabaseAdmin';
import { isToken } from '@/utils/unsubscribe';
import { SITE } from '@/utils/emailParts';

export const dynamic = 'force-dynamic';

// Unsubscribe from Day 4 and discovery emails (email_preferences, 0025).
//
// POST is the unsubscribe: from the /unsubscribe page, or one-click from a mail
// client's own button (List-Unsubscribe-Post). The token is the only key, it
// is not guessable, and it can only ever unsubscribe its own account. The
// answer is the same whether or not the token matched, so this cannot be used
// to test tokens.
export async function POST(request) {
  const url = new URL(request.url);
  let token = url.searchParams.get('token');
  if (!token) {
    const body = await request.json().catch(() => ({}));
    token = body?.token;
  }
  if (!isToken(token)) return NextResponse.json({ error: 'invalid_token' }, { status: 400 });

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const { error } = await supabase
    .from('email_preferences')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token)
    .is('unsubscribed_at', null);
  if (error) return NextResponse.json({ error: 'failed' }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// A GET changes nothing (link scanners make them): it goes to the page, which
// asks first.
export async function GET(request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  return NextResponse.redirect(`${SITE}/unsubscribe?token=${encodeURIComponent(token)}`, 303);
}

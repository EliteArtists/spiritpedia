import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '@/utils/supabaseAdmin';
import { deleteAccount } from '@/utils/deleteAccount';

export const dynamic = 'force-dynamic';

// Self-serve account deletion — the website's account page and the app both
// call this. Apple requires in-app deletion; the website offers the same.
//
// WHO. Identity comes only from the caller's own access token, verified with
// Supabase here, never from the body — so nobody can delete anyone else. The
// token travels in the Authorization header, which a form on another site
// cannot set, so this cannot be triggered cross-site.
//
// WHAT. utils/deleteAccount.js: the auth user (and by cascade the profile,
// saved items, reviews and admin notes), plus uploaded photos the public
// listing does not display. A practitioner's deletion is flagged in the admin
// Inbox so their unclaimed listing can be reviewed.
//
// The body must say { "confirm": "DELETE" } — the screens ask the person to
// confirm, and this makes an accidental or replayed call do nothing.
const SOURCES = new Set(['website', 'app']);

export async function POST(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'no_token' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body?.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'not_confirmed' }, { status: 400 });
  }
  const source = SOURCES.has(body?.source) ? body.source : 'website';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: 'misconfigured' }, { status: 503 });

  // getUser(token) asks Supabase who this is: a forged or expired token
  // resolves to nobody.
  const reader = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await reader.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const result = await deleteAccount(supabase, user.id, { source });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  // Nothing about the listing or the Inbox goes back to the caller — they asked
  // for their account to go, and it has.
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// The signed-in member's own "Discovery emails" switch (account page on the
// website, Account in the app). email_preferences (migration 0025) is
// service-role only, so this route reads and writes it for the person holding
// the token — never anyone named in the body.
//   GET → { on }      PUT { on: boolean } → { on }
// On means unsubscribed_at is empty: Day 4 and personal editions go.

async function caller(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const reader = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await reader.auth.getUser(token);
  return error ? null : data?.user || null;
}

export async function GET(request) {
  const user = await caller(request);
  if (!user) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });
  const { data } = await supabase.from('email_preferences').select('unsubscribed_at').eq('user_id', user.id).maybeSingle();
  return NextResponse.json({ on: !data?.unsubscribed_at });
}

export async function PUT(request) {
  const user = await caller(request);
  if (!user) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  const { on } = await request.json().catch(() => ({}));
  if (typeof on !== 'boolean') return NextResponse.json({ error: 'missing_on' }, { status: 400 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });
  const { error } = await supabase
    .from('email_preferences')
    .upsert({ user_id: user.id, unsubscribed_at: on ? null : new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: 'failed' }, { status: 500 });
  return NextResponse.json({ on });
}

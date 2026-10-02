import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Puts a practitioner application back into the queue.
//
// WHY THIS NEEDS A SERVER ROUTE. The field-protection trigger pins
// verification_status against every ordinary caller — that is what stops a
// practitioner approving themselves. It also means a REJECTED applicant who
// fixes their details and submits again stays 'rejected' forever: the form
// writes their new answers, the status does not move, and they never reappear
// in the Inbox. That was the block.
//
// WHY IT IS SAFE. Identity comes from the caller's own access token, verified
// against Supabase here — never from the request body, so nobody can reset
// anyone else's account. And the only value it ever writes is 'pending', which
// means "awaiting review" and grants nothing. 'approved' remains reachable only
// through the admin route and the claim function.
export async function POST(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'no_token' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: 'misconfigured' }, { status: 503 });

  // Verify the token rather than trust it: getUser(token) asks Supabase who
  // this is, so a forged or expired token resolves to nobody.
  const reader = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await reader.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const { error } = await supabase
    .from('user_profiles')
    .update({ verification_status: 'pending', user_type: 'practitioner' })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, verification_status: 'pending' });
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '@/utils/supabaseAdmin';
import { firstNameFrom, sendEmail } from '@/utils/email';
import { sendOnce } from '@/utils/emailOnce';
import { claimRequestReceived } from '@/utils/emailTemplates';

export const dynamic = 'force-dynamic';

// "We've received your request to manage …" (D5), after the "Request to claim
// it" page has saved a claim_requests row (migration 0020).
//
// The body names a request id and nothing else, and the request is looked up
// by id AND by the caller's own account, so this can only ever email the
// person who made it — once per request (email_sends, migration 0025).
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
  if (userError || !user?.email) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });

  const { id } = await request.json().catch(() => ({}));
  if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'missing_request' }, { status: 400 });

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const [{ data: claim }, { data: profile }] = await Promise.all([
    supabase
      .from('claim_requests')
      .select('id, status, healers(name), publishers(name)')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('user_profiles').select('full_name').eq('id', user.id).maybeSingle(),
  ]);
  if (!claim || claim.status !== 'pending') return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const result = await sendOnce(supabase, { kind: 'claim_request_received', ref: claim.id }, () =>
    sendEmail({
      to: user.email,
      ...claimRequestReceived({
        firstName: firstNameFrom(profile?.full_name),
        listingName: claim.healers?.name || claim.publishers?.name || null,
      }),
    })
  );

  return NextResponse.json({ ok: true, sent: Boolean(result.sent) });
}

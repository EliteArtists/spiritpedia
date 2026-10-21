import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '@/utils/supabaseAdmin';
import { firstNameFrom, sendClaimDecision } from '@/utils/email';
import { sendOnce } from '@/utils/emailOnce';

export const dynamic = 'force-dynamic';

// "You can now manage …" (D7) after an INSTANT claim: the account's email
// matched the listing, so claim_healer_profile / claim_publisher_profile
// linked it at once with no admin step. The claim page calls this when the
// claim succeeds. It is their welcome too: no practitioner welcome follows
// (/api/email/practitioner-welcome holds it back).
//
// Nothing in the body is trusted. The listing is the one the caller's own
// profile is now linked to, and the email goes once per account and listing,
// shared with the admin's approvals.
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

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, verification_status, linked_healer_slug, linked_publisher_id')
    .eq('id', user.id)
    .maybeSingle();
  const listingRef = profile?.linked_healer_slug || profile?.linked_publisher_id;
  if (!listingRef || profile.verification_status !== 'approved') {
    return NextResponse.json({ error: 'not_claimed' }, { status: 409 });
  }

  const { data: listing } = profile.linked_healer_slug
    ? await supabase.from('healers').select('name').eq('healer_slug', listingRef).maybeSingle()
    : await supabase.from('publishers').select('name').eq('id', listingRef).maybeSingle();

  const result = await sendOnce(supabase, { kind: 'claim_approved', ref: `${user.id}:${listingRef}` }, () =>
    sendClaimDecision({
      email: user.email,
      firstName: firstNameFrom(profile.full_name),
      decision: 'approved',
      listingName: listing?.name,
    })
  );

  return NextResponse.json({ ok: true, sent: Boolean(result.sent), skipped: result.skipped });
}

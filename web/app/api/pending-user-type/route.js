import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabaseAdmin';
import { USER_TYPES } from '@/utils/userType';

export const dynamic = 'force-dynamic';

// Records the practitioner/explorer choice against an email, before that email
// has been verified and therefore before anyone is authenticated.
//
// WHY THIS IS A SERVER ROUTE rather than a direct write from the browser.
// pending_user_types deliberately has no SELECT policy for anon — with one it
// would be a publicly readable list of every address that has ever begun
// signing up. That has a consequence which is easy to miss: an anonymous
// UPSERT fails, because ON CONFLICT DO UPDATE has to read the conflicting row,
// and an anonymous UPDATE ... WHERE email = x silently matches zero rows,
// because the WHERE clause cannot see the row either. Both were measured.
//
// So the row would be write-once from the browser: someone who picked explorer,
// went back, and picked practitioner would keep the first answer with no error
// shown. Writing here with the service role sidesteps that without opening the
// table up to readers.
export async function POST(request) {
  const supabase = adminClient();
  if (!supabase) {
    // Not fatal — the choice still rides in sessionStorage for anyone who
    // finishes in the same tab. Reported so it is visible, not silent.
    return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const userType =
    body.userType === USER_TYPES.practitioner ? USER_TYPES.practitioner : USER_TYPES.explorer;

  // A rough shape check, not validation: Supabase is the authority on whether
  // an address exists. This only stops obvious rubbish filling the table.
  if (!email || !email.includes('@') || email.length > 320) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  // created_at is re-stamped on every write, not left at the column default.
  // The daily cleanup (api/cron/pending-signups) deletes rows older than 24
  // hours; measured from the FIRST attempt, someone who abandoned sign-up and
  // came back days later could lose their choice mid-way through the second.
  const { error } = await supabase
    .from('pending_user_types')
    .upsert(
      { email, user_type: userType, created_at: new Date().toISOString() },
      { onConflict: 'email' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

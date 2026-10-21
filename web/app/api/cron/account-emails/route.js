import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabaseAdmin';
import { firstNameFrom, sendEmail, sendPractitionerWelcome } from '@/utils/email';
import { sendOnce } from '@/utils/emailOnce';
import { explorerDay4 } from '@/utils/emailTemplates';
import { isExplorerForDay4, unsubscribeHeaders, unsubscribePageUrl } from '@/utils/unsubscribe';

export const dynamic = 'force-dynamic';

// The daily pass for emails that follow an account (Vercel, 09:00 UTC):
//
//   Day 4 (B2)  — to an explorer four days after the account was made, once.
//                 Never to anyone who has applied as a practitioner (declined
//                 applicants included), manages a listing, or has
//                 unsubscribed.
//   Welcome     — the practitioner welcome that waited for a claim
//                 (/api/email/practitioner-welcome) goes a day after sign-up
//                 to anyone who has neither claimed nor chosen by then. Also
//                 catches a welcome whose send failed.
//
// Each is once per account (email_sends, migration 0025), so a missed or
// repeated run sends nothing twice.

const DAY_MS = 24 * 60 * 60 * 1000;

// Accounts made before this had their welcomes sent with no record of it
// (records began with migration 0025), so they are left alone: no second
// welcome, and no Day 4 for the team's own test accounts.
// ACCOUNT_EMAILS_SINCE moves it, for testing on dev only; never set it on Vercel.
const RECORDS_SINCE = process.env.ACCOUNT_EMAILS_SINCE || '2026-10-22T00:00:00Z';

// How far back a run looks. A day or two of missed runs is caught up; an
// account from weeks ago is not suddenly emailed.
const LOOK_BACK_DAYS = 14;

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'cron_secret_not_set' }, { status: 503 });
  const auth = request.headers.get('authorization') || '';
  const header = request.headers.get('x-cron-secret') || '';
  const presented = auth.startsWith('Bearer ') ? auth.slice(7) : header;
  if (presented !== secret) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const now = Date.now();
  const earliest = new Date(Math.max(now - LOOK_BACK_DAYS * DAY_MS, Date.parse(RECORDS_SINCE))).toISOString();
  const tally = { day4_sent: 0, welcome_sent: 0, skipped: 0, errors: 0 };

  const addressOf = async (id) => (await supabase.auth.admin.getUserById(id)).data?.user?.email || null;
  const alreadySent = async (kind, ids) => {
    if (!ids.length) return new Set();
    const { data } = await supabase.from('email_sends').select('ref').eq('kind', kind).in('ref', ids);
    return new Set((data || []).map((row) => row.ref));
  };

  /* ── Day 4 ── */
  const { data: explorers, error: explorerError } = await supabase
    .from('user_profiles')
    .select('id, full_name, user_type, verification_status, linked_healer_slug, linked_publisher_id')
    .eq('user_type', 'explorer')
    .gte('created_at', earliest)
    .lte('created_at', new Date(now - 4 * DAY_MS).toISOString());
  if (explorerError) return NextResponse.json({ error: explorerError.message }, { status: 500 });

  const due = (explorers || []).filter(isExplorerForDay4);
  const day4Done = await alreadySent('explorer_day4', due.map((p) => p.id));

  for (const profile of due) {
    if (day4Done.has(profile.id)) continue;
    try {
      const email = await addressOf(profile.id);
      if (!email) continue;

      // Their preferences row: made now if they have none, for the token.
      await supabase.from('email_preferences').upsert({ user_id: profile.id }, { onConflict: 'user_id', ignoreDuplicates: true });
      const { data: prefs } = await supabase
        .from('email_preferences')
        .select('unsubscribed_at, unsubscribe_token')
        .eq('user_id', profile.id)
        .maybeSingle();
      if (!prefs?.unsubscribe_token || prefs.unsubscribed_at) {
        tally.skipped += 1;
        continue;
      }

      const result = await sendOnce(supabase, { kind: 'explorer_day4', ref: profile.id }, () =>
        sendEmail({
          to: email,
          ...explorerDay4({
            firstName: firstNameFrom(profile.full_name),
            unsubscribeUrl: unsubscribePageUrl(prefs.unsubscribe_token),
          }),
          headers: unsubscribeHeaders(prefs.unsubscribe_token),
        })
      );
      if (result.sent) tally.day4_sent += 1;
      else if (result.error) tally.errors += 1;
    } catch (err) {
      console.error(`[account-emails] day 4 for ${profile.id} failed:`, err);
      tally.errors += 1;
    }
  }

  /* ── The practitioner welcome that waited ── */
  const { data: practitioners, error: practitionerError } = await supabase
    .from('user_profiles')
    .select('id, full_name, linked_healer_slug, linked_publisher_id')
    .eq('user_type', 'practitioner')
    .is('linked_healer_slug', null)
    .is('linked_publisher_id', null)
    .gte('created_at', earliest)
    .lte('created_at', new Date(now - DAY_MS).toISOString());
  if (practitionerError) return NextResponse.json({ error: practitionerError.message }, { status: 500 });

  const welcomed = await alreadySent('practitioner_welcome', (practitioners || []).map((p) => p.id));
  for (const profile of practitioners || []) {
    if (welcomed.has(profile.id)) continue;
    try {
      const email = await addressOf(profile.id);
      if (!email) continue;
      const result = await sendOnce(supabase, { kind: 'practitioner_welcome', ref: profile.id }, () =>
        sendPractitionerWelcome({ email, firstName: firstNameFrom(profile.full_name) })
      );
      if (result.sent) tally.welcome_sent += 1;
      else if (result.error) tally.errors += 1;
    } catch (err) {
      console.error(`[account-emails] welcome for ${profile.id} failed:`, err);
      tally.errors += 1;
    }
  }

  return NextResponse.json(tally);
}

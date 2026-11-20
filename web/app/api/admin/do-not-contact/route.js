import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { isMissingTable, normaliseEmail } from '@/utils/neverAgain';

export const dynamic = 'force-dynamic';

// "Do not contact this email address" (owner, 20 Nov 2026; migration 0055):
// a listing's Outreach tab and Admin → Outreach.
//
//   GET                          → { rows, ready }
//   POST   { email, note }       → the address goes on the list; every
//                                  running or paused journey to a listing
//                                  with it stops; it comes off every listing
//                                  (each healer change in admin_edit_log)
//   DELETE { email }             → off the list again (the listings keep
//                                  no address: add it back by hand if wanted)
//
// Nothing is ever sent to an address on the list (utils/email.js → sendEmail).

const MIGRATION_0055 =
  'This needs migration 0055 (supabase/migrations/0055_do_not_contact_and_do_not_revive.sql). Run it on this database first.';

const who = () => process.env.ADMIN_NAME || 'Admin';

// ilike for case, with its wildcards escaped: "_" is common in addresses.
const likeAddress = (email) => email.replace(/[\\%_]/g, (c) => `\\${c}`);

async function guard() {
  if (!(await isAdminRequest())) return { response: NextResponse.json({ error: 'unauthorised' }, { status: 401 }) };
  const supabase = adminClient();
  if (!supabase) return { response: NextResponse.json(NOT_CONFIGURED, { status: 503 }) };
  return { supabase };
}

export async function GET() {
  const { supabase, response } = await guard();
  if (response) return response;
  const { data, error } = await supabase
    .from('do_not_contact_emails')
    .select('email, note, added_at, added_by')
    .order('added_at', { ascending: false });
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ rows: [], ready: false, message: MIGRATION_0055 });
    return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data, ready: true });
}

export async function POST(request) {
  const { supabase, response } = await guard();
  if (response) return response;
  const body = await request.json().catch(() => ({}));
  const email = normaliseEmail(body.email);
  if (!email) return NextResponse.json({ error: 'bad_email', message: 'That is not an email address.' }, { status: 400 });
  const note = (body.note || '').trim() || null;

  const { error: listError } = await supabase
    .from('do_not_contact_emails')
    .upsert({ email, note, added_by: who() }, { onConflict: 'email', ignoreDuplicates: true });
  if (listError) {
    if (isMissingTable(listError)) return NextResponse.json({ error: 'migration_needed', message: MIGRATION_0055 }, { status: 409 });
    return NextResponse.json({ error: 'write_failed', message: listError.message }, { status: 500 });
  }

  // Every listing that shows it, of either kind.
  const [{ data: healers, error: hError }, { data: publishers, error: pError }] = await Promise.all([
    supabase
      .from('healers')
      .select('id, healer_slug, name, contact_email, contact_email_source, contact_recipient_type')
      .ilike('contact_email', likeAddress(email)),
    supabase.from('publishers').select('id, slug, name, contact_email').ilike('contact_email', likeAddress(email)),
  ]);
  if (hError || pError) {
    return NextResponse.json(
      { error: 'query_failed', message: `On the list, but the listings could not be read: ${(hError || pError).message}` },
      { status: 500 }
    );
  }

  // Their running or paused journeys stop for good.
  let stopped = 0;
  for (const [column, values] of [
    ['healer_slug', healers.map((h) => h.healer_slug)],
    ['publisher_id', publishers.map((p) => p.id)],
  ]) {
    if (!values.length) continue;
    const { data } = await supabase
      .from('healer_journeys')
      .update({ status: 'stopped', stop_reason: 'do_not_contact_email' })
      .in(column, values)
      .in('status', ['running', 'paused'])
      .select('id');
    stopped += data?.length || 0;
  }

  // Off every listing. 0055's trigger would clear it on the next save
  // anyway; doing it now means no page shows it in the meantime.
  const cleared = { contact_email: null, contact_email_source: null, contact_recipient_type: null };
  const problems = [];
  for (const h of healers) {
    const { error } = await supabase.from('healers').update(cleared).eq('id', h.id);
    if (error) {
      problems.push(`${h.name}: ${error.message}`);
      continue;
    }
    await supabase.from('admin_edit_log').insert({
      healer_slug: h.healer_slug,
      table_name: 'healers',
      record_id: String(h.id),
      action: 'edit',
      summary: `Contact email ${email} removed: marked do not contact.`,
      before: { contact_email: h.contact_email, contact_email_source: h.contact_email_source, contact_recipient_type: h.contact_recipient_type },
      after: cleared,
      note,
      created_by: who(),
    });
  }
  for (const p of publishers) {
    const { error } = await supabase.from('publishers').update(cleared).eq('id', p.id);
    if (error) problems.push(`${p.name}: ${error.message}`);
  }

  return NextResponse.json({
    email,
    listings: [
      ...healers.map((h) => ({ name: h.name, slug: h.healer_slug, publisher: false })),
      ...publishers.map((p) => ({ name: p.name, slug: p.slug, publisher: true })),
    ],
    stopped,
    problems,
  });
}

export async function DELETE(request) {
  const { supabase, response } = await guard();
  if (response) return response;
  const body = await request.json().catch(() => ({}));
  const email = normaliseEmail(body.email);
  if (!email) return NextResponse.json({ error: 'bad_email', message: 'That is not an email address.' }, { status: 400 });
  const { error } = await supabase.from('do_not_contact_emails').delete().eq('email', email);
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: 'migration_needed', message: MIGRATION_0055 }, { status: 409 });
    return NextResponse.json({ error: 'write_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ email, removed: true });
}

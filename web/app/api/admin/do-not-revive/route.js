import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { isMissingTable } from '@/utils/neverAgain';

export const dynamic = 'force-dynamic';

// "Removed at owner's request — never re-add" (owner, 20 Nov 2026; migration
// 0055): the do-not-revive list, README §18.7. The listing's Delete dialog
// adds it here first, then deletes. No sprint or ingest adds it again:
// scripts/ingest.mjs refuses the plan, and 0055's trigger refuses the insert.
//
//   GET                         → { rows, ready }
//   POST   { healer_slug, note } → the listing goes on the list (by name,
//                                  slug and website, read from the listing)
//   DELETE { id }                → off the list again

const MIGRATION_0055 =
  'This needs migration 0055 (supabase/migrations/0055_do_not_contact_and_do_not_revive.sql). Run it on this database first.';

const who = () => process.env.ADMIN_NAME || 'Admin';

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
    .from('do_not_revive')
    .select('id, name, healer_slug, website_url, reason, removed_at')
    .order('removed_at', { ascending: false });
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
  const slug = (body.healer_slug || '').trim();
  if (!slug) return NextResponse.json({ error: 'missing_healer_slug' }, { status: 400 });

  const { data: healer } = await supabase
    .from('healers')
    .select('name, healer_slug, website_url, youtube_url, contact_email')
    .eq('healer_slug', slug)
    .maybeSingle();
  if (!healer) return NextResponse.json({ error: 'healer_not_found' }, { status: 404 });

  const day = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
  const note = (body.note || '').trim();
  const { error } = await supabase.from('do_not_revive').insert({
    ...healer,
    reason: `Removed at the owner's request (${day})${note ? `: ${note}` : ''}`,
    added_by: who(),
  });
  // Already on the list (the same name): nothing to add.
  if (error && error.code !== '23505') {
    if (isMissingTable(error)) return NextResponse.json({ error: 'migration_needed', message: MIGRATION_0055 }, { status: 409 });
    return NextResponse.json({ error: 'write_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ name: healer.name, added: !error });
}

export async function DELETE(request) {
  const { supabase, response } = await guard();
  if (response) return response;
  const body = await request.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  const { error } = await supabase.from('do_not_revive').delete().eq('id', body.id);
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: 'migration_needed', message: MIGRATION_0055 }, { status: 409 });
    return NextResponse.json({ error: 'write_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ removed: true });
}

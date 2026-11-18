import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { isMissingSchema } from '@/utils/journey';
import { ITEM_TABLES, changedFields, cleanEdit, defaultLockNote, lockOf, logSummary } from '@/utils/listingEdit';

export const dynamic = 'force-dynamic';

// Admin → Content → listing → Content (owner, 18 Nov 2026): changes the admin
// makes on a listing owner's behalf, each one written to admin_edit_log
// (migration 0053) with the rows before.
//
//   GET  ?slug=                                  → { lock, log, ready }
//   POST { action: 'edit', slug, table, id, values }
//        { action: 'remove', slug, table, id }
//        { action: 'remove_all', slug, table }   every item of one type
//        { action: 'lock' | 'unlock', slug, note }
//
// Every item is checked to belong to the listing named, so a stale page
// can't change another listing's row. Before 0053 runs, edits and removals
// still work and say they weren't logged; the lock needs 0053.

const MIGRATION_0053 =
  'This needs migration 0053 (supabase/migrations/0053_listing_locks_and_edit_log.sql). Run it on this database first.';

const who = () => process.env.ADMIN_NAME || 'Admin';

async function writeLog(supabase, entry) {
  const { error } = await supabase.from('admin_edit_log').insert({ ...entry, created_by: who() });
  if (error && !isMissingSchema(error)) console.error('[listing-edit] log failed:', error.message);
  return !error;
}

// The listing's lock row, null when unlocked, or undefined before 0053.
async function lockRow(supabase, slug) {
  const { data, error } = await supabase.from('listing_locks').select('*').eq('healer_slug', slug).maybeSingle();
  if (error) return isMissingSchema(error) ? undefined : null;
  return data;
}

async function listingBySlug(supabase, slug) {
  const { data } = await supabase.from('healers').select('*').eq('healer_slug', slug).maybeSingle();
  return data;
}

// The listing's own value for the table's key: its slug or its id.
const keyOf = (table, healer) => (ITEM_TABLES[table].key === 'healer_slug' ? healer.healer_slug : healer.id);

export async function GET(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const slug = new URL(request.url).searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'missing_slug' }, { status: 400 });
  const healer = await listingBySlug(supabase, slug);
  if (!healer) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data, error } = await supabase
    .from('admin_edit_log')
    .select('id, table_name, record_id, action, summary, before, after, note, created_by, created_at')
    .eq('healer_slug', slug)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error && !isMissingSchema(error)) return NextResponse.json({ error: error.message }, { status: 500 });
  const lock = await lockRow(supabase, slug);

  return NextResponse.json({
    ready: lock !== undefined && !error,
    lock: lockOf(lock),
    log: data || [],
    defaultNote: defaultLockNote(),
  });
}

export async function POST(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const { action, slug, table, id } = body;
  if (!slug) return NextResponse.json({ error: 'missing_slug' }, { status: 400 });
  const healer = await listingBySlug(supabase, slug);
  if (!healer) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // ── The lock ───────────────────────────────────────────────────────────
  if (action === 'lock' || action === 'unlock') {
    const before = await lockRow(supabase, slug);
    if (before === undefined) return NextResponse.json({ error: 'migration_needed', message: MIGRATION_0053 }, { status: 409 });
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    let data = null;
    if (action === 'lock') {
      const result = await supabase
        .from('listing_locks')
        .upsert({ healer_slug: slug, note: note || defaultLockNote(), locked_at: new Date().toISOString(), locked_by: who() })
        .select('*')
        .single();
      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
      data = result.data;
    } else {
      const { error } = await supabase.from('listing_locks').delete().eq('healer_slug', slug);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const logged = await writeLog(supabase, {
      healer_slug: slug,
      table_name: 'listing_locks',
      record_id: slug,
      action,
      summary: logSummary({ action, note: data?.note }),
      before,
      after: data,
      note: note || null,
    });
    return NextResponse.json({ lock: lockOf(data), logged });
  }

  const spec = ITEM_TABLES[table];
  if (!spec) return NextResponse.json({ error: 'table_not_allowed' }, { status: 400 });
  const ownKey = keyOf(table, healer);

  // ── Every item of one type ─────────────────────────────────────────────
  if (action === 'remove_all') {
    const { data: rows, error } = await supabase.from(table).select('*').eq(spec.key, ownKey);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!rows.length) return NextResponse.json({ removed: 0, logged: false });
    const { error: deleteError } = await supabase.from(table).delete().eq(spec.key, ownKey);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
    await supabase
      .from('broken_images')
      .delete()
      .eq('table_name', table)
      .in('record_id', rows.map((r) => String(r.id)));
    const logged = await writeLog(supabase, {
      healer_slug: slug,
      table_name: table,
      record_id: null,
      action,
      summary: logSummary({ action, table, count: rows.length }),
      before: rows,
      after: null,
      note: body.note || null,
    });
    return NextResponse.json({ removed: rows.length, logged });
  }

  // ── One item ───────────────────────────────────────────────────────────
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  const { data: row } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (!row || String(row[spec.key]) !== String(ownKey)) {
    return NextResponse.json({ error: 'not_on_this_listing', message: `That ${spec.noun} isn't on this listing any more.` }, { status: 404 });
  }

  if (action === 'remove') {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await supabase.from('broken_images').delete().eq('table_name', table).eq('record_id', String(id));
    const logged = await writeLog(supabase, {
      healer_slug: slug,
      table_name: table,
      record_id: String(id),
      action,
      summary: logSummary({ action, table, title: row.title }),
      before: row,
      after: null,
    });
    return NextResponse.json({ removed: 1, logged });
  }

  if (action === 'edit') {
    const clean = cleanEdit(table, body.values);
    if (clean.error) return NextResponse.json({ error: 'invalid', message: clean.error }, { status: 400 });
    const { before, after, changed } = changedFields(row, clean.values);
    if (!changed.length) return NextResponse.json({ item: row, changed: [], logged: false });
    const { data, error } = await supabase.from(table).update(after).eq('id', id).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    // A new picture clears the broken-image queue row, as the thumbnail editor does.
    if (changed.some((f) => f === 'image_url' || f === 'mock_cover_url')) {
      await supabase.from('broken_images').delete().eq('table_name', table).eq('record_id', String(id));
    }
    const logged = await writeLog(supabase, {
      healer_slug: slug,
      table_name: table,
      record_id: String(id),
      action,
      summary: logSummary({ action, table, title: data.title, changed }),
      before,
      after,
    });
    return NextResponse.json({ item: data, changed, logged });
  }

  return NextResponse.json({ error: 'action_not_allowed' }, { status: 400 });
}

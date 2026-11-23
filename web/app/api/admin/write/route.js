import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { lockRefusal } from '@/utils/listingEdit';

export const dynamic = 'force-dynamic';

// Every write the ingestion form makes, performed on the server.
//
// The form ran these from the browser with the anon key. That key ships in the
// bundle of every public page, so any permission it needed was a permission
// every visitor had — which is exactly how healers ended up editable by anyone.
// The writes move here so the anon key can lose those grants entirely
// (migration 0006) without the form losing the ability to work.
//
// Reads stay in the browser. They are public tables and public data.
//
// Access is the same admin session cookie that gates /admin. This route sits
// under /api, outside proxy.js's matcher, so it re-checks for itself —
// otherwise it would be an unauthenticated write endpoint for the whole
// catalogue.
const TABLES = new Set([
  'healers',
  'videos',
  'books',
  'courses',
  'free_resources',
  'publishers',
  'publisher_healers',
  // Teachers at a school (0029): the school's Profile tab adds and removes them.
  'hub_teachers',
  // Moderation. The service role is the only thing that may set reviews.status
  // — the table's trigger pins it against the author on both insert and
  // update, so approving one cannot be done from the browser session.
  'reviews',
  // The broken-image queue, so saving a replacement URL clears the row that
  // reported it. RLS on that table has no policy at all, so the anon key
  // cannot see it, let alone delete from it — this route's service role is the
  // only way in, and the admin session cookie is what gates it.
  'broken_images',
]);

const OPS = new Set(['insert', 'update', 'delete']);

export async function POST(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const { table, op, values, match, select, single } = body;

  // An allowlist of tables and operations, so this cannot become a general
  // write channel into the database if the client is ever tampered with.
  if (!TABLES.has(table)) return NextResponse.json({ error: 'table_not_allowed' }, { status: 400 });
  if (!OPS.has(op)) return NextResponse.json({ error: 'op_not_allowed' }, { status: 400 });

  let query = supabase.from(table);

  if (op === 'insert') {
    if (!values) return NextResponse.json({ error: 'no_values' }, { status: 400 });
    query = query.insert(values);
  } else if (op === 'update') {
    if (!values) return NextResponse.json({ error: 'no_values' }, { status: 400 });
    query = query.update(values);
  } else {
    query = query.delete();
  }

  // update and delete MUST be scoped. Without a match clause they would hit
  // every row in the table, and a single malformed call could empty it.
  if (op !== 'insert') {
    if (!match || typeof match !== 'object' || Object.keys(match).length === 0) {
      return NextResponse.json({ error: 'match_required' }, { status: 400 });
    }
  }

  if (match && typeof match === 'object') {
    for (const [column, value] of Object.entries(match)) {
      query = query.eq(column, value);
    }
  }

  if (select) query = query.select(select);
  if (select && single) query = query.single();

  // THE OLD PICTURE GOES IN THE CHANGE LOG (owner, 23 Nov 2026): a listing's
  // photos or a publisher's logo, read before the update and logged after it
  // (admin_edit_log, 0053), so a replaced or uploaded image can be put back.
  const image = op === 'update' && match ? IMAGE_COLUMNS[table]?.find((c) => c in values) : null;
  let before = null;
  if (image) {
    let read = supabase.from(table).select(`id, ${IMAGE_KEYS[table]}, ${image}`);
    for (const [column, value] of Object.entries(match)) read = read.eq(column, value);
    ({ data: before } = await read.maybeSingle());
  }

  const { data, error } = await query;

  // A listing locked at its owner's request (migration 0053) refuses new
  // items; the ingestion form shows this sentence.
  if (error) return NextResponse.json({ error: lockRefusal(error) || error.message, code: error.code }, { status: 400 });

  if (before && JSON.stringify(before[image] ?? null) !== JSON.stringify(values[image] ?? null)) {
    const slug = before[IMAGE_KEYS[table]];
    const { error: logError } = await supabase.from('admin_edit_log').insert({
      // The log is keyed by listing; a publisher's rows say so.
      healer_slug: table === 'publishers' ? `publisher:${slug}` : slug,
      table_name: table,
      record_id: String(before.id),
      action: 'edit',
      summary: table === 'publishers' ? 'Logo changed' : 'Photos changed',
      before: { [image]: before[image] ?? null },
      after: { [image]: values[image] ?? null },
      created_by: process.env.ADMIN_NAME || 'Admin',
    });
    if (logError) console.error('[write] image change not logged:', logError.message);
  }
  return NextResponse.json({ data: data ?? null });
}

// Where each table keeps its picture, and the column that names the listing.
const IMAGE_COLUMNS = { healers: ['image_urls', 'image_url'], publishers: ['logo_url'] };
const IMAGE_KEYS = { healers: 'healer_slug', publishers: 'slug' };

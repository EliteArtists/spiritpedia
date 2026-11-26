import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { lockRefusal } from '@/utils/listingEdit';
import { placesHolding } from '@/utils/oldAddress';

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

  // THE OLD VALUE GOES IN THE CHANGE LOG (admin_edit_log, 0053): a
  // listing's photos or a publisher's logo (owner, 23 Nov 2026), so a replaced
  // or uploaded image can be put back, and the contact email (26 Nov 2026).
  // Read before the update and logged after it.
  const logged = op === 'update' && match ? (LOGGED_COLUMNS[table] || []).filter((c) => c in values) : [];
  let before = null;
  if (logged.length) {
    let read = supabase.from(table).select(`id, name, ${KEYS[table]}, ${logged.join(', ')}`);
    for (const [column, value] of Object.entries(match)) read = read.eq(column, value);
    ({ data: before } = await read.maybeSingle());
  }

  const { data, error } = await query;

  // A listing locked at its owner's request (migration 0053) refuses new
  // items; the ingestion form shows this sentence.
  if (error) return NextResponse.json({ error: lockRefusal(error) || error.message, code: error.code }, { status: 400 });

  let oldAddress = null;
  if (before) {
    const slug = before[KEYS[table]];
    const changed = logged.filter((c) => JSON.stringify(before[c] ?? null) !== JSON.stringify(values[c] ?? null));
    for (const group of [changed.filter((c) => c !== 'contact_email'), changed.filter((c) => c === 'contact_email')]) {
      if (!group.length) continue;
      const email = group[0] === 'contact_email';
      const { error: logError } = await supabase.from('admin_edit_log').insert({
        // The log is keyed by listing; a publisher's rows say so.
        healer_slug: table === 'publishers' ? `publisher:${slug}` : slug,
        table_name: table,
        record_id: String(before.id),
        action: 'edit',
        summary: email ? 'Contact email changed' : table === 'publishers' ? 'Logo changed' : 'Photos changed',
        before: Object.fromEntries(group.map((c) => [c, before[c] ?? null])),
        after: Object.fromEntries(group.map((c) => [c, values[c] ?? null])),
        created_by: process.env.ADMIN_NAME || 'Admin',
      });
      if (logError) console.error('[write] change not logged:', logError.message);
    }
    // Where the old address is still written (owner, 26 Nov 2026).
    if (changed.includes('contact_email') && before.contact_email) {
      oldAddress = {
        address: before.contact_email,
        places: await placesOfOldAddress(supabase, table, before),
      };
    }
  }
  return NextResponse.json({ data: data ?? null, ...(oldAddress ? { oldAddress } : {}) });
}

// What is logged with its old value, and the column that names the listing.
const LOGGED_COLUMNS = {
  healers: ['image_urls', 'image_url', 'contact_email'],
  publishers: ['logo_url', 'contact_email'],
};
const KEYS = { healers: 'healer_slug', publishers: 'slug' };

// Everywhere the old address is still written: the listing itself (its
// email source page is where it was found, so not that), its books, videos,
// offerings and free resources, and any listing or publisher that shows it.
// Never fails the save: a failed look returns what it found.
async function placesOfOldAddress(supabase, table, before) {
  const address = before.contact_email.trim();
  const like = `%${address.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const groups = [];
  const read = async (promise) => {
    const { data, error } = await promise;
    if (error) console.error('[write] old address look failed:', error.message);
    return data || [];
  };
  const listingHref = (row) => `/admin/content/${encodeURIComponent(row.healer_slug)}`;
  if (table === 'healers') {
    const [self] = await read(supabase.from('healers').select('*').eq('id', before.id));
    groups.push({ table: 'healers', rows: self ? [self] : [], nameOf: (r) => r.name, hrefOf: listingHref, skip: ['contact_email_source'] });
    if (self) {
      const [videos, books, courses, resources] = await Promise.all([
        read(supabase.from('videos').select('*').eq('healer_slug', self.healer_slug)),
        read(supabase.from('books').select('*').eq('healer_slug', self.healer_slug)),
        read(supabase.from('courses').select('*').eq('healer_id', self.id)),
        read(supabase.from('free_resources').select('*').eq('healer_id', self.id)),
      ]);
      const item = (t, rows) => ({ table: t, rows, nameOf: (r) => r.title || r.name || `#${r.id}`, hrefOf: () => listingHref(self) });
      groups.push(item('videos', videos), item('books', books), item('courses', courses), item('free_resources', resources));
    }
  } else {
    const [self] = await read(supabase.from('publishers').select('*').eq('id', before.id));
    groups.push({ table: 'publishers', rows: self ? [self] : [], nameOf: (r) => r.name, hrefOf: (r) => `/publishers/${r.slug}` });
  }
  const columns = ['contact_email', 'booking_url', 'website_url', 'contact_form_url'];
  const [healers, publishers] = await Promise.all([
    read(
      supabase
        .from('healers')
        .select(`id, name, healer_slug, ${columns.join(', ')}`)
        .or(columns.map((c) => `${c}.ilike.${like}`).join(','))
        .neq('id', table === 'healers' ? before.id : -1)
    ),
    read(
      supabase
        .from('publishers')
        .select('id, name, slug, contact_email, website_url')
        .or(['contact_email', 'website_url'].map((c) => `${c}.ilike.${like}`).join(','))
        .neq('id', table === 'publishers' ? before.id : -1)
    ),
  ]);
  groups.push(
    { table: 'healers', rows: healers, nameOf: (r) => r.name, hrefOf: listingHref },
    { table: 'publishers', rows: publishers, nameOf: (r) => r.name, hrefOf: (r) => `/publishers/${r.slug}` }
  );
  return placesHolding(address, groups);
}

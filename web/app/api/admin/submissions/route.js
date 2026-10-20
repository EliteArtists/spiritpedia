import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { firstNameFrom, sendSubmissionDecision } from '@/utils/email';
import {
  IMAGE_COLUMNS,
  REJECT_REASONS,
  TABLES,
  URL_COLUMNS,
  changedFields,
  checkSubmission,
  kindOf,
  nextFreeSlug,
  slugify,
  typeWord,
} from '@/utils/contentSubmissions';
import {
  HOLDING_BUCKET,
  LIVE_COLUMNS,
  PUBLIC_BUCKET,
  PUBLIC_CONTENT_FOLDER,
  findDuplicate,
  findRemoval,
  holdingImageUrl,
  hostedContentPath,
  knownSubjects,
} from '@/utils/contentOwner';

export const dynamic = 'force-dynamic';

// Deciding what owners add and change (content_submissions, migration 0024).
//
//   GET                 everything waiting, and what owners removed lately
//   GET ?removed=&type= whether an owner removed this link (for ingestion)
//   GET ?id=            one, with the live row (for an edit), the duplicate
//                       and link checks, and the image
//   POST { id, action: 'approve', fields, subjects, … }
//                       new → inserted into its table, live at once;
//                       edit → only the changed columns applied to the live row
//   POST { id, action: 'reject', reason, note }
//
// Either way the owner is emailed (utils/email.js → sendSubmissionDecision);
// a failed email never undoes the decision.

const COLUMNS =
  'id, user_id, kind, content_type, target_id, fields, suggested_subjects, notes, author_pending, healer_slug, publisher_id, image_path, status, reject_reason, admin_note, created_at, updated_at, decided_at, healers(name, entity_type), publishers(name, slug)';

function bad(error, message, status = 400, extra = {}) {
  return NextResponse.json({ error, message, ...extra }, { status });
}

async function personFor(supabase, userId) {
  const [{ data: authUser }, { data: profile }] = await Promise.all([
    supabase.auth.admin.getUserById(userId),
    supabase.from('user_profiles').select('full_name').eq('id', userId).maybeSingle(),
  ]);
  return { email: authUser?.user?.email || null, name: profile?.full_name || null };
}

async function liveRow(supabase, row) {
  if (row.kind !== 'edit') return null;
  const table = TABLES[row.content_type];
  const { data } = await supabase.from(table).select(LIVE_COLUMNS[table]).eq('id', row.target_id).maybeSingle();
  return data || null;
}

// Does the link open? A courtesy check: some sites (Amazon especially) refuse
// automatic visits, which says nothing about whether a person can open it.
async function checkLink(contentType, link) {
  if (!link) return null;
  if (contentType === 'video') {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link)}`, {
        signal: AbortSignal.timeout(8000),
      });
      return res.ok
        ? { ok: true, label: 'The video exists on YouTube.' }
        : { ok: false, label: 'YouTube says this video doesn’t exist or is private.' };
    } catch {
      return { ok: null, label: 'Couldn’t reach YouTube to check.' };
    }
  }
  try {
    const res = await fetch(link, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; SpiritpediaLinkCheck/1.0; +https://www.spiritpedia.co)' },
    });
    if (res.ok) return { ok: true, label: `Opens (${res.status}).` };
    if (contentType === 'book' || res.status === 403 || res.status === 429 || res.status === 503) {
      return { ok: null, label: `The site refused an automatic check (${res.status}). Open it to check.` };
    }
    return { ok: false, label: `Didn’t open: ${res.status}.` };
  } catch {
    return { ok: null, label: 'Couldn’t reach the site to check. Open it to check.' };
  }
}

export async function GET(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const params = new URL(request.url).searchParams;
  const id = params.get('id');

  // Ingestion asking whether an owner removed this (so it isn't added back).
  if (params.get('removed')) {
    const removal = await findRemoval(supabase, params.get('type'), params.get('removed'));
    return NextResponse.json({ removal });
  }

  if (!id) {
    const [{ data: pending, error }, { data: removals }] = await Promise.all([
      supabase.from('content_submissions').select(COLUMNS).eq('status', 'pending').order('created_at', { ascending: true }),
      supabase
        .from('content_removals')
        .select('id, content_type, title, url, healer_slug, removed_by_name, reviews_deleted, saves_deleted, removed_at')
        .order('removed_at', { ascending: false })
        .limit(50),
    ]);
    if (error) return bad('query_failed', error.message, 500);
    return NextResponse.json({ pending: pending || [], removals: removals || [] });
  }

  const { data: row } = await supabase.from('content_submissions').select(COLUMNS).eq('id', id).maybeSingle();
  if (!row) return bad('not_found', 'That submission is gone.', 404);

  const live = await liveRow(supabase, row);
  const link = row.fields?.[URL_COLUMNS[row.content_type]];
  const [person, subjects, duplicate, removal, linkCheck, imagePreview, healers] = await Promise.all([
    personFor(supabase, row.user_id),
    knownSubjects(supabase),
    row.status === 'pending' ? findDuplicate(supabase, row.content_type, link, { exceptId: live?.id }) : null,
    findRemoval(supabase, row.content_type, link),
    row.status === 'pending' && (!live || link !== live[URL_COLUMNS[row.content_type]]) ? checkLink(row.content_type, link) : null,
    holdingImageUrl(supabase, row.image_path),
    row.author_pending
      ? supabase.from('healers').select('healer_slug, name').order('name').then((r) => r.data || [])
      : [],
  ]);

  // Approved: what it became, so the page still shows its (now public) image.
  let result = null;
  if (row.status === 'approved' && row.kind === 'new' && row.target_id) {
    const table = TABLES[row.content_type];
    const { data } = await supabase.from(table).select(LIVE_COLUMNS[table]).eq('id', row.target_id).maybeSingle();
    result = data || null;
  }

  return NextResponse.json({
    submission: row,
    live,
    result,
    changes: live ? changedFields(row.content_type, live, row.fields || {}) : null,
    person,
    subjects,
    duplicate,
    removal,
    linkCheck,
    imagePreview,
    healers,
  });
}

// Copies an approved image out of the holding bucket into the public one.
// → its public URL.
async function publishImage(supabase, row) {
  const { data: blob, error } = await supabase.storage.from(HOLDING_BUCKET).download(row.image_path);
  if (error || !blob) throw new Error('The image couldn’t be read. Ask them to upload it again.');
  const ext = row.image_path.split('.').pop();
  const path = `${PUBLIC_CONTENT_FOLDER}/${row.id}-${Date.now()}.${ext}`;
  const { error: upError } = await supabase.storage
    .from(PUBLIC_BUCKET)
    .upload(path, blob, { contentType: blob.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: false });
  if (upError) throw new Error('The image couldn’t be published.');
  return supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function uniqueSlug(supabase, table, title) {
  const base = slugify(title) || table;
  const { data } = await supabase.from(table).select('slug').or(`slug.eq.${base},slug.like.${base}-%`);
  return nextFreeSlug(base, (data || []).map((r) => r.slug));
}

async function tellOwner(supabase, row, decision, { title, slug, reason, note }) {
  try {
    const person = await personFor(supabase, row.user_id);
    if (!person.email) return false;
    const result = await sendSubmissionDecision({
      email: person.email,
      firstName: firstNameFrom(person.name),
      decision,
      kind: row.kind,
      title,
      what: typeWord(row.content_type, row.fields?.product_type),
      contentType: row.content_type,
      slug,
      reason,
      note,
    });
    return Boolean(result.sent);
  } catch (err) {
    console.error('[submissions] decision email failed:', err);
    return false;
  }
}

export async function POST(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const { data: row } = await supabase.from('content_submissions').select(COLUMNS).eq('id', body.id).maybeSingle();
  if (!row) return bad('not_found', 'That submission is gone.', 404);
  if (row.status !== 'pending') return bad('already_decided', `This was already ${row.status}.`, 409);

  const now = new Date().toISOString();

  if (body.action === 'reject') {
    if (!REJECT_REASONS[body.reason]) return bad('missing_reason', 'Choose a reason.');
    const note = String(body.note || '').trim().slice(0, 1000) || null;
    if (body.reason === 'other' && !note) return bad('missing_note', 'Add a note saying why.');
    const { error } = await supabase
      .from('content_submissions')
      .update({ status: 'rejected', reject_reason: body.reason, admin_note: note, decided_at: now, updated_at: now })
      .eq('id', row.id)
      .eq('status', 'pending');
    if (error) return bad('save_failed', error.message, 500);
    const live = await liveRow(supabase, row);
    const notified = await tellOwner(supabase, row, 'rejected', {
      title: live?.title || row.fields?.title,
      slug: live?.slug,
      reason: REJECT_REASONS[body.reason],
      note,
    });
    return NextResponse.json({ ok: true, status: 'rejected', notified });
  }

  if (body.action !== 'approve') return bad('unknown_action', 'Unknown action.');

  const table = TABLES[row.content_type];
  const live = await liveRow(supabase, row);
  if (row.kind === 'edit' && !live) {
    await supabase
      .from('content_submissions')
      .update({ status: 'withdrawn', admin_note: 'The item was removed.', decided_at: now, updated_at: now })
      .eq('id', row.id);
    return bad('item_gone', 'The item has been removed since, so there is nothing to change.', 409);
  }

  // The admin's version of the form, checked by the same rules.
  const kind = live ? kindOf(row.content_type, live) : kindOf(row.content_type, row.fields || {});
  const { data: subjectRows } = await supabase.from('subjects').select('slug');
  const { fields, errors } = checkSubmission(kind, body.fields || row.fields || {}, {
    subjects: body.subjects ?? row.suggested_subjects,
    knownSubjects: (subjectRows || []).map((s) => s.slug),
    live,
  });
  if (Object.keys(errors).length) return bad('invalid', Object.values(errors)[0], 400, { errors });

  // Whose listing it goes on.
  let healerSlug = row.healer_slug;
  if (row.author_pending) {
    healerSlug = String(body.healer_slug || '').trim() || null;
    if (!healerSlug) return bad('author_needed', 'Create the author in admin first, then choose them here.');
  }
  const { data: healer } = healerSlug
    ? await supabase.from('healers').select('id, healer_slug, name').eq('healer_slug', healerSlug).maybeSingle()
    : { data: null };
  if (!healer) return bad('listing_missing', 'That listing no longer exists.', 409);

  const link = fields[URL_COLUMNS[row.content_type]];
  const duplicate = await findDuplicate(supabase, row.content_type, link, { exceptId: live?.id });
  if (duplicate) return bad('duplicate', `“${duplicate.title}” is already on Spiritpedia with this link.`, 409);

  let imageUrl = null;
  try {
    if (row.image_path) imageUrl = await publishImage(supabase, row);
  } catch (err) {
    return bad('image_failed', err.message, 500);
  }
  const imageColumn = IMAGE_COLUMNS[row.content_type];

  let resultId;
  let slug;
  let title;

  if (row.kind === 'new') {
    title = fields.title;
    slug = await uniqueSlug(supabase, table, title);
    const values = { title, slug, subject_slugs: fields.subject_slugs };
    if (row.content_type === 'video') {
      Object.assign(values, { platform_url: fields.platform_url, healer_slug: healer.healer_slug });
    } else if (row.content_type === 'book') {
      Object.assign(values, {
        amazon_url: fields.amazon_url,
        author: fields.author,
        description: fields.description,
        mock_cover_url: imageUrl,
        healer_slug: healer.healer_slug,
      });
    } else if (row.content_type === 'course') {
      Object.assign(values, {
        course_url: fields.course_url,
        description: fields.description,
        price: fields.price,
        image_url: imageUrl,
        start_date: fields.start_date,
        end_date: fields.end_date,
        product_type: row.fields?.product_type || 'course',
        affiliate_status: ['none', 'applied', 'active'].includes(body.affiliate_status) ? body.affiliate_status : 'none',
        healer_id: healer.id,
      });
    } else {
      Object.assign(values, {
        resource_url: fields.resource_url,
        resource_type: fields.resource_type,
        description: fields.description,
        image_url: imageUrl,
        is_featured: Boolean(body.is_featured),
        healer_id: healer.id,
      });
    }
    const { data: inserted, error } = await supabase.from(table).insert(values).select('id').single();
    if (error) {
      if (imageUrl) await supabase.storage.from(PUBLIC_BUCKET).remove([hostedContentPath(imageUrl)]);
      return bad('save_failed', error.message, 500);
    }
    resultId = String(inserted.id);
  } else {
    const changes = changedFields(row.content_type, live, fields);
    const update = Object.fromEntries(Object.entries(changes).map(([column, { after }]) => [column, after]));
    if (imageUrl && imageColumn) update[imageColumn] = imageUrl;
    if (row.content_type === 'course' && ['none', 'applied', 'active'].includes(body.affiliate_status)) {
      update.affiliate_status = body.affiliate_status;
    }
    if (row.content_type === 'free_resource' && typeof body.is_featured === 'boolean') update.is_featured = body.is_featured;
    if (Object.keys(update).length) {
      const { error } = await supabase.from(table).update(update).eq('id', live.id);
      if (error) {
        if (imageUrl) await supabase.storage.from(PUBLIC_BUCKET).remove([hostedContentPath(imageUrl)]);
        return bad('save_failed', error.message, 500);
      }
    }
    // The image it replaced, if we hosted it.
    const old = imageUrl && imageColumn ? hostedContentPath(live[imageColumn]) : null;
    if (old) await supabase.storage.from(PUBLIC_BUCKET).remove([old]);
    resultId = String(live.id);
    slug = live.slug;
    title = update.title || live.title;
  }

  await supabase
    .from('content_submissions')
    .update({
      status: 'approved',
      target_id: resultId,
      healer_slug: healer.healer_slug,
      author_pending: false,
      image_path: null,
      decided_at: now,
      updated_at: now,
    })
    .eq('id', row.id);
  if (row.image_path) await supabase.storage.from(HOLDING_BUCKET).remove([row.image_path]);

  const notified = await tellOwner(supabase, row, 'approved', { title, slug });
  return NextResponse.json({ ok: true, status: 'approved', id: resultId, slug, content_type: row.content_type, notified });
}

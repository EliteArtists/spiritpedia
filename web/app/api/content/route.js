import { NextResponse } from 'next/server';
import {
  CONTENT_KINDS,
  EDITABLE,
  IMAGE_COLUMNS,
  LIMITS,
  URL_COLUMNS,
  changedFields,
  checkSubmission,
  kindOf,
  youtubeWatchUrl,
} from '@/utils/contentSubmissions';
import {
  HOLDING_BUCKET,
  PUBLIC_BUCKET,
  findDuplicate,
  holdingImageUrl,
  hostedContentPath,
  knownSubjects,
  liveItems,
  ownedItem,
  ownerFrom,
  youtubeTitle,
} from '@/utils/contentOwner';

export const dynamic = 'force-dynamic';

// An owner's own content (content_submissions, migration 0024).
//
//   GET  ?as=healer|publisher   what's live, what's waiting, what was turned down
//   POST { action, as, … }
//     submit        a new item, or an edit to a live one (target_id). Waits
//                   for the admin; the live row is never touched here.
//     resubmit      a turned-down one, changed, sent again
//     withdraw      a waiting one, taken back
//     remove        a live one, gone at once: no approval
//     youtube_title what YouTube calls a video, to fill the title in
//
// Only verified owners, and only their own listing (utils/contentOwner.js).

const SUBMISSION_COLUMNS =
  'id, kind, content_type, target_id, fields, suggested_subjects, notes, author_pending, healer_slug, image_path, status, reject_reason, admin_note, created_at, updated_at, decided_at';

export async function GET(request) {
  const as = new URL(request.url).searchParams.get('as');
  const owner = await ownerFrom(request, as);
  if (owner.error) return owner.error;
  const { supabase, user } = owner;

  const [live, subjects, { data: rows }] = await Promise.all([
    liveItems(owner),
    knownSubjects(supabase),
    supabase
      .from('content_submissions')
      .select(SUBMISSION_COLUMNS)
      .eq('user_id', user.id)
      .in('status', ['pending', 'rejected'])
      .order('created_at', { ascending: false }),
  ]);

  // Only this listing's: an account can manage a practitioner and a publisher.
  const mine = (rows || []).filter((row) =>
    owner.healer ? row.healer_slug === owner.healer.healer_slug : row.author_pending || owner.authors.some((a) => a.healer_slug === row.healer_slug)
  );
  const submissions = await Promise.all(
    mine.map(async (row) => ({ ...row, image_preview: await holdingImageUrl(supabase, row.image_path) }))
  );

  return NextResponse.json({
    as,
    listing: owner.healer
      ? { name: owner.healer.name, slug: owner.healer.healer_slug, path: `/healers/${owner.healer.healer_slug}` }
      : { name: owner.publisher.name, slug: owner.publisher.slug, path: `/publishers/${owner.publisher.slug}` },
    authors: owner.authors.map((a) => ({ slug: a.healer_slug, name: a.name })),
    subjects,
    live,
    submissions,
  });
}

function bad(error, message, status = 400, extra = {}) {
  return NextResponse.json({ error, message, ...extra }, { status });
}

// The image they uploaded (POST /api/content/image), which must be in their own
// folder of the holding bucket.
function ownImagePath(user, path) {
  const p = String(path || '');
  return p && p.startsWith(`${user.id}/`) && !p.includes('..') ? p : null;
}

// Check a submission, new or edit, against the rules and against what's
// already on the site. → { values } or { response }.
async function prepare(owner, body, { target, existingId } = {}) {
  const { supabase } = owner;
  const kind = target ? kindOf(body.content_type, target) : body.kind;
  const spec = CONTENT_KINDS[kind];
  if (!spec) return { response: bad('unknown_kind', 'Choose what you’re adding.') };
  if (owner.publisher && spec.contentType !== 'book') {
    return { response: bad('books_only', 'Publishers add books, for one of their authors.') };
  }

  const subjects = (await knownSubjects(supabase)).map((s) => s.slug);
  const { fields, errors } = checkSubmission(kind, body.form || {}, {
    subjects: body.subjects,
    knownSubjects: subjects,
    live: target || null,
  });
  if (Object.keys(errors).length) return { response: bad('invalid', 'Please check the highlighted fields.', 400, { errors }) };

  if (spec.productType && !target) fields.product_type = spec.productType;

  // Whose it is.
  let healerSlug = owner.healer?.healer_slug || null;
  let authorPending = false;
  if (owner.publisher) {
    if (target) {
      healerSlug = target.healer_slug;
    } else if (body.author_pending) {
      authorPending = true;
      healerSlug = null;
      if (!String(body.notes || '').trim()) {
        return { response: bad('invalid', 'Tell us the author’s name in the notes.', 400, { errors: { notes: 'Tell us the author’s name.' } }) };
      }
    } else {
      const author = owner.authors.find((a) => a.healer_slug === body.author_slug);
      if (!author) return { response: bad('invalid', 'Choose the author.', 400, { errors: { author_slug: 'Choose the author.' } }) };
      healerSlug = author.healer_slug;
    }
  }

  // Already on Spiritpedia? (An edit may keep its own link.)
  const link = fields[URL_COLUMNS[spec.contentType]];
  const duplicate = await findDuplicate(supabase, spec.contentType, link, { exceptId: target?.id });
  if (duplicate) {
    return {
      response: bad('duplicate', `“${duplicate.title}” is already on Spiritpedia with this link.`, 409, {
        errors: { [URL_COLUMNS[spec.contentType]]: 'This is already on Spiritpedia.' },
      }),
    };
  }
  // …or waiting already, from anyone.
  let waiting = supabase
    .from('content_submissions')
    .select('id')
    .eq('status', 'pending')
    .eq('content_type', spec.contentType)
    .eq(`fields->>${URL_COLUMNS[spec.contentType]}`, link)
    .limit(1);
  if (existingId) waiting = waiting.neq('id', existingId);
  if (target) waiting = waiting.neq('target_id', String(target.id));
  const { data: waitingRows } = await waiting;
  if (waitingRows?.length) {
    return {
      response: bad('duplicate', 'This link is already waiting for review.', 409, {
        errors: { [URL_COLUMNS[spec.contentType]]: 'Already waiting for review.' },
      }),
    };
  }

  // An image: uploaded only, and only where this type has one.
  let imagePath = null;
  if (body.image_path) {
    if (!IMAGE_COLUMNS[spec.contentType]) return { response: bad('no_image', 'Videos use YouTube’s own thumbnail.') };
    imagePath = ownImagePath(owner.user, body.image_path);
    if (!imagePath) return { response: bad('bad_image', 'Upload the image again.') };
  }

  // An edit that changes nothing has nothing to send.
  if (target) {
    const changes = changedFields(spec.contentType, target, fields);
    if (!imagePath && Object.keys(changes).length === 0) {
      return { response: bad('no_changes', 'Nothing has changed.') };
    }
    // Only the editable columns travel.
    for (const column of Object.keys(fields)) if (!EDITABLE[spec.contentType].includes(column)) delete fields[column];
  }

  const notes = String(body.notes || '').trim().slice(0, LIMITS.notes) || null;
  return {
    values: {
      content_type: spec.contentType,
      fields,
      suggested_subjects: fields.subject_slugs || [],
      notes,
      image_path: imagePath,
      healer_slug: healerSlug,
      publisher_id: owner.publisher?.id || null,
      author_pending: authorPending,
    },
  };
}

async function deleteHolding(supabase, path) {
  if (path) await supabase.storage.from(HOLDING_BUCKET).remove([path]);
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const owner = await ownerFrom(request, body.as);
  if (owner.error) return owner.error;
  const { supabase, user } = owner;

  if (body.action === 'youtube_title') {
    const watch = youtubeWatchUrl(body.url);
    if (!watch) return bad('invalid', 'That isn’t a YouTube link.');
    return NextResponse.json({ ok: true, url: watch, title: await youtubeTitle(watch) });
  }

  if (body.action === 'submit') {
    const { count } = await supabase
      .from('content_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');
    if ((count || 0) >= LIMITS.pending) {
      return bad('too_many', `You have ${LIMITS.pending} waiting already. Please wait for those to be reviewed.`, 429);
    }

    let target = null;
    if (body.target_id !== undefined && body.target_id !== null) {
      target = await ownedItem(owner, body.content_type, body.target_id);
      if (!target) return bad('not_yours', 'That isn’t on your listing.', 404);
      const { data: open } = await supabase
        .from('content_submissions')
        .select('id')
        .eq('kind', 'edit')
        .eq('status', 'pending')
        .eq('content_type', body.content_type)
        .eq('target_id', String(target.id))
        .limit(1);
      if (open?.length) return bad('edit_waiting', 'An edit to this is already waiting. Withdraw it first to send another.', 409);
    }

    const prepared = await prepare(owner, body, { target });
    if (prepared.response) return prepared.response;

    const { data, error } = await supabase
      .from('content_submissions')
      .insert({
        ...prepared.values,
        user_id: user.id,
        kind: target ? 'edit' : 'new',
        target_id: target ? String(target.id) : null,
      })
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505') return bad('edit_waiting', 'An edit to this is already waiting.', 409);
      return bad('save_failed', 'We couldn’t send that. Please try again.', 500);
    }
    return NextResponse.json({ ok: true, id: data.id });
  }

  if (body.action === 'resubmit' || body.action === 'withdraw') {
    const { data: row } = await supabase
      .from('content_submissions')
      .select('id, user_id, kind, content_type, target_id, status, image_path, healer_slug, author_pending')
      .eq('id', body.id)
      .maybeSingle();
    if (!row || row.user_id !== user.id) return bad('not_found', 'We couldn’t find that.', 404);

    if (body.action === 'withdraw') {
      if (row.status !== 'pending' && row.status !== 'rejected') return bad('already_decided', 'That has already been decided.', 409);
      const { error } = await supabase
        .from('content_submissions')
        .update({ status: 'withdrawn', decided_at: new Date().toISOString(), updated_at: new Date().toISOString(), image_path: null })
        .eq('id', row.id);
      if (error) return bad('save_failed', 'We couldn’t withdraw that. Please try again.', 500);
      await deleteHolding(supabase, row.image_path);
      return NextResponse.json({ ok: true });
    }

    if (row.status !== 'rejected') return bad('not_rejected', 'Only something we turned down can be sent again.', 409);
    let target = null;
    if (row.kind === 'edit') {
      target = await ownedItem(owner, row.content_type, row.target_id);
      if (!target) return bad('not_yours', 'That isn’t on your listing any more.', 404);
    }
    const prepared = await prepare(
      owner,
      { ...body, content_type: row.content_type, kind: body.kind, author_slug: body.author_slug ?? row.healer_slug, author_pending: body.author_pending ?? row.author_pending },
      { target, existingId: row.id }
    );
    if (prepared.response) return prepared.response;
    // A new image replaces the old; no new image keeps it.
    const values = { ...prepared.values, image_path: prepared.values.image_path || row.image_path };
    const { error } = await supabase
      .from('content_submissions')
      .update({
        ...values,
        status: 'pending',
        reject_reason: null,
        admin_note: null,
        decided_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    if (error) {
      if (error.code === '23505') return bad('edit_waiting', 'An edit to this is already waiting.', 409);
      return bad('save_failed', 'We couldn’t send that. Please try again.', 500);
    }
    if (prepared.values.image_path && row.image_path && prepared.values.image_path !== row.image_path) {
      await deleteHolding(supabase, row.image_path);
    }
    return NextResponse.json({ ok: true, id: row.id });
  }

  if (body.action === 'remove') {
    const item = await ownedItem(owner, body.content_type, body.id);
    if (!item) return bad('not_yours', 'That isn’t on your listing.', 404);

    // Images waiting in edits to it go too.
    const { data: edits } = await supabase
      .from('content_submissions')
      .select('image_path')
      .eq('kind', 'edit')
      .eq('status', 'pending')
      .eq('content_type', body.content_type)
      .eq('target_id', String(item.id));

    const { data: removalId, error } = await supabase.rpc('remove_owned_content', {
      p_type: body.content_type,
      p_id: String(item.id),
      p_user: user.id,
      p_user_name: owner.profile?.full_name || owner.healer?.name || owner.publisher?.name || null,
    });
    if (error) return bad('remove_failed', 'We couldn’t remove that. Please try again.', 500);

    // The image we hosted for it, if any. After the row is gone, so a failure
    // here leaves a stray file, never a broken page.
    const hosted = hostedContentPath(item[IMAGE_COLUMNS[body.content_type]]);
    if (hosted) await supabase.storage.from(PUBLIC_BUCKET).remove([hosted]);
    const waiting = (edits || []).map((e) => e.image_path).filter(Boolean);
    if (waiting.length) await supabase.storage.from(HOLDING_BUCKET).remove(waiting);

    return NextResponse.json({ ok: true, removed: Boolean(removalId) });
  }

  return bad('unknown_action', 'Unknown action.');
}

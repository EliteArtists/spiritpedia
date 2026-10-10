import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { deleteAccount } from '@/utils/deleteAccount';

export const dynamic = 'force-dynamic';

// Everything behind one person's record: their profile, their email, the healer
// row they are linked to, and the content hanging off it.
//
// The joins are not uniform and cannot be made so: videos and books find a
// practitioner by the text healer_slug, while courses and free_resources use
// the bigint healer_id. That split is documented in the README and is why this
// needs the healer row before it can count anything.
export async function GET(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !profile) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: authUser } = await supabase.auth.admin.getUserById(id);
  profile.email = authUser?.user?.email || null;
  profile.last_sign_in_at = authUser?.user?.last_sign_in_at || null;
  profile.email_confirmed_at = authUser?.user?.email_confirmed_at || null;

  let healer = null;
  let content = { videos: [], books: [], courses: [], free_resources: [] };

  if (profile.linked_healer_slug) {
    const { data: h } = await supabase
      .from('healers')
      .select('id, name, healer_slug, tier, entity_type, availability_type, city, country')
      .eq('healer_slug', profile.linked_healer_slug)
      .maybeSingle();
    healer = h || null;

    if (healer) {
      const [videos, books, courses, resources] = await Promise.all([
        supabase.from('videos').select('id, title, platform_url').eq('healer_slug', healer.healer_slug),
        supabase.from('books').select('id, title, slug').eq('healer_slug', healer.healer_slug),
        supabase.from('courses').select('id, title, slug, product_type').eq('healer_id', healer.id),
        supabase.from('free_resources').select('id, title, slug, resource_type').eq('healer_id', healer.id),
      ]);
      content = {
        videos: videos.data || [],
        books: books.data || [],
        courses: courses.data || [],
        free_resources: resources.data || [],
      };
    }
  }

  return NextResponse.json({ profile, healer, content });
}

// Edit a profile by hand. Two separate powers, deliberately kept apart.
//
// `verification_status` is the first. The field-protection trigger pins that
// column against every ordinary caller, which is what stops practitioners
// approving themselves; the service role is the one path that may set it.
//
// `profile` is the second — the ordinary fields an admin may correct on
// somebody's behalf. It is an ALLOWLIST, not an exclusion list, because the two
// columns that must never be written this way are exactly the two that look
// most like ordinary fields:
//
//   linked_healer_slug  — the claim. Setting it here would hand someone a
//                         healer profile without the email check in
//                         claim_healer_profile(), which is the whole guard.
//   verification_status — has its own path above, with its own validation.
//
// Anything not named here is ignored rather than rejected, so a client sending
// a whole row back cannot smuggle a column in.
const STATUSES = ['pending', 'approved', 'rejected'];
const USER_TYPES = ['practitioner', 'explorer'];

const PROFILE_COLUMNS = new Set([
  'full_name',
  'user_type',
  'modality',
  'bio',
  'location_city',
  'location_country',
  'availability_type',
  'website_url',
  'booking_url',
  'youtube_url',
  'instagram_url',
  'facebook_url',
  'tiktok_url',
  'twitter_url',
  'subject_slugs',
]);

export async function PATCH(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const { id, verification_status: status, profile } = body;

  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const values = {};

  if (status !== undefined) {
    if (!STATUSES.includes(status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }
    values.verification_status = status;
  }

  if (profile && typeof profile === 'object') {
    for (const [column, value] of Object.entries(profile)) {
      if (!PROFILE_COLUMNS.has(column)) continue;
      if (column === 'user_type' && !USER_TYPES.includes(value)) {
        return NextResponse.json({ error: 'invalid_user_type' }, { status: 400 });
      }
      if (column === 'subject_slugs' && value !== null && !Array.isArray(value)) {
        return NextResponse.json({ error: 'invalid_subject_slugs' }, { status: 400 });
      }
      values[column] = value;
    }
  }

  // An update with no SET clause is a no-op that still reports success, which
  // would show the caller a confirmation for a write that never happened.
  if (Object.keys(values).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
  }

  const { error } = await supabase.from('user_profiles').update(values).eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: Object.keys(values) });
}

// Delete an account outright.
//
// The row that matters is in auth.users, not user_profiles: deleting the
// profile alone would leave the identity behind, still able to sign in and
// still owning a profile row that gets recreated on the next AuthSync pass.
// Deleting the auth user is what actually removes the person, and three
// foreign keys carry ON DELETE CASCADE off it:
//
//   user_profiles.id              (0001)
//   user_favourites.user_id       (0002)
//   admin_notes.subject_user_id   (0005)
//
// (and reviews.user_id, 0008). So one delete takes the profile, everything
// they saved, their reviews and every internal note written about them. None of it is recoverable, which is why the client
// puts a confirmation in front of this and why the route refuses to guess an
// id from anything but an explicit one.
//
// Only the service role may do this. The anon key could not delete an auth
// user even if it tried — admin.deleteUser is a service-role endpoint — and
// this route is where that key lives.
//
// Note what is NOT cascaded: a claimed healer profile. healers has no foreign
// key onto the account, so deleting the person leaves their public listing
// standing, unclaimed. That is deliberate — the directory is editorial content
// and should not vanish because somebody closed their account — but it does
// mean the claim must be cleared separately if the listing should go too.
export async function DELETE(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const id = body?.id || new URL(request.url).searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  // The shared implementation (utils/deleteAccount.js) — the same one the
  // self-serve route uses, so an admin deletion also removes uploaded photos
  // the listing does not display. source 'admin' writes no Inbox record: the
  // admin is the one looking.
  const result = await deleteAccount(supabase, id, { source: 'admin' });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    deleted: id,
    // Surfaced so the admin knows a public listing is now unclaimed rather than
    // gone, without having to go and look.
    orphaned_healer_slug: result.linkedHealerSlug,
  });
}

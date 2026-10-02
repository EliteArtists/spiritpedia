import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// The only fields a practitioner may change on their own healer row.
//
// An allowlist, not a blocklist: a new column added to healers should not
// silently become editable from the browser because nobody remembered to
// exclude it. Everything that decides how the platform treats them — tier,
// entity_type, availability_type, subject_slugs, healer_slug — is absent on
// purpose and stays with Spiritpedia.
//
// contact_email is absent for a sharper reason. claim_healer_profile() matches
// a claimant against healers.contact_email, so a practitioner who could edit it
// could point it at someone else's address and hand them a claim on this
// profile. It is read-only here until a verify-then-apply flow exists.
const TEXT_FIELDS = [
  'bio',
  'website_url',
  'booking_url',
  'youtube_url',
  'instagram_url',
  'facebook_url',
  'twitter_url',
  'tiktok_url',
  'contact_phone',
];

const MAX_IMAGES = 3;

function cleanUrl(value) {
  const v = String(value ?? '').trim();
  if (!v) return null;
  try {
    const url = new URL(v);
    // http(s) only: a javascript: or data: URL stored here would be rendered
    // into an href on the public profile.
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function PATCH(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'no_token' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: 'misconfigured' }, { status: 503 });

  // Identity is asked of Supabase, never read from the body.
  const reader = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await reader.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_type, verification_status, linked_healer_slug')
    .eq('id', user.id)
    .maybeSingle();

  // The slug comes from THEIR profile row, never from the request. Without this
  // the route would be an open editor for any healer on the site.
  if (
    !profile ||
    profile.user_type !== 'practitioner' ||
    profile.verification_status !== 'approved' ||
    !profile.linked_healer_slug
  ) {
    return NextResponse.json({ error: 'not_an_approved_practitioner' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const update = {};

  if (typeof body.bio === 'string') update.bio = body.bio.trim() || null;

  for (const field of TEXT_FIELDS) {
    if (field === 'bio') continue;
    if (!(field in body)) continue;
    const raw = String(body[field] ?? '').trim();
    if (!raw) {
      update[field] = null;
      continue;
    }
    if (field === 'contact_phone') {
      update[field] = raw.slice(0, 40);
      continue;
    }
    const valid = cleanUrl(raw);
    if (!valid) {
      return NextResponse.json(
        { error: 'invalid_url', field, message: `${field} must be a full http(s) address.` },
        { status: 400 }
      );
    }
    update[field] = valid;
  }

  if (Array.isArray(body.image_urls)) {
    const images = body.image_urls
      .map((u) => String(u ?? '').trim())
      .filter(Boolean)
      .slice(0, MAX_IMAGES);
    // Images arrive as storage URLs the browser has just uploaded, so they are
    // checked the same way as any other URL rather than trusted.
    for (const image of images) {
      if (!cleanUrl(image)) {
        return NextResponse.json({ error: 'invalid_image_url' }, { status: 400 });
      }
    }
    update.image_urls = images;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('healers')
    .update(update)
    .eq('healer_slug', profile.linked_healer_slug)
    .select('healer_slug')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'healer_row_missing' }, { status: 404 });

  return NextResponse.json({ ok: true, healer_slug: data.healer_slug, updated: Object.keys(update) });
}

// Everything the dashboard needs to render: the healer row, and the content
// hanging off it across all four tables.
export async function GET(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'no_token' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const reader = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await reader.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_type, verification_status, linked_healer_slug, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.user_type !== 'practitioner' ||
    profile.verification_status !== 'approved' ||
    !profile.linked_healer_slug
  ) {
    return NextResponse.json({ error: 'not_an_approved_practitioner' }, { status: 403 });
  }

  const { data: healer } = await supabase
    .from('healers')
    .select('*')
    .eq('healer_slug', profile.linked_healer_slug)
    .maybeSingle();

  if (!healer) return NextResponse.json({ error: 'healer_row_missing' }, { status: 404 });

  // Content lives in four tables, joined two different ways: videos and books
  // by the text healer_slug, courses and free_resources by the bigint
  // healer_id. There is no single content table.
  const [videos, books, courses, resources] = await Promise.all([
    supabase.from('videos').select('id, title, platform_url, subject_slugs').eq('healer_slug', healer.healer_slug),
    supabase.from('books').select('id, title, slug, mock_cover_url, subject_slugs').eq('healer_slug', healer.healer_slug),
    supabase.from('courses').select('id, title, slug, image_url, product_type, subject_slugs').eq('healer_id', healer.id),
    supabase.from('free_resources').select('id, title, slug, image_url, resource_type, subject_slugs').eq('healer_id', healer.id),
  ]);

  // CLAIMED vs ADMIN-INGESTED.
  //
  // There is no claims table. But the two cases leave different traces: an
  // admin approval CREATES the healer row from the application, so the row is
  // newer than the account; a claim links to a profile that was already on the
  // site, so the row is older. Comparing the timestamps answers it today
  // without a migration. A claimed_at column would be cleaner, and this should
  // be replaced by one when claims get their own table.
  const claimed =
    healer.created_at && profile.created_at
      ? new Date(healer.created_at) < new Date(profile.created_at)
      : false;

  return NextResponse.json({
    healer,
    claimed,
    email: user.email,
    content: {
      videos: videos.data || [],
      books: books.data || [],
      courses: courses.data || [],
      free_resources: resources.data || [],
    },
  });
}

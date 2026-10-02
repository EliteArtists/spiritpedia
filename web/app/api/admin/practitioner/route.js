import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// The label healers.availability_type carries, keyed by what user_profiles
// stores.
//
// NOT quite the ingestion form's map. That form is for an admin adding a known
// figure, so its 'worldwide' label reads "Worldwide (Famous Names)" — which is
// simply false about someone who registered themselves and picked "Worldwide"
// from a dropdown, and it was being written onto Local Heroes.
//
// The replacement is not a bare "Worldwide" either. The healer profile decides
// whether to show the "Online Session available" badge with
// availability_type.includes('Online'), so a label without that word silently
// drops the badge from exactly the practitioners who are most available
// online. The wording carries it deliberately.
const AVAILABILITY_LABELS = {
  worldwide: 'Worldwide (Online Sessions)',
  local: 'Local Only (In-Person)',
  local_online: 'Local & Online Sessions',
};

const TIERS = ['superhero', 'ascended_master', 'luminary', 'local_hero'];
const ENTITY_TYPES = ['individual', 'channel', 'app'];

function slugify(value) {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Approving must never collide with an existing healer_slug — the column is how
// every book, video and route finds a practitioner, so a duplicate would merge
// two people's work.
async function uniqueSlug(supabase, base) {
  const { data } = await supabase.from('healers').select('healer_slug').ilike('healer_slug', `${base}%`);
  const taken = new Set((data || []).map((row) => row.healer_slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export async function POST(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const { action, id, tier = 'local_hero', entityType = 'individual' } = body;

  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  if (action === 'reject') {
    // Rejection hands the account back to being an ordinary explorer. They keep
    // everything an explorer has — the library, the saved items — and lose only
    // the pending practitioner listing. verification_status stays 'rejected' so
    // the account page can explain what happened and offer a resubmission; it
    // is user_type that decides what they ARE, and they are no longer a
    // practitioner awaiting review.
    const { error } = await supabase
      .from('user_profiles')
      .update({ verification_status: 'rejected', user_type: 'explorer' })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, verification_status: 'rejected' });
  }

  if (action !== 'approve') {
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  }

  // Never trust the dropdown values off the wire — a bad tier would render an
  // unstyled badge across the whole site.
  if (!TIERS.includes(tier) || !ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: 'invalid_tier_or_entity_type' }, { status: 400 });
  }

  const { data: profile, error: readError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (readError || !profile) {
    return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
  }

  // Already linked: approve in place rather than creating a second healer row
  // for the same person. Pressing Approve twice is an ordinary slip.
  if (profile.linked_healer_slug) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ verification_status: 'approved' })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, healer_slug: profile.linked_healer_slug, reused: true });
  }

  const { data: authUser } = await supabase.auth.admin.getUserById(id);
  const email = authUser?.user?.email || null;

  const name = (profile.full_name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'no_name', message: 'This profile has no name to publish.' }, { status: 400 });
  }

  const healerSlug = await uniqueSlug(supabase, slugify(name));

  const { error: insertError } = await supabase.from('healers').insert({
    name,
    healer_slug: healerSlug,
    bio: profile.bio || null,
    tier,
    entity_type: entityType,
    image_urls: profile.image_urls || [],
    subject_slugs: profile.subject_slugs || [],
    availability_type: AVAILABILITY_LABELS[profile.availability_type] || AVAILABILITY_LABELS.worldwide,
    city: profile.location_city || null,
    country: profile.location_country || null,
    contact_email: email,
    website_url: profile.website_url || null,
    booking_url: profile.booking_url || null,
    youtube_url: profile.youtube_url || null,
    instagram_url: profile.instagram_url || null,
    facebook_url: profile.facebook_url || null,
    tiktok_url: profile.tiktok_url || null,
    twitter_url: profile.twitter_url || null,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // The healer row exists now. If this second write fails the practitioner is
  // published but still reads as pending, which is recoverable and visible —
  // the opposite order would mark them approved with nothing to show.
  const { error: linkError } = await supabase
    .from('user_profiles')
    .update({ verification_status: 'approved', linked_healer_slug: healerSlug })
    .eq('id', id);

  if (linkError) {
    return NextResponse.json(
      { error: 'partial', message: `Healer ${healerSlug} was created but the profile was not linked: ${linkError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, healer_slug: healerSlug });
}

import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { ENTITY_TYPES } from '@/utils/listings';
import { firstNameFrom, sendClaimDecision, sendEmail, sendListingLive } from '@/utils/email';
import { forgetSent, sendOnce } from '@/utils/emailOnce';
import { applicationDeclined } from '@/utils/emailTemplates';

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

// Channels, apps and organisations do not hold sessions unless they said so:
// their label carries no "Online", so no "Online Session available" badge.
const PLATFORM_AVAILABILITY = 'Worldwide';

const TIERS = ['superhero', 'ascended_master', 'luminary', 'local_hero'];
// Ascended Master is for people only (utils/badges.js).
const PLATFORM_TIERS = ['superhero', 'luminary', 'local_hero'];

// "Your listing is live" to the owner (D3, utils/emailTemplates.js). Never
// throws and never undoes the approval: the response says whether it went,
// and the admin's message says so.
async function tellOwner({ email, fullName, listingName, listingPath }) {
  if (!email) return false;
  try {
    const result = await sendListingLive({
      email,
      firstName: firstNameFrom(fullName),
      listingName,
      listingPath,
    });
    return Boolean(result?.sent);
  } catch (err) {
    console.error('[approve] listing live email failed:', err);
    return false;
  }
}

// A claimed listing approved: the claim approval email, never "live". Once
// per account and listing, shared with /api/email/claim-approved, so an
// instant claim that already had it is not told twice.
async function tellClaimant(supabase, { userId, listingRef, email, fullName, listingName }) {
  if (!email) return false;
  try {
    const result = await sendOnce(supabase, { kind: 'claim_approved', ref: `${userId}:${listingRef}` }, () =>
      sendClaimDecision({
        email,
        firstName: firstNameFrom(fullName),
        decision: 'approved',
        listingName,
      })
    );
    return Boolean(result?.sent);
  } catch (err) {
    console.error('[approve] claim approved email failed:', err);
    return false;
  }
}

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
async function uniqueSlug(supabase, base, table = 'healers', column = 'healer_slug') {
  const { data } = await supabase.from(table).select(column).ilike(column, `${base}%`);
  const taken = new Set((data || []).map((row) => row[column]));
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
  const { action, id, tier = 'local_hero', entityType = 'individual', publisherId = null } = body;
  // For a decline: the explanation the applicant reads (D4). Not a private note.
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  if (action === 'reject') {
    if (!reason) {
      return NextResponse.json(
        { error: 'missing_reason', message: 'Write the reason the applicant will read.' },
        { status: 400 }
      );
    }
    const { data: before } = await supabase
      .from('user_profiles')
      .select('full_name, verification_status')
      .eq('id', id)
      .maybeSingle();

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

    // "An update on your Spiritpedia application" (D4), with the reason. Not
    // when Reject is pressed on something already rejected. Sending it in
    // again is a new application, so its receipt (D2) is forgotten here.
    let notified = null;
    if (before?.verification_status !== 'rejected') {
      await forgetSent(supabase, { kind: 'application_received', ref: id });
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(id);
        const email = authUser?.user?.email;
        notified = email
          ? Boolean(
              (
                await sendEmail({
                  to: email,
                  ...applicationDeclined({
                    firstName: firstNameFrom(before?.full_name),
                    listingName: before?.full_name?.trim() || null,
                    reason,
                  }),
                })
              ).sent
            )
          : false;
      } catch (err) {
        console.error('[reject] application declined email failed:', err);
        notified = false;
      }
    }
    return NextResponse.json({ ok: true, verification_status: 'rejected', notified });
  }

  if (action !== 'approve') {
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  }

  // Never trust the dropdown values off the wire — a bad tier would render an
  // unstyled badge across the whole site. 'publisher' is not an entity_type: it
  // makes a publishers row instead (migration 0020).
  const isPublisher = entityType === 'publisher';
  const allowedTiers = isPublisher || (entityType && entityType !== 'individual') ? PLATFORM_TIERS : TIERS;
  if (!allowedTiers.includes(tier) || (!isPublisher && !ENTITY_TYPES.includes(entityType))) {
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

  // Already linked: approve in place rather than creating a second listing for
  // the same person. Pressing Approve twice is an ordinary slip.
  const { data: authUser } = await supabase.auth.admin.getUserById(id);
  const email = authUser?.user?.email || null;

  if (profile.linked_healer_slug || profile.linked_publisher_id) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ verification_status: 'approved' })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Already linked means a claim of a listing that was public all along: no
    // "Your listing is live". The claim approval email says it is theirs now
    // (utils/claimRequests.js, as for a claim request). Approve pressed on
    // something already approved is not news, so no email (notified: null).
    let notified = null;
    if (profile.verification_status !== 'approved') {
      const listing = profile.linked_healer_slug
        ? await supabase.from('healers').select('name').eq('healer_slug', profile.linked_healer_slug).maybeSingle()
        : await supabase.from('publishers').select('name, slug').eq('id', profile.linked_publisher_id).maybeSingle();
      notified = await tellClaimant(supabase, {
        userId: id,
        listingRef: profile.linked_healer_slug || profile.linked_publisher_id,
        email,
        fullName: profile.full_name,
        listingName: listing.data?.name,
      });
    }
    return NextResponse.json({
      ok: true,
      healer_slug: profile.linked_healer_slug,
      publisher_id: profile.linked_publisher_id,
      reused: true,
      notified,
    });
  }

  const name = (profile.full_name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'no_name', message: 'This profile has no name to publish.' }, { status: 400 });
  }

  if (isPublisher) return approvePublisher(supabase, { id, profile, name, email, publisherId, tier });

  const healerSlug = await uniqueSlug(supabase, slugify(name));
  const availability =
    entityType !== 'individual' && profile.availability_type !== 'local' && profile.availability_type !== 'local_online'
      ? PLATFORM_AVAILABILITY
      : AVAILABILITY_LABELS[profile.availability_type] || AVAILABILITY_LABELS.worldwide;

  const { error: insertError } = await supabase.from('healers').insert({
    name,
    healer_slug: healerSlug,
    bio: profile.bio || null,
    tier,
    entity_type: entityType,
    image_urls: profile.image_urls || [],
    subject_slugs: profile.subject_slugs || [],
    availability_type: availability,
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

  const notified = await tellOwner({
    email,
    fullName: profile.full_name,
    listingName: name,
    listingPath: `/healers/${healerSlug}`,
  });
  return NextResponse.json({ ok: true, healer_slug: healerSlug, notified });
}

// A publisher: link an existing publishers row (chosen by the admin), or
// create one from the application. The account is linked by
// linked_publisher_id, which only the service role or a verified claim may
// write (migration 0020).
async function approvePublisher(supabase, { id, profile, name, email, publisherId, tier }) {
  let targetId = null;
  let slug = null;
  let listingName = name;

  if (publisherId) {
    const { data: existing } = await supabase
      .from('publishers')
      .select('id, slug, name, contact_email')
      .eq('id', publisherId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: 'publisher_not_found' }, { status: 404 });
    targetId = existing.id;
    slug = existing.slug;
    listingName = existing.name;
    // Fill a missing contact address; never replace one already published.
    if (!existing.contact_email && email) {
      await supabase.from('publishers').update({ contact_email: email }).eq('id', existing.id);
    }
  } else {
    slug = await uniqueSlug(supabase, slugify(name), 'publishers', 'slug');
    const { data: created, error: insertError } = await supabase
      .from('publishers')
      .insert({
        name,
        slug,
        description: profile.bio || null,
        website_url: profile.website_url || null,
        logo_url: (profile.image_urls || []).find(Boolean) || null,
        subject_slugs: profile.subject_slugs || [],
        contact_email: email,
        tier,
      })
      .select('id')
      .single();
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    targetId = created.id;
  }

  const { error: linkError } = await supabase
    .from('user_profiles')
    .update({ verification_status: 'approved', linked_publisher_id: targetId })
    .eq('id', id);

  if (linkError) {
    return NextResponse.json(
      { error: 'partial', message: `Publisher ${slug} is ready but the profile was not linked: ${linkError.message}` },
      { status: 500 }
    );
  }

  const notified = await tellOwner({
    email,
    fullName: profile.full_name,
    listingName,
    listingPath: `/publishers/${slug}`,
  });
  return NextResponse.json({ ok: true, publisher_slug: slug, notified });
}

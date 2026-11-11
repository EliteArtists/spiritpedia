import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { isSuppressed, sendJourneyEmail } from '@/utils/email';
import { doNotContactReason, isClaimed, outreachRefusal, recordMessage } from '@/utils/journey';

export const dynamic = 'force-dynamic';

// Begin the outreach sequence and send email 1 immediately.
//
// Every refusal happens BEFORE the insert, so a rejected start leaves nothing
// behind. The one exception is a send that fails after the row exists: the
// journey is created and email_1_sent_at stays null, which the admin card shows
// as started-but-unsent rather than pretending it went.
export async function POST(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  // A healers listing of any kind by healer_slug, or a publisher by
  // publisher_slug (migration 0020; owner 11 Nov 2026: publishers are in
  // scope). Exactly one.
  const { healer_slug: slug, publisher_slug: publisherSlug } = await request.json().catch(() => ({}));
  if (!slug && !publisherSlug) return NextResponse.json({ error: 'missing_healer_slug' }, { status: 400 });

  const { data: listing } = publisherSlug
    ? await supabase
        .from('publishers')
        .select('id, name, slug, contact_email')
        .eq('slug', publisherSlug)
        .maybeSingle()
    : await supabase
        .from('healers')
        .select('name, healer_slug, contact_email, entity_type')
        .eq('healer_slug', slug)
        .maybeSingle();

  if (!listing) return NextResponse.json({ error: 'healer_not_found' }, { status: 404 });

  const entityType = publisherSlug ? 'publisher' : listing.entity_type;
  const target = publisherSlug ? { publisherId: listing.id } : slug;

  // Only the kinds whose wording is approved (utils/journey.js). Today that is
  // individuals; the rest wait for the owner's wording.
  const refusal = outreachRefusal(entityType);
  if (refusal) {
    return NextResponse.json({ error: 'wording_not_approved', message: refusal }, { status: 400 });
  }

  if (!listing.contact_email) {
    return NextResponse.json(
      { error: 'no_contact_email', message: 'This listing has no contact email to write to.' },
      { status: 400 }
    );
  }

  // Nobody who has already joined should be asked to join.
  if (await isClaimed(supabase, target)) {
    return NextResponse.json(
      { error: 'already_claimed', message: 'This healer has claimed their account.' },
      { status: 409 }
    );
  }

  // Someone who asked us to stop, or asked for removal, or whose address
  // bounced, is never written to again.
  const doNotContact = await doNotContactReason(supabase, target);
  if (doNotContact) {
    return NextResponse.json({ error: 'do_not_contact', message: doNotContact }, { status: 409 });
  }
  const suppressed = await isSuppressed(listing.contact_email);
  if (suppressed !== false) {
    return NextResponse.json(
      {
        error: suppressed ? 'suppressed' : 'suppression_check_failed',
        message: suppressed
          ? 'This address has bounced or marked an email as spam, so it is not written to.'
          : 'Could not check the address with Resend. Try again in a minute.',
      },
      { status: suppressed ? 409 : 503 }
    );
  }

  // The partial unique index allows one journey per healer that is not stopped,
  // so this conflicts only with a live one — a previous, finished sequence stays
  // as history and does not block a restart.
  const { data: journey, error: insertError } = await supabase
    .from('healer_journeys')
    .insert(publisherSlug ? { publisher_id: listing.id } : { healer_slug: slug })
    .select('*')
    .single();

  if (insertError) {
    const duplicate = insertError.code === '23505';
    return NextResponse.json(
      {
        error: duplicate ? 'journey_exists' : insertError.message,
        message: duplicate
          ? 'Journey already exists for this healer.'
          : insertError.message,
      },
      { status: duplicate ? 409 : 500 }
    );
  }

  const result = await sendJourneyEmail({
    emailNumber: 1,
    to: listing.contact_email,
    healerName: listing.name,
    healerSlug: publisherSlug ? listing.slug : listing.healer_slug,
    entityType,
    publisher: Boolean(publisherSlug),
  });

  if (result.suppressed) {
    await supabase
      .from('healer_journeys')
      .update({ status: 'stopped', stop_reason: 'suppressed' })
      .eq('id', journey.id);
    return NextResponse.json(
      { error: 'suppressed', message: 'This address has bounced or marked an email as spam. Nothing was sent.' },
      { status: 409 }
    );
  }

  if (!result.sent) {
    // The row stays, deliberately. It records that a journey was started and
    // that the first email did not go, which is the honest state and lets the
    // cron pick it up tomorrow rather than losing the attempt entirely.
    return NextResponse.json(
      { error: 'send_failed', message: 'The journey was created but email 1 did not send.' },
      { status: 502 }
    );
  }

  await supabase
    .from('healer_journeys')
    .update({ email_1_sent_at: new Date().toISOString() })
    .eq('id', journey.id);
  // For the delivered and bounced webhook (migration 0044).
  await recordMessage(supabase, { resendId: result.id, journeyId: journey.id, emailNumber: 1 });

  return NextResponse.json({
    message: 'Journey started',
    emailSentTo: result.recipient,
    // Surfaced so the admin is never in doubt about whether a real practitioner
    // was written to or the test inbox was.
    redirected: Boolean(process.env.JOURNEY_TEST_EMAIL),
  });
}

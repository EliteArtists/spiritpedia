import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { isSuppressed, sendJourneyEmail } from '@/utils/email';
import {
  doNotContactByAddress,
  doNotContactReason,
  isClaimed,
  listingFacts,
  outreachEligibility,
  outreachRefusal,
  recordMessage,
} from '@/utils/journey';

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
        .select('*')
        .eq('slug', publisherSlug)
        .maybeSingle()
    : await supabase
        .from('healers')
        .select('*')
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

  // SENDING ELIGIBILITY (utils/journey.js → outreachEligibility): the page
  // the address is published on, always; for every kind but a person, a
  // business or organisation inbox (migration 0048). Read as '*' so this
  // works before 0048: a column it adds is then absent, not an error.
  const recipientType = 'contact_recipient_type' in listing ? listing.contact_recipient_type : undefined;
  const source = listing.contact_email_source || null;
  const { problems, warnings } = outreachEligibility({
    entityType,
    email: listing.contact_email,
    source,
    recipientType,
  });
  if (problems.length) {
    return NextResponse.json(
      { error: listing.contact_email ? 'not_eligible' : 'no_contact_email', message: problems.join(' ') },
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
  const doNotContact =
    (await doNotContactReason(supabase, target)) || (await doNotContactByAddress(supabase, listing.contact_email));
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
    .insert({
      ...(publisherSlug ? { publisher_id: listing.id } : { healer_slug: slug }),
      // What it was eligible on, kept with the journey (migration 0048).
      ...(recipientType === undefined ? {} : { contact_recipient_type: recipientType, contact_email_source: source }),
    })
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
    // C4 of the shared sequence says only what is on the listing.
    facts: await listingFacts(supabase, {
      entityType,
      healerId: listing.id,
      healerSlug: listing.healer_slug,
      publisherId: publisherSlug ? listing.id : null,
    }),
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
    // Allowed, but worth knowing: a person's address with no recipient type.
    warnings,
  });
}

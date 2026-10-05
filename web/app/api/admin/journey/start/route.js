import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { sendJourneyEmail } from '@/utils/email';
import { isClaimed } from '@/utils/journey';

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

  const { healer_slug: slug } = await request.json().catch(() => ({}));
  if (!slug) return NextResponse.json({ error: 'missing_healer_slug' }, { status: 400 });

  const { data: healer } = await supabase
    .from('healers')
    .select('name, healer_slug, contact_email')
    .eq('healer_slug', slug)
    .maybeSingle();

  if (!healer) return NextResponse.json({ error: 'healer_not_found' }, { status: 404 });

  if (!healer.contact_email) {
    return NextResponse.json(
      { error: 'no_contact_email', message: 'This healer has no contact email to write to.' },
      { status: 400 }
    );
  }

  // Nobody who has already joined should be asked to join.
  if (await isClaimed(supabase, slug)) {
    return NextResponse.json(
      { error: 'already_claimed', message: 'This healer has claimed their account.' },
      { status: 409 }
    );
  }

  // The partial unique index allows one journey per healer that is not stopped,
  // so this conflicts only with a live one — a previous, finished sequence stays
  // as history and does not block a restart.
  const { data: journey, error: insertError } = await supabase
    .from('healer_journeys')
    .insert({ healer_slug: slug })
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
    to: healer.contact_email,
    healerName: healer.name,
    healerSlug: healer.healer_slug,
  });

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

  return NextResponse.json({
    message: 'Journey started',
    emailSentTo: result.recipient,
    // Surfaced so the admin is never in doubt about whether a real practitioner
    // was written to or the test inbox was.
    redirected: Boolean(process.env.JOURNEY_TEST_EMAIL),
  });
}

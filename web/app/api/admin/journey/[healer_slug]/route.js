import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { doNotContactReason, isClaimed, messagesFor, outreachRefusal, schedule } from '@/utils/journey';

export const dynamic = 'force-dynamic';

const STATUSES = ['running', 'paused', 'stopped'];

// The live journey for one healer, or null. A stopped journey is history and is
// not returned here — the admin card is about what is happening now, and a
// finished sequence would otherwise make the Start button look broken.
async function activeJourney(supabase, slug) {
  const { data } = await supabase
    .from('healer_journeys')
    .select('*')
    .eq('healer_slug', slug)
    .neq('status', 'stopped')
    .maybeSingle();
  return data || null;
}

export async function GET(request, { params }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const { healer_slug: slug } = await params;
  const journey = await activeJourney(supabase, slug);

  // Claim state travels with the journey so the admin card can explain itself
  // without a second round trip — and so the Start button can be disabled for a
  // healer who has joined since the page loaded.
  const claimed = await isClaimed(supabase, slug);
  // Why Start must stay off for good, if it must.
  const doNotContact = journey ? null : await doNotContactReason(supabase, slug);
  // Why Start is off for this kind (waiting for its approved wording), if it is.
  const { data: healer } = await supabase
    .from('healers')
    .select('entity_type')
    .eq('healer_slug', slug)
    .maybeSingle();
  const kindRefusal = outreachRefusal(healer?.entity_type);

  // Every finished journey too, newest first: what was sent before, a form
  // contact, a reply (the Outreach list shows all of them; the card shows
  // this listing's).
  const { data: past } = await supabase
    .from('healer_journeys')
    .select('*')
    .eq('healer_slug', slug)
    .eq('status', 'stopped')
    .order('started_at', { ascending: false });

  const all = [journey, ...(past || [])].filter(Boolean);
  const { byJourney, ready } = await messagesFor(supabase, all.map((j) => j.id));
  const withSchedule = (j) => ({ ...j, schedule: schedule(j, byJourney[j.id] || []) });

  return NextResponse.json({
    journey: journey ? withSchedule(journey) : null,
    history: (past || []).map(withSchedule),
    claimed,
    doNotContact,
    kindRefusal,
    // Before migration 0044: no replied, form or delivery tracking yet.
    trackingReady: ready && (!all.length || 'replied_at' in all[0]),
  });
}

export async function PATCH(request, { params }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const { healer_slug: slug } = await params;
  const { status, stop_reason: stopReason } = await request.json().catch(() => ({}));

  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }

  const journey = await activeJourney(supabase, slug);
  if (!journey) return NextResponse.json({ error: 'no_active_journey' }, { status: 404 });

  // Resuming sends the next email, so the kind is checked again: a listing
  // changed to an organisation since the start waits for that wording.
  if (status === 'running') {
    const { data: healer } = await supabase
      .from('healers')
      .select('entity_type')
      .eq('healer_slug', slug)
      .maybeSingle();
    const refusal = outreachRefusal(healer?.entity_type);
    if (refusal) return NextResponse.json({ error: 'wording_not_approved', message: refusal }, { status: 400 });
  }

  const values = { status };
  // A reason belongs to a stop. Resuming clears whatever was there, or a
  // journey paused with a note would carry it forever.
  if (status === 'stopped') values.stop_reason = stopReason || 'stopped_by_admin';
  else values.stop_reason = null;

  const { data, error } = await supabase
    .from('healer_journeys')
    .update(values)
    .eq('id', journey.id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { byJourney } = await messagesFor(supabase, [data.id]);
  return NextResponse.json({ journey: { ...data, schedule: schedule(data, byJourney[data.id] || []) } });
}

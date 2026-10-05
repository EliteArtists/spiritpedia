import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { isClaimed, schedule } from '@/utils/journey';

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

  return NextResponse.json({
    journey: journey ? { ...journey, schedule: schedule(journey) } : null,
    claimed,
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

  return NextResponse.json({ journey: { ...data, schedule: schedule(data) } });
}

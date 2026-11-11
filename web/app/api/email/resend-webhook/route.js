import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabaseAdmin';
import { isMissingSchema } from '@/utils/journey';
import { isPermanentBounce, messageUpdate, verifyWebhook } from '@/utils/resendWebhook';

export const dynamic = 'force-dynamic';

// POST /api/email/resend-webhook — Resend's "delivered" and "bounced" events
// for the outreach emails (owner, 11 Nov 2026; migration 0044). Nothing else
// is tracked: no opens, no clicks.
//
// Set up in Resend → Webhooks: this URL on www, events email.delivered and
// email.bounced, and its signing secret in Vercel as RESEND_WEBHOOK_SECRET.
// Without the secret every request is refused: an unsigned endpoint would let
// anyone mark an email delivered, or bounce a journey to a stop.
//
// Events for emails that are not outreach (welcomes, receipts) find no
// journey_messages row and are acknowledged and ignored. Resend retries on
// anything but a 2xx, so only a bad signature or our own fault returns one.
export async function POST(request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'webhook_secret_not_set' }, { status: 503 });

  const body = await request.text();
  const ok = verifyWebhook({
    secret,
    id: request.headers.get('svix-id'),
    timestamp: request.headers.get('svix-timestamp'),
    signature: request.headers.get('svix-signature'),
    body,
  });
  if (!ok) return NextResponse.json({ error: 'bad_signature' }, { status: 401 });

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const update = messageUpdate(event);
  const resendId = event?.data?.email_id;
  if (!update || !resendId) return NextResponse.json({ ignored: true });

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  // Only the first report of each counts: a retried event must not move the
  // time it was delivered.
  const column = update.delivered_at ? 'delivered_at' : 'bounced_at';
  const { data: message, error } = await supabase
    .from('journey_messages')
    .update(update)
    .eq('resend_id', resendId)
    .is(column, null)
    .select('journey_id')
    .maybeSingle();

  if (error) {
    // Before 0044 there is nowhere to record it; acknowledged so Resend
    // does not retry for days.
    if (isMissingSchema(error)) return NextResponse.json({ ignored: true, reason: 'migration_0044_not_run' });
    console.error('[resend-webhook] update failed:', error);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
  if (!message) return NextResponse.json({ ignored: true });

  if (isPermanentBounce(update)) {
    await supabase
      .from('healer_journeys')
      .update({ status: 'stopped', stop_reason: 'suppressed' })
      .eq('id', message.journey_id)
      .neq('status', 'stopped');
  }

  return NextResponse.json({ recorded: column });
}

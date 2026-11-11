import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabaseAdmin';
import { JOURNEY_EMAILS, sendJourneyEmail } from '@/utils/email';
import { cronDecision, isClaimed, nextDue, recordMessage, sentAtColumn } from '@/utils/journey';

export const dynamic = 'force-dynamic';

// The daily pass. Vercel calls this at 08:00 UTC; nothing else should.
//
// AT MOST ONE EMAIL PER JOURNEY PER RUN, and the lowest-numbered one that is
// due. If a run is missed, the backlog is worked through a day at a time rather
// than three landing in somebody's inbox together.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'cron_secret_not_set' }, { status: 503 });
  }

  // Vercel sends `Authorization: Bearer <CRON_SECRET>` of its own accord. The
  // x-cron-secret header is accepted too, so the route can be exercised by hand
  // without forging an Authorization header.
  const auth = request.headers.get('authorization') || '';
  const header = request.headers.get('x-cron-secret') || '';
  const presented = auth.startsWith('Bearer ') ? auth.slice(7) : header;

  if (presented !== secret) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const { data: journeys, error } = await supabase
    .from('healer_journeys')
    .select('*')
    .eq('status', 'running')
    .order('started_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tally = { processed: 0, sent: 0, stopped: 0, paused: 0, errors: 0 };

  for (const journey of journeys || []) {
    // A form contact (migration 0044) was one message, sent by hand. Recorded
    // as stopped, so it is not normally here; never sent to if it is.
    if (journey.channel === 'form') continue;
    const publisherId = journey.publisher_id || null;
    const slug = journey.healer_slug;
    if (!slug && !publisherId) continue;
    tally.processed += 1;

    try {
      // The listing as it is TODAY: a healers row of any kind, or a publisher
      // (migration 0020). Read every run, never copied onto the journey, so a
      // changed address or a changed kind is seen before the next email.
      const { data: listing } = publisherId
        ? await supabase
            .from('publishers')
            .select('name, slug, contact_email')
            .eq('id', publisherId)
            .maybeSingle()
        : await supabase
            .from('healers')
            .select('name, healer_slug, contact_email, entity_type')
            .eq('healer_slug', slug)
            .maybeSingle();

      const entityType = publisherId ? 'publisher' : listing?.entity_type;

      // THE CHECKS, in cronDecision's order (utils/journey.js): gone, claimed
      // (checked every run, so somebody who joins on day 22 never receives
      // email 3), a kind whose wording is not approved, no address.
      const decision = cronDecision({
        listing,
        claimed: listing ? await isClaimed(supabase, publisherId ? { publisherId } : slug) : false,
        entityType,
      });

      if (decision.stop) {
        await stop(supabase, journey.id, decision.stop);
        tally.stopped += 1;
        continue;
      }
      // Paused, not stopped: the history stays as it is, and an admin can
      // resume it once the wording for that kind is approved.
      if (decision.pause) {
        await supabase
          .from('healer_journeys')
          .update({ status: 'paused', stop_reason: decision.pause })
          .eq('id', journey.id);
        tally.paused += 1;
        continue;
      }

      const due = nextDue(journey);
      if (!due) continue;

      const column = sentAtColumn(due);

      // THE LOCK, AND IT IS THE WRITE ITSELF.
      //
      // Claiming the slot before sending is what stops a double send: two
      // overlapping runs, or Vercel retrying a cron it believes failed, both
      // reach this and only one gets a row back, because the WHERE clause
      // requires the column to still be null. There is no separate 'sending'
      // state to leak if the process dies — and if the send then fails, the
      // timestamp is put back to null and tomorrow tries again.
      const claimedAt = new Date().toISOString();
      const { data: locked } = await supabase
        .from('healer_journeys')
        .update({ [column]: claimedAt })
        .eq('id', journey.id)
        .is(column, null)
        .select('id')
        .maybeSingle();

      if (!locked) continue; // another run took it

      const result = await sendJourneyEmail({
        emailNumber: due,
        to: listing.contact_email,
        healerName: listing.name,
        healerSlug: publisherId ? listing.slug : listing.healer_slug,
        entityType,
        publisher: Boolean(publisherId),
      });

      // On Resend's suppression list: it bounced or they complained. Never
      // written to again (utils/journey.js → DO_NOT_CONTACT).
      if (result.suppressed) {
        await supabase.from('healer_journeys').update({ [column]: null }).eq('id', journey.id);
        await stop(supabase, journey.id, 'suppressed');
        tally.stopped += 1;
        continue;
      }

      if (!result.sent) {
        await supabase
          .from('healer_journeys')
          .update({ [column]: null })
          .eq('id', journey.id);
        console.error(`[journey] ${slug || publisherId} email ${due} failed:`, result.error);
        tally.errors += 1;
        continue;
      }

      tally.sent += 1;
      // For the delivered and bounced webhook (migration 0044).
      await recordMessage(supabase, { resendId: result.id, journeyId: journey.id, emailNumber: due });

      // The last one. The sequence is over whether or not they ever answered.
      if (due === JOURNEY_EMAILS) {
        await stop(supabase, journey.id, 'sequence_complete');
        tally.stopped += 1;
      }
    } catch (err) {
      console.error(`[journey] ${slug || publisherId} failed:`, err);
      tally.errors += 1;
    }
  }

  return NextResponse.json(tally);
}

async function stop(supabase, id, reason) {
  await supabase
    .from('healer_journeys')
    .update({ status: 'stopped', stop_reason: reason })
    .eq('id', id);
}

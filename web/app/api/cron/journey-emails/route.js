import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabaseAdmin';
import { JOURNEY_EMAILS, sendJourneyEmail } from '@/utils/email';
import { isClaimed, nextDue, sentAtColumn } from '@/utils/journey';

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

  const tally = { processed: 0, sent: 0, stopped: 0, errors: 0 };

  for (const journey of journeys || []) {
    tally.processed += 1;
    const slug = journey.healer_slug;

    try {
      const { data: healer } = await supabase
        .from('healers')
        .select('name, healer_slug, contact_email')
        .eq('healer_slug', slug)
        .maybeSingle();

      // The listing is gone. Nothing left to invite anyone to.
      if (!healer) {
        await stop(supabase, journey.id, 'healer_removed');
        tally.stopped += 1;
        continue;
      }

      // THE POINT OF THE WHOLE SEQUENCE. Checked every run rather than once, so
      // somebody who joins on day 22 never receives email 3.
      if (await isClaimed(supabase, slug)) {
        await stop(supabase, journey.id, 'claimed');
        tally.stopped += 1;
        continue;
      }

      // An address removed since the journey began. Stopped rather than carried
      // on with a stale copy: the healer row is the authority on where to write.
      if (!healer.contact_email) {
        await stop(supabase, journey.id, 'no_contact_email');
        tally.stopped += 1;
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
        to: healer.contact_email,
        healerName: healer.name,
        healerSlug: healer.healer_slug,
      });

      if (!result.sent) {
        await supabase
          .from('healer_journeys')
          .update({ [column]: null })
          .eq('id', journey.id);
        console.error(`[journey] ${slug} email ${due} failed:`, result.error);
        tally.errors += 1;
        continue;
      }

      tally.sent += 1;

      // The last one. The sequence is over whether or not they ever answered.
      if (due === JOURNEY_EMAILS) {
        await stop(supabase, journey.id, 'sequence_complete');
        tally.stopped += 1;
      }
    } catch (err) {
      console.error(`[journey] ${slug} failed:`, err);
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

import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import {
  MIGRATION_NEEDED,
  doNotContactReason,
  isClaimed,
  isMissingSchema,
  journeyState,
  messagesFor,
  outreachKind,
  schedule,
} from '@/utils/journey';

export const dynamic = 'force-dynamic';

// GET  /api/admin/journey — every journey ever started, newest first, with its
//      listing, its eight emails (sent, delivered, bounced) and where it stands,
//      for Admin → Outreach. Stopped and claimed ones included: this is the
//      history, not just what is running.
// POST /api/admin/journey — { action, … }
//      replied        { id, replied_at? }   "Mark replied" (migration 0044)
//      clear_replied  { id }                undo a mistaken mark
//      form           { healer_slug, contacted_at? }
//                                           "Contacted via form": recorded,
//                                           nothing is sent
//
// Service role only, like every journey route: healer_journeys has RLS on and
// no policies.
export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const { data: journeys, error } = await supabase
    .from('healer_journeys')
    .select('*, healers(*), publishers(*)')
    .order('started_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 500 });

  const rows = journeys || [];

  // Which listings have been claimed since, in two queries rather than one
  // per journey.
  const slugs = [...new Set(rows.map((j) => j.healer_slug).filter(Boolean))];
  const publisherIds = [...new Set(rows.map((j) => j.publisher_id).filter(Boolean))];
  const claimedSlugs = new Set();
  const claimedPublishers = new Set();
  if (slugs.length) {
    const { data } = await supabase.from('user_profiles').select('linked_healer_slug').in('linked_healer_slug', slugs);
    for (const p of data || []) claimedSlugs.add(p.linked_healer_slug);
  }
  if (publisherIds.length) {
    const { data } = await supabase
      .from('user_profiles')
      .select('linked_publisher_id')
      .in('linked_publisher_id', publisherIds);
    for (const p of data || []) claimedPublishers.add(p.linked_publisher_id);
  }

  const { byJourney, ready } = await messagesFor(supabase, rows.map((j) => j.id));

  return NextResponse.json({
    // Before migration 0044 there is no replied, form or delivery tracking.
    trackingReady: ready && (!rows.length || 'replied_at' in rows[0]),
    journeys: rows.map((j) => {
      const claimed = j.publisher_id ? claimedPublishers.has(j.publisher_id) : claimedSlugs.has(j.healer_slug);
      return {
        id: j.id,
        healer_slug: j.healer_slug,
        publisher_id: j.publisher_id,
        name: j.publishers?.name || j.healers?.name || j.healer_slug || 'Removed listing',
        href: j.publisher_id
          ? j.publishers?.slug
            ? `/publishers/${j.publishers.slug}`
            : null
          : `/admin/content/${encodeURIComponent(j.healer_slug)}`,
        kind: j.publisher_id ? 'publisher' : outreachKind(j.healers?.entity_type),
        contact_email: j.publishers?.contact_email || j.healers?.contact_email || null,
        contact_form_url: j.healers?.contact_form_url || null,
        // Whose inbox and where it is published (migration 0048): what the
        // journey was started on if it recorded it, else the listing today.
        // undefined before 0048 runs.
        ...(() => {
          const listing = j.publishers || j.healers || {};
          const recorded = 'contact_recipient_type' in j && (j.contact_recipient_type || j.contact_email_source);
          return {
            recipient_type: recorded ? j.contact_recipient_type : listing.contact_recipient_type,
            email_source: (recorded ? j.contact_email_source : null) || listing.contact_email_source || null,
            recorded_at_start: Boolean(recorded),
          };
        })(),
        status: j.status,
        stop_reason: j.stop_reason,
        channel: j.channel || 'email',
        replied_at: j.replied_at || null,
        started_at: j.started_at,
        claimed,
        state: journeyState(j, { claimed }),
        schedule: schedule(j, byJourney[j.id] || []),
      };
    }),
  });
}

export async function POST(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const when = (value) => {
    const date = value ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) || date > new Date() ? null : date.toISOString();
  };

  if (body.action === 'replied' || body.action === 'clear_replied') {
    if (!body.id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    const repliedAt = body.action === 'replied' ? when(body.replied_at) : null;
    if (body.action === 'replied' && !repliedAt) {
      return NextResponse.json({ error: 'bad_date', message: 'The reply date must be today or earlier.' }, { status: 400 });
    }

    const { data: journey, error } = await supabase
      .from('healer_journeys')
      .update({ replied_at: repliedAt })
      .eq('id', body.id)
      .select('*')
      .maybeSingle();
    if (error) {
      return NextResponse.json(
        { error: isMissingSchema(error) ? 'migration_needed' : 'update_failed', message: isMissingSchema(error) ? MIGRATION_NEEDED : error.message },
        { status: isMissingSchema(error) ? 409 : 500 }
      );
    }
    if (!journey) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // A reply ends the automatic emails: the conversation goes on by hand,
    // and "would you like to talk?" must not arrive after they have answered.
    // Not a do-not-contact reason, so a new journey can still be started.
    if (repliedAt && journey.status !== 'stopped') {
      await supabase.from('healer_journeys').update({ status: 'stopped', stop_reason: 'replied' }).eq('id', journey.id);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'form') {
    const slug = body.healer_slug;
    if (!slug) return NextResponse.json({ error: 'missing_healer_slug' }, { status: 400 });
    const contactedAt = when(body.contacted_at);
    if (!contactedAt) {
      return NextResponse.json({ error: 'bad_date', message: 'The date must be today or earlier.' }, { status: 400 });
    }

    const { data: healer } = await supabase
      .from('healers')
      .select('healer_slug, contact_form_url')
      .eq('healer_slug', slug)
      .maybeSingle();
    if (!healer) return NextResponse.json({ error: 'healer_not_found' }, { status: 404 });
    if (!healer.contact_form_url) {
      return NextResponse.json(
        { error: 'no_contact_form', message: 'This listing has no contact form recorded.' },
        { status: 400 }
      );
    }
    if (await isClaimed(supabase, slug)) {
      return NextResponse.json({ error: 'already_claimed', message: 'This listing has been claimed.' }, { status: 409 });
    }
    const refusal = await doNotContactReason(supabase, slug);
    if (refusal) return NextResponse.json({ error: 'do_not_contact', message: refusal }, { status: 409 });

    // Recorded as a finished, one-message journey: it sits in the history
    // and the Outreach list, the daily job never sends for it, and it does
    // not block an email journey if an address turns up later.
    const { error } = await supabase.from('healer_journeys').insert({
      healer_slug: slug,
      channel: 'form',
      status: 'stopped',
      stop_reason: 'contacted_via_form',
      started_at: contactedAt,
    });
    if (error) {
      return NextResponse.json(
        { error: isMissingSchema(error) ? 'migration_needed' : 'insert_failed', message: isMissingSchema(error) ? MIGRATION_NEEDED : error.message },
        { status: isMissingSchema(error) ? 409 : 500 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}

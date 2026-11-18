import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { DAILY_STARTS, outreachEligibility, outreachKind, startedToday, upNext } from '@/utils/journey';

export const dynamic = 'force-dynamic';

// GET /api/admin/journey/up-next — the daily outreach list (owner, 18 Nov
// 2026): every listing with an email that has never been contacted, in the
// order utils/journey.js → upNext gives, and how many email journeys were
// started today. Reads only: each row's Start goes through
// /api/admin/journey/start, which checks everything again (Resend's
// suppression list included, which this list doesn't ask).

// PostgREST returns at most 1,000 rows a request.
async function everyRow(query) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query().range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  try {
    // '*' so the 0048 columns are read when they exist and simply absent before.
    const [healers, publishers, journeys, profiles] = await Promise.all([
      everyRow(() => supabase.from('healers').select('*').not('contact_email', 'is', null).order('id')),
      everyRow(() => supabase.from('publishers').select('*').not('contact_email', 'is', null).order('id')),
      everyRow(() => supabase.from('healer_journeys').select('*').order('started_at')),
      everyRow(() =>
        supabase
          .from('user_profiles')
          .select('linked_healer_slug, linked_publisher_id')
          .or('linked_healer_slug.not.is.null,linked_publisher_id.not.is.null')
      ),
    ]);

    const claimed = new Set(
      profiles.flatMap((p) => [p.linked_healer_slug, p.linked_publisher_id && `publisher:${p.linked_publisher_id}`])
    );
    const listing = (row, publisher) => {
      const kind = publisher ? 'publisher' : outreachKind(row.entity_type);
      const recipientType = 'contact_recipient_type' in row ? row.contact_recipient_type : undefined;
      const key = publisher ? `publisher:${row.id}` : row.healer_slug;
      return {
        key,
        kind,
        name: row.name,
        slug: publisher ? row.slug : row.healer_slug,
        publisher,
        email: row.contact_email,
        tier: row.tier,
        deceased: Boolean(row.death_year),
        claimed: claimed.has(key),
        recipient_type: recipientType,
        email_source: row.contact_email_source || null,
        warnings: outreachEligibility({
          entityType: kind,
          email: row.contact_email,
          source: row.contact_email_source,
          recipientType,
        }).warnings,
      };
    };

    const { list, left, partnerships } = upNext({
      listings: [...healers.map((h) => listing(h, false)), ...publishers.map((p) => listing(p, true))],
      journeys: journeys.map((j) => ({ key: j.publisher_id ? `publisher:${j.publisher_id}` : j.healer_slug })),
    });

    return NextResponse.json({
      startedToday: startedToday(journeys),
      dailyStarts: DAILY_STARTS,
      left,
      partnerships,
      listings: list.map((l) => ({
        kind: l.kind,
        name: l.name,
        slug: l.slug,
        publisher: l.publisher,
        email: l.email,
        tier: l.tier,
        recipient_type: l.recipient_type,
        email_source: l.email_source,
        warnings: l.warnings,
        alsoAt: l.alsoAt,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 500 });
  }
}

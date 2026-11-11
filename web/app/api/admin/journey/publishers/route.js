import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import {
  doNotContactByAddress,
  doNotContactReason,
  isClaimed,
  outreachEligibility,
  outreachRefusal,
  startBlocker,
} from '@/utils/journey';

export const dynamic = 'force-dynamic';

// GET /api/admin/journey/publishers?q=hay — publishers by name, for the
// Outreach page's "Start a journey for a publisher" (owner, 11 Nov 2026).
// Each with what Start would say: switched off (OUTREACH_KINDS_APPROVED),
// claimed, do not contact, an address that isn't eligible (source and
// recipient type, migration 0048), or a journey already running. Reads only;
// starting goes through /api/admin/journey/start with publisher_slug, which
// checks all of this again.
export async function GET(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const q = (new URL(request.url).searchParams.get('q') || '').trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  if (q.length < 2) return NextResponse.json({ publishers: [] });

  // '*' so the 0048 columns are read when they exist and simply absent before.
  const { data, error } = await supabase.from('publishers').select('*').ilike('name', `%${q}%`).order('name').limit(10);
  if (error) return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 500 });

  const publishers = await Promise.all(
    (data || []).map(async (p) => {
      const target = { publisherId: p.id };
      const { data: running } = await supabase
        .from('healer_journeys')
        .select('id, status')
        .eq('publisher_id', p.id)
        .neq('status', 'stopped')
        .limit(1);
      const eligibility = outreachEligibility({
        entityType: 'publisher',
        email: p.contact_email,
        source: p.contact_email_source,
        recipientType: 'contact_recipient_type' in p ? p.contact_recipient_type : undefined,
      });
      const row = {
        id: p.id,
        name: p.name,
        slug: p.slug,
        contact_email: p.contact_email || null,
        contact_email_source: p.contact_email_source || null,
        recipient_type: 'contact_recipient_type' in p ? p.contact_recipient_type : undefined,
        kindRefusal: outreachRefusal('publisher'),
        claimed: await isClaimed(supabase, target),
        doNotContact:
          (await doNotContactReason(supabase, target)) || (await doNotContactByAddress(supabase, p.contact_email)),
        running: running?.[0]?.status || null,
        eligibility,
      };
      return { ...row, blocked: startBlocker(row) };
    })
  );

  return NextResponse.json({ publishers });
}

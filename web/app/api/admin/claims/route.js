import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Admin → Claims, for every kind of listing and for publishers (owner, 11 Nov
// 2026). Two records:
//   managed   accounts linked to a listing or a publisher, which is what a
//             claim is once approved (user_profiles.linked_healer_slug /
//             linked_publisher_id; ✓ Verified follows from it by trigger,
//             refresh_listing_badges(), migration 0023)
//   requests  every claim request (claim_requests, migration 0020), pending
//             first, with what became of it
// Deciding a pending request stays in the Inbox; Revoke is here.

async function emailsById(supabase) {
  const emails = new Map();
  for (let page = 1; ; page += 1) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    for (const user of data?.users || []) emails.set(user.id, user.email);
    if (!data?.users || data.users.length < 1000) break;
  }
  return emails;
}

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const [{ data: owners, error }, { data: requests, error: requestError }, emails] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, full_name, user_type, verification_status, linked_healer_slug, linked_publisher_id, created_at')
      .or('linked_healer_slug.not.is.null,linked_publisher_id.not.is.null')
      .order('created_at', { ascending: false }),
    supabase
      .from('claim_requests')
      .select('id, user_id, healer_slug, publisher_id, status, proof, connection, created_at, decided_at, healers(name, entity_type), publishers(name, slug)')
      .order('created_at', { ascending: false })
      .limit(500),
    emailsById(supabase),
  ]);
  if (error || requestError) {
    return NextResponse.json({ error: 'query_failed', message: (error || requestError).message }, { status: 500 });
  }

  const slugs = [...new Set((owners || []).map((o) => o.linked_healer_slug).filter(Boolean))];
  const publisherIds = [...new Set((owners || []).map((o) => o.linked_publisher_id).filter(Boolean))];
  const [{ data: listings }, { data: publishers }] = await Promise.all([
    slugs.length
      ? supabase.from('healers').select('healer_slug, name, entity_type, verified, official').in('healer_slug', slugs)
      : { data: [] },
    publisherIds.length
      ? supabase.from('publishers').select('id, name, slug, verified').in('id', publisherIds)
      : { data: [] },
  ]);
  const listingBySlug = new Map((listings || []).map((l) => [l.healer_slug, l]));
  const publisherById = new Map((publishers || []).map((p) => [String(p.id), p]));

  const managed = (owners || []).map((o) => ({
    ...o,
    email: emails.get(o.id) || null,
    listing: o.linked_healer_slug ? listingBySlug.get(o.linked_healer_slug) || null : null,
    publisher: o.linked_publisher_id ? publisherById.get(String(o.linked_publisher_id)) || null : null,
  }));

  const order = { pending: 0 };
  const all = (requests || [])
    .map((r) => ({ ...r, requester_email: emails.get(r.user_id) || null }))
    .sort((a, b) => (order[a.status] ?? 1) - (order[b.status] ?? 1));

  return NextResponse.json({ managed, requests: all, readAt: new Date().toISOString() });
}

// POST { action: 'revoke', user_id, target: 'listing' | 'publisher' }
//
// Unlinks the account from what it manages. The ✓ Verified badge goes with it
// (the user_profiles trigger recomputes it). Nothing is deleted, the account
// stays, and no email is sent: tell them yourself. Spiritpedia's own listing
// (official) is refused, since unlinking it would take its Official badge.
export async function POST(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const { action, user_id: userId, target } = await request.json().catch(() => ({}));
  if (action !== 'revoke') return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  if (!userId || !['listing', 'publisher'].includes(target)) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, linked_healer_slug, linked_publisher_id')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (target === 'listing') {
    if (!profile.linked_healer_slug) {
      return NextResponse.json({ error: 'not_linked', message: 'This account manages no listing.' }, { status: 409 });
    }
    const { data: listing } = await supabase
      .from('healers')
      .select('official')
      .eq('healer_slug', profile.linked_healer_slug)
      .maybeSingle();
    if (listing?.official) {
      return NextResponse.json(
        { error: 'official', message: 'This is Spiritpedia’s own listing; unlinking it would remove its Official badge.' },
        { status: 409 }
      );
    }
  } else if (!profile.linked_publisher_id) {
    return NextResponse.json({ error: 'not_linked', message: 'This account manages no publisher.' }, { status: 409 });
  }

  const { error } = await supabase
    .from('user_profiles')
    .update(target === 'listing' ? { linked_healer_slug: null } : { linked_publisher_id: null })
    .eq('id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

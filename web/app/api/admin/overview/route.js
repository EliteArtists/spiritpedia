import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { MIN_FAILURES } from '@/utils/brokenImages';

export const dynamic = 'force-dynamic';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Everything the dashboard's live tabs need, in one request: the profiles
// behind Practitioners, Accounts and Claims, and the counts behind Stats.
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const supabase = adminClient();

  // Content counts do not need the service role — they are public tables — so
  // they are still returned when the key is missing. Only the account data is
  // withheld, and it is withheld explicitly rather than as an empty array.
  const counts = {};
  const since = new Date(Date.now() - WEEK_MS).toISOString();

  const publicClient = supabase || (await import('@/utils/supabase')).supabase;

  for (const table of ['healers', 'videos', 'books', 'courses', 'free_resources', 'publishers']) {
    const { count } = await publicClient.from(table).select('*', { count: 'exact', head: true });
    counts[table] = count ?? 0;
  }

  for (const table of ['healers', 'books']) {
    const { count } = await publicClient
      .from(table)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since);
    counts[`${table}_this_week`] = count ?? 0;
  }

  if (!supabase) {
    return NextResponse.json(
      { ...NOT_CONFIGURED, counts, profiles: null, pendingReviews: [], brokenImages: [], accountDeletions: [] },
      { status: 200 }
    );
  }

  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'query_failed', message: error.message, counts }, { status: 200 });
  }

  // Reviews waiting on a moderator. Needs the service role for the same reason
  // the profiles above do: the public policy on reviews is `status =
  // 'approved'`, so the anonymous key cannot see a pending one at all — that is
  // what moderation means here, not a filter the UI applies.
  //
  // Only the columns the queue row renders. The body is deliberately absent:
  // the Inbox lists what is waiting, and reading it is the Reviews tab's job.
  const { data: pendingReviews } = await supabase
    .from('reviews')
    .select('id, content_type, content_slug, rating, author_name, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Images that failed their audit, and only the ones worth showing.
  //
  // failures >= MIN_FAILURES is the whole dampener: a row is recorded on its
  // first failure so the second can be counted, but one failed fetch is far
  // more often a timeout or a rate-limited burst than a missing file, and
  // surfacing those would put hundreds of healthy images in the queue on the
  // first bad afternoon.
  //
  // Needs the service role: broken_images has RLS on with no policy at all, so
  // the anon key cannot read it. Oldest first — a thing that has been broken
  // for a month is more urgent than one that broke yesterday, which is the
  // opposite of how an application queue reads.
  const { data: brokenImages } = await supabase
    .from('broken_images')
    .select('table_name, record_id, healer_slug, title, image_url, status_code, failures, first_seen_at')
    .gte('failures', MIN_FAILURES)
    .order('first_seen_at', { ascending: true });

  // Accounts with a claimed listing that their owner deleted, still to be
  // reviewed (migration 0013). Service role only, like broken_images. A
  // missing table (migration not yet run) reads as none rather than failing.
  const { data: accountDeletions } = await supabase
    .from('account_deletions')
    .select('id, deleted_at, source, linked_healer_slug, kept_image_count')
    .is('resolved_at', null)
    .order('deleted_at', { ascending: true });

  // user_profiles has no email column — the address lives in auth.users, which
  // only the service role can read. One listUsers call and a lookup map is far
  // cheaper than a getUserById per profile.
  const emails = new Map();
  const { data: userPage } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of userPage?.users || []) emails.set(user.id, user.email);

  const withEmail = (profiles || []).map((profile) => ({
    ...profile,
    email: emails.get(profile.id) || null,
  }));

  counts.users = withEmail.length;
  counts.practitioners = withEmail.filter((p) => p.user_type === 'practitioner').length;
  counts.explorers = withEmail.filter((p) => p.user_type !== 'practitioner').length;
  counts.pending_practitioners = withEmail.filter(
    (p) => p.user_type === 'practitioner' && p.verification_status === 'pending'
  ).length;
  counts.claims = withEmail.filter((p) => p.linked_healer_slug).length;
  counts.users_this_week = withEmail.filter((p) => p.created_at && p.created_at >= since).length;
  counts.pending_reviews = (pendingReviews || []).length;
  counts.broken_images = (brokenImages || []).length;
  counts.closed_accounts = (accountDeletions || []).length;

  return NextResponse.json({
    profiles: withEmail,
    pendingReviews: pendingReviews || [],
    brokenImages: brokenImages || [],
    accountDeletions: accountDeletions || [],
    counts,
  });
}

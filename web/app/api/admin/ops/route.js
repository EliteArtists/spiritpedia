import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { isMissingSchema } from '@/utils/journey';

export const dynamic = 'force-dynamic';

// GET /api/admin/ops — Admin → Ops (migration 0045): held plans, listings on
// dev only, the retry list and sprint reports, as last copied from the repo by
// scripts/ops-sync.mjs. Before 0045 runs this answers { missing: true }.
// Locked listings (migration 0053) are read live from listing_locks, not
// copied: they change in the admin, not in the repo.
export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const { data, error } = await supabase
    .from('ops_items')
    .select('kind, item_key, title, slug, reason, path, source_date, detail, synced_at')
    .order('source_date', { ascending: false, nullsFirst: false })
    .order('title')
    .limit(2000);

  if (error) {
    // 42P01 / PGRST205: the table isn't there yet.
    if (error.code === '42P01' || error.code === 'PGRST205' || /ops_items/.test(error.message || '')) {
      return NextResponse.json({ missing: true });
    }
    return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 500 });
  }

  const { data: lockRows, error: lockError } = await supabase
    .from('listing_locks')
    .select('healer_slug, note, locked_at, locked_by, healers(name)')
    .order('locked_at', { ascending: false });
  if (lockError && !isMissingSchema(lockError)) console.error('[ops] locks:', lockError.message);
  const locks = (lockRows || []).map((l) => ({
    kind: 'lock',
    item_key: l.healer_slug,
    title: l.healers?.name || l.healer_slug,
    slug: l.healer_slug,
    reason: l.note,
    source_date: l.locked_at?.slice(0, 10) || null,
    href: `/admin/content/${encodeURIComponent(l.healer_slug)}?tab=content`,
  }));

  const rows = data || [];
  const run = rows.find((r) => r.kind === 'sync_run') || null;
  const group = (kind) => rows.filter((r) => r.kind === kind);
  return NextResponse.json({
    missing: false,
    syncedAt: run?.synced_at || rows[0]?.synced_at || null,
    target: run?.detail?.target || null,
    held: group('held_plan'),
    devOnly: group('dev_only_plan'),
    retry: group('retry'),
    reports: group('sprint_report'),
    locks,
    locksReady: !lockError,
  });
}

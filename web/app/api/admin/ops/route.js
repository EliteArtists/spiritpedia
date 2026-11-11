import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// GET /api/admin/ops — Admin → Ops (migration 0045): held plans, listings on
// dev only, the retry list and sprint reports, as last copied from the repo by
// scripts/ops-sync.mjs. Before 0045 runs this answers { missing: true }.
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
  });
}

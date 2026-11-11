import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabaseAdmin';
import { cleanClick } from '@/utils/amazonClicks';

export const dynamic = 'force-dynamic';

// POST /api/amazon-click — a tap on a Buy on Amazon button (migration 0046).
//   { platform: 'web' | 'app', content_type: 'book' | 'course', content_slug, url }
// Sent with sendBeacon from the website (components/AmazonBuyLink.jsx), so the
// visitor's trip to Amazon never waits on it. Anonymous: no user, no IP, and
// only the store is kept from the link. Before 0046 runs the call fails
// quietly and nothing is counted.

const MAX_BODY = 2 * 1024;

export async function POST(request) {
  const text = await request.text().catch(() => '');
  if (!text || text.length > MAX_BODY) return NextResponse.json({ error: 'bad_body' }, { status: 400 });

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'bad_body' }, { status: 400 });
  }
  const click = cleanClick(body);
  if (!click) return NextResponse.json({ ok: true, counted: false });

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  const { data, error } = await supabase.rpc('log_amazon_click', click);
  if (error) return NextResponse.json({ ok: false, counted: false }, { status: 200 });
  return NextResponse.json({ ok: true, counted: data === true });
}

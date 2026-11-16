import { NextResponse } from 'next/server';
import { countAppClick } from '@/utils/appStoreCount';
import { deviceFromUserAgent } from '@/utils/appStores';

export const dynamic = 'force-dynamic';

// POST /api/app-store-click — a close of the Android "Get the app" strip or of
// the welcome card (migration 0052).
//   { placement: 'android_banner' | 'after_signup', store }
// Sent with sendBeacon, so closing never waits on it. Taps don't come here:
// they are counted by /get-app/<store> on the way to the store. The kind of
// device is read from the user-agent here, nothing else about the visitor.
// Before 0052 runs the call answers counted: false.

const MAX_BODY = 1024;

export async function POST(request) {
  const text = await request.text().catch(() => '');
  if (!text || text.length > MAX_BODY) return NextResponse.json({ error: 'bad_body' }, { status: 400 });

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'bad_body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'bad_body' }, { status: 400 });

  const counted = await countAppClick({
    placement: body.placement,
    store: body.store,
    device: deviceFromUserAgent(request.headers.get('user-agent')),
    action: 'dismiss',
  });
  return NextResponse.json({ ok: true, counted });
}

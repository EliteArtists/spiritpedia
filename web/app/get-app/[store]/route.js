import { NextResponse } from 'next/server';
import { countAppClick } from '@/utils/appStoreCount';
import { deviceFromUserAgent, isPlacement, storeFromSlug, storeUrl } from '@/utils/appStores';

export const dynamic = 'force-dynamic';

// GET /get-app/app-store?from=footer, /get-app/google-play?from=library
//
// Every website and email link to a store comes here (utils/appStores.js
// getAppHref): the tap is counted (migration 0052) and the visitor is sent
// straight on. No script is needed, so it works in the welcome email too.
// Before 0052 runs nothing is counted and the redirect still happens.
//
// Only GET counts: link checkers that only look (HEAD) are sent on uncounted.
// An unknown placement is sent on uncounted too.
export async function GET(request, { params }) {
  const { store: slug } = await params;
  const store = storeFromSlug(slug);
  if (!store) return NextResponse.redirect(new URL('/get-app', request.url), 302);

  const from = new URL(request.url).searchParams.get('from');
  const placement = isPlacement(from) ? from : null;
  if (placement) {
    await countAppClick({
      placement,
      store,
      device: deviceFromUserAgent(request.headers.get('user-agent')),
      action: 'tap',
    });
  }

  const res = NextResponse.redirect(storeUrl(store, placement), 302);
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('X-Robots-Tag', 'noindex');
  return res;
}

export async function HEAD(request, { params }) {
  const { store: slug } = await params;
  const store = storeFromSlug(slug);
  const target = store ? storeUrl(store, null) : new URL('/get-app', request.url);
  return NextResponse.redirect(target, 302);
}

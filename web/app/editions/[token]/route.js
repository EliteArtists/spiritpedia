import { adminClient } from '@/utils/supabaseAdmin';
import { loadCatalogue } from '@/utils/discoveryData';
import { hydrateEdition } from '@/utils/discoverySelect';
import { renderDiscoveryEdition } from '@/utils/discoveryEmail';
import { editionLinks } from '@/utils/discoveryEditions';
import { SITE, escapeHtml } from '@/utils/emailParts';
import { isToken } from '@/utils/unsubscribe';

export const dynamic = 'force-dynamic';

// "View this edition online": a sent edition, drawn again from its stored
// picks (discovery_editions, migration 0026) for 30 days.
//
// The token is the only key and can't be guessed. The page greets nobody by
// name and has no unsubscribe or preferences links of its own, so a forwarded
// link reveals nothing personal and controls nothing. Never indexed.
const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
};

function ended() {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Spiritpedia</title></head>
<body style="margin:0;background:#0a0e18;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">
<div><div style="font-family:Georgia,serif;font-size:28px"><img src="/email/spiritpedia-star.png" width="34" height="34" alt="Spiritpedia" style="vertical-align:middle;border:0"> Spiritpedia</div>
<p style="color:#cbd5e1;font-size:16px;line-height:1.6;margin:20px 0">This edition has ended. Your Library keeps everything you saved.</p>
<a href="${escapeHtml(`${SITE}/library`)}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px">Visit your Library</a></div></body></html>`,
    { status: 404, headers: HEADERS }
  );
}

export async function GET(request, { params }) {
  const { token } = await params;
  if (!isToken(token)) return ended();

  const supabase = adminClient();
  if (!supabase) return ended();

  const { data: row } = await supabase
    .from('discovery_editions')
    .select('picks, view_expires_at')
    .eq('view_token', token)
    .eq('status', 'sent')
    .maybeSingle();
  if (!row || !row.view_expires_at || Date.parse(row.view_expires_at) < Date.now()) return ended();

  const shared = await loadCatalogue(supabase);
  const edition = hydrateEdition(row.picks, shared.catalogue, shared.places);
  const links = editionLinks({ unsubscribeToken: '', viewToken: null });
  const { html } = renderDiscoveryEdition({
    edition,
    picks: row.picks,
    firstName: '',
    // Library only: preferences and unsubscribe belong to the inbox it was
    // sent to, not to whoever has the link.
    links: { library: links.library, online: null, preferences: null, unsubscribe: null },
  });
  return new Response(html, { status: 200, headers: HEADERS });
}

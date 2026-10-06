import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabaseAdmin';
import {
  AUDIT_TABLES,
  AUDIT_USER_AGENT,
  DAILY_TABLES,
  DOCUMENT_TYPES,
  MIN_FAILURES,
  NOT_AN_IMAGE,
  SHARDS,
  shardOf,
  todayShard,
} from '@/utils/brokenImages';

export const dynamic = 'force-dynamic';

// A measured ~25s for a seventh of the catalogue, against a ceiling of 60 here.
//
// The default is 10s, which this would exceed every single run — and a Vercel
// function that times out is not a partial result, it is a 504 with nothing
// written. 60 is the Hobby plan's maximum and well inside Pro's 300, so it
// holds whichever this project is on.
export const maxDuration = 60;

// How many URLs are in flight at once.
//
// Raised from 20 to 40 when healer portraits joined the run: 710 URLs at 20
// measured 34.8s against a 40s deadline, and a deadline that bites is not
// merely a slow run — targets are built in table order, so the SAME tail of
// free_resources would be skipped every single day while the rows above it
// were checked every time. A systematic blind spot is worse than a slow audit.
//
// Not raised further. Higher finishes sooner and starts to look like a burst
// to a shared image host — the condition under which a perfectly healthy
// server answers 429 or 403 and the audit invents a problem. 73% of portrait
// URLs are on one host (Google's image cache), so a batch is already far less
// spread than its size suggests.
const BATCH_SIZE = 40;

// Long enough for a slow origin on a cold cache, short enough that one dead
// host cannot hold a batch open for long.
const FETCH_TIMEOUT_MS = 8000;

// THE DEADLINE, and it is not the same thing as maxDuration.
//
// Measured: a real shard of 333 URLs took 38s, against a 60s ceiling. That is
// the good case. The bad case is arithmetic — 17 batches that each time out
// twice (a HEAD then a GET at 8s apiece) is 272s, and a Vercel function that
// overruns does not return a partial result, it returns a 504 having written
// nothing at all. A whole day's audit would be lost to a few slow hosts.
//
// So checking stops at 40s whatever is left, the findings so far are written,
// and the response says how many were skipped. Those rows are simply audited
// next week — which is the cadence anyway.
const DEADLINE_MS = 40000;

// PostgREST caps a response at 1,000 rows and reports no error when it
// truncates. Measured during the investigation: a plain select on courses
// returned exactly 1000 of its 1,103 rows, so an unpaged audit would never
// check 103 offerings and nothing would say so. Ordered by id because it is
// unique — created_at is not, bulk imports share a timestamp.
const PAGE = 1000;

async function selectAll(supabase, table, columns) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return rows;
  }
}

// A STATEMENT ABOUT THE FILE, as opposed to a statement about us.
//
// 404 and 410 are the server answering clearly about the resource: it is not
// there, and asking again next week will not change that. Everything else is
// about the request or the server's mood — 403 and 429 are "not you, not now",
// 5xx is "not working", and a timeout is not an answer at all.
//
// The distinction is not theoretical. Measured on this catalogue: a dry run of
// shard 3 found 7 failures and an identical run minutes later found 5, because
// two hosts answer 4xx to a burst of twenty concurrent requests and 200 to the
// same URL on its own. Treating those as settled would have put two healthy
// images in the Inbox. They now have to fail twice, a week apart, to be
// believed — and a genuinely dead file still arrives on the first pass.
const DEFINITIVE_STATUSES = new Set([404, 410]);

// ONE URL, AND THE DIFFERENCE BETWEEN TWO KINDS OF NO.
//
// The re-check with GET is not belt-and-braces. Some hosts reject the HEAD
// method specifically (405, or a 403 from a WAF that only whitelists GET)
// while serving the image perfectly to anyone who asks for it properly. HEAD
// alone would report those as broken.
async function checkUrl(url) {
  const attempt = async (method, headers = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        // Without this header two of fourteen sampled hosts answer 403 to an
        // otherwise identical request. See utils/brokenImages.js.
        headers: { 'User-Agent': AUDIT_USER_AGENT, ...headers },
        signal: controller.signal,
      });
      return { status: res.status, type: contentType(res), res };
    } catch {
      return { status: null, type: '' };
    } finally {
      clearTimeout(timer);
    }
  };

  const head = await attempt('HEAD');
  if (head.status !== null && head.status < 400) return classify(url, head);

  // Either the method was refused or nothing came back. Ask properly before
  // accusing the image of being missing.
  const get = await attempt('GET');
  if (get.status !== null && get.status < 400) return classify(url, get);

  const status = get.status ?? head.status;
  return { ok: false, status, definitive: DEFINITIVE_STATUSES.has(status) };
}

// A 200 IS NOT A PICTURE, which is the whole of Job 2.
//
// app.karinagrant.co.uk answers every image request with HTTP 200, a
// Content-Type of text/html and 599 bytes of a single-page-app shell. The
// server never 404s; it just hands back its index page. Ten of her offerings
// point at that URL, every public card falls back to a placeholder, and an
// audit that only reads the status line calls all ten healthy.
//
// Twenty-five URLs across the catalogue answer 200 with something that is not
// an image. The obvious rule — "Content-Type is not image/*, therefore broken"
// — is WRONG, and measurably so: twelve of those twenty-five are served as
// application/octet-stream by S3, CloudFront and Akamai, and every one of them
// is a real JPEG or PNG. That rule would have invented twelve broken images.
//
// So the header is believed only when it is specific. text/html and friends
// are a document where a picture should be. image/* is a picture. Anything
// vague — octet-stream, or no header at all — is settled by looking at the
// bytes, which cannot lie about what they are.
function classify(url, response) {
  const type = response.type;

  // A CHALLENGE IS NOT A VERDICT.
  //
  // 202 Accepted means "received, not finished" and no image host serves a
  // picture that way. What actually sends it is an anti-bot layer: a 230-byte
  // HTML page with a meta-refresh to /.well-known/, served instead of the
  // file. Measured on readnevillegoddard.com with both the audit's User-Agent
  // and a real Chrome one — identical 202, so it is the address being
  // challenged, not the agent.
  //
  // It is OUR OWN traffic that provokes it: that host holds 21 free resources
  // whose rows sit consecutively, so they went out as one burst. A visitor's
  // browser would in all likelihood be served the image. Recording these would
  // have put 29 healthy images in the Inbox — the audit reporting its own
  // footprint as somebody else's broken content.
  //
  // Undetermined, therefore, and undetermined means silent. The pass does not
  // know, and a queue that says things it does not know is not worth reading.
  if (response.status === 202) return { ok: true, undetermined: true };

  if (type.startsWith('image/')) return { ok: true };
  if (DOCUMENT_TYPES.some((d) => type === d || type.startsWith(`${d};`) || type.startsWith('text/'))) {
    return notAnImage(type);
  }

  // Ambiguous or absent. Ask for the first few bytes rather than guess.
  return sniff(url);
}

// The first bytes of the file, which is what a browser falls back on too.
//
// A Range request so a 5MB photo is not downloaded to read eight bytes of it.
// A host that ignores Range simply sends more and the extra is discarded —
// the read is capped either way because only the first 64 bytes are examined.
async function sniff(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': AUDIT_USER_AGENT, Range: 'bytes=0-63' },
      signal: controller.signal,
    });
    if (res.status >= 400) {
      return { ok: false, status: res.status, definitive: DEFINITIVE_STATUSES.has(res.status) };
    }
    const bytes = new Uint8Array((await res.arrayBuffer()).slice(0, 64));
    if (looksLikeImage(bytes)) return { ok: true };
    if (looksLikeMarkup(bytes)) return notAnImage('text/html');
    // Unrecognised bytes are not evidence of a broken image — they are
    // evidence of a format this function has not been taught. Saying nothing
    // is the honest answer; a false positive here would be indistinguishable
    // from a real one to whoever reads the queue.
    return { ok: true };
  } catch {
    // The HEAD or GET already succeeded, so the file is served. Failing to
    // re-read 64 bytes of it says nothing about the image.
    return { ok: true };
  } finally {
    clearTimeout(timer);
  }
}

function contentType(res) {
  return (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
}

// A document served where an image was asked for. Definitive, because a server
// that is configured to answer this way will answer the same next week — there
// is nothing transient about a soft 404, and making it wait a second pass would
// hide it for another cycle for no gain.
//
// 415 is recorded rather than the 200 the server actually sent. The table has
// no column for a content type, and a row reading "HTTP 200" next to the word
// BROKEN would read as a bug in the audit. 415 is Unsupported Media Type,
// which is precisely the finding, and the Inbox renders it as "Not an image"
// rather than as a status line. See the note in components/admin/queue.js.
function notAnImage() {
  return { ok: false, status: NOT_AN_IMAGE, definitive: true };
}

function looksLikeImage(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true; // JPEG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return true; // PNG
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return true; // GIF
  if (b[0] === 0x42 && b[1] === 0x4d) return true; // BMP
  // RIFF....WEBP
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) {
    return b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  }
  // SVG and ICO. SVG is markup, so it is checked before looksLikeMarkup runs.
  if (b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00) return true; // ICO
  const text = String.fromCharCode(...b.slice(0, 64)).toLowerCase();
  if (text.includes('<svg')) return true;
  return false;
}

function looksLikeMarkup(b) {
  // Leading whitespace is common — barbarabrennan.com sends four spaces before
  // its doctype, and a naive check on byte 0 would miss it.
  const text = String.fromCharCode(...b.slice(0, 64)).trimStart().toLowerCase();
  return text.startsWith('<!doctype') || text.startsWith('<html') || text.startsWith('<?xml');
}

// DEAL THE URLS OUT BY HOST, one per host per round.
//
// Rows arrive grouped by table and id, which means grouped by host: one healer
// has 21 free resources on readnevillegoddard.com with consecutive ids, so in
// table order they filled a single batch and went out as 21 simultaneous
// requests to one server. That is indistinguishable from an attack, and the
// host answered the way hosts answer attacks — with a bot challenge, which the
// audit then had to decide how to read.
//
// Dealing round-robin means a batch of 40 is 40 different hosts wherever there
// are 40 to be had. Same URLs, same count, same run time; just not all at once
// at anybody's door. The politeness is the point, but the reason is accuracy:
// a host that is not provoked answers honestly.
function spreadByHost(list) {
  const queues = new Map();
  for (const target of list) {
    let host;
    try {
      host = new URL(target.url).host;
    } catch {
      host = '';
    }
    if (!queues.has(host)) queues.set(host, []);
    queues.get(host).push(target);
  }

  const out = [];
  const lanes = [...queues.values()];
  for (let round = 0; out.length < list.length; round++) {
    for (const lane of lanes) {
      if (round < lane.length) out.push(lane[round]);
    }
  }
  return out;
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'cron_secret_not_set' }, { status: 503 });
  }

  // Vercel sends `Authorization: Bearer <CRON_SECRET>` of its own accord. The
  // x-cron-secret header is accepted too, so the route can be exercised by hand
  // without forging an Authorization header. Same contract as journey-emails.
  const auth = request.headers.get('authorization') || '';
  const header = request.headers.get('x-cron-secret') || '';
  const presented = auth.startsWith('Bearer ') ? auth.slice(7) : header;

  if (presented !== secret) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });

  // ?shard=N audits a named seventh instead of today's, and ?dry=1 checks
  // without writing. Both exist for verification: without them the only way to
  // exercise this is to wait for 07:00 and then read the table to find out what
  // it decided.
  const params = new URL(request.url).searchParams;
  const requested = Number(params.get('shard'));
  const shard = Number.isInteger(requested) && requested >= 0 && requested < SHARDS
    ? requested
    : todayShard();
  const dryRun = params.get('dry') === '1';

  try {
    // Every healer, so a course's slug can be resolved from its healer_id.
    // Spans the whole table rather than the audited rows' healers, and is one
    // query rather than one per row.
    const healers = await selectAll(supabase, 'healers', 'id, healer_slug');
    const slugById = new Map(healers.map((h) => [h.id, h.healer_slug]));

    // Everything already on the board, so a repeat failure can be counted and
    // a recovery can be cleared. The whole table, because it is a worklist: a
    // few hundred rows at the very worst.
    const existingRows = await selectAll(
      supabase,
      'broken_images',
      'id, table_name, record_id, failures, first_seen_at'
    );
    const existing = new Map(existingRows.map((r) => [`${r.table_name}:${r.record_id}`, r]));

    // Today's slice of all three tables, flattened into one list of things to
    // check so the batching is even across tables rather than three separate
    // runs that each finish with a partly-idle batch.
    const targets = [];
    const scanned = {};

    for (const spec of AUDIT_TABLES) {
      const columns =
        spec.columns || ['id', 'title', spec.imageColumn, spec.healerKey].join(', ');
      const rows = await selectAll(supabase, spec.table, columns);
      scanned[spec.table] = rows.length;

      // Healers go round in full every day; the content tables take a seventh.
      const daily = DAILY_TABLES.has(spec.table);

      for (const row of rows) {
        if (!daily && shardOf(row.id) !== shard) continue;

        // One URL from a column, or several from an array. ONE ROW PER RECORD
        // EITHER WAY — broken_images is unique on (table_name, record_id), and
        // a healer with two dead portraits is still one healer to go and fix.
        // The first failure found is the one recorded; if a second portrait is
        // also dead it surfaces on the next pass, which for healers is
        // tomorrow.
        const urls = (spec.urls ? spec.urls(row) : [row[spec.imageColumn]]).filter(
          // No image is not a broken image. A row with nothing to show falls
          // back to a placeholder by design, and flagging it would fill the
          // queue with work that does not exist.
          (u) => u && typeof u === 'string' && /^https?:\/\//i.test(u)
        );
        if (urls.length === 0) continue;

        const healerSlug =
          spec.healerKey === 'healer_slug'
            ? row.healer_slug || null
            : slugById.get(row[spec.healerKey]) || null;

        // ONE TARGET PER URL, not per row, so all three of a healer's
        // portraits are checked side by side with everything else rather than
        // in three sequential rounds. Measured: 377 portraits take 10s this
        // way and roughly 27s walked record by record, which is the difference
        // between fitting inside the deadline alongside the content shard and
        // not. They are folded back into one row per record at the write
        // stage, where the unique constraint needs them.
        for (const url of urls) {
          targets.push({
            table: spec.table,
            recordId: String(row.id),
            // healers have `name` where content tables have `title`.
            title: row.title || row.name || null,
            url,
            healerSlug,
          });
        }
      }
    }

    // WHERE THE DEADLINE BITES, IF IT BITES.
    //
    // Targets are built in table order, so a run cut short would skip the tail
    // of free_resources — and would skip THE SAME tail tomorrow, and the day
    // after. Those rows would never be audited while the ones above them were
    // audited every time, and nothing in the output would distinguish that
    // from a healthy queue. A silent permanent blind spot is the exact failure
    // this whole feature exists to prevent.
    //
    // So the content targets are rotated by a daily offset: whichever rows go
    // unchecked today are at the front tomorrow. Healer portraits are held at
    // the front and never rotated — they are the daily pass and the first
    // thing a visitor sees, so they are the last thing worth dropping.
    const daily = targets.filter((t) => DAILY_TABLES.has(t.table));
    const rest = targets.filter((t) => !DAILY_TABLES.has(t.table));
    const offset = rest.length ? Math.floor(Date.now() / 86400000) % rest.length : 0;
    const ordered = spreadByHost([...daily, ...rest.slice(offset), ...rest.slice(0, offset)]);

    // Per record, not per URL: `seen` is every record this run managed to
    // check, `failed` the worst verdict found for each one that failed.
    const seen = new Set();
    const failed = new Map();
    // Records behind a bot challenge. Counted and reported rather than merely
    // skipped: "the audit found nothing" and "the audit could not look" are
    // different claims, and a queue that conflates them is quietly lying.
    const undetermined = new Set();
    const now = new Date().toISOString();
    const startedAt = Date.now();
    let skipped = 0;

    for (let i = 0; i < ordered.length; i += BATCH_SIZE) {
      // Checked before the batch rather than after, because the decision is
      // whether there is room for another 8s of timeouts — not whether the last
      // one fitted.
      if (Date.now() - startedAt > DEADLINE_MS) {
        skipped = ordered.length - i;
        break;
      }

      const batch = ordered.slice(i, i + BATCH_SIZE);
      const verdicts = await Promise.all(batch.map((t) => checkUrl(t.url)));

      batch.forEach((target, index) => {
        const verdict = verdicts[index];
        const key = `${target.table}:${target.recordId}`;

        seen.add(key);
        if (verdict.undetermined) undetermined.add(key);
        if (verdict.ok) return;

        // FIRST FAILURE WINS, and a definitive one outranks a soft one.
        //
        // broken_images is unique on (table_name, record_id), so a healer with
        // two dead portraits is still one row — which is right, because it is
        // still one healer to go and fix, and the Profile tab shows all three
        // side by side when you get there.
        const held = failed.get(key);
        if (held && (held.definitive || !verdict.definitive)) return;
        failed.set(key, { ...verdict, target });
      });
    }

    const broken = [];
    for (const [key, verdict] of failed) {
      const previous = existing.get(key);
      const target = verdict.target;

      // A DEFINITIVE failure counts as two at once, and that is the whole
      // reason the field distinguishes them.
      //
      // The threshold exists so a blip cannot fill the Inbox. A server that
      // answers 404 to both a HEAD and a GET is not a blip — it has said
      // plainly, twice, that the file is gone, and making it wait for the next
      // pass would leave a genuinely dead image invisible for eight days,
      // because a content shard is only revisited weekly. A soft 404 — a 200
      // carrying a web page instead of a picture — is definitive for the same
      // reason: a server configured to answer that way will answer the same
      // tomorrow.
      //
      // Everything else gets the one increment it has earned and must fail
      // again next pass to be believed. That is what absorbs a rate-limited
      // 403, which is the single commonest false positive here.
      const base = previous?.failures || 0;
      const failures = verdict.definitive ? Math.max(base + 1, MIN_FAILURES) : base + 1;

      broken.push({
        table_name: target.table,
        record_id: target.recordId,
        healer_slug: target.healerSlug,
        title: target.title,
        // The URL that actually failed, which for a healer is whichever of the
        // three portraits it was — not necessarily the first.
        image_url: target.url,
        status_code: verdict.status,
        failures,
        // Preserved across upserts: how long a thing has been broken is the
        // most useful number on the row, and an upsert supplying NOW() would
        // reset it every pass and always read "first seen today".
        first_seen_at: previous?.first_seen_at || now,
        detected_at: now,
      });
    }

    // SELF-CLEARING. An image that was replaced, or a host that came back,
    // leaves the queue on its own — otherwise every fix would have to be
    // confirmed by hand and the count would only ever rise.
    //
    // Keyed off `seen` rather than off a per-URL pass, so a healer only clears
    // when ALL THREE portraits are healthy: a record that was checked, is not
    // in `failed`, and has a row on the board no longer deserves one. Records
    // the deadline cut short are not in `seen` and are left exactly as they
    // are, which is why a short run cannot silently empty the queue.
    const recovered = [];
    for (const [key, row] of existing) {
      if (seen.has(key) && !failed.has(key)) recovered.push(row.id);
    }

    if (!dryRun) {
      if (recovered.length) {
        await supabase.from('broken_images').delete().in('id', recovered);
      }
      if (broken.length) {
        const { error } = await supabase
          .from('broken_images')
          .upsert(broken, { onConflict: 'table_name,record_id' });
        if (error) throw new Error(`upsert: ${error.message}`);
      }
    }

    return NextResponse.json({
      shard,
      shards: SHARDS,
      dryRun,
      scanned,
      // URLs, not records — a healer contributes three. `records` is the
      // number of things that could be fixed.
      checked: targets.length - skipped,
      records: seen.size,
      // Could not be determined — a host answered with an anti-bot challenge
      // instead of the file. Not counted as broken and not counted as healthy.
      undetermined: undetermined.size,
      // Not an error, but not nothing either: a run that keeps skipping is a
      // run whose shard has grown past what one pass can cover.
      skipped,
      elapsedMs: Date.now() - startedAt,
      broken: broken.length,
      // How many of those are being shown rather than merely recorded, so a
      // run's output can be read against the Inbox badge without a query.
      queued: broken.filter((b) => b.failures >= MIN_FAILURES).length,
      recovered: recovered.length,
    });
  } catch (err) {
    console.error('[broken-images]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

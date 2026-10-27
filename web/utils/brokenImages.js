// The broken-image audit: what gets checked, and which seventh of it today.
//
// Shared between the cron route that writes findings and the admin surfaces
// that read them, so the two can never disagree about what a content type is
// called or where its picture lives.

import { youtubeId } from './contentSubmissions.js';

// WHERE A ROW'S PICTURE LIVES, which is not the same column twice, and WHICH
// KEY POINTS AT THE HEALER, which is not the same key twice either.
//
// books carry healer_slug as text. courses and free_resources carry a
// relational bigint healer_id. The spec for this feature listed healer_slug on
// all three; it is on one. That is the same split that once left the admin
// Content tab showing only half a healer's work, so the slug is resolved here
// by joining healers rather than assumed to be on the row.
//
// VIDEOS have no image column — the thumbnail is derived from the YouTube id in
// platform_url at render time — so their entry derives the same URL. What a
// failure means there is different: see videoThumbnail below.
export const AUDIT_TABLES = [
  // HEALERS ARE FIRST AND ARE NOT SHARDED. See DAILY_TABLES below.
  //
  // Their picture is not in a column, it is in image_urls — a text ARRAY of
  // three, and all three are on screen: the healer page runs a crossfade
  // rotator over them, and the homepage card picks one by index seeded on the
  // active subject filter. Auditing only [0] would have missed four of the six
  // portraits that are broken today, which sit at indices 0, 1 and 2.
  //
  // So this entry carries `urls` instead of `imageColumn`: an accessor that
  // returns every URL on the row, rather than a column name to read as a
  // string. The other three keep the simple form.
  {
    table: 'healers',
    columns: 'id, name, healer_slug, image_urls',
    urls: (row) => (Array.isArray(row.image_urls) ? row.image_urls : []),
    healerKey: 'healer_slug',
    label: 'Profile photo',
  },
  {
    table: 'books',
    imageColumn: 'mock_cover_url',
    healerKey: 'healer_slug',
    label: 'Book',
  },
  {
    table: 'courses',
    imageColumn: 'image_url',
    healerKey: 'healer_id',
    label: 'Offering',
  },
  {
    table: 'free_resources',
    imageColumn: 'image_url',
    healerKey: 'healer_id',
    label: 'Free resource',
  },
  // Sharded like the content tables: 2,519 thumbnails is too many for one run.
  {
    table: 'videos',
    columns: 'id, title, healer_slug, platform_url',
    urls: (row) => [videoThumbnail(row.platform_url)].filter(Boolean),
    healerKey: 'healer_slug',
    label: 'Video',
  },
];

// The thumbnail the site shows for a video, which is the URL the check asks
// for. img.youtube.com answers 404 (with a grey stand-in picture, which the
// browser shows without complaint) once the video is deleted or made private.
// So a 404 here is not a broken image, it is a removed video: measured on 27
// October 2026, 6 of 2,519.
export function videoThumbnail(platformUrl) {
  const id = youtubeId(platformUrl);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

// For the admin row's type chip. Keyed by the stored table_name, so a row read
// back from the database names itself without the reader holding a lookup.
export const TABLE_LABELS = {
  healers: 'Profile Photo',
  books: 'Books',
  courses: 'Offerings',
  free_resources: 'Free Resources',
  videos: 'Videos',
};

// What kind of problem a queue row is (broken_images.problem, migration 0028).
//   broken         the picture does not load
//   placeholder    it loads, but it is a stand-in such as a "no cover" image.
//                  Soft: listed in the queue, left out of the Inbox badge.
//   video_removed  the YouTube video is gone; the fix is to remove the row
export const PROBLEMS = {
  broken: 'broken',
  placeholder: 'placeholder',
  videoRemoved: 'video_removed',
};

// A STAND-IN PICTURE, by its file name.
//
// Five books point at Goodreads' https://dryofg8nmyqjw.cloudfront.net/images/
// no-cover.png. It is a real PNG and answers 200, so to the check it is
// healthy, while the visitor sees "no cover". Matched on the LAST PATH SEGMENT
// only, and that matters: 19 offerings and resources on ik.imagekit.io carry
// `di-placeholder_portrait….jpg` in their URL, which is imagekit's "use this
// if the photo is missing" setting, and their photos are real (70KB against
// the 4.7KB placeholder). A match anywhere in the URL would have flagged all 19.
const PLACEHOLDER_FILES =
  /^(?:no[-_]?cover|no[-_]?photo|no[-_]?image|placeholder|image[-_]not[-_]available|default[-_]cover)\.(?:png|jpe?g|gif|webp|svg)$/i;

export function isPlaceholderImage(url) {
  try {
    const file = new URL(url).pathname.split('/').pop() || '';
    return PLACEHOLDER_FILES.test(decodeURIComponent(file));
  } catch {
    return false;
  }
}

// WHICH SEVENTH, from the ?shard= parameter or the day.
//
// The bug this replaces: `Number(params.get('shard'))` on a scheduled run,
// which has no ?shard=, is Number(null), which is 0 — a valid shard. So every
// run from 6 to 27 October 2026 checked shard 0 and the other six were never
// looked at again. An absent or blank parameter now means "today's".
export function pickShard(param, date = new Date()) {
  if (param === null || param === undefined || String(param).trim() === '') return todayShard(date);
  const n = Number(param);
  return Number.isInteger(n) && n >= 0 && n < SHARDS ? n : todayShard(date);
}

// Audited in full every day rather than a seventh at a time.
//
// There are 377 portrait URLs against 2,513 content ones, and a full pass over
// them measured 10s — affordable daily where the content tables are not. It
// matters because none of the six portraits broken today is a 404: they are
// 403s and a 525, which are indefinite and need two passes to be believed.
// Weekly that is a fortnight before a dead face photo reaches the Inbox; daily
// it is two days. The portrait is the first thing a visitor sees.
export const DAILY_TABLES = new Set(['healers']);

// The Inbox line about the last scheduled check, or null when there is none to
// describe. `stale` when it is over 26 hours old, cut short, or failed: the
// three ways a queue can look clean without having looked.
export function describeImageCheck(run, now = new Date()) {
  if (!run) return null;
  const when = new Date(run.ran_at);
  const hours = (now - when) / 3600000;
  const at = when.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  if (run.error) return { stale: true, text: `Image check failed ${at} UTC: ${run.error}` };
  const parts = [
    `Image check last ran ${at} UTC`,
    `shard ${run.shard + 1} of ${run.shards}`,
    `${run.checked ?? 0} checked`,
  ];
  if (run.skipped) parts.push(`${run.skipped} skipped (out of time)`);
  if (run.undetermined) parts.push(`${run.undetermined} behind a bot check`);
  if (run.recovered) parts.push(`${run.recovered} cleared`);
  const stale = hours > 26 || Boolean(run.skipped);
  if (hours > 26) parts.push('overdue');
  return { stale, text: parts.join(' · ') };
}

// The content types that mean "this is a document, not a picture".
//
// Checked against the header only when the header is specific. Vague types —
// application/octet-stream above all — are settled by sniffing the bytes
// instead, because twelve URLs on S3, CloudFront and Akamai are served as
// octet-stream and every one of them is a real JPEG or PNG. Trusting the
// header alone would have reported all twelve as broken.
export const DOCUMENT_TYPES = [
  'text/html',
  'text/plain',
  'text/xml',
  'application/json',
  'application/xml',
  'application/xhtml+xml',
];

// The verdict code stored for a 200 that is not an image.
//
// 415 Unsupported Media Type is the audit's finding rather than anything the
// server said — app.karinagrant.co.uk returns a cheerful 200. The table has no
// column for a content type, and a BROKEN row reading "HTTP 200" would look
// like a fault in the audit, so the condition is recorded as the status whose
// meaning it is and rendered in words.
export const NOT_AN_IMAGE = 415;

// A SEVENTH PER DAY, and the reason is a hard limit rather than a preference.
//
// Measured: one fully-concurrent batch of 20 HEAD requests takes 1.3s, and
// there are 2,513 URLs. A whole-catalogue pass is ~164s at best and longer the
// moment a host hangs, against a Vercel function ceiling of 60s on Hobby and
// 300s on Pro. Auditing a seventh brings a run to roughly 25s, which fits with
// room to spare, and every image is still checked every week.
export const SHARDS = 7;

// WHICH seventh, and it must be the same seventh for the same row every week —
// otherwise rows would drift between days as the tables grow and some would be
// checked twice in a week while others were missed.
//
// `id % 7` is what the plan called for and is exactly what happens for books,
// whose ids are integers. It cannot happen for courses or free_resources, whose
// ids are UUIDs: there is no remainder of a UUID. Those are hashed to a number
// first (FNV-1a, 32-bit), which is deterministic, evenly spread, and stable for
// the life of the row.
export function shardOf(id) {
  const key = String(id);
  if (/^\d+$/.test(key)) return Number(key) % SHARDS;

  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    // Math.imul keeps the multiply in 32-bit space; a plain * would lose the
    // low bits to float precision and collapse the distribution.
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % SHARDS;
}

// Day of the week in UTC, 0 (Sunday) to 6. UTC rather than local time because
// the cron fires on UTC and a server in another zone would otherwise re-audit
// one shard and skip another across a day boundary.
export function todayShard(date = new Date()) {
  return date.getUTCDay() % SHARDS;
}

// HOW MANY FAILURES BEFORE AN ADMIN IS TOLD. Two.
//
// A row is written on its first failure but not shown, because the single
// commonest cause of one failed fetch is nothing to do with the image: a
// timeout, a DNS blip, a host rate-limiting a burst of requests from one
// address. Surfacing those would put hundreds of healthy images in the Inbox on
// the first bad afternoon and the queue would be ignored within a week.
export const MIN_FAILURES = 2;

// A User-Agent IS NOT OPTIONAL, and this is measured rather than assumed.
//
// Of 14 real image hosts sampled from these tables, two — barbarabrennan.com
// and www.soundstrue.com — answer 403 to a HEAD with no User-Agent and 200 to
// the identical request with one. That is 14% of the sample: without this
// header roughly one in seven healthy images would be reported broken, which is
// worse than having no audit at all. With it, HEAD agreed with GET on all 14.
export const AUDIT_USER_AGENT =
  'Mozilla/5.0 (compatible; SpiritpediaImageAudit/1.0; +https://www.spiritpedia.co)';

// VIDEO THUMBNAILS ARE COVERED since migration 0028 (see videoThumbnail). A
// video with no YouTube id in platform_url has no thumbnail to check and is
// skipped, as a row with no image is.

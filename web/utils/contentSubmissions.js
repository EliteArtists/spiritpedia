// Owners managing their own content (content_submissions, migration 0024):
// the rules both sides share. The owner's dashboard and /api/content check a
// submission with these; the admin's review pane and /api/admin/submissions
// approve with them. Plain functions with no imports, so they are tested
// without Supabase or Resend (contentSubmissions.test.mjs).

// What an owner can add. Courses, retreats and memberships all live in the
// courses table, told apart by product_type; they share /offerings/[slug].
export const CONTENT_KINDS = {
  video: { label: 'Video', contentType: 'video', table: 'videos' },
  book: { label: 'Book', contentType: 'book', table: 'books' },
  course: { label: 'Course', contentType: 'course', table: 'courses', productType: 'course' },
  retreat: { label: 'Retreat', contentType: 'course', table: 'courses', productType: 'retreat' },
  membership: { label: 'Membership', contentType: 'course', table: 'courses', productType: 'membership' },
  free_resource: { label: 'Free resource', contentType: 'free_resource', table: 'free_resources' },
};

export const TABLES = {
  video: 'videos',
  book: 'books',
  course: 'courses',
  free_resource: 'free_resources',
};

// Each item's own link: what the duplicate check and content_removals compare.
export const URL_COLUMNS = {
  video: 'platform_url',
  book: 'amazon_url',
  course: 'course_url',
  free_resource: 'resource_url',
};

export const IMAGE_COLUMNS = {
  book: 'mock_cover_url',
  course: 'image_url',
  free_resource: 'image_url',
};

// The columns an owner may propose, per table. Everything else (the slug,
// the listing it hangs off, affiliate status, Featured) stays with the admin.
export const EDITABLE = {
  video: ['title', 'platform_url', 'subject_slugs'],
  book: ['title', 'amazon_url', 'author', 'description', 'mock_cover_url', 'subject_slugs'],
  course: ['title', 'course_url', 'description', 'price', 'image_url', 'start_date', 'end_date', 'subject_slugs'],
  free_resource: ['title', 'resource_url', 'resource_type', 'description', 'image_url', 'subject_slugs'],
};

export const RESOURCE_TYPES = [
  ['meditation', 'Meditation'],
  ['download', 'Download'],
  ['mini_course', 'Mini course'],
  ['workshop', 'Workshop'],
  ['practice', 'Practice'],
];

export const PRODUCT_LABELS = {
  course: 'Course',
  retreat: 'Retreat',
  membership: 'Membership',
  download: 'Download',
};

export const FIELD_LABELS = {
  title: 'Title',
  platform_url: 'YouTube link',
  amazon_url: 'Amazon link',
  author: 'Author',
  description: 'Description',
  mock_cover_url: 'Cover',
  course_url: 'Link',
  resource_url: 'Link',
  resource_type: 'Type',
  price: 'Price',
  image_url: 'Image',
  start_date: 'Starts',
  end_date: 'Ends',
  subject_slugs: 'Subjects',
};

export const LIMITS = {
  title: 200,
  author: 200,
  description: 3000,
  price: 60,
  notes: 2000,
  subjects: 5,
  pending: 20,
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Rejecting: the reason the owner is told, in their email and on their
// dashboard.
export const REJECT_REASONS = {
  not_theirs: 'It doesn’t look like your own work.',
  link_broken: 'The link doesn’t work.',
  not_a_fit: 'It isn’t a fit for Spiritpedia.',
  already_listed: 'It’s already on Spiritpedia.',
  other: 'Something else; see the note below.',
};

// The Privacy Policy: "Content you send us to add or change — 12 months after
// we decide it." Change both together.
export const SUBMISSION_RETENTION_MONTHS = 12;

export function submissionCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - SUBMISSION_RETENTION_MONTHS);
  return cutoff.toISOString();
}

/* ── Links ─────────────────────────────────────────────────────────────── */

// A full https link they typed: never one we make up or guess.
export function httpsUrl(value) {
  const v = String(value ?? '').trim();
  if (!v) return null;
  try {
    const url = new URL(v);
    if (url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const YOUTUBE_HOSTS = /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)$/i;

export function youtubeId(value) {
  const v = String(value ?? '').trim();
  let url;
  try {
    url = new URL(v);
  } catch {
    return null;
  }
  if (!YOUTUBE_HOSTS.test(url.hostname)) return null;
  const patterns = [/[?&]v=([A-Za-z0-9_-]{11})/, /youtu\.be\/([A-Za-z0-9_-]{11})/, /\/embed\/([A-Za-z0-9_-]{11})/, /\/shorts\/([A-Za-z0-9_-]{11})/, /\/live\/([A-Za-z0-9_-]{11})/];
  for (const re of patterns) {
    const m = v.match(re);
    if (m) return m[1];
  }
  return null;
}

// Stored the way ingestion stores them, so the duplicate check compares like
// with like.
export function youtubeWatchUrl(value) {
  const id = youtubeId(value);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

// The stores utils/affiliate.js knows; a link to any other shows no button.
const AMAZON_HOSTS = /^(?:www\.|us\.|smile\.|m\.)?(amazon\.(?:com|co\.uk|es|de|fr|it|ca|com\.au))$/i;

export function amazonId(value) {
  const m = String(value ?? '').match(/(?:\/dp\/|\/gp\/product\/|\/product\/|\/ASIN\/)([A-Z0-9]{10})/i);
  return m ? m[1].toUpperCase() : null;
}

// An Amazon product page. The affiliate tag is added when the page shows the
// link (utils/affiliate.js), never stored, so one typed with someone else's tag
// is stored without it.
export function amazonProductUrl(value) {
  const v = httpsUrl(value);
  if (!v) return null;
  const url = new URL(v);
  const host = url.hostname.match(AMAZON_HOSTS);
  if (!host) return null;
  const id = amazonId(url.pathname);
  if (!id) return null;
  return `https://www.${host[1].toLowerCase()}/dp/${id}`;
}

/* ── Checking a submission ─────────────────────────────────────────────── */

function text(value, max) {
  const v = String(value ?? '').trim().replace(/\s+\n/g, '\n');
  return v ? v.slice(0, max) : null;
}

function isoDate(value) {
  const v = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? null : v;
}

// The subjects they suggest: 1 to 5, from the existing list only.
export function cleanSubjects(values, known) {
  const allowed = new Set(known || []);
  const out = [];
  for (const raw of Array.isArray(values) ? values : []) {
    const slug = String(raw ?? '').trim();
    if (slug && allowed.has(slug) && !out.includes(slug)) out.push(slug);
  }
  return out.slice(0, LIMITS.subjects);
}

// The owner's form → the target table's columns, or the errors to show.
// `kind` is a CONTENT_KINDS key. Images are checked separately: an uploaded
// file, never a link.
//   → { fields, errors } — errors is {} when it is fine.
// `live` is the live row, for an edit.
export function checkSubmission(kind, form = {}, { subjects = [], knownSubjects = [], requireSubjects = true, live = null } = {}) {
  const spec = CONTENT_KINDS[kind];
  if (!spec) return { fields: {}, errors: { kind: 'Choose what you’re adding.' } };
  const errors = {};
  const fields = {};

  fields.title = text(form.title, LIMITS.title);
  if (!fields.title) errors.title = 'Add a title.';

  if (spec.contentType === 'video') {
    fields.platform_url = youtubeWatchUrl(form.platform_url);
    if (!fields.platform_url) errors.platform_url = 'Paste a YouTube link (youtube.com, youtu.be or a Short).';
  }

  if (spec.contentType === 'book') {
    fields.amazon_url = amazonProductUrl(form.amazon_url);
    if (!fields.amazon_url) errors.amazon_url = 'Paste the book’s Amazon product link (it contains /dp/).';
    fields.author = text(form.author, LIMITS.author);
    if (!fields.author) errors.author = 'Add the author.';
    fields.description = text(form.description, LIMITS.description);
  }

  if (spec.contentType === 'course') {
    fields.course_url = httpsUrl(form.course_url);
    if (!fields.course_url) errors.course_url = 'Paste the full link to its page, starting https://';
    fields.description = text(form.description, LIMITS.description);
    if (!fields.description) errors.description = 'Add a short description.';
    fields.price = text(form.price, LIMITS.price);
    fields.start_date = isoDate(form.start_date);
    fields.end_date = isoDate(form.end_date);
    if (spec.productType === 'retreat' || form.product_type === 'retreat') {
      if (!fields.start_date) errors.start_date = 'Add the start date.';
      if (!fields.end_date) errors.end_date = 'Add the end date.';
    }
    if (fields.start_date && fields.end_date && fields.end_date < fields.start_date) {
      errors.end_date = 'The end can’t be before the start.';
    }
  }

  if (spec.contentType === 'free_resource') {
    fields.resource_url = httpsUrl(form.resource_url);
    if (!fields.resource_url) errors.resource_url = 'Paste the full link to it, starting https://';
    const type = String(form.resource_type || '');
    fields.resource_type = RESOURCE_TYPES.some(([v]) => v === type) ? type : null;
    if (!fields.resource_type) errors.resource_type = 'Choose what kind of resource it is.';
    fields.description = text(form.description, LIMITS.description);
    if (!fields.description) errors.description = 'Add a short description.';
  }

  fields.subject_slugs = cleanSubjects(subjects, knownSubjects);
  if (requireSubjects && fields.subject_slugs.length === 0) errors.subjects = 'Choose at least one subject.';

  // An edit: something already live that today's form wouldn't accept (an
  // http:// link, a long Amazon URL, a course with no description) isn't
  // their problem unless they change it. Left as it was, it stays as it was.
  // (And a link left alone isn't rewritten into a "change".)
  if (live) {
    for (const column of new Set([...Object.keys(errors), ...Object.keys(fields)])) {
      if (column === 'subject_slugs' || !(column in live)) continue;
      // Not on this form at all (a course's dates): not theirs to change.
      if (form[column] === undefined) {
        fields[column] = live[column] ?? null;
        delete errors[column];
        continue;
      }
      const typed = String(form[column] ?? '').trim();
      const was = String(live[column] ?? '').trim();
      if (typed === was) {
        fields[column] = live[column] ?? null;
        delete errors[column];
      }
    }
    if (errors.subjects && (live.subject_slugs || []).length === 0) delete errors.subjects;
  }

  return { fields, errors };
}

// Which CONTENT_KINDS key a live row is edited with.
export function kindOf(contentType, row = {}) {
  if (contentType !== 'course') return contentType;
  return CONTENT_KINDS[row.product_type] ? row.product_type : 'course';
}

/* ── Edits ─────────────────────────────────────────────────────────────── */

function same(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    const x = [...(a || [])].sort();
    const y = [...(b || [])].sort();
    return x.length === y.length && x.every((v, i) => v === y[i]);
  }
  return (a ?? null) === (b ?? null) || String(a ?? '') === String(b ?? '');
}

// What an edit changes: only the editable columns that differ from the live
// row. → { column: { before, after } }
export function changedFields(contentType, live = {}, proposed = {}) {
  const out = {};
  for (const column of EDITABLE[contentType] || []) {
    if (!(column in proposed)) continue;
    if (!same(live[column], proposed[column])) out[column] = { before: live[column] ?? null, after: proposed[column] ?? null };
  }
  return out;
}

/* ── Slugs ─────────────────────────────────────────────────────────────── */

// The same slugs ingestion makes (ContentIngestion.jsx).
export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

// The first of base, base-2, base-3… not in `taken`.
export function nextFreeSlug(base, taken) {
  const used = new Set(taken || []);
  const root = base || 'item';
  if (!used.has(root)) return root;
  let n = 2;
  while (used.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

/* ── The emails ────────────────────────────────────────────────────────── */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TYPE_WORDS = {
  video: 'video',
  book: 'book',
  course: 'course',
  retreat: 'retreat',
  membership: 'membership',
  download: 'download',
  free_resource: 'free resource',
};

export function typeWord(contentType, productType) {
  return TYPE_WORDS[contentType === 'course' ? productType || 'course' : contentType] || 'item';
}

// The owner hears the decision, in the same plain style as the other emails.
//   decision: 'approved' | 'rejected'; kind: 'new' | 'edit'.
//   → { subject, text, html }
export function submissionDecisionMessage({
  decision,
  kind,
  firstName,
  title,
  what = 'item',
  itemUrl,
  accountUrl,
  reason,
  note,
  supportEmail,
}) {
  const name = title || `your ${what}`;
  const quoted = title ? `“${title}”` : `your ${what}`;
  // The greeting rule every email follows (utils/emailParts.js → greeting).
  const hi = firstName ? `Hi ${firstName},` : 'Hello,';
  const signOff = 'With love,\nThe Spiritpedia team';
  const signOffHtml = '<p>With love,<br>The Spiritpedia team</p>';

  if (decision === 'approved') {
    const lead = kind === 'edit' ? `Your changes to ${quoted} are now live on Spiritpedia.` : `Your ${what} ${quoted} is now live on Spiritpedia.`;
    return {
      subject: kind === 'edit' ? `Your changes to “${name}” are live` : `Your ${what} “${name}” is now live on Spiritpedia`,
      text: `${hi}

${lead}

See it here: ${itemUrl}

You can add more, or change or remove anything on your listing, from your account page: ${accountUrl}

${signOff}`,
      html: `<p>${escapeHtml(hi)}</p><p>${escapeHtml(lead)}</p><p><a href="${itemUrl}">See it here</a></p><p>You can add more, or change or remove anything on your listing, from <a href="${accountUrl}">your account page</a>.</p>${signOffHtml}`,
    };
  }

  const lead = kind === 'edit' ? `We couldn’t make your changes to ${quoted}.` : `We couldn’t add ${quoted} to Spiritpedia.`;
  const why = reason ? `The reason: ${reason}` : null;
  const yourNote = note ? `A note from us: ${note}` : null;
  const after =
    kind === 'edit'
      ? 'The live version is unchanged. You can edit it and send it again from your account page'
      : 'You can edit it and send it again from your account page';
  return {
    subject: kind === 'edit' ? `We couldn’t change “${name}”` : `We couldn’t add “${name}”`,
    text: `${hi}

${lead}

${[why, yourNote].filter(Boolean).join('\n\n')}

${after}: ${accountUrl}

If you have a question, just reply to this email or write to ${supportEmail}.

${signOff}`.replace(/\n{3,}/g, '\n\n'),
    html: `<p>${escapeHtml(hi)}</p><p>${escapeHtml(lead)}</p>${why ? `<p>${escapeHtml(why)}</p>` : ''}${yourNote ? `<p>${escapeHtml(yourNote)}</p>` : ''}<p>${escapeHtml(after)}: <a href="${accountUrl}">your account page</a>.</p><p>If you have a question, just reply to this email or write to <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>${signOffHtml}`,
  };
}

/* ── Retention ─────────────────────────────────────────────────────────── */

// Deletes every decided submission (approved, rejected or withdrawn) whose
// decision is older than the retention period, and the image any of them
// still held. A pending one is never touched. → { deleted, images } or { error }.
export async function purgeDecidedSubmissions(supabase, now = new Date(), bucket = 'content-submissions') {
  const { data, error } = await supabase
    .from('content_submissions')
    .delete()
    .neq('status', 'pending')
    .not('decided_at', 'is', null)
    .lt('decided_at', submissionCutoff(now))
    .select('id, image_path');
  if (error) return { error: error.message || String(error) };
  const images = (data || []).map((r) => r.image_path).filter(Boolean);
  if (images.length) await supabase.storage.from(bucket).remove(images);
  return { deleted: data?.length || 0, images: images.length };
}

// An image uploaded but never sent (the form was abandoned) is deleted after
// two days. `files` are { path, created_at } from the holding bucket;
// `referenced` the image_path of every submission. → the paths to delete.
export const ABANDONED_UPLOAD_HOURS = 48;

export function abandonedUploads(files, referenced, now = new Date()) {
  const keep = new Set((referenced || []).filter(Boolean));
  const before = now.getTime() - ABANDONED_UPLOAD_HOURS * 60 * 60 * 1000;
  return (files || [])
    .filter((f) => f?.path && !keep.has(f.path) && new Date(f.created_at || 0).getTime() < before)
    .map((f) => f.path);
}

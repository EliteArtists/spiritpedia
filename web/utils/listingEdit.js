// Editing a listing's items on the owner's behalf (owner, 18 Nov 2026):
// Admin → Content → listing → Content. What each kind of item lets the admin
// change, the checks a change must pass, the "keep minimal" lock (migration
// 0053) and the lines the edit log keeps. The route that writes is
// /api/admin/listing-edit; scripts/ingest.mjs, link-hub.mjs and
// fix-images.mjs read the same lock (listing_locks).

// Each table, how it finds its listing, and the fields the admin can change.
// The labels are the ones the form shows. Videos have no description, price
// or image column (the thumbnail comes from YouTube); books have no price.
export const ITEM_TABLES = {
  videos: {
    noun: 'video',
    plural: 'videos',
    key: 'healer_slug',
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'platform_url', label: 'Link', url: true, required: true },
    ],
  },
  books: {
    noun: 'book',
    plural: 'books',
    key: 'healer_slug',
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'description', label: 'Description', long: true },
      { name: 'amazon_url', label: 'Link', url: true },
      { name: 'mock_cover_url', label: 'Image', url: true },
    ],
  },
  courses: {
    noun: 'offering',
    plural: 'offerings',
    key: 'healer_id',
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'description', label: 'Description', long: true },
      { name: 'price', label: 'Price' },
      { name: 'course_url', label: 'Link', url: true },
      { name: 'image_url', label: 'Image', url: true },
    ],
  },
  free_resources: {
    noun: 'free resource',
    plural: 'free resources',
    key: 'healer_id',
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'description', label: 'Description', long: true },
      { name: 'resource_url', label: 'Link', url: true, required: true },
      { name: 'image_url', label: 'Image', url: true },
    ],
  },
};

const isUrl = (v) => /^https?:\/\/\S+$/i.test(v);

// The fields an edit may write, trimmed, with empty optional fields as null.
// → { values } or { error }. Fields the table doesn't have are refused rather
// than dropped, so a mistake in the form can't pass for a save.
export function cleanEdit(table, values) {
  const spec = ITEM_TABLES[table];
  if (!spec) return { error: `Items of type "${table}" can't be edited here.` };
  const allowed = new Map(spec.fields.map((f) => [f.name, f]));
  const out = {};
  for (const [name, raw] of Object.entries(values || {})) {
    const field = allowed.get(name);
    if (!field) return { error: `A ${spec.noun} has no "${name}" to change.` };
    const value = typeof raw === 'string' ? raw.trim() : raw == null ? '' : String(raw);
    if (!value) {
      if (field.required) return { error: `${field.label} can't be empty.` };
      out[name] = null;
      continue;
    }
    if (field.url && !isUrl(value)) return { error: `${field.label} must be a full address starting https://.` };
    out[name] = value;
  }
  if (!Object.keys(out).length) return { error: 'Nothing to change.' };
  return { values: out };
}

// The fields that actually differ, as { before, after } of those fields only.
export function changedFields(row, values) {
  const before = {};
  const after = {};
  for (const [name, value] of Object.entries(values)) {
    if ((row?.[name] ?? null) !== value) {
      before[name] = row?.[name] ?? null;
      after[name] = value;
    }
  }
  return { before, after, changed: Object.keys(after) };
}

// The note a lock carries unless the admin writes another.
export function defaultLockNote(date = new Date()) {
  const day = new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
  return `owner request — keep minimal (${day})`;
}

// A listing_locks row (or null) → { locked, note, at, by }.
export function lockOf(row) {
  if (!row) return { locked: false, note: null, at: null, by: null };
  return { locked: true, note: row.note || 'keep minimal', at: row.locked_at || null, by: row.locked_by || null };
}

// The database's refusal (0053's trigger) in words for the admin.
export function lockRefusal(error) {
  const message = error?.message || '';
  if (!message.includes('listing_locked')) return null;
  return message.replace(/^.*listing_locked:\s*/, '');
}

// One line for the edit log.
export function logSummary({ action, table, title, changed = [], count = 0, note }) {
  const spec = ITEM_TABLES[table];
  if (action === 'edit') return `Edited ${spec.noun} "${title}": ${changed.join(', ')}`;
  if (action === 'remove') return `Removed ${spec.noun} "${title}"`;
  if (action === 'remove_all') return `Removed all ${spec.plural} (${count})`;
  if (action === 'lock') return `Locked: ${note || 'keep minimal'}`;
  if (action === 'unlock') return 'Lock switched off';
  return action;
}

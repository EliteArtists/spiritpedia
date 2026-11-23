// Images uploaded in the admin (owner, 23 Nov 2026; migration 0056). Shared
// by /api/admin/upload-image and components/admin/ImageField.jsx. No
// browser or server imports, so `node --test` can import it.

export const IMAGE_BUCKET = 'listing-images';

// The folders, one per table whose rows carry a picture.
export const IMAGE_KINDS = ['healers', 'publishers', 'books', 'courses', 'free_resources'];

// The longer side, in pixels: sharp on a phone and a large screen, small
// enough to load quickly. Smaller pictures are never enlarged.
export const MAX_SIDE = 1600;

// What the file really is, from its first bytes: 'jpeg', 'png', 'webp' or
// null. A name or a stated type can say anything.
export function imageTypeOf(bytes) {
  const b = bytes || [];
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  const text = (from, to) => String.fromCharCode(...Array.from(b.slice(from, to)));
  if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'webp';
  return null;
}

// <kind>/<slug>/<time>-<random>.<ext>. The slug is kept to letters, digits
// and hyphens, so no name can climb out of its folder.
export function imagePath({ kind, slug, type, now = Date.now(), random = Math.random() }) {
  const folder = String(slug || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'unsorted';
  const ext = type === 'jpeg' ? 'jpg' : type;
  return `${kind}/${folder}/${now}-${random.toString(36).slice(2, 8)}.${ext}`;
}

// The size to draw a picture at in the browser before sending it: its own
// size, or smaller so the longer side is `max`.
export function fitInside(width, height, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

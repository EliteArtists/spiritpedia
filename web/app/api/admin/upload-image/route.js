import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { IMAGE_BUCKET, IMAGE_KINDS, imagePath, imageTypeOf } from '@/utils/imageUpload';
import { processImage } from '@/utils/imageProcess';

export const dynamic = 'force-dynamic';

// POST /api/admin/upload-image (owner, 23 Nov 2026; migration 0056): the
// admin's "Upload" button. A multipart form with `file` (JPG, PNG or WebP),
// `kind` (healers, publishers, books, courses, free_resources) and `slug`
// (the listing's). → { url, width, height }.
//
// The browser has already shrunk the picture (components/admin/ImageField),
// because Vercel refuses a request over 4.5 MB and an iPhone photo is often
// bigger. Here it is checked to be the image it says it is, turned the right
// way up, shrunk to MAX_SIDE if it is still bigger, stripped of its hidden
// details, and saved as a JPG, or a PNG when it has see-through parts. It is
// only stored: nothing is set until the admin presses Save on the form, which
// writes the link (and logs the old one) as any typed link would be.

const MAX_BYTES = 4 * 1024 * 1024;

// Without sharp the browser's copy (already shrunk, already free of hidden
// details) is stored as it came.
async function loadSharp() {
  try {
    return (await import('sharp')).default;
  } catch (err) {
    console.error('[upload-image] sharp is not available, storing the browser\'s copy:', err.message);
    return null;
  }
}

export async function POST(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const kind = String(form?.get('kind') || '');
  const slug = String(form?.get('slug') || '');
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'no_file', message: 'No picture was sent.' }, { status: 400 });
  }
  if (!IMAGE_KINDS.includes(kind)) return NextResponse.json({ error: 'bad_kind' }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'too_big', message: 'That picture is too big to send. Try a smaller one.' }, { status: 413 });
  }

  let bytes = Buffer.from(await file.arrayBuffer());
  // What the bytes are, not what the name says.
  let type = imageTypeOf(bytes);
  if (!type) {
    return NextResponse.json({ error: 'not_an_image', message: 'Only JPG, PNG or WebP pictures can be uploaded.' }, { status: 415 });
  }

  let width = null;
  let height = null;
  const sharp = await loadSharp();
  if (sharp) {
    try {
      ({ bytes, type, width, height } = await processImage(sharp, bytes));
    } catch (err) {
      return NextResponse.json(
        { error: 'unreadable', message: `That picture could not be read (${err.message}).` },
        { status: 415 }
      );
    }
  }

  const path = imagePath({ kind, slug, type });
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, bytes, { contentType: `image/${type}`, cacheControl: '31536000', upsert: false });
  if (error) {
    const missing = /bucket not found/i.test(error.message);
    return NextResponse.json(
      {
        error: missing ? 'migration_needed' : 'upload_failed',
        message: missing
          ? 'This needs migration 0056 (supabase/migrations/0056_listing_images_bucket.sql). Run it on this database first.'
          : `The picture could not be stored: ${error.message}`,
      },
      { status: missing ? 409 : 500 }
    );
  }
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, width, height });
}

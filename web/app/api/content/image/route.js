import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/utils/contentSubmissions';
import { HOLDING_BUCKET, holdingImageUrl, ownerFrom } from '@/utils/contentOwner';

export const dynamic = 'force-dynamic';

// An image for a submission (migration 0024): uploaded, never linked. It waits
// in the private content-submissions bucket, under the owner's own folder, and
// only becomes public when the admin approves. The upload goes through here,
// with the service role, so the bucket needs no storage policy at all.
//
// POST multipart: file, as. → { path, preview } (a link that lasts an hour).

// The first bytes of each type, so a renamed file isn't taken on trust.
function sniff(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export async function POST(request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'no_file', message: 'Choose an image.' }, { status: 400 });
  const owner = await ownerFrom(request, form.get('as'));
  if (owner.error) return owner.error;

  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'no_file', message: 'Choose an image.' }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'too_big', message: 'That image is larger than 5 MB.' }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) {
    return NextResponse.json({ error: 'not_an_image', message: 'Use a JPEG, PNG or WebP image.' }, { status: 400 });
  }

  const path = `${owner.user.id}/${randomUUID()}.${IMAGE_TYPES[type]}`;
  const { error } = await owner.supabase.storage
    .from(HOLDING_BUCKET)
    .upload(path, bytes, { contentType: type, upsert: false });
  if (error) {
    return NextResponse.json({ error: 'upload_failed', message: 'The upload didn’t work. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, path, preview: await holdingImageUrl(owner.supabase, path) });
}

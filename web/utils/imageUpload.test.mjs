import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitInside, imagePath, imageTypeOf } from './imageUpload.js';

test('a picture is known by its bytes, not its name', () => {
  assert.equal(imageTypeOf(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0])), 'jpeg');
  assert.equal(imageTypeOf(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d])), 'png');
  assert.equal(imageTypeOf(Buffer.from('RIFF\0\0\0\0WEBPVP8 ')), 'webp');
  assert.equal(imageTypeOf(Buffer.from('<svg xmlns=')), null);
  assert.equal(imageTypeOf(Buffer.from('%PDF-1.7')), null);
  assert.equal(imageTypeOf(null), null);
});

test('stored under its kind and listing, with a name nobody can steer', () => {
  assert.equal(imagePath({ kind: 'healers', slug: 'ajahn-brahm', type: 'jpeg', now: 1, random: 0.5 }), 'healers/ajahn-brahm/1-i.jpg');
  assert.equal(imagePath({ kind: 'books', slug: '../../etc/Passwd', type: 'png', now: 2, random: 0.5 }), 'books/etc-passwd/2-i.png');
  assert.equal(imagePath({ kind: 'courses', slug: '', type: 'png', now: 3, random: 0.5 }), 'courses/unsorted/3-i.png');
});

test('shrunk so the longer side is 1600 px, never enlarged', () => {
  assert.deepEqual(fitInside(4032, 3024), { width: 1600, height: 1200 });
  assert.deepEqual(fitInside(3024, 4032), { width: 1200, height: 1600 });
  assert.deepEqual(fitInside(800, 600), { width: 800, height: 600 });
});

// The server's processing, with real pictures made by sharp itself.
const sharp = (await import('sharp')).default;
const { processImage } = await import('./imageProcess.js');

test('a large phone photo: turned upright, shrunk to 1600 px, location and camera dropped, a JPG', async () => {
  // 4032×3024 stored sideways (EXIF orientation 6), with GPS and camera details.
  const photo = await sharp({ create: { width: 4032, height: 3024, channels: 3, background: '#8040c0' } })
    .jpeg()
    .withMetadata({ orientation: 6, exif: { IFD0: { Make: 'Apple', Model: 'iPhone' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '51/1 30/1 0/1' } } })
    .toBuffer();
  const out = await processImage(sharp, photo);
  assert.equal(out.type, 'jpeg');
  assert.deepEqual([out.width, out.height], [1200, 1600]);
  const meta = await sharp(out.bytes).metadata();
  assert.equal(meta.exif, undefined);
  assert.equal(meta.orientation, undefined);
});

test('a logo with see-through parts stays a PNG, and a small picture is not enlarged', async () => {
  const logo = await sharp({ create: { width: 600, height: 300, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  const out = await processImage(sharp, logo);
  assert.equal(out.type, 'png');
  assert.deepEqual([out.width, out.height], [600, 300]);
  assert.equal((await sharp(out.bytes).metadata()).hasAlpha, true);
});

test('a file that only claims to be a picture is refused', async () => {
  await assert.rejects(processImage(sharp, Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from('not really a jpeg')])));
});

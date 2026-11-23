import { MAX_SIDE } from './imageUpload.js';

// SERVER ONLY (sharp). An uploaded picture, made ready to store (owner, 23 Nov
// 2026): turned the right way up, shrunk so its longer side is at most
// MAX_SIDE (never enlarged), its hidden details (location, camera) dropped,
// and saved as a JPG, or a PNG when it has see-through parts.
// → { bytes, type: 'jpeg' | 'png', width, height }. Throws when it can't be
// read as a picture.
export async function processImage(sharp, input) {
  const image = sharp(input, { failOn: 'error' }).rotate();
  const meta = await image.metadata();
  const resized = image.resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true });
  const { data, info } = meta.hasAlpha
    ? await resized.png({ compressionLevel: 9, palette: true }).toBuffer({ resolveWithObject: true })
    : await resized.flatten({ background: '#ffffff' }).jpeg({ quality: 84, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  return { bytes: data, type: meta.hasAlpha ? 'png' : 'jpeg', width: info.width, height: info.height };
}
